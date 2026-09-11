// One-off: upsinverter-raw.json -> new entries appended to src/data/products.json.
// Only real, live (non-404) UTL-brand products. No pricing carried over (RSK sets its own).
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const raw = JSON.parse(readFileSync(new URL('upsinverter-raw.json', dir), 'utf8')).filter((p) => p.title);

const clean = (t) =>
  t
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/photo-volatic/g, 'photovoltaic')
    .trim();

// Dated promotions, unverifiable manufacturer marketing stats, and vague "why choose us" claims
// that are not RSK's to make (CLAUDE.md: never invent statistics; DESIGN.md: no generic-company copy).
const FLUFF =
  /\d+\s*(lakh|crore)\+?[\s\w]{0,24}customers|years? of legacy|patented (r?mppt|technology)|till 31|dedicated service support|best in (class|price)|eco-friendly|next-gen|deep satisfaction|why choose utl/i;

const clip = (t, n) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t);

const isHeaderRow = (r) => /^(particulars?|parameter|specifications?)$/i.test(r[0] ?? '');

function specTable(rows) {
  // Two merged source tables can each carry their own "Particulars / Description"-style header
  // row; strip every one of those, not just a leading row at position 0.
  const cleaned = rows.map((r) => r.map((c) => clean(c))).filter((r) => !isHeaderRow(r));
  const header = isHeaderRow(rows[0] ?? []) ? rows[0] : null;
  const out = [];
  for (const r of cleaned) {
    if (r.length === 1 || r.slice(1).every((c) => !c)) out.push({ section: r[0] });
    else out.push({ label: r[0], values: r.slice(1) });
  }
  const multi = out.some((r) => r.values && r.values.length > 1);
  return { columns: multi && header ? header.slice(1) : null, rows: out };
}

function firstSentences(text, max = 2, hardLimit = 260) {
  const parts = clean(text).match(/[^.!?]+[.!?]+(\s|$)/g) ?? [clean(text)];
  return clip(parts.slice(0, max).join('').trim(), hardLimit);
}

// Classify from the SLUG alone — upsinverter.com's own slugs are descriptive and reliable, and
// checking the full title text miscategorises e.g. any inverter whose blurb mentions "battery".
function category(slug) {
  if (/solar-system/.test(slug)) return 'solar-systems';
  if (/solar-panel/.test(slug)) return 'solar-panels';
  if (/charge-controller|management-unit/.test(slug)) return 'charge-controllers';
  if (/battery-charger/.test(slug)) return 'ev-chargers';
  if (/inverter|pcu|sun-lion/.test(slug)) return 'inverters'; // sun-lion: an inverter with an inbuilt battery, same family as "combo home inverter"
  if (/\bbattery\b/.test(slug)) return 'batteries';
  return 'lighting-and-appliances';
}

function cleanTitle(t) {
  // "Name | subhead" -> keep the name half; keep short parenthetical model notes.
  const pipe = t.split(' | ');
  return clean(pipe[0]);
}

// Hand-tightened summaries for the handful of newest listings whose source copy reads as
// generic marketing filler ("blends smart energy management... industry-leading") rather than
// the specific, technical voice the rest of the site uses (DESIGN.md §7). Facts only, drawn
// from the same source page — nothing invented.
const SUMMARY_FIX = {
  'utl-gamma-plus-3400-24v-mppt-solar-inverter': 'Gamma+ 3400 rMPPT solar inverter, 3 kVA at 24V, for home and small commercial use. Built-in r-MPPT charge controller, pure sine wave output, and a smart LCD display.',
  'sigma-plus-solar-inverter-3kva-48v': 'Sigma Pro 3kVA/48V grid-export hybrid solar inverter (model UGE 3048), rMPPT technology, pure sine wave output.',
  'sigma-plus-solar-inverter-5kva-48v': 'Sigma Pro 5kVA/48V grid-export hybrid solar inverter, rMPPT technology, pure sine wave output, 5-year warranty.',
};

// Confirmed directly in the product's own <h1> title (not inferred from a sibling product's
// naming pattern), for the couple of cases the automatic spec-table/SKU lookup misses.
const MODEL_FIX = { 'sigma-plus-solar-inverter-3kva-48v': 'UGE 3048' };

const products = raw.map((p) => {
  const title = cleanTitle(p.title);
  const slug = p.slug;
  const paras = p.descParas.map(clean).filter((x) => x.length > 25 && !FLUFF.test(x));
  const bullets = [...new Set([...p.shortBullets, ...p.descBullets].map(clean))].filter(
    (b) => b && !FLUFF.test(b) && b.length < 160 && b.length > 3,
  );
  const summary =
    SUMMARY_FIX[slug] ??
    (paras[0]
      ? firstSentences(paras[0], 2)
      : bullets.length
        ? clip(
            bullets
              .slice(0, 3)
              .map((b) => b.replace(/\.+$/, ''))
              .join('. ') + '.',
            260,
          )
        : '');
  const description = paras.slice(0, 3);
  const specs = p.specs.length > 1 ? specTable(p.specs) : null;
  // Prefer the real model from a spec-table "Model" row; the page's own SKU text is often a
  // templated variant pattern with "XX" wildcards (e.g. "UGE-XX5K-D-XX"), not a real model number.
  const specModelRow = specs?.rows.find((r) => 'label' in r && /^model( name)?$/i.test(r.label));
  const specModel = specModelRow && 'values' in specModelRow ? specModelRow.values.join(' ') : null;
  const skuModel = p.sku && /^[A-Z0-9-]{4,20}$/.test(p.sku) && !p.sku.includes('XX') ? p.sku : null;
  const model = MODEL_FIX[slug] ?? specModel ?? skuModel;

  return {
    slug,
    oldSlug: null,
    title,
    category: category(slug),
    brand: 'UTL Solar',
    model,
    summary,
    description,
    features: bullets,
    specs,
    source: 'utl-catalogue',
    oldImage: p.image,
  };
});

const existing = JSON.parse(readFileSync('C:/xampp/htdocs/rsksolarenergy/src/data/products.json', 'utf8'));
const existingSlugs = new Set(existing.map((p) => p.slug));
const toAdd = products.filter((p) => !existingSlugs.has(p.slug));
const skipped = products.filter((p) => existingSlugs.has(p.slug));

const merged = [...existing, ...toAdd].sort(
  (a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title, 'en', { numeric: true }),
);
writeFileSync('C:/xampp/htdocs/rsksolarenergy/src/data/products.json', JSON.stringify(merged, null, 2) + '\n');

console.log(`Added ${toAdd.length}, skipped ${skipped.length} (slug already exists), total now ${merged.length}`);
if (skipped.length) console.log('Skipped:', skipped.map((p) => p.slug).join(', '));
for (const p of toAdd) {
  const flags = [];
  if (!p.summary) flags.push('NO-SUMMARY');
  if (!p.features.length) flags.push('NO-FEATURES');
  if (!p.model) flags.push('no-model');
  console.log(p.category.padEnd(22), p.slug.padEnd(48), flags.join(' '));
}
