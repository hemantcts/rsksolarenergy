// Crosses a topic off files/TOPICS.md once its post is live.
//
// It runs from the publishing workflow after every check has passed, not when the draft is written.
// Striking it earlier would throw the topic away whenever a check refused the draft; not striking it
// at all would make the next run write the same post and fail on the duplicate slug.
//
//   node scripts/strike-topic.mjs "Solar panel cleaning in the smoke season: how often"
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const FILE = 'files/TOPICS.md';
const topic = process.argv.slice(2).join(' ').trim();

if (!topic) {
  console.log('No backlog topic to cross off: this post came from the search report or a typed topic.');
  process.exit(0);
}
if (!existsSync(FILE)) {
  console.log(`${FILE} is not there, so there is nothing to cross off.`);
  process.exit(0);
}

const before = readFileSync(FILE, 'utf8');
const lines = before.split(/\r?\n/);
let struck = false;

const after = lines
  .map((line) => {
    if (struck) return line;
    const match = line.match(/^(\s*[-*]\s+)(?!~~)(.+?)\s*$/);
    if (!match || match[2] !== topic) return line;
    struck = true;
    return `${match[1]}~~${match[2]}~~`;
  })
  .join('\n');

if (!struck) {
  // Not a failure: the topic may have been edited or removed by hand while the run was going.
  console.log(`Could not find "${topic}" in ${FILE} to cross off. Leaving the file alone.`);
  process.exit(0);
}

writeFileSync(FILE, after);
console.log(`Crossed off: ${topic}`);
