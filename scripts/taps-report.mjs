// The "Who reached out" section of the weekly report: WhatsApp and call taps, by page and button,
// by place, by repeat address and by how people found the site. See files/DEPLOY.md, "Enquiry taps".
//
//   node scripts/taps-report.mjs <folder of monthly CSVs> <city .mmdb[.gz]> <asn .mmdb[.gz]>
//
// Writes taps.md (the email section), taps-this-week.csv and taps-all.csv (the attachments). These
// hold IP addresses, so they are emailed and never committed, and this script prints counts only:
// the repository is public, and so are its workflow logs.
//
// Locations come from DB-IP's free Lite databases (CC BY 4.0), looked up here in CI rather than on
// the web host, so the host only ever writes a line of text per tap.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { Reader } from 'mmdb-lib';

const [dir, cityDb, asnDb] = process.argv.slice(2);
const DAY = 86400000;
const NOW = Date.now();

// ---------- reading ----------

/** RFC 4180: quoted fields, doubled quotes inside them, commas and line breaks inside quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

function readTaps(folder) {
  if (!folder || !existsSync(folder)) return [];
  const taps = [];
  for (const name of readdirSync(folder).filter((f) => /^\d{4}-\d{2}\.csv$/.test(f)).sort()) {
    const [head, ...rows] = parseCsv(readFileSync(join(folder, name), 'utf8'));
    if (!head) continue;
    for (const r of rows) {
      const t = Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']));
      const time = Date.parse(t.time_utc);
      if (Number.isFinite(time)) taps.push({ ...t, time });
    }
  }
  return taps;
}

function openDb(path) {
  if (!path || !existsSync(path)) return null;
  try {
    const buf = readFileSync(path);
    return new Reader(path.endsWith('.gz') ? gunzipSync(buf) : buf);
  } catch (err) {
    console.log(`Could not open ${path.split(/[\\/]/).pop()}: ${err.message}`);
    return null;
  }
}

// ---------- describing ----------

const city = openDb(cityDb);
const asn = openDb(asnDb);
const geoCache = new Map();

/** Place and network for an address. Cached, since one address often taps more than once. */
function whereIs(ip) {
  if (geoCache.has(ip)) return geoCache.get(ip);
  let c = null;
  let a = null;
  try {
    c = city?.get(ip) ?? null;
    a = asn?.get(ip) ?? null;
  } catch {
    // Not an address the databases understand (a test from localhost, say).
  }
  const name = c?.city?.names?.en ?? '';
  const region = c?.subdivisions?.[0]?.names?.en ?? '';
  const country = c?.country?.iso_code ?? '';
  const parts = [name, region].filter(Boolean);
  if (country && country !== 'IN') parts.push(c?.country?.names?.en ?? country);
  const out = {
    place: parts.join(', ') || (city ? 'Unknown' : 'Location unavailable'),
    city: name,
    region,
    country,
    network: a?.autonomous_system_organization ?? '',
  };
  geoCache.set(ip, out);
  return out;
}

const MOBILE_UA = /Android|iPhone|iPad|Mobile/i;
// DB-IP names the carriers in full: "Bharat Sanchar Nigam Ltd" is BSNL, "Vodafone Idea" is Vi.
const MOBILE_CARRIER = /jio|airtel|vodafone|idea|bsnl|bharat sanchar|mahanagar telephone|\bvi\b/i;
const TEST_UA = /rsk-test/i;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor/i;

/** Whether a place is only the carrier's regional gateway rather than where the person is. */
const approximate = (tap) => MOBILE_UA.test(tap.user_agent) && MOBILE_CARRIER.test(whereIs(tap.ip).network);

