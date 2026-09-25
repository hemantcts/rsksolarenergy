// Writing check: flags the patterns that make copy read as AI-written, from the humanizer rules
// (Wikipedia's "Signs of AI writing"). Runs over the built pages, so it covers MDX, Astro pages and
// anything a generated draft adds.
//
// Contrasts ("not X but Y", "rather than") are legitimate when the negative half corrects a belief
// the reader holds, so those are warnings. The rest fail the build: stock AI words, staged openers,
// dramatic fragments, "serves as" in place of "is", and dashes used as connectors.
//
// Pages exempt: product pages (UTL's own catalogue text), reviews (customers' words) and the legal
// pages (wording is deliberate). Allowed phrases live in ALLOW below, each with a reason.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const EXEMPT = /^\/products\/[^/]+\/$|^\/reviews\/$|^\/privacy-policy\/$|^\/terms-and-conditions\/$|^\/refund-and-cancellation-policy\/$/;

/** [name, pattern, fails the build] */
const PATTERNS = [
  ['stock AI words', /\b(additionally|crucial|delve|enhanc\w+|foster\w*|garner|landscape|meticulous\w*|pivotal|seamless\w*|showcas\w+|testament|underscor\w+|vibrant|hassle[- ]free|peace of mind|one[- ]stop|cutting[- ]edge|state[- ]of[- ]the[- ]art|empower\w*|in today[’']s|game[- ]changer|plays? a (key|crucial|vital) role)\b/i, true],
  ['staged opener', /(^|\. )(Here[’']s (the thing|what|how|why)|Let[’']s (dive|look|break)|The (short|simple) answer|The bottom line|In short|Put simply|Simply put|The truth is|Bottom line)\b/, true],
  ['dramatic fragment', /(^|\. )(No [a-z]+\. No [a-z]+|That[’']s it\.|Simple\.|Easy\.|Read that again\.)/, true],
  ['"serves as" for "is"', /\b(serves as|stands as|acts as a|boasts)\b/i, true],
  ['dash as connector', /\s[—–]\s|\w—\w/, true],
  ['not X but Y', /\b(not (just|only|merely)\b[^.]{0,80}\bbut\b|isn[’']t (just|about)|it[’']s not [^.]{0,40}[,;] it[’']s)/i, false],
  ['rather than', /\brather than\b/i, false],
];

/** Phrases that look like a tell but are correct here. */
const ALLOW = [
  [/Mon–Sat/, 'opening hours in the header and footer'],
  [/[–—]\s*\d/, 'model codes and ranges inside UTL product names, e.g. "For Inverter – 360V-100AH"'],
  [/load[- ]enhancement/i, "PSPCL's own term for raising a sanctioned load"],
];

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name === 'index.html') files.push(p);
  }
})(DIST);

const found = new Map();
for (const file of files) {
  const page = '/' + relative(DIST, file).split(sep).join('/').replace(/index\.html$/, '');
  if (EXEMPT.test(page)) continue;
  const html = readFileSync(file, 'utf8')
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<select[\s\S]*?<\/select>/g, ' ')
    .replace(/<header class="site-header"[\s\S]*?<\/header>/, '')
    .replace(/<footer[\s\S]*?<\/footer>/, '');
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

  for (const sentence of text.split(/(?<=[.?!])\s+/)) {
    if (ALLOW.some(([re]) => re.test(sentence))) continue;
    for (const [name, re, fails] of PATTERNS) {
      if (!re.test(sentence)) continue;
      const key = `${name}\u0000${sentence.trim().slice(0, 150)}`;
      if (!found.has(key)) found.set(key, { name, fails, sentence: sentence.trim().slice(0, 150), pages: [] });
      found.get(key).pages.push(page);
    }
  }
}

const hits = [...found.values()];
const errors = hits.filter((h) => h.fails);
const warnings = hits.filter((h) => !h.fails);

const show = (list) =>
  list.map((h) => `  [${h.name}] ${h.pages[0]}${h.pages.length > 1 ? ` (+${h.pages.length - 1} more)` : ''}\n    “${h.sentence}”`).join('\n');

if (warnings.length) console.log(`\n${warnings.length} contrast(s) to check by hand:\n${show(warnings)}`);

if (errors.length) {
  console.error(`\n❌ ${errors.length} AI writing pattern(s). Rewrite these before publishing:\n${show(errors)}`);
  process.exitCode = 1;
} else {
  console.log(`\n✅ No AI writing patterns in ${files.length} pages.`);
}
