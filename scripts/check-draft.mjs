// Checks a blog post before it goes live. Deterministic: no model involved, same answer every time.
//
// It refuses a post that prints a figure we cannot account for, claims something about a process we
// have not published, links somewhere that does not exist, or breaks the house rules on the brand
// name and warranties. Run on its own or from the publishing pipeline:
//
//   node scripts/check-draft.mjs src/content/blog/some-post.mdx
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { allowedNumber } from './lib/facts.mjs';

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error('Usage: node scripts/check-draft.mjs <path to .mdx>');
  process.exit(1);
}

const text = readFileSync(file, 'utf8');
const problems = [];
const flag = (what) => problems.push(what);

const fmEnd = text.indexOf('\n---', 3);
const frontmatter = text.slice(0, fmEnd);
const body = text.slice(fmEnd + 4);
// Code and imports carry figures of their own; only prose is checked for claims.
const prose = body
  .replace(/^import .*$/gm, '')
  .replace(/^export const [\s\S]*?;$/gm, '')
  .replace(/<[^>]+>/g, ' ');

// ---- claims we will not publish without a page of our own to point at ----
const FORBIDDEN = [
  [/credited to the (empanelled )?lender|paid to the (bank|lender) on your behalf|subsidy (is )?(deducted|adjusted) (from|against) the (invoice|price)/i, 'says the subsidy goes somewhere other than the owner’s bank account'],
  [/\b(interest rate|rate of interest|EMI of|processing fee)\b/i, 'quotes loan terms, which we do not publish'],
  [/\b(guaranteed?|assured) (savings|returns|payback|generation)\b/i, 'promises a return'],
  [/\bwe (are|is) (an? )?(authoris|authoriz|certifi|approved)/i, 'claims an authorisation we do not publish'],
  [/\bISO\b|\bMNRE (approved|certified)\b|\bgovernment[- ]approved\b/i, 'claims a certification'],
  [/\bfree (installation|site visit|of cost)\b/i, 'promises something free that we have not agreed'],
  [/\bwithin \d+ (working )?(days|weeks)\b/i, 'commits to a timescale we do not publish'],
  [/\b(best|cheapest|number one|#1|leading|top) (solar|installer|company|dealer)\b/i, 'makes a superlative claim'],
  [/\b(lakhs? of|thousands of|hundreds of) (customers|homes|installations)\b/i, 'inflates our install numbers'],
  [/\bRSK\b(?! Solar Energy)/, 'writes "RSK" without "Solar Energy"'],
];
for (const [re, why] of FORBIDDEN) {
  const hit = prose.match(re);
  if (hit) flag(`${why}: “${prose.slice(Math.max(0, prose.indexOf(hit[0]) - 60), prose.indexOf(hit[0]) + 80).trim()}”`);
}

// A warranty may only be described as the manufacturer's.
for (const sentence of prose.split(/(?<=[.?!])\s+/)) {
  if (/\b(warranty|guarantee)\b/i.test(sentence) && /\b(we|our|RSK Solar Energy)\b/i.test(sentence) && !/manufacturer|UTL|brand|its own|not add|no warranty/i.test(sentence)) {
    flag(`suggests a warranty of ours: “${sentence.trim().slice(0, 120)}”`);
  }
}

// ---- every figure has to be one of ours ----
const NUMBER_IN_CONTEXT = /₹\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(units|kWh|kW|kVA|kWp|sq ft|square feet|%|per cent|days|years|months)/gi;
const KIND = { units: 'units', kwh: 'units', kw: 'kw', kva: 'kw', kwp: 'kw', '%': 'percent', 'per cent': 'percent', days: 'days', years: 'years', months: 'days', 'sq ft': 'area', 'square feet': 'area', rupees: 'money' };
const unverified = new Set();
for (const m of prose.matchAll(NUMBER_IN_CONTEXT)) {
  const raw = (m[1] ?? m[2] ?? '').replace(/,/g, '');
  const value = Number(raw);
  const unit = (m[3] ?? 'rupees').toLowerCase();
  if (!Number.isFinite(value)) continue;
  const kind = KIND[unit] ?? 'other';
  if (kind === 'days' && value <= 60) continue; // ordinary durations
  if (!allowedNumber(value, kind)) unverified.add(`${m[0].trim()}`);
}
if (unverified.size) flag(`prints figures that are not ours and not arithmetic on ours: ${[...unverified].join(', ')}`);

// ---- links ----
const links = [...text.matchAll(/\]\((\/[^)\s]*)\)/g), ...text.matchAll(/^\s*-?\s*href:\s*(\/\S*)\s*$/gm)].map((m) => m[1]);
const pages = new Set([
  '/',
  ...readdirSync('src/content/blog').filter((f) => f.endsWith('.mdx')).map((f) => `/blog/${f.replace(/\.mdx$/, '')}/`),
  ...readdirSync('src/content/guides').filter((f) => f.endsWith('.mdx')).map((f) => `/${f.replace(/\.mdx$/, '')}/`),
]);
const unknown = links.filter((l) => !pages.has(l) && !/^\/(products|solar-company-|search|brands|contact|about|reviews|installations|blog|careers|make-a-payment|privacy|terms|refund|why-choose|awards|\d+kw-|solar-calculator|new-house-solar-calculator|hybrid-solar-calculator|off-grid-solar-calculator)/.test(l));
if (unknown.length) flag(`links to pages that may not exist: ${[...new Set(unknown)].join(', ')}`);
if (new Set(links).size < 3) flag('links to fewer than three of our pages');

// ---- shape ----
if (!/^title:/m.test(frontmatter)) flag('no title');
if (!/<BarChart|<PriceRangeChart/.test(body)) flag('no chart');
const words = prose.split(/\s+/).filter(Boolean).length;
if (words < 500) flag(`only ${words} words`);

if (problems.length) {
  console.error(`\n❌ ${file} is not publishable:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`✅ ${file}: ${words} words, every figure accounted for, ${new Set(links).size} internal links.`);
