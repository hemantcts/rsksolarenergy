// Drafts a blog post and writes it to src/content/blog/. The workflow then puts it through
// check-draft.mjs and review-draft.mjs and publishes it, with nobody reading it first, so the checks
// are what stand between this draft and the live site.
//
// The figures come from lib/facts.mjs, the same list the checker and the reviewer use. Keeping one
// list matters more than it looks: when the writer had its own copy, worded differently, the first
// real run was held for saying the subsidy is "paid to the bank" because that is what its own brief
// said, while the checker's wording was "into the applicant's own bank account".
//
// The topic comes from the weekly Search Console report (seo-report.md) when one is present, or
// from the TOPIC env var. The model is handed the site's own figures, the list of pages it may
// link to, and the chart snippets it may use, so a draft cannot invent numbers or links.
//
// Usage: node scripts/draft-post.mjs ["a topic in plain words"]
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { generate } from './lib/ai.mjs';
import { FACTS_TEXT } from './lib/facts.mjs';
import { SOLAR_CONFIG as C } from '../src/config/solar-config.ts';

const BLOG = 'src/content/blog';
const GUIDES = 'src/content/guides';
const TODAY = new Date().toISOString().slice(0, 10);

const CATEGORIES = [
  'Subsidy and bills',
  'Sizing and systems',
  'Hybrid, on-grid and off-grid',
  'Solar pumps and agriculture',
  'Panels and inverters',
  'Installation and maintenance',
  'Financing',
  'Residential and commercial',
  'ROI and payback',
];

