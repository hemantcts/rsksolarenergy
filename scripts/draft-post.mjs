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
import { failingTells } from './lib/tells.mjs';
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
export const ticks = [0, 500, 1000, 1500].map((v) => ({ value: v, label: String(v) }));

<div class="not-prose my-8">
<BarChart title="Units a month by system size" rows={rows} max={1500} ticks={ticks} valueHeading="Units a month" caption="Our planning figure across the year." />
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

// ---- tidied before the checks, because neither is worth a whole correction pass ----
/**
 * Models reach for a non-breaking hyphen in "clear-day" and for American spelling. Neither breaks a
 * rule, so nothing would reject the post, and both read as foreign next to the rest of the site.
 * Fixed here rather than argued about with the model.
 */
const tidy = (draft) =>
  [
    [/[‐‑‒]/g, '-'],
    [/\baluminum\b/g, 'aluminium'],
    [/\bmicrofiber\b/g, 'microfibre'],
    [/\bfiberglass\b/g, 'fibreglass'],
    [/\bcolor(s|ed|ing)?\b/g, (m) => m.replace('color', 'colour')],
    [/\bcenter(s|ed|ing)?\b/g, (m) => m.replace('center', 'centre')],
    [/\bliter(s)?\b/g, (m) => m.replace('liter', 'litre')],
    [/\b(analy|organi|recogni|prioriti|summari)z(e|es|ed|ing|ation)\b/g, (m) => m.replace('z', 's')],
  ].reduce((out, [pattern, to]) => out.replace(pattern, to), draft);

const frontmatter = (draft) => draft.slice(3, draft.indexOf('\n---', 3));
const field = (draft, name) => (frontmatter(draft).match(new RegExp(`^${name}:\\s*'?"?(.*?)'?"?\\s*$`, 'm')) || [])[1] ?? '';

// Cut to 60 characters on a word boundary. Slicing mid-word leaves a slug ending "-how-to-te",
// which is what a visitor sees in the address bar and what the search result shows.
const slugFor = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 61)
    .replace(/-[^-]*$/, (tail) => (tail.length > 1 && title.length > 60 ? '' : tail))
    .replace(/-$/, '')
    // A slug ending "-how-often-and" reads as though it was cut off, because it was.
    .replace(/-(and|or|the|a|an|to|in|of|for|with|on|at|is|it|how|what|why)$/, '');

// Links can be markdown, HTML or a frontmatter `related` entry. All three have to point at a
// real page; at least three have to be in the body, where a reader will actually follow them.
const linksIn = (text) => [
  ...[...text.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]),
  ...[...text.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1]),
  ...[...text.matchAll(/^\s*-?\s*href:\s*(\/\S*)\s*$/gm)].map((m) => m[1]),
];

/** The draft's readable prose, for the writing check: no frontmatter, imports, JSX or link targets. */
const prose = (draft) =>
  draft
    .slice(draft.indexOf('\n---', 3) + 4)
    .replace(/^(import|export) .*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/[#*_`[\]]/g, ' ');

/**
 * The first rule a draft breaks, or null. The model is told the reason and writes the post again,
 * so a fixable slip (a stray phrase, one sentence that sounds like our own warranty) costs a retry
 * instead of the whole post. A draft that still breaks a rule after the last attempt is thrown away.
 */
function problem(draft) {
  if (!draft.startsWith('---')) return 'had no frontmatter';
  const title = field(draft, 'title');
  const description = field(draft, 'description');
  const category = field(draft, 'category');
  if (!title || title.length > 70) return `had a title of ${title.length} characters (70 at most)`;
  if (!description || description.length > 160) return `had a description of ${description.length} characters (160 at most)`;
  if (!CATEGORIES.includes(category)) return `used the category "${category}", which is not one of ours`;
  if (field(draft, 'published') !== TODAY) return `did not have today's date, ${TODAY}, as published`;
  if (/\bRSK\b(?! Solar Energy)/.test(draft)) return 'wrote "RSK" without "Solar Energy"';
  if (/[—–]/.test(draft.replace(/\d\s*[–—]\s*\d/g, ''))) return 'used a dash as a connector';
  // Sentence by sentence, so "UTL gives a 10-year warranty" in one place and "we provide the
  // structure" in another is fine, while "we provide a warranty" or "our guarantee" is not.
  const promise = draft
    .replace(/\s+/g, ' ')
    .split(/(?<=[.?!'])\s+/)
    .find(
      (s) =>
        /\bwe guarantee\b|\bguaranteed by us\b/i.test(s) ||
        /\bwe (offer|give|provide|include|extend)\s+(\S+\s+){0,4}(warrant(y|ies)|guarantees?)\b/i.test(s) ||
        /\bour (own\s+)?(\S+\s+)?(warranty|warranties|guarantee)\b/i.test(s) ||
        /\bRSK Solar Energy['’]s (\S+\s+)?(warranty|guarantee)\b/i.test(s),
    );
  if (promise) return `implied that RSK Solar Energy gives a warranty or guarantee, in this sentence: "${promise.trim().slice(0, 160)}". Only manufacturers' warranties exist; say whose they are`;
  const bad = [...new Set(linksIn(draft))].filter((u) => !LINKS.includes(u));
  if (bad.length) return `linked to pages that are not in the allowed list: ${bad.join(', ')}`;
  const inBody = new Set(linksIn(draft.slice(draft.indexOf('\n---', 3) + 4)));
  if (inBody.size < 3) return `linked to only ${inBody.size} of our pages in the body (three at least)`;
  if (!/<BarChart|<PriceRangeChart/.test(draft)) return 'had no chart';
  const tells = failingTells(prose(draft));
  if (tells.length) return `failed the writing check (${tells[0].name}) in this sentence: "${tells[0].sentence}"`;
  if (posts.some((p) => p.slug === slugFor(title))) return `has the same title as an existing post; choose a different title`;
  return null;
}

const ATTEMPTS = 3;
let body = '';
let provider = '';
let why = null;
let prompt = PROMPT;
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  const out = await generate({ system: SYSTEM, prompt, maxTokens: 8000 });
  provider = out.provider;
  body = tidy(out.text.trim().replace(/^```(?:mdx|markdown)?\n?/, '').replace(/\n?```$/, ''));
  why = problem(body);
  if (!why) break;
  console.log(`Attempt ${attempt} of ${ATTEMPTS} rejected: it ${why}.`);
  prompt = `${PROMPT}\n\nYOUR PREVIOUS DRAFT WAS REJECTED because it ${why}. Write the whole post again, following every rule above, and fix that. Your previous draft, for reference:\n\n${body}`;
}
if (why) {
  console.error(`Draft rejected after ${ATTEMPTS} attempts: it ${why}.`);
  process.exit(1);
}

const title = field(body, 'title');
const slug = slugFor(title);

writeFileSync(`${BLOG}/${slug}.mdx`, `${body}\n`);
console.log(`Wrote ${BLOG}/${slug}.mdx (${provider})`);
console.log(`title: ${title}`);
console.log(`slug: ${slug}`);

// Values the workflow uses for the branch and pull request.
if (process.env.GITHUB_OUTPUT) {
  // `topic` is echoed back so the workflow can strike it off files/TOPICS.md once the post is
  // actually published. Striking it here would lose the topic whenever a later check refuses the
  // draft, and leaving it would make the next run write the same post and fail on the duplicate slug.
  const fromBacklog = !process.argv[2] && !process.env.TOPIC && backlog[0] === topic ? topic : '';
  writeFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\ntitle=${title.replace(/"/g, "'")}\nprovider=${provider}\ntopic=${fromBacklog}\n`, { flag: 'a' });
}
