// Domain Authority for the weekly report.
//
// DA is Moz's own score, so the real figure needs a Moz token. Open PageRank is free and gives a
// 0 to 10 score built from the same idea; where only that key is set the report says which score it
// is showing, because the two numbers are not interchangeable.
//
// Keys, either or both, as GitHub secrets:
//   MOZ_TOKEN           Moz API v3 token (moz.com/api, Free tier). Gives Domain Authority, Page
//                       Authority, linking root domains and Spam Score.
//   OPENPAGERANK_KEY    free key from domcop.com/openpagerank. Gives a 0 to 10 score and a rank.
//
// The last few readings live in files/authority.json, so the report can show movement rather than a
// bare number.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DOMAIN = 'rsksolarenergy.com';
const HISTORY = 'files/authority.json';
/** Enough readings to see a year of movement without the file growing forever. */
const KEEP = 52;

async function fromMoz(token) {
  const res = await fetch('https://lsapi.seomoz.com/v2/url_metrics', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ targets: [DOMAIN] }),
  });
  if (!res.ok) throw new Error(`Moz said ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const row = (await res.json()).results?.[0];
  if (!row) throw new Error('Moz returned no row for the domain.');
  return {
    source: 'Moz',
    da: row.domain_authority,
    pa: row.page_authority,
    linkingDomains: row.root_domains_to_root_domain,
    spamScore: row.spam_score,
  };
}

async function fromOpenPageRank(key) {
  const res = await fetch(`https://openpagerank.com/api/v1.0/getPageRank?domains%5B%5D=${DOMAIN}`, {
    headers: { 'API-OPR': key },
  });
  if (!res.ok) throw new Error(`Open PageRank said ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  const row = body.response?.[0];
  if (!row) throw new Error(`Open PageRank sent back nothing usable: ${JSON.stringify(body).slice(0, 200)}`);
  if (row.status_code !== 200) throw new Error(`Open PageRank has no entry for ${DOMAIN} (it answered ${row.status_code}${row.error ? `, "${row.error}"` : ''}).`);
  // A domain in the index but with no links yet scores 0, which is a real reading, not a failure.
  const score = Number(row.page_rank_decimal);
  if (!Number.isFinite(score)) throw new Error(`Open PageRank gave no score for ${DOMAIN}.`);
  return { source: 'Open PageRank', da: score, scale: 10, rank: Number(row.rank) || null };
}

function history() {
  if (!existsSync(HISTORY)) return [];
  try {
    const parsed = JSON.parse(readFileSync(HISTORY, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Reads whichever provider has a key, records it, and returns the section for the report. */
export async function authoritySection() {
  const moz = process.env.MOZ_TOKEN;
  const opr = process.env.OPENPAGERANK_KEY;
  let reading;
  const trouble = [];

  for (const [key, fn] of [[moz, fromMoz], [opr, fromOpenPageRank]]) {
    if (!key || reading) continue;
    try {
      reading = await fn(key);
    } catch (err) {
      trouble.push(err.message);
    }
  }

  if (!reading) {
    const why = trouble.length ? `\n\nWhat went wrong: ${trouble.join(' ')}` : '';
    return `## Authority

No authority score this week. Add **MOZ_TOKEN** (moz.com/api, free tier, real Domain Authority) or
**OPENPAGERANK_KEY** (domcop.com/openpagerank, free, a 0 to 10 stand-in) as a repository secret and
it appears here from the next report on.${why}`;
  }

  const past = history();
  const previous = past.at(-1);
  const scale = reading.scale === 10 ? ' out of 10' : ' out of 100';
  const moved = previous && typeof previous.da === 'number' ? reading.da - previous.da : null;
  const movement =
    moved === null
      ? 'first reading, so there is nothing to compare it with yet'
      : moved === 0
        ? `unchanged since ${previous.date}`
        : `${moved > 0 ? 'up' : 'down'} ${Math.abs(Number(moved.toFixed(1)))} since ${previous.date}`;

  const entry = { date: new Date().toISOString().slice(0, 10), ...reading };
  writeFileSync(HISTORY, `${JSON.stringify([...past, entry].slice(-KEEP), null, 2)}\n`);

  const extra = [];
  if (reading.pa != null) extra.push(`Page Authority of the homepage ${reading.pa}`);
  if (reading.linkingDomains != null) extra.push(`${reading.linkingDomains} domains linking in`);
  if (reading.spamScore != null) extra.push(`Spam Score ${reading.spamScore}%`);
  if (reading.rank) extra.push(`ranked ${reading.rank.toLocaleString('en-IN')} among all domains`);

  const note =
    reading.source === 'Moz'
      ? 'Domain Authority is a prediction of how well a site can rank, not a Google figure. It moves slowly, and a point or two either way is noise.'
      : 'This is Open PageRank, not Moz Domain Authority: a 0 to 10 score from the same idea. Add MOZ_TOKEN for the Moz figure.';

  return `## Authority

**${reading.da}${scale}** from ${reading.source}, ${movement}.${extra.length ? `\n\n${extra.join('. ')}.` : ''}

_${note}_`;
}
