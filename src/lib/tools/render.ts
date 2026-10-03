/**
 * HTML for each tool's result. The same functions render the worked example into the page at
 * build time and the visitor's own result in the browser, so the two can never disagree.
 */
import { PRIMARY_PHONE, BUSINESS } from '../../config/business';
import { SOLAR_CONFIG } from '../../config/solar-config';
import { digits, inr, inrRange, kw } from '../calculator/format';
import { whatsappUrl, withSource } from '../whatsapp';
import { PUMP_SPEC_SOURCE } from '../../data/pump-spec';
import type { RoofOutcome } from './roof';
import type { PumpInput, PumpOutcome } from './pump';
import { MONTHS, type Generation } from './generation';
import type { QuoteRow } from './quotes';
import type { Selection } from './selector';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const row = (label: string, value: string, sub?: string) =>
  `<tr><th scope="row">${esc(label)}${sub ? `<span class="calc-sub">${esc(sub)}</span>` : ''}</th><td class="num">${value}</td></tr>`;
const table = (rows: string[]) => `<div class="table-scroll mt-3"><table class="spec-table calc-table"><tbody>${rows.join('')}</tbody></table></div>`;
const notes = (list: string[]) => (list.length ? `<ul class="calc-notes" role="note">${list.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '');
const error = (message: string) => `<p class="calc-error" role="alert">${esc(message)}</p>`;

function actions(message: string, page: string, heading = 'Turn this into a quote', body = 'Send us the figures. We check the site, the connection and the numbers, and come back with a system and a price.') {
  return `<div class="mt-8">
  <h3 class="t-h3">${esc(heading)}</h3>
  <p class="mt-2">${esc(body)}</p>
  <div class="calc-actions mt-4">
    <a class="btn btn-primary" href="${esc(whatsappUrl(withSource(message, page)))}" rel="noopener" target="_blank" data-wa>Send this on WhatsApp</a>
    <a class="btn btn-secondary" href="tel:${esc(PRIMARY_PHONE.tel)}">Call ${esc(BUSINESS.name)}</a>
  </div>
</div>`;
}

export function renderRoof(r: RoofOutcome, page: string): string {
  if (!r.ok) return error(r.message);
  const cfg = SOLAR_CONFIG;
  const onGridMin = cfg.sizing.minKwByType['on-grid'];
  const rows = [
    row('Roof area', `${digits(r.roofSqFt)} sq ft`),
    row('Usable area', `${digits(r.usableSqFt)} sq ft`, 'After shade, tanks, stairs and walkways'),
    row('Capacity the usable area takes', kw(r.fitsKw), `At ${cfg.generation.sqFtPerKw} sq ft per kW, including gaps between rows`),
  ];
  if (r.systemKw) {
    rows.push(row('Largest standard on-grid system', `<strong>${esc(kw(r.systemKw))}</strong>`, r.limitedBy === 'load' ? 'Limited by your sanctioned load' : 'Limited by the roof'));
    if (r.panels) rows.push(row('Panels', `${r.panels}`, 'At the panel size you chose'));
    rows.push(row('Average units a month', digits(r.unitsPerMonth), 'Averaged over the year'));
    if (r.price) rows.push(row('Estimated installed price', esc(inrRange(r.price)), 'On-grid, before subsidy'));
    if (r.subsidy) rows.push(row('PM Surya Ghar subsidy', `− ${esc(inr(r.subsidy))}`, 'Paid to your bank after inspection'));
  }
  const n: string[] = [];
  if (!r.systemKw) n.push(`That is less than our smallest on-grid system, ${onGridMin} kW. A hybrid system can start at ${cfg.sizing.minKwByType.hybrid} kW, or a site visit may find more usable area.`);
  if (r.limitedBy === 'load') n.push('A net-metered system cannot be larger than the sanctioned load. To use more of the roof, apply to PSPCL for a load increase first.');
  n.push('The right size depends on your bill as well as your roof. A home in Punjab often needs less than the roof allows, because the bill is already zero once net use is under 300 units a month.');
  const msg = r.systemKw
    ? `Hi RSK Solar Energy, I used your roof capacity tool. Roof about ${r.roofSqFt} sq ft, usable about ${r.usableSqFt} sq ft, which fits about ${kw(r.systemKw)}. Please assess my roof.`
    : `Hi RSK Solar Energy, I used your roof capacity tool. My roof is about ${r.roofSqFt} sq ft. Please tell me what fits.`;
  return `<div class="nh-result">
  <h2 class="t-h2">What your roof can take</h2>
  <p class="calc-kicker mt-4">Usable roof fits about</p>
  <p class="calc-system"><span class="t-value">${esc(kw(r.fitsKw))}</span> of panels</p>
  ${table(rows)}
  ${notes(n)}
  ${actions(msg, page, 'Check it on your roof', 'Send us a few photos of the roof and your last bill. We confirm the layout, the size your bill needs and the price.')}
  <p class="calc-fineprint">An estimate from the area you entered. The final layout depends on the roof's direction, shade through the day and where the structure can be fixed.</p>
</div>`;
}

export function renderPump(r: PumpOutcome, input: PumpInput, page: string, diesel: number | null): string {
  if (!r.ok) return error(r.message);
  const kind = input.kind === 'surface' ? 'surface' : 'submersible';
  const motor = input.motor === 'dc' ? 'DC' : 'AC';
  const rows = [
    row('Pump', `${r.hp} HP ${kind}, ${motor} motor`),
    row('Minimum panel capacity', `<strong>${digits(r.arrayWp)} W</strong>`, `${(r.arrayWp / 1000).toFixed(r.arrayWp % 1000 ? 2 : 0)} kW, from the MNRE specification`),
    row('Minimum water a day', `<strong>${digits(r.litresPerDay)} litres</strong>`, `${r.litresPerWp} litres per watt at a ${r.ratedHead} m head, on the specification's test day`),
    row('Ground or roof area for the panels', `About ${digits(r.areaSqFt)} sq ft`),
  ];
  if (r.fromNeed) rows.unshift(row('Water you need a day', `${digits(r.fromNeed.needed)} litres`));
  if (diesel !== null) rows.push(row('Your diesel spend a year', esc(inr(diesel, 100)), 'From the figures you entered'));
  const n = [...r.notes];
  n.push(`The water figure is the specification's minimum on a clear day with ${PUMP_SPEC_SOURCE.radiation} kWh/m² of sunshine and the panels turned three times a day to follow the sun. A fixed structure, haze or a winter day gives less.`);
  const msg = `Hi RSK Solar Energy, I used your solar pump calculator: ${r.hp} HP ${kind} ${motor} pump, total head about ${input.head} m, needs at least ${digits(r.arrayWp)} W of panels. Please advise. My location: `;
  return `<div class="nh-result">
  <h2 class="t-h2">Your solar pump</h2>
  <p class="calc-kicker mt-4">Suggested pump</p>
  <p class="calc-system"><span class="t-value">${r.hp} HP</span> ${kind}</p>
  ${table(rows)}
  ${notes(n)}
  ${actions(msg, page, 'Get it sized on site', 'Send us the bore depth, the water level in summer, the pipe size and your current pump. We size the pump and panels for your field.')}
  <p class="calc-fineprint">A first estimate from the national specification. The bore, the water level through the year and the pipe run decide the final choice.</p>
</div>`;
}

