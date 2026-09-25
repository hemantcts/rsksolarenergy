// Weekly Search Console report. Runs on a schedule in GitHub Actions, so nothing has to be
// switched on at our end.
//
// It reads the last 28 days and the 28 before that, then writes a markdown summary: what moved,
// what is close to page one, which pages are shown but never clicked, and what is newly appearing.
// Those are the three things worth acting on, and they decide what we write next.
//
// Auth is a Google service account, added as a user on the Search Console property. The JSON key
// arrives in GSC_SA_JSON; nothing is written to disk. The JWT is signed with node:crypto, so this
// needs no dependencies.
//
// Usage: GSC_SA_JSON='{...}' GSC_SITE='sc-domain:rsksolarenergy.com' node scripts/seo-report.mjs
import { createSign } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { authoritySection } from './lib/authority.mjs';

const SITE = process.env.GSC_SITE || 'sc-domain:rsksolarenergy.com';
const DAYS = 28;
/** Ignore the long tail: a query needs this many impressions before it can be an "opportunity". */
const MIN_IMPRESSIONS = 15;
/** Positions worth chasing: close enough that a better page or title can move them. */
const STRIKING_DISTANCE = [4.5, 20.5];

let key;
try {
  key = JSON.parse(process.env.GSC_SA_JSON ?? '');
} catch {
  console.error('GSC_SA_JSON is not valid JSON. Paste the whole service-account key file, braces included.');
  process.exit(1);
}
if (!key.client_email || !key.private_key) {
  console.error('GSC_SA_JSON has no client_email or private_key, so it is not a service-account key.');
  process.exit(1);
}

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const day = (offset) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claim)}`;
  let signature;
  try {
    signature = createSign('RSA-SHA256').update(unsigned).end().sign(key.private_key, 'base64url');
  } catch {
    console.error('The private_key in GSC_SA_JSON could not be read. Copy the key file exactly as Google gives it, without reformatting the private_key line.');
    process.exit(1);
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Google refused the key: ${JSON.stringify(json).slice(0, 300)}`);
  return json.access_token;
}

async function query(token, body) {
  const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ rowLimit: 500, dataState: 'final', ...body }),
  });
  if (!res.ok) throw new Error(`Search Console said ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).rows ?? [];
}

const round = (n, d = 1) => Number(n.toFixed(d));
const pct = (n) => `${round(n * 100)}%`;
const table = (head, rows) => (rows.length ? [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n') : '_Nothing this week._');

const authority = await authoritySection();
const token = await accessToken();
const period = { startDate: day(DAYS + 2), endDate: day(2) };
const previous = { startDate: day(DAYS * 2 + 2), endDate: day(DAYS + 3) };

const [queriesNow, queriesBefore, pagesNow, pagesBefore] = await Promise.all([
  query(token, { ...period, dimensions: ['query'] }),
  query(token, { ...previous, dimensions: ['query'] }),
  query(token, { ...period, dimensions: ['page'] }),
  query(token, { ...previous, dimensions: ['page'] }),
]);

const sum = (rows, k) => rows.reduce((t, r) => t + r[k], 0);
const byKey = (rows) => new Map(rows.map((r) => [r.keys[0], r]));
const prevQ = byKey(queriesBefore);
const prevP = byKey(pagesBefore);

const totals = (rows) => ({ clicks: sum(rows, 'clicks'), impressions: sum(rows, 'impressions') });
const now = totals(queriesNow);
const before = totals(queriesBefore);
const change = (a, b) => (b ? `${a > b ? '+' : ''}${round(((a - b) / b) * 100, 0)}%` : 'new');

const opportunities = queriesNow
  .filter((r) => r.impressions >= MIN_IMPRESSIONS && r.position >= STRIKING_DISTANCE[0] && r.position <= STRIKING_DISTANCE[1])
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 15);

const noClicks = queriesNow
  .filter((r) => r.clicks === 0 && r.impressions >= MIN_IMPRESSIONS * 2 && r.position <= 10.5)
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 10);

const movers = pagesNow
  .filter((r) => r.impressions >= MIN_IMPRESSIONS && prevP.has(r.keys[0]))
  .map((r) => ({ page: r.keys[0].replace('https://rsksolarenergy.com', ''), now: r.position, was: prevP.get(r.keys[0]).position, clicks: r.clicks }))
  .filter((r) => Math.abs(r.was - r.now) >= 3)
  .sort((a, b) => a.now - a.was - (b.now - b.was));

const fresh = queriesNow.filter((r) => !prevQ.has(r.keys[0]) && r.impressions >= MIN_IMPRESSIONS).sort((a, b) => b.impressions - a.impressions).slice(0, 10);

const report = `# Search report, ${period.startDate} to ${period.endDate}

Clicks **${now.clicks}** (${change(now.clicks, before.clicks)}), impressions **${now.impressions}** (${change(now.impressions, before.impressions)}), against the previous 28 days.

${authority}

## Close to page one

Ranked ${STRIKING_DISTANCE[0]} to ${STRIKING_DISTANCE[1]} with real demand. A better page, or a better title, moves these fastest.

${table(['Search', 'Position', 'Impressions', 'Clicks'], opportunities.map((r) => [r.keys[0], round(r.position), r.impressions, r.clicks]))}

## Shown, never clicked

High on the page and getting nothing. Usually the title or description is the problem.

${table(['Search', 'Position', 'Impressions'], noClicks.map((r) => [r.keys[0], round(r.position), r.impressions]))}

## Pages that moved three places or more

${table(['Page', 'Was', 'Now', 'Clicks'], movers.slice(0, 15).map((r) => [r.page, round(r.was), round(r.now), r.clicks]))}

## New searches we now appear for

${table(['Search', 'Position', 'Impressions'], fresh.map((r) => [r.keys[0], round(r.position), r.impressions]))}

## Top searches

${table(['Search', 'Clicks', 'Impressions', 'CTR', 'Position'], queriesNow.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 15).map((r) => [r.keys[0], r.clicks, r.impressions, pct(r.ctr), round(r.position)]))}

_Search Console leaves out searches made only a few times, so these totals run below the real ones. Figures exclude the last two days, which Google is still counting._
`;

writeFileSync('seo-report.md', report);
console.log(report);
