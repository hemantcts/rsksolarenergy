// Builds src/data/sunshine.json: monthly sunshine for every town in src/data/locations.ts, for the
// "Solar generation by location" tool. Run by hand when the town list changes: npm run sunshine.
//
// Sources, both free and public:
// - Coordinates: OpenStreetMap Nominatim (one request a second, as its usage policy asks).
// - Sunshine: NASA POWER climatology, ALLSKY_SFC_SW_DWN (all-sky surface shortwave downward
//   irradiance on a horizontal surface, kWh/m²/day), January 2001 to December 2020 average,
//   from CERES SYN1deg satellite data at about 1° (roughly 100 km) resolution.
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = new URL('../src/data/sunshine.json', import.meta.url);
const UA = 'rsksolarenergy.com sunshine data (https://rsksolarenergy.com/)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Slugs and names straight from locations.ts, which Node cannot import directly (extensionless imports).
const src = readFileSync(new URL('../src/data/locations.ts', import.meta.url), 'utf8');
const towns = [...src.matchAll(/slug: '([^']+)',\s*name: '([^']+)',\s*district: '([^']+)'/g)].map((m) => ({ slug: m[1], name: m[2], district: m[3] }));
if (towns.length < 40) throw new Error(`Only ${towns.length} towns parsed from locations.ts`);

// Where a plain name finds the wrong place or none, the query OpenStreetMap knows it by.
const QUERY = {
  chandigarh: 'Chandigarh, India',
  panchkula: 'Panchkula, Haryana, India',
  'new-chandigarh': 'Mullanpur Garibdas, Punjab, India',
  'naya-gaon': 'Nayagaon, Kharar, Punjab, India',
  derabassi: 'Dera Bassi, Punjab, India',
};
// The Tricity and Punjab, generously: a coordinate outside this box is a wrong match.
const inRegion = (lat, lon) => lat > 29.4 && lat < 32.7 && lon > 73.7 && lon < 77.4;

async function geocode(t) {
  // The listed query first, then the plain name in Punjab, then the name alone.
  const queries = [QUERY[t.slug], `${t.name}, Punjab, India`, `${t.name}, India`].filter(Boolean);
  let hit;
  let q;
  for (q of queries) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    [hit] = await res.json();
    if (hit && inRegion(Number(hit.lat), Number(hit.lon))) break;
    await sleep(1100);
  }
  if (!hit) throw new Error(`No coordinates for ${t.name} (${queries.join(' | ')})`);
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!inRegion(lat, lon)) throw new Error(`${t.name} resolved outside Punjab: ${lat}, ${lon} (${hit.display_name})`);
  return { lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4 };
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
async function sunshine({ lat, lon }) {
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&latitude=${lat}&longitude=${lon}&format=JSON`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`NASA POWER answered ${res.status} for ${lat}, ${lon}`);
  const j = await res.json();
  const p = j.properties.parameter.ALLSKY_SFC_SW_DWN;
  const monthly = MONTHS.map((m) => p[m]);
  if (monthly.some((v) => !(v > 0 && v < 12))) throw new Error(`Bad sunshine values for ${lat}, ${lon}`);
  return { monthly, annual: p.ANN, range: j.header.range, sources: j.header.sources };
}

const out = { towns: {} };
for (const t of towns) {
  const at = await geocode(t);
  await sleep(1100);
  const s = await sunshine(at);
  out.towns[t.slug] = { name: t.name, ...at, monthly: s.monthly, annual: s.annual };
  out.range = s.range;
  out.sources = s.sources;
  console.log(`${t.name.padEnd(18)} ${at.lat}, ${at.lon}  ${s.annual} kWh/m²/day`);
  await sleep(300);
}
const data = {
  source: 'NASA POWER climatology, ALLSKY_SFC_SW_DWN (kWh/m²/day, horizontal), CERES SYN1deg',
  sourceUrl: 'https://power.larc.nasa.gov/',
  period: out.range,
  coordinates: 'OpenStreetMap Nominatim',
  retrieved: new Date().toISOString().slice(0, 10),
  towns: out.towns,
};
writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${Object.keys(out.towns).length} towns to src/data/sunshine.json`);
