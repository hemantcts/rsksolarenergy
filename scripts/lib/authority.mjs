// The authority score in the weekly report.
//
// Two sources, either of which will do:
//
//   OPENPAGERANK_KEY   free, 30,000 domains a month, from the Dashboard at
//                      openpagerank.keywordseverywhere.com. A 0 to 10 score computed from Common
//                      Crawl's open link graph, with monthly history back to 2018 and a count of
//                      linking domains. Keys look like opr_live_...
//   MOZ_TOKEN          moz.com/api, free tier. Moz's own Domain Authority out of 100, plus Page
//                      Authority, linking root domains and Spam Score.
//
// Moz wins where both are set, because "DA" means Moz's number and nothing else. Neither key set
// means the report still goes out, with a line saying which secret to add.
//
// Open PageRank moved from domcop.com to keywordseverywhere.com and was rebuilt: it is now a POST
// with a bearer token, where it used to be a GET with an API-OPR header. An old domcop key returns
// 401 against it, so that case says so rather than leaving a blank section.
//
// Readings are kept in files/authority.json. Open PageRank carries its own history, so the file is
// the record rather than the source of the trend; for Moz, which returns only today's figure, the
// file is the only way to say whether anything moved.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DOMAIN = 'rsksolarenergy.com';
const HISTORY = 'files/authority.json';
const OPR_API = 'https://openpagerank.keywordseverywhere.com/v1/domains/bulk';
/** Enough readings to see a couple of years without the file growing forever. */
const KEEP = 104;

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
    scale: 100,
    score: row.domain_authority,
    pageAuthority: row.page_authority,
    linkingDomains: row.root_domains_to_root_domain,
    spamScore: row.spam_score,
  };
}

async function fromOpenPageRank(key) {
  const res = await fetch(OPR_API, {
    method: 'POST',
    headers: { authorization: `Bearer ${key.trim()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ domains: [DOMAIN], include_history: true }),
  });

  if (res.status === 401) {
    const old = !key.trim().startsWith('opr_')
      ? ' This key does not start "opr_", so it is probably an old domcop.com key. Open PageRank moved to openpagerank.keywordseverywhere.com and needs a new key from its Dashboard, created by signing in with a Keywords Everywhere key.'
      : '';
    throw new Error(`Open PageRank refused the key.${old}`);
  }
  if (!res.ok) throw new Error(`Open PageRank said ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const body = await res.json();
  const row = body.results?.[0];
  if (!row) throw new Error(`Open PageRank sent nothing usable back: ${JSON.stringify(body).slice(0, 200)}`);
  if (row.found === false || row.open_page_rank === null) {
    throw new Error(`Open PageRank has not scored ${DOMAIN} yet. That happens to a domain with almost no links pointing at it, and it fixes itself as links appear.`);
  }

  return {
    source: 'Open PageRank',
    scale: 10,
    score: row.open_page_rank,
    rank: row.rank ?? null,
    linkingDomains: row.referring_domains ?? null,
    asOf: body.as_of ?? null,
    // Oldest first, measured months and interpolated ones alike.
    series: Array.isArray(row.history) ? row.history : [],
  };
}

function pastReadings() {
  if (!existsSync(HISTORY)) return [];
  try {
    const parsed = JSON.parse(readFileSync(HISTORY, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** The entry in a monthly series closest to `months` before the last one, if the series reaches back that far. */
function monthsBack(series, months) {
  if (series.length < 2) return null;
  const latest = new Date(series.at(-1).date);
  const target = new Date(latest);
  target.setMonth(target.getMonth() - months);
  // Anything within six weeks of the target month is close enough to describe in words.
  const tolerance = 46 * 86400000;
  let best = null;
  for (const point of series) {
    const gap = Math.abs(new Date(point.date) - target);
    if (gap <= tolerance && (!best || gap < best.gap)) best = { gap, point };
  }
  return best?.point ?? null;
}

const round = (n) => Number(Number(n).toFixed(2));

/** "up 0.4 since September last year", or an explanation of why there is nothing to compare with. */
function movement(reading, previous) {
  const year = monthsBack(reading.series ?? [], 12);
  if (year && Number.isFinite(year.open_page_rank)) {
    const moved = round(reading.score - year.open_page_rank);
    const when = new Date(year.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (moved === 0) return `unchanged since ${when}`;
    return `${moved > 0 ? 'up' : 'down'} ${Math.abs(moved)} since ${when}`;
  }
  if (previous && Number.isFinite(previous.score)) {
    const moved = round(reading.score - previous.score);
    if (moved === 0) return `unchanged since ${previous.date}`;
    return `${moved > 0 ? 'up' : 'down'} ${Math.abs(moved)} since ${previous.date}`;
  }
  return 'first reading, so there is nothing to compare it with yet';
}

const NOTE = {
  Moz: 'Domain Authority is Moz predicting how well a site can rank, not a figure from Google. It moves slowly, and a point either way is noise.',
  'Open PageRank':
    'This is Open PageRank, not Moz Domain Authority: a 0 to 10 score computed from Common Crawl’s open link graph, with domains that manufacture links through networks scored down. Add MOZ_TOKEN for the Moz figure as well.',
};

/** Reads whichever provider has a key, records it, and returns the section for the report. */
export async function authoritySection() {
  const keys = [
    [process.env.MOZ_TOKEN, fromMoz],
    [process.env.OPENPAGERANK_KEY, fromOpenPageRank],
  ];
  let reading;
  const trouble = [];

  for (const [key, read] of keys) {
    if (!key || reading) continue;
    try {
      reading = await read(key);
    } catch (err) {
      trouble.push(err.message);
    }
  }

  if (!reading) {
    const why = trouble.length ? `\n\nWhat went wrong: ${trouble.join(' ')}` : '';
    return `## Authority

No authority score this week. Add **OPENPAGERANK_KEY** (free, 30,000 domains a month, from the
Dashboard at openpagerank.keywordseverywhere.com) or **MOZ_TOKEN** (moz.com/api, free tier, Moz's own
Domain Authority) as a repository secret, and the score appears here from the next report on.${why}`;
  }

  const past = pastReadings();
  const moved = movement(reading, past.at(-1));

  // The series is the API's, not ours, so only the reading itself is kept.
  const { series, ...keep } = reading;
  const entry = { date: new Date().toISOString().slice(0, 10), ...keep };
  writeFileSync(HISTORY, `${JSON.stringify([...past, entry].slice(-KEEP), null, 2)}\n`);

  const aside = [];
  if (reading.linkingDomains != null) aside.push(`${reading.linkingDomains.toLocaleString('en-IN')} domains linking in`);
  if (reading.pageAuthority != null) aside.push(`Page Authority of the homepage ${reading.pageAuthority}`);
  if (reading.spamScore != null) aside.push(`Spam Score ${reading.spamScore}%`);
  if (reading.rank) aside.push(`ranked ${reading.rank.toLocaleString('en-IN')} of every domain on the web`);
  if (reading.asOf) aside.push(`measured ${reading.asOf}`);

  return `## Authority

**${round(reading.score)} out of ${reading.scale}** from ${reading.source}, ${moved}.${aside.length ? `\n\n${aside.join('. ')}.` : ''}

_${NOTE[reading.source]}_`;
}
