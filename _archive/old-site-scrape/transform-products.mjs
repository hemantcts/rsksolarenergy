// One-off: raw scrape → src/data/products.json (clean, typed-shape data; no markup).
import { readFileSync, writeFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('./products-raw.json', import.meta.url), 'utf8'));

const SLUG_FIX = {
  'proin-gravida-nibh-vel-veli': 'utl-170ah-inverter-battery-usb-17100',
  'proin-gravida-nibh-vel-veli-2': 'utl-solar-tubular-battery',
  'proin-gravida-nibh-vel-veli-3': 'utl-li-ion-48v-8a-battery-charger',
  'proin-gravida-nibh-vel-veli-4': '12v-28ah-e-bike-rechargeable-battery',
  'proin-gravida-nibh-vel-veli-5': 'sigma-plus-solar-pcu-5kva-48v',
  'proin-gravida-nibh-vel-veli-6': 'e-rickshaw-battery-charger',
};
const TITLE_FIX = {
  'solar-led-lightning-system': 'Solar LED Lighting System',
  '265watt-solar-panel': '265 Watt Solar Panel',
  'mono-perc-solar-panels': 'Mono PERC Solar Panel',
  'proin-gravida-nibh-vel-veli': 'UTL 170Ah Inverter Battery – USB 17100',
};

// Hand-written where the old page had no usable text. Facts only from the old page's own feature list.
const SUMMARY_FIX = {
  'utl-solar-tubular-battery': 'UTL tubular solar battery with gauntlet positive plates. C20 rated, with a stated life of 1,500 cycles at 80% depth of discharge.',
  'sinfin-solar-air-conditioner': 'Solar-powered air conditioner from UTL’s SINFIN range. The old listing carried no specifications; ask us for the current model, capacity and price.',
  'li-ion-led-rechargeable-torch': 'Rechargeable LED torch with dual-mode lighting, a 3–4 hour charge time and battery protection.',
  'mini-led-lantern': 'Rechargeable lantern with five LEDs and USB phone charging. Charges from a solar panel or an AC charger.',
  'solar-led-lightning-system': 'Solar home lighting kit from UTL with 2 W rain-proof bulbs, a lithium battery and phone charging.',
  '12v-28ah-e-bike-rechargeable-battery': '12V 28Ah sealed, maintenance-free battery for electric bikes. Spill-proof and supplied charged.',
  '335-watt-solar-panel': '335 W solar module from UTL with anti-reflective coated tempered glass.',
};

function category(slug, title) {
  const s = `${slug} ${title}`.toLowerCase();
  if (/solar-system/.test(slug)) return 'solar-systems';
  if (/solar-panel|mono-perc/.test(slug)) return 'solar-panels';
  if (/charge-controller|management-unit/.test(slug)) return 'charge-controllers';
  if (/battery-charger|e-rickshaw|li-ion 48v/.test(s)) return 'ev-chargers';
  if (/battery/.test(s)) return 'batteries';
  if (/inverter|pcu/.test(s)) return 'inverters';
  return 'lighting-and-appliances';
}

const clean = (t) =>
  t
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/Reliablity/g, 'Reliability')
    .replace(/photo-volatic/g, 'photovoltaic')
    .replace(/accodance/g, 'accordance')
    .replace(/\bNo’s\b/g, 'nos')
    .replace(/Let’s have a look.*$/i, '')
    .trim();

// Fluff that says nothing specific — dropped from feature lists.
const FLUFF = /deep satisfaction|one-time investment|unique experience|eco-friendly|environment friendly|best in price|cheap and|next-gen|smarter/i;

function firstSentences(text, max = 2) {
  const parts = clean(text).match(/[^.!?]+[.!?]+(\s|$)/g) ?? [clean(text)];
  return parts.slice(0, max).join('').trim();
}

function specTable(rows) {
  const cleaned = rows.map((r) => r.map((c) => clean(c)));
  let header = null;
  if (cleaned[0] && /particulars|parameter/i.test(cleaned[0][0] ?? '')) header = cleaned.shift();
  // single-cell rows are section headings
  const out = [];
  for (const r of cleaned) {
    if (r.length === 1 || r.slice(1).every((c) => !c)) out.push({ section: r[0] });
    else out.push({ label: r[0], values: r.slice(1) });
  }
  const multi = out.some((r) => r.values && r.values.length > 1);
  return { columns: multi && header ? header.slice(1) : null, rows: out };
}

function modelOf(p) {
  const row = p.specs.find((r) => /^model$|smu capacity|^system rating$/i.test(r[0] ?? ''));
  if (row && row[1] && /^model$/i.test(row[0])) return clean(row[1]);
  const m = p.short.join(' ').match(/Model:-?\s*([A-Z0-9 ]+)/);
  if (m) return m[1].trim();
  const t = p.title.match(/USB \d+|UST \d+|C-\d+/);
  return t ? t[0] : null;
}

const products = raw.map((p) => {
  const slug = SLUG_FIX[p.slug] ?? p.slug;
  const title = TITLE_FIX[p.slug] ?? clean(p.title);
  const dedupeTitle = (x) => (x.startsWith(p.title) && x.slice(p.title.length).trim().startsWith(p.title.split(' ')[0]) ? x.slice(p.title.length).trim() : x);
  const paras = p.paras.map(clean).map(dedupeTitle).filter((x) => x.length > 40 && !/^Explore UTL/i.test(x));
  const shortLines = p.short.map(clean).filter(Boolean);
  const listLikeShort = shortLines.length > 2 && shortLines.every((l) => l.length < 90);
  let features = [...new Set([...(listLikeShort ? shortLines : []), ...p.bullets.map(clean)])]
    .filter((f) => f && !FLUFF.test(f) && !/^Model:/i.test(f) && !/^Benefits of/i.test(f) && f.length < 160);
  const source = paras[0] ?? (!listLikeShort ? shortLines.join(' ') : '');
  const summary = SUMMARY_FIX[slug] ?? (source && source.length > 60 ? firstSentences(source, 2) : '');
  const description = paras.slice(0, 3).filter((x) => !/^(Stand-alone|PCU Mode|Smart Mode)/.test(x));
  return {
    slug,
    oldSlug: p.slug,
    title,
    category: category(slug, title),
    brand: 'UTL Solar',
    model: modelOf(p),
    summary,
    description,
    features,
    specs: p.specs.length > 1 ? specTable(p.specs) : null,
    oldImage: p.image,
  };
});

// Sort within category by title for stable output.
products.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title, 'en', { numeric: true }));
writeFileSync('C:/xampp/htdocs/rsksolarenergy/src/data/products.json', JSON.stringify(products, null, 2) + '\n');
const counts = products.reduce((m, p) => ((m[p.category] = (m[p.category] ?? 0) + 1), m), {});
console.log(products.length, counts);
for (const p of products) if (!p.summary || !p.specs) console.log('thin:', p.slug, p.summary ? '' : 'no-summary', p.specs ? '' : 'no-specs', p.features.length, 'features');