export function renderGeneration(g: Generation, page: string): string {
  const max = Math.max(...g.months);
  const bars = g.months
    .map(
      (u, i) =>
        `<li><span>${MONTHS[i]}</span><span class="tool-bar" aria-hidden="true"><span data-w="${((u / max) * 100).toFixed(1)}"></span></span><span class="num">${digits(u)}</span></li>`,
    )
    .join('');
  const best = g.months.indexOf(Math.max(...g.months));
  const worst = g.months.indexOf(Math.min(...g.months));
  const pct = Math.round((g.relative - 1) * 100);
  const vs = pct === 0 ? 'about the Punjab average' : `${Math.abs(pct)}% ${pct > 0 ? 'more' : 'less'} than the Punjab average`;
  const msg = `Hi RSK Solar Energy, I looked at solar generation for ${g.town.name}: a ${kw(g.kw)} system makes about ${digits(g.year)} units a year. Please assess my site.`;
  return `<div class="nh-result">
  <h2 class="t-h2">${esc(kw(g.kw))} in ${esc(g.town.name)}</h2>
  <p class="calc-kicker mt-4">Units a year, after losses</p>
  <p class="calc-system"><span class="t-value">${digits(g.year)}</span> units</p>
  <p class="calc-cover">About ${digits(g.year / 12)} a month on average. ${esc(g.town.name)} gets ${esc(vs)} sunshine over the year.</p>
  <h3 class="t-h3 mt-8">Month by month</h3>
  <ul class="tool-bars" aria-label="Units each month">${bars}</ul>
  ${notes([
    `${MONTHS[best]} is the strongest month and ${MONTHS[worst]} the weakest.`,
    'Panels tilted towards the south catch more of the low winter sun than the flat-ground sunshine figures suggest, so the real winter dip is usually smaller than shown.',
  ])}
  ${actions(msg, page)}
</div>`;
}

