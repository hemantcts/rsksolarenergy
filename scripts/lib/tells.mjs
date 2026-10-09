// The AI-writing patterns, shared by the site-wide check (scripts/check-tells.mjs) and the blog
// writer (scripts/draft-post.mjs), which tests its own draft against them before publishing.

/** [name, pattern, fails the build] */
export const PATTERNS = [
  ['stock AI words', /\b(additionally|crucial|delve|enhanc\w+|foster\w*|garner|landscape|meticulous\w*|pivotal|seamless\w*|showcas\w+|testament|underscor\w+|vibrant|hassle[- ]free|peace of mind|one[- ]stop|cutting[- ]edge|state[- ]of[- ]the[- ]art|empower\w*|in today[’']s|game[- ]changer|plays? a (key|crucial|vital) role)\b/i, true],
  ['staged opener', /(^|\. )(Here[’']s (the thing|what|how|why)|Let[’']s (dive|look|break)|The (short|simple) answer|The bottom line|In short|Put simply|Simply put|The truth is|Bottom line)\b/, true],
  ['dramatic fragment', /(^|\. )(No [a-z]+\. No [a-z]+|That[’']s it\.|Simple\.|Easy\.|Read that again\.)/, true],
  ['"serves as" for "is"', /\b(serves as|stands as|acts as a|boasts)\b/i, true],
  ['dash as connector', /\s[—–]\s|\w—\w/, true],
  ['not X but Y', /\b(not (just|only|merely)\b[^.]{0,80}\bbut\b|isn[’']t (just|about)|it[’']s not [^.]{0,40}[,;] it[’']s)/i, false],
  ['rather than', /\brather than\b/i, false],
];

/** Phrases that look like a tell but are correct here. */
export const ALLOW = [
  [/Mon–Sat/, 'opening hours in the header and footer'],
  [/[–—]\s*\d/, 'model codes and ranges inside UTL product names, e.g. "For Inverter – 360V-100AH"'],
  [/load[- ]enhancement/i, "PSPCL's own term for raising a sanctioned load"],
];

/** Patterns that fail the build, found in a piece of plain text: [{ name, sentence }]. */
export function failingTells(text) {
  const out = [];
  for (const sentence of text.replace(/\s+/g, ' ').split(/(?<=[.?!])\s+/)) {
    if (ALLOW.some(([re]) => re.test(sentence))) continue;
    for (const [name, re, fails] of PATTERNS) if (fails && re.test(sentence)) out.push({ name, sentence: sentence.trim().slice(0, 150) });
  }
  return out;
}
