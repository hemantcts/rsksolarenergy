// One call, two providers. Anthropic first; if it errors, is rate limited or times out, the same
// prompt goes to OpenAI. Either key alone is enough to keep the pipeline running.
//
// Env: ANTHROPIC_API_KEY, OPENAI_API_KEY (either or both), ANTHROPIC_MODEL, OPENAI_MODEL.

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5';
const TIMEOUT_MS = 180_000;

async function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await promise(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function anthropic({ system, prompt, maxTokens }) {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error('no ANTHROPIC_API_KEY');
  // Anthropic keys always start sk-ant-. Anything else is a wrong paste or a key for another
  // service, and calling with it just returns 401.
  if (!key.startsWith('sk-ant-')) throw new Error('ANTHROPIC_API_KEY is not an Anthropic key (it should start sk-ant-)');
  const res = await withTimeout(
    (signal) =>
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] }),
      }),
    TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const text = (json.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  if (!text.trim()) throw new Error('Anthropic returned nothing');
  return { text, provider: `anthropic/${ANTHROPIC_MODEL}` };
}

async function openai({ system, prompt, maxTokens }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('no OPENAI_API_KEY');
  const res = await withTimeout(
    (signal) =>
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          max_completion_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
        }),
      }),
    TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? '';
  if (!text.trim()) throw new Error('OpenAI returned nothing');
  return { text, provider: `openai/${OPENAI_MODEL}` };
}

/** Asks Anthropic, falls back to OpenAI, and says which one answered. */
export async function generate({ system, prompt, maxTokens = 8000 }) {
  const errors = [];
  for (const provider of [anthropic, openai]) {
    try {
      const out = await provider({ system, prompt, maxTokens });
      if (errors.length) console.log(`First choice failed (${errors.join('; ')}), used ${out.provider}.`);
      return out;
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error(`Both providers failed: ${errors.join(' | ')}`);
}