export function renderQuotes(rows: QuoteRow[], spread: number | null, page: string): string {
  if (!rows.length) return error('Enter the size and price of at least one quote.');
  const head = `<tr><th scope="col"></th>${rows.map((r) => `<th scope="col" class="num">${esc(r.name)}</th>`).join('')}</tr>`;
  const line = (label: string, f: (r: QuoteRow) => string, sub?: string) =>
    `<tr><th scope="row">${esc(label)}${sub ? `<span class="calc-sub">${esc(sub)}</span>` : ''}</th>${rows.map((r) => `<td class="num">${f(r)}</td>`).join('')}</tr>`;
  const body = [
    line('Size', (r) => esc(kw(r.kw))),
    line('Quoted price', (r) => esc(inr(r.price))),
    line('Price per kW', (r) => `<strong>${esc(inr(r.perKw, 100))}</strong>`),
    line('PM Surya Ghar subsidy', (r) => (r.subsidy ? `− ${esc(inr(r.subsidy))}` : 'None')),
    line('Your cost after subsidy', (r) => esc(inr(r.afterSubsidy))),
    line('RSK Solar Energy estimate for this size', (r) => esc(inrRange(r.ourRange)), 'Our published range, for reference'),
    line('Items not mentioned', (r) => String(r.missing.length)),
  ];
  const detail = rows
    .map(
      (r) => `<div class="mt-6"><h3 class="t-h3">${esc(r.name)}: what to ask</h3>${
        r.flags.length || r.missing.length
          ? `<ul class="calc-notes">${[...r.flags, ...r.missing.map((m) => `Not mentioned: ${m}.`)].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
          : '<p class="mt-2">Everything on the checklist is covered.</p>'
      }</div>`,
    )
    .join('');
  const spreadNote =
    spread !== null && spread > 0.15
      ? `<p class="calc-cover mt-4">The price per kW differs by ${Math.round(spread * 100)}% between these quotes. A gap that size usually means they are not quoting the same panels, inverter, structure or scope, so check those before comparing price.</p>`
      : '';
  const msg = `Hi RSK Solar Energy, I compared ${rows.length} solar quote${rows.length > 1 ? 's' : ''} on your site (${rows.map((r) => `${kw(r.kw)} at ${inr(r.price)}`).join('; ')}). Please give me your quote for the same.`;
  return `<div class="nh-result">
  <h2 class="t-h2">Your quotes side by side</h2>
  <div class="table-scroll mt-4"><table class="spec-table calc-table"><thead>${head}</thead><tbody>${body.join('')}</tbody></table></div>
  ${spreadNote}
  ${detail}
  ${actions(msg, page, 'Get a quote to compare', 'Send us the same details and we quote the same scope, item by item, with the panels, inverter and structure named.')}
  <p class="calc-fineprint">This compares what you entered. It does not judge the installers, and a low price per kW is only good value if the panels, inverter, structure and service are the same.</p>
</div>`;
}

export function renderSelection(s: Selection, page: string): string {
  const msg = `Hi RSK Solar Energy, your system selector suggested ${s.title.toLowerCase()} for me. Please advise. My bill or use: `;
  return `<div class="nh-result">
  <h2 class="t-h2">Our suggestion</h2>
  <p class="calc-system mt-4"><span class="t-value">${esc(s.title)}</span></p>
  <ul class="calc-notes mt-4">${s.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  <h3 class="t-h3 mt-8">Subsidy</h3>
  <p class="mt-2">${esc(s.subsidy)}</p>
  <h3 class="t-h3 mt-8">Next</h3>
  <ul class="mt-2">${s.next.map((n) => `<li><a class="underline" href="${esc(n.href)}">${esc(n.label)}</a></li>`).join('')}</ul>
  ${actions(msg, page, 'Talk it through', 'Tell us about the place and send a recent bill. We confirm the right type before anything is sized.')}
</div>`;
}

/** Bar widths, set through the DOM: the CSP blocks inline style attributes in markup. */
export function applyBars(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-w]').forEach((el) => {
    el.style.width = `${el.dataset.w}%`;
  });
}