/** What brought the visit, in words rather than hostnames. */
function sourceName(raw) {
  const s = (raw || '').toLowerCase();
  if (!s || s === 'direct') return 'Direct: typed, bookmarked, or opened from an app';
  if (s === 'this site') return 'Earlier page on this site';
  if (s.startsWith('utm:')) {
    const tag = s.slice(4);
    return /gbp|business|maps/.test(tag) ? 'Google Business Profile' : `Tagged link: ${tag}`;
  }
  if (s.includes('gemini.google')) return 'Gemini';
  if (s.includes('googlequicksearchbox') || /(^|\.)google\.[a-z.]+$/.test(s)) return 'Google search';
  if (s.includes('bing.')) return 'Bing';
  if (s.includes('duckduckgo')) return 'DuckDuckGo';
  if (s.includes('chatgpt') || s.includes('openai')) return 'ChatGPT';
  if (s.includes('perplexity')) return 'Perplexity';
  if (s.includes('claude.ai')) return 'Claude';
  if (s.includes('copilot')) return 'Copilot';
  if (s.includes('facebook') || s === 'fb.com') return 'Facebook';
  if (s.includes('instagram')) return 'Instagram';
  if (s.includes('youtube')) return 'YouTube';
  if (s.includes('justdial')) return 'Justdial';
  if (s.includes('linkedin')) return 'LinkedIn';
  return raw;
}

const kind = (t) => (t.type === 'call' ? 'Call' : 'WhatsApp');
const ist = (ms) =>
  new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const istFull = (ms) => new Date(ms).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' });

// ---------- counting ----------

const all = readTaps(dir);
const tests = all.filter((t) => TEST_UA.test(t.user_agent));
const bots = all.filter((t) => !TEST_UA.test(t.user_agent) && BOT_UA.test(t.user_agent));
const taps = all.filter((t) => !TEST_UA.test(t.user_agent) && !BOT_UA.test(t.user_agent));
const week = taps.filter((t) => t.time > NOW - 7 * DAY);
const before = taps.filter((t) => t.time <= NOW - 7 * DAY && t.time > NOW - 14 * DAY);

