// Makes the illustration across the top of a new blog post: src/assets/blog/<slug>.webp.
//
// The picture is drawn from the post's `imageAlt`, so the alt text describes what is actually in it.
// It is an illustration, never a photo-like scene, so it cannot pass for one of our installations.
// Image models still slip in garbled lettering or a logo now and then, and nobody looks before the
// post goes live, so a second model looks at each picture first and anything with text, a logo or
// a photographic look is drawn again, once. If that fails too, the post keeps its category photo.
//
// Needs OPENAI_API_KEY. Usage: node scripts/make-post-image.mjs <slug>
import { readFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { load as parseYaml } from 'js-yaml';

const slug = process.argv[2];
const key = process.env.OPENAI_API_KEY;
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL;
const CHECK_MODEL = process.env.OPENAI_MODEL || 'gpt-5';
if (!slug || !key) {
  console.error('Usage: OPENAI_API_KEY=... node scripts/make-post-image.mjs <slug>');
  process.exit(1);
}

const post = readFileSync(`src/content/blog/${slug}.mdx`, 'utf8');
const scene = parseYaml(post.slice(3, post.indexOf('\n---', 3)))?.imageAlt;
if (!scene) {
  console.error(`${slug} has no imageAlt to draw from.`);
  process.exit(1);
}

const PROMPT = `Flat editorial illustration for a rooftop solar blog in Punjab, India.
Scene: ${scene}
Style: clean flat vector illustration with simple shapes and soft daylight. Palette of deep green (#10824c), warm sun yellow (#f5b700), navy (#0d1b2a) and off-white. Wide landscape composition with calm space around the subject.
Strict rules: no text, letters, numbers, labels, signs, logos, brand names or watermarks anywhere. Not photorealistic. Any people are small, simple stylised figures.`;

async function openai(path, body) {
  const res = await fetch(`https://api.openai.com/v1/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok) throw new Error(`OpenAI ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** A reason to reject the picture, or null. */
async function objection(png) {
  const json = await openai('chat/completions', {
    model: CHECK_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'This illustration goes on a business website with nobody checking it. Reply with one line. Reply OK if it has no visible text, letters, numbers, logos or watermarks, does not look like a photograph, and shows nothing unsafe or embarrassing (such as a person on a roof edge without care, or a broken or burning panel). Otherwise reply REJECT and the reason.',
          },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${png.toString('base64')}` } },
        ],
      },
    ],
  });
  const answer = (json.choices?.[0]?.message?.content ?? '').trim();
  return /^OK\b/i.test(answer) ? null : answer || 'the check gave no answer';
}

// Image model names change (gpt-image-1 was gone by October 2026), so ask the account which it has:
// the newest full gpt-image model, else DALL-E 3.
async function imageModel() {
  if (IMAGE_MODEL) return IMAGE_MODEL;
  const res = await fetch('https://api.openai.com/v1/models', { headers: { authorization: `Bearer ${key}` } });
  const ids = res.ok ? (await res.json()).data.map((m) => m.id) : [];
  const version = (id) => Number(id.match(/gpt-image-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  const best = ids.filter((id) => /^gpt-image-[\d.]+$/.test(id)).sort((a, b) => version(b) - version(a))[0];
  return best ?? 'dall-e-3';
}
const model = await imageModel();
console.log(`Image model: ${model}`);
const request = model.startsWith('dall-e')
  ? { model, prompt: PROMPT, size: '1792x1024', quality: 'standard', response_format: 'b64_json', n: 1 }
  : { model, prompt: PROMPT, size: '1536x1024', quality: 'medium', n: 1 };

for (let attempt = 1; attempt <= 2; attempt++) {
  const json = await openai('images/generations', request);
  const png = Buffer.from(json.data?.[0]?.b64_json ?? '', 'base64');
  if (!png.length) throw new Error('The image model returned no picture.');
  const why = await objection(png);
  if (why) {
    console.log(`Picture ${attempt} rejected: ${why}`);
    continue;
  }
  mkdirSync('src/assets/blog', { recursive: true });
  const out = `src/assets/blog/${slug}.webp`;
  await sharp(png).webp({ quality: 82 }).toFile(out);
  console.log(`Wrote ${out}`);
  process.exit(0);
}
console.error('No usable picture after two tries; the post keeps its category photo.');
process.exit(1);
