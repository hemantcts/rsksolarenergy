// Gives a held draft one chance to be corrected, rather than losing the slot over a phrasing slip.
//
// check-draft.mjs and review-draft.mjs both write what they objected to into draft-problems.txt.
// This hands the post and that list back to the model, asks for the whole file again with those
// things fixed and nothing else touched, and overwrites the draft. The workflow then runs both
// checks again, strictly: a second failure publishes nothing.
//
// It deliberately does not argue with the checks. A figure that cannot be verified comes out, it is
// not restated more carefully, because the checks are the thing that makes publishing without a
// human reading it defensible in the first place.
//
//   node scripts/revise-draft.mjs src/content/blog/some-post.mdx
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { generate } from './lib/ai.mjs';
import { FACTS_TEXT } from './lib/facts.mjs';

const PROBLEMS = 'draft-problems.txt';

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error('Usage: node scripts/revise-draft.mjs <path to .mdx>');
  process.exit(1);
}
if (!existsSync(PROBLEMS)) {
  console.error(`Nothing to fix: no ${PROBLEMS}. This runs only after a check has objected to something.`);
  process.exit(1);
}

const post = readFileSync(file, 'utf8');
const problems = readFileSync(PROBLEMS, 'utf8').trim();
if (!problems) {
  console.error(`${PROBLEMS} is empty, so there is nothing to fix.`);
  process.exit(1);
}

console.log(`Fixing ${file}. What the checks objected to:\n${problems}\n`);

const SYSTEM = `You are correcting one blog post for RSK Solar Energy, a rooftop solar installer in Mohali, Punjab. Automated checks refused to publish it and listed why. Fix exactly those things.

How to fix each kind of objection:
- A figure that is not ours: take the figure out. Do not replace it with a different number, do not hedge it with "around" or "roughly", and do not derive it from a percentage that is not in the FACTS. Say what happens without quantifying it, or use a figure from the FACTS instead.
- A claim we do not publish: delete the claim. Do not soften it.
- Wording that drifts from the FACTS: use the FACTS' own wording.
- A link that does not resolve: remove it, or point it at a page listed in the post already.
- Too few links, no chart, too short: add what is missing, in keeping with the rest of the post.
- Repetition: cut the weaker passage rather than rewriting both.

Rules that still apply: never invent a number; the business is "RSK Solar Energy" or "we", never "RSK" alone; no warranty or guarantee of ours; no promised saving or payback; no em dashes or en dashes; only links that are already in the post or in the FACTS.

Change nothing the checks did not object to. Keep the title, the slug's wording, the frontmatter fields, the headings, the chart and the voice as they are.

FORMAT: output ONLY the corrected .mdx file, starting with the frontmatter fence. No preamble, no code fence around the whole thing, no commentary after.`;

const PROMPT = `FACTS (the only figures and rules this business publishes):${FACTS_TEXT}

WHAT THE CHECKS OBJECTED TO:
${problems}

THE POST, TO RETURN CORRECTED IN FULL:
---8<---
${post}
---8<---

Output the corrected file only.`;

const { text, provider } = await generate({ system: SYSTEM, prompt: PROMPT, maxTokens: 8000 });

const revised = text.trim().replace(/^```(?:mdx|markdown)?\n?/, '').replace(/\n?```$/, '');

const fail = (why) => {
  console.error(`The correction was not usable: ${why}. Nothing is published.`);
  process.exit(1);
};

if (!revised.startsWith('---')) fail('it did not come back as an .mdx file');
const fmEnd = revised.indexOf('\n---', 3);
if (fmEnd === -1) fail('the frontmatter is not closed');
const title = (revised.slice(0, fmEnd).match(/^title:\s*'?"?(.*?)'?"?\s*$/m) || [])[1] ?? '';
if (!title) fail('it has no title');
if (title.length > 70) fail(`the title came back at ${title.length} characters`);
if (!/<BarChart|<PriceRangeChart/.test(revised)) fail('the chart is gone');
// A correction that removes half the post is not a correction.
const before = post.split(/\s+/).length;
const after = revised.split(/\s+/).length;
if (after < before * 0.6) fail(`it cut the post from about ${before} words to ${after}`);

writeFileSync(file, `${revised}\n`);
// The list is spent. Leaving it would let a later run read stale objections.
unlinkSync(PROBLEMS);
console.log(`Rewritten by ${provider}: about ${before} words in, ${after} out. Both checks now run again, strictly.`);