function tally(list, keyOf) {
  const m = new Map();
  for (const t of list) {
    const k = keyOf(t);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|');
const table = (head, rows) =>
  rows.length ? [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n') : '_Nothing yet._';
const split = (list) => `${list.filter((t) => t.type === 'whatsapp').length} WhatsApp, ${list.filter((t) => t.type === 'call').length} call`;

// ---------- the email section ----------

let md;
if (!taps.length) {
  md = `## Who reached out

No WhatsApp or call taps recorded yet. Recording started on the site this week, so this section
fills in as people use the buttons.${tests.length ? `\n\n_${tests.length} test tap${tests.length === 1 ? '' : 's'} left out, which confirms the recording works end to end._` : ''}`;
} else {
  const first = Math.min(...taps.map((t) => t.time));
  const diff = week.length - before.length;
  const change = before.length ? (diff === 0 ? ' (the same as the week before)' : ` (${diff > 0 ? 'up' : 'down'} ${Math.abs(diff)} on the week before)`) : '';

  // Which page, which button.
  const combo = new Map();
  for (const t of taps) {
    const k = `${t.page}\u0000${t.button}\u0000${t.type}`;
    const e = combo.get(k) ?? { page: t.page, button: t.button, type: kind(t), all: 0, week: 0 };
    e.all++;
    if (t.time > NOW - 7 * DAY) e.week++;
    combo.set(k, e);
  }
  const buttons = [...combo.values()].sort((a, b) => b.all - a.all || b.week - a.week).slice(0, 25);

  const pages = new Map();
  for (const t of taps) {
    const e = pages.get(t.page) ?? { page: t.page, whatsapp: 0, call: 0 };
    e[t.type === 'call' ? 'call' : 'whatsapp']++;
    pages.set(t.page, e);
  }
  const byPage = [...pages.values()].sort((a, b) => b.whatsapp + b.call - (a.whatsapp + a.call)).slice(0, 15);

  // Where they are.
  const places = new Map();
  for (const t of taps) {
    const g = whereIs(t.ip);
    const e = places.get(g.place) ?? { place: g.place, all: 0, week: 0, ips: new Set(), networks: new Map(), approx: 0 };
    e.all++;
    if (t.time > NOW - 7 * DAY) e.week++;
    e.ips.add(t.ip);
    if (g.network) e.networks.set(g.network, (e.networks.get(g.network) ?? 0) + 1);
    if (approximate(t)) e.approx++;
    places.set(g.place, e);
  }
  const byPlace = [...places.values()].sort((a, b) => b.all - a.all).slice(0, 20);

  // The same address more than once.
  const addresses = new Map();
  for (const t of taps) {
    const e = addresses.get(t.ip) ?? { ip: t.ip, taps: 0, first: t.time, last: t.time };
    e.taps++;
    e.first = Math.min(e.first, t.time);
    e.last = Math.max(e.last, t.time);
    addresses.set(t.ip, e);
  }
  const repeats = [...addresses.values()].filter((e) => e.taps > 1).sort((a, b) => b.taps - a.taps).slice(0, 20);

  const sourcesAll = tally(taps, (t) => sourceName(t.source));
  const sourcesWeek = tally(week, (t) => sourceName(t.source));

  md = `## Who reached out

**${week.length} tap${week.length === 1 ? '' : 's'}** on WhatsApp or call buttons in the last 7 days${change}: ${split(week)}.
${taps.length} since recording began on ${istFull(first).slice(0, 10)}: ${split(taps)}.

### Which page, and which button

${table(
  ['Page', 'Button', 'Type', 'This week', 'All time'],
  buttons.map((e) => [e.page, e.button, e.type, e.week, e.all]),
)}

### Pages people reach out from

${table(
  ['Page', 'WhatsApp', 'Call', 'Total'],
  byPage.map((e) => [e.page, e.whatsapp, e.call, e.whatsapp + e.call]),
)}

### Where they are

${table(
  ['Place', 'Usual network', 'This week', 'All time', 'Addresses'],
  byPlace.map((e) => {
    const network = [...e.networks.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    return [e.place + (e.approx > e.all / 2 ? ' (approx.)' : ''), network, e.week, e.all, e.ips.size];
  }),
)}

### The same address more than once

${table(
  ['Address', 'Place', 'Network', 'Taps', 'First', 'Last'],
  repeats.map((e) => {
    const g = whereIs(e.ip);
    return [e.ip, g.place, g.network, e.taps, ist(e.first), ist(e.last)];
  }),
)}

### How they found the site

${table(
  ['Came from', 'This week', 'All time'],
  [...sourcesAll.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => [s, sourcesWeek.get(s) ?? 0, n]),
)}

_"(approx.)" marks places where most taps came from a phone on Jio, Airtel, Vi or BSNL. Those
networks route through regional gateways, so the place is often the gateway city rather than where
the person is; the page they tapped from is the steadier guide. Several phones on one mobile network
can also share an address, so a repeat address is not always one person. Every tap is in the two
attached spreadsheets. Records are kept for 12 months. IP locations by DB-IP (db-ip.com), CC BY 4.0.${
    tests.length || bots.length
      ? ` Left out: ${[tests.length ? `${tests.length} test tap${tests.length === 1 ? '' : 's'}` : '', bots.length ? `${bots.length} automated tap${bots.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ')}.`
      : ''
  }_`;
}

// ---------- the spreadsheets ----------

/** A leading = + - @ makes a spreadsheet run the cell as a formula. A leading apostrophe stops it. */
const safe = (v) => {
  const s = String(v ?? '');
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};

function csv(list) {
  const head = ['time_ist', 'type', 'number', 'page', 'button', 'landing_page', 'came_from', 'ip', 'city', 'region', 'country', 'network', 'device', 'place_approximate', 'user_agent'];
  const lines = [...list]
    .sort((a, b) => b.time - a.time)
    .map((t) => {
      const g = whereIs(t.ip);
      return [istFull(t.time), kind(t), t.number, t.page, t.button, t.landing_page, sourceName(t.source), t.ip, g.city, g.region, g.country, g.network, MOBILE_UA.test(t.user_agent) ? 'Mobile' : 'Desktop', approximate(t) ? 'yes' : 'no', t.user_agent]
        .map(safe)
        .join(',');
    });
  // The byte-order mark makes Excel read the file as UTF-8, so ₹ and Punjabi text survive.
  return '﻿' + [head.join(','), ...lines].join('\r\n') + '\r\n';
}

writeFileSync('taps.md', `${md}\n`);
writeFileSync('taps-this-week.csv', csv(week));
writeFileSync('taps-all.csv', csv(taps));

// Counts only. Never an address, a place or a row: this log is public.
console.log(
  `taps: ${taps.length} kept (${week.length} this week), ${tests.length} test, ${bots.length} automated; ` +
    `locations: ${city ? 'yes' : 'no'}, networks: ${asn ? 'yes' : 'no'}`,
);