const frontmatterOf = (file, dir) => {
  const text = readFileSync(`${dir}/${file}`, 'utf8');
  const title = (text.match(/^title:\s*'?"?(.*?)'?"?$/m) || [])[1] ?? file;
  return { slug: file.replace(/\.mdx$/, ''), title };
};
const posts = readdirSync(BLOG).filter((f) => f.endsWith('.mdx')).map((f) => frontmatterOf(f, BLOG));
const guides = readdirSync(GUIDES).filter((f) => f.endsWith('.mdx')).map((f) => frontmatterOf(f, GUIDES));

/** Only these may be linked. Anything else in a draft is rejected. */
const LINKS = [
  '/',
  '/solar-calculator/',
  '/new-house-solar-calculator/',
  '/hybrid-solar-calculator/',
  '/off-grid-solar-calculator/',
  '/products/',
  '/products/solar-panels/',
  '/products/inverters/',
  '/products/batteries/',
  '/products/solar-systems/',
  '/products/charge-controllers/',
  '/brands/',
  '/contact/',
  '/about/',
  '/reviews/',
  '/installations/',
  '/blog/',
  '/solar-company-punjab/',
  '/solar-company-mohali/',
  '/solar-company-ludhiana/',
  '/solar-company-chandigarh/',
  ...C.sizing.sizePagesKw.map((kw) => `/${kw}kw-solar-system-price-punjab/`),
  ...guides.map((g) => `/${g.slug}/`),
  ...posts.map((p) => `/blog/${p.slug}/`),
];

const CHARTS = `
A. Units by system size, from the shared generation config:

import BarChart from '../../components/charts/BarChart.astro';
import { SOLAR_CONFIG } from '../../config/solar-config';
import { effectiveYieldPerKw } from '../../lib/calculator/sizing';

export const perKwMonth = effectiveYieldPerKw(SOLAR_CONFIG) / 12;
export const sizes = [1, 2, 3, 5, 10];
export const rows = sizes.map((kw) => ({ label: \`\${kw} kW\`, value: kw * perKwMonth, display: \`\${Math.round(kw * perKwMonth)} units\`, emphasis: kw === 3 }));
export const ticks = [0, 250, 500, 750, 1000].map((v) => ({ value: v, label: String(v) }));

<div class="not-prose my-8">
<BarChart title="Units a month by system size" rows={rows} max={1000} ticks={ticks} valueHeading="Units a month" caption="Our planning figure across the year." />
</div>

B. Installed price by size and system type, straight from the price models:

import PriceRangeChart from '../../components/charts/PriceRangeChart.astro';

<div class="not-prose my-8"><PriceRangeChart /></div>

C. Estimated use for different homes, from the new-house calculator:

import BarChart from '../../components/charts/BarChart.astro';
import { estimateFrom } from '../../lib/appliance/estimate';
import { approxUnits } from '../../lib/appliance/render';

export const cases = [
  { label: 'No AC', fields: { 'ac0-qty': '0' } },
  { label: 'One 1.5 ton AC', fields: { 'ac0-qty': '1' } },
  { label: 'Two 1.5 ton ACs', fields: { 'ac0-qty': '2' } },
];
export const rows = cases.map((c) => {
  const monthly = estimateFrom(new URLSearchParams(c.fields)).estimate.currentAnnual / 12;
  return { label: c.label, value: monthly, display: \`\${approxUnits(monthly)} units\`, emphasis: c.label === 'Two 1.5 ton ACs' };
});
export const ticks = [0, 200, 400, 600].map((v) => ({ value: v, label: String(v) }));

<div class="not-prose my-8">
<BarChart title="Units a month, by how many ACs a home runs" rows={rows} max={600} ticks={ticks} valueHeading="Units a month" caption="From our new-house calculator." />
</div>
`;


const SYSTEM = `You write for RSK Solar Energy, a UTL Solar distributor and rooftop solar installer in Mohali, Punjab. You are writing one blog post for their website, as a working installer would: plainly, concretely, and only about things you can support.

HARD RULES, a breach means the post is thrown away:
1. Never invent a number. Use only the figures given to you, or arithmetic on them. No prices, generation figures, percentages, dates, project counts or customer details from anywhere else.
2. The business is always "RSK Solar Energy" or "we"/"our". Never "RSK" on its own.
3. RSK Solar Energy gives no warranty or guarantee of its own. Product warranties are the manufacturer's, on their terms. Never promise a bill, a saving or a payback.
4. Link only to the paths in the ALLOWED LINKS list. No external links, no invented paths.
5. No em dashes or en dashes in the prose.
6. Do not explain how the subsidy, a loan, net metering or any government process works beyond the facts you are given. If a step is not in your facts, say it is covered in the linked guide instead of describing it.
7. Never turn an effect into a figure unless that figure is in your facts. Dust, shade, heat, panel age and a cloudy week all cut output, and we publish no number for any of them, so say what happens without quantifying it. Do not invent a percentage and then work out the units or the rupees it costs. A sentence like "a dirty array loses about 15 units a month" is exactly what gets a post thrown away.

WRITING RULES (these are how a person writes, and how the site's automated check judges you):
- No "not X but Y" contrasts unless the negative half corrects a belief a reader actually holds.
- No one-line closers that restate the paragraph before them, no dramatic fragments.
- No staged openers: "Here's the thing", "In short", "Let's dive in", "The bottom line".
- Do not use: additionally, crucial, delve, enhance, foster, garner, landscape, meticulous, pivotal, seamless, showcase, testament, underscore, vibrant, comprehensive, hassle-free, peace of mind, one-stop, cutting-edge, state-of-the-art, empower, journey, game-changer, "plays a key role", "serves as", "stands as", "boasts".
- Vary sentence length. Short sentences are good. Use "is", "are" and "has" rather than longer phrases.
- Write for a homeowner or business owner in Punjab who is deciding whether to spend money.

FORMAT: output ONLY the .mdx file, starting with the frontmatter fence. No preamble, no code fence around the whole thing, no commentary after.`;

const report = existsSync('seo-report.md') ? readFileSync('seo-report.md', 'utf8').slice(0, 4000) : '';
// Anything queued in files/TOPICS.md is written first, in order, before the search report is used.
const backlogFile = 'files/TOPICS.md';
const backlog = existsSync(backlogFile)
  ? readFileSync(backlogFile, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.match(/^\s*[-*]\s+(?!~~)(.+?)\s*$/)?.[1])
      .filter(Boolean)
  : [];
const topic = process.argv.slice(2).join(' ') || process.env.TOPIC || backlog[0] || '';
if (!process.argv[2] && !process.env.TOPIC && backlog[0]) console.log(`Topic from the backlog: ${backlog[0]}`);

const PROMPT = `${topic ? `TOPIC (use this): ${topic}` : 'Choose the topic yourself from the search report below. Pick the search with real demand that our existing posts do not already answer, and write the post that would satisfy it.'}

${report ? `SEARCH CONSOLE REPORT (last 28 days):\n${report}\n` : ''}
POSTS THAT ALREADY EXIST (do not repeat these; link to them where relevant):
${posts.map((p) => `- /blog/${p.slug}/ — ${p.title}`).join('\n')}

GUIDES THAT ALREADY EXIST:
${guides.map((g) => `- /${g.slug}/ — ${g.title}`).join('\n')}

FIGURES YOU MAY USE. These are the only ones, and the checks that follow use this same list, so wording that drifts from it is treated as invention:${FACTS_TEXT}

CHART SNIPPETS: include exactly one chart. Copy one of these blocks as it is, changing only the title, caption and emphasis row. Put the imports directly under the frontmatter.
${CHARTS}

ALLOWED LINKS. Link to at least four of these from the body text, written as markdown links inside sentences, for example [the calculator](/solar-calculator/). The three related entries in the frontmatter are on top of that.
${LINKS.join('\n')}

REQUIRED FRONTMATTER (exactly these fields, in this order). It is parsed as YAML and a post whose frontmatter will not parse is thrown away, so: put every title, description, question, answer, label and message in single quotes, keep each one on a single line, and never leave a colon inside an unquoted value. Write an apostrophe inside single quotes by doubling it.
REQUIRED FRONTMATTER (exactly these fields, in this order):
---
title: 'Sentence case, 70 characters or fewer, no brand name'
description: 'One sentence, 150 characters or fewer, says what the reader gets'
published: '${TODAY}'
category: 'one of: ${CATEGORIES.join(' | ')}'
tags: ['three', 'or', 'four']
faq:
  - q: A real question someone asks
    a: 'A direct answer, two or three sentences.'
  (three FAQ entries)
related:
  - href: /an-allowed-path/
    label: What it is
  (three entries)
cta:
  heading: A short question
  label: Ask ... on WhatsApp
  message: 'Hi RSK Solar Energy, ... '
---

BODY: 700 to 1000 words. Open with the answer in the first two sentences. Use "## " headings in sentence case. Include the chart with a caption that says where the figures come from. Use a short bullet list where it helps. End on something concrete, not a summary.`;

const { text, provider } = await generate({ system: SYSTEM, prompt: PROMPT, maxTokens: 8000 });

// ---- checks before the file is written ----
const body = text.trim().replace(/^```(?:mdx|markdown)?\n?/, '').replace(/\n?```$/, '');
const fail = (msg) => {
  console.error(`Draft rejected: ${msg}`);
  process.exit(1);
};

if (!body.startsWith('---')) fail('no frontmatter');
const fm = body.slice(3, body.indexOf('\n---', 3));
const field = (name) => (fm.match(new RegExp(`^${name}:\\s*'?"?(.*?)'?"?\\s*$`, 'm')) || [])[1] ?? '';

const title = field('title');
const description = field('description');
const category = field('category');
if (!title || title.length > 70) fail(`title is ${title.length} characters`);
if (!description || description.length > 160) fail(`description is ${description.length} characters`);
if (!CATEGORIES.includes(category)) fail(`category "${category}" is not one of ours`);
if (field('published') !== TODAY) fail('published date is not today');
if (/\bRSK\b(?! Solar Energy)/.test(body)) fail('writes "RSK" without "Solar Energy"');
if (/[—–]/.test(body.replace(/\d\s*[–—]\s*\d/g, ''))) fail('uses a dash as a connector');
if (/\b(warranty|guarantee)\b/i.test(body) && /\bwe (offer|give|provide)\b/i.test(body)) fail('implies an RSK Solar Energy warranty');

// Links can be markdown, HTML or a frontmatter `related` entry. All three have to point at a
// real page; at least three have to be in the body, where a reader will actually follow them.
const linksIn = (text) => [
  ...[...text.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]),
  ...[...text.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1]),
  ...[...text.matchAll(/^\s*-?\s*href:\s*(\/\S*)\s*$/gm)].map((m) => m[1]),
];
const bad = [...new Set(linksIn(body))].filter((u) => !LINKS.includes(u));
if (bad.length) fail(`links to pages that are not allowed: ${bad.join(', ')}`);
const inBody = new Set(linksIn(body.slice(body.indexOf('\n---', 3) + 4)));
if (inBody.size < 3) fail(`links to only ${inBody.size} of our pages in the body, needs three`);
if (!/<BarChart|<PriceRangeChart/.test(body)) fail('has no chart');

// Cut to 60 characters on a word boundary. Slicing mid-word leaves a slug ending "-how-to-te",
// which is what a visitor sees in the address bar and what the search result shows.
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 61)
  .replace(/-[^-]*$/, (tail) => (tail.length > 1 && title.length > 60 ? '' : tail))
  .replace(/-$/, '');
if (posts.some((p) => p.slug === slug)) fail(`a post with the slug ${slug} already exists`);

writeFileSync(`${BLOG}/${slug}.mdx`, `${body}\n`);
console.log(`Wrote ${BLOG}/${slug}.mdx (${provider})`);
console.log(`title: ${title}`);
console.log(`slug: ${slug}`);

// Values the workflow uses for the branch and pull request.
if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\ntitle=${title.replace(/"/g, "'")}\nprovider=${provider}\n`, { flag: 'a' });
}
