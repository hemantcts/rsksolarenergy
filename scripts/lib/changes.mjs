// What changed on the site since the last report.
//
// Nothing waits for approval any more (RSK Solar Energy's instruction, 26 September 2026), so this is
// the record: every change that reached the live site in the last week, in the weekly email, without
// adding a second email to anybody's day.
//
// It needs the repository's history, so the workflow checking out for the report has to use
// fetch-depth: 0. With a shallow checkout there is nothing to read and the section says so rather
// than pretending nothing happened.
import { execFileSync } from 'node:child_process';

const DAYS = 7;

/** Commits that are bookkeeping rather than a change to the site. */
const NOISE = [/^Authority score for this week$/i, /^Merge (branch|pull request|remote)/i];

// Arguments go as an array, so git receives them directly and no shell parses them.
const git = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

/** True when the checkout is shallow, in which case the log is not there to read. */
const shallow = () => git('rev-parse', '--is-shallow-repository') === 'true';

export function changesSection(days = DAYS) {
  if (shallow()) {
    return `## What changed on the site

The history was not available in this run, so this week's changes could not be listed. The workflow
needs \`fetch-depth: 0\` on its checkout step.`;
  }

  // %x1f between fields and %x1e between records, so a subject containing punctuation cannot split a
  // row by accident.
  const since = `--since=${Number(days) || DAYS}.days`;
  const raw = git('log', since, '--no-merges', '--date=short', '--pretty=format:%ad%x1f%s%x1f%an%x1e');
  const rows = raw
    .split('\u001e')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const [date, subject, author] = r.split('\u001f');
      return { date, subject, author };
    })
    .filter((r) => r.subject && !NOISE.some((n) => n.test(r.subject)));

  if (!rows.length) {
    return `## What changed on the site

Nothing changed this week.`;
  }

  const posts = rows.filter((r) => r.author === 'rsk-content-bot');
  const rest = rows.filter((r) => r.author !== 'rsk-content-bot');
  const lines = [...rest, ...posts].map((r) => `| ${r.date} | ${r.subject.replace(/\|/g, '\\|')} |`);

  return `## What changed on the site

${rows.length} change${rows.length === 1 ? '' : 's'} went live in the last ${days} days. Nothing here
waited for approval, which is how RSK Solar Energy asked for it to work. Anything that looks wrong can
be undone in one commit; say which line and it goes.

| When | What |
|---|---|
${lines.join('\n')}`;
}
