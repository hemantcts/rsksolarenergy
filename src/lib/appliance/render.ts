/**
 * Renders a new-house estimate to HTML. Used at build time (the worked example: crawlable, works
 * without JS) and in the browser, so both always match. Everything interpolated is escaped,
 * including the visitor's own appliance names.
 */
import { APPLIANCE_CONFIG, type ApplianceConfig } from '../../config/appliance-config';
import { PRIMARY_PHONE } from '../../config/business';
import { SOLAR_CONFIG, type SolarConfig } from '../../config/solar-config';
import { digits, kw } from '../calculator/format';
import { whatsappUrl, withSource } from '../whatsapp';
import type { Estimate, HouseInput, Scenario } from './estimate';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Units rounded to a sensible step, so nothing looks more precise than it is. */
export function approxUnits(n: number): string {
  const step = n >= 1000 ? 50 : n >= 100 ? 10 : 1;
  return digits(Math.round(n / step) * step);
}
const kwRange = ([a, b]: [number, number]) => (a === b ? kw(a) : `${Number.isInteger(a) ? a : a.toFixed(1)} to ${kw(b)}`);
const pct = (x: number) => `${Math.round(x * 100)}%`;

export interface HouseRenderOptions {
  /** Show share, print and edit buttons (the live calculator, not the static example). */
  interactive?: boolean;
  /** Absolute or root-relative link that reproduces this result. */
  shareUrl?: string;
  /** The page this result is on, named in the message when there is no share link. */
  page?: string;
  /** The result's h2. The worked example on the page uses its own. */
  heading?: string;
  cfg?: ApplianceConfig;
  solar?: SolarConfig;
}

export function houseMessage(e: Estimate, input: HouseInput, shareUrl?: string, page?: string): string {
  const rec = e.scenarios.find((s) => s.id === 'recommended');
  const fut = e.scenarios.find((s) => s.id === 'future');
  const lines = ['Hi RSK Solar Energy, I used the new-house solar calculator on your website.'];
  const home = [`${input.people} people`, input.home, input.district].filter(Boolean).join(', ');
  lines.push(`Home: ${home}`);
  lines.push(`Estimated use: about ${approxUnits(e.household.monthly)} units a month, ${approxUnits(e.household.peakMonth)} in the hottest months`);
  if (e.ev) lines.push(`EV (${e.ev.timing === 'owned' ? 'already own' : 'planned'}): about ${approxUnits(e.ev.monthly)} units a month`);
  if (e.futureLines.length) lines.push(`Planned: ${e.futureLines.map((f) => f.label.toLowerCase()).join(', ')}`);
  if (rec) lines.push(`Recommended: ${kwRange(rec.kwRange)}`);
  if (fut) lines.push(`Higher coverage: ${kwRange(fut.kwRange)}`);
  if (input.backup !== 'none') lines.push(`Backup wanted: ${input.backup === 'ac' ? 'essentials and one AC' : 'essentials'}`);
  if (shareUrl) lines.push(`My answers: ${shareUrl}`);
  lines.push('Please send me a quote.');
  return withSource(lines.join('\n'), shareUrl ? undefined : page);
}

function scenarioCard(s: Scenario, cfg: ApplianceConfig, onGridMin: number): string {
  const rec = s.id === 'recommended';
  return `<li class="nh-card${rec ? ' nh-card-mid' : ''}">
  <h4 class="nh-card-title">${esc(s.label)}</h4>
  <p class="nh-card-kw t-value">${esc(kwRange(s.kwRange))}</p>
  <p class="nh-card-desc">${esc(s.description)}</p>
  <dl class="nh-facts">
    <dt>Example system</dt><dd>${esc(kw(s.exampleKw))}${s.exampleKw < onGridMin ? ' <span class="calc-sub">hybrid or off-grid at this size</span>' : ''}</dd>
    <dt>Panels</dt><dd>about ${s.panels} × ${cfg.panelWatts} W</dd>
    <dt>Roof area</dt><dd>about ${digits(s.roofSqFt)} sq ft</dd>
    <dt>Solar generation</dt><dd>${approxUnits(s.generationRange[0])} to ${approxUnits(s.generationRange[1])} units a year</dd>
    <dt>Covers</dt><dd>about ${pct(Math.min(s.coverage, 9.99))} of current use</dd>
  </dl>
</li>`;
}

function freeUnitsBlock(e: Estimate, solar: SolarConfig): string {
  const free = solar.freeUnits.perMonth;
  if (e.freeUnits === 'under')
    return `<div class="nh-callout"><p class="calc-subhead">Under Punjab’s ${free} free units</p><p>At about ${approxUnits(e.currentAnnual / 12)} units a month, a home on the general or reserved domestic tariff pays no energy bill in Punjab. Solar would have little to save, so it only makes sense if you expect your use to rise or you want backup for power cuts. We will say the same when you call.</p></div>`;
  if (e.freeUnits === 'summer-over')
    return `<div class="nh-callout"><p class="calc-subhead">Near the ${free}-unit line</p><p>Your yearly average is under ${free} units a month, but the hottest months come to about ${approxUnits(e.household.peakMonth)}. PSPCL counts the free units per bill, so summer bills can be full ones. A small system can keep those months under the line.</p></div>`;
  return `<div class="nh-callout"><p class="calc-subhead">Over Punjab’s ${free} free units</p><p>Above ${free} units a month, general-category homes pay for every unit, so solar has a real bill to cut. Because of the free units, the system that takes a bill to zero can be smaller than one that covers all your use. Once you have a few PSPCL bills, the <a href="/solar-calculator/" class="underline">bill calculator</a> works that out exactly.</p></div>`;
}

export function renderHouseResult(e: Estimate, input: HouseInput, o: HouseRenderOptions = {}): string {
  const cfg = o.cfg ?? APPLIANCE_CONFIG;
  const solar = o.solar ?? SOLAR_CONFIG;
  const rec = e.scenarios.find((s) => s.id === 'recommended');
  const heading = esc(o.heading ?? 'Your estimate');

  if (!rec) {
    return `<div class="nh-result"><h2 class="t-h2">${heading}</h2><p class="calc-error" role="alert">Add at least one appliance with some hours of use and we can work out an estimate.</p></div>`;
  }

  const plans = e.ev || e.futureLines.length;
  const planRows = [
    `<tr><th scope="row">Current home</th><td class="num">${approxUnits(e.household.monthly)}</td></tr>`,
    e.ev ? `<tr><th scope="row">EV charging (${e.ev.timing === 'owned' ? 'already own' : 'planned'})<span class="calc-sub">${esc(e.ev.vehicle)}, ${e.ev.method === 'km' ? 'from kilometres a day' : e.ev.method === 'battery' ? 'from battery size and charges a week' : 'assuming typical daily use'}</span></th><td class="num">${approxUnits(e.ev.monthly)}</td></tr>` : '',
    ...e.futureLines.map((f) => `<tr><th scope="row">${esc(f.label)}<span class="calc-sub">${esc(f.detail)}</span></th><td class="num">${approxUnits(f.kwhYear / 12)}</td></tr>`),
    `<tr class="calc-strong"><th scope="row">After planned additions</th><td class="num">${approxUnits(e.futureAnnual / 12)}</td></tr>`,
  ].join('');

  const notes = [
    ...e.notes.map((n) => n.message),
    ...(e.unusuallyHigh ? [`That is far more than most homes use (over ${digits(cfg.limits.sanityMonthlyUnits)} units a month). Check the quantities and hours; if they are right, this needs a site survey.`] : []),
    ...(rec.exampleKw < e.onGridMinKw ? [`Our on-grid systems start at ${e.onGridMinKw} kW. Smaller homes are usually better served by a hybrid or off-grid system, or no system at all.`] : []),
  ];

  const share = o.interactive
    ? `<div class="nh-tools">
  <button type="button" class="btn-tertiary" data-nh-edit>Change my answers</button>
  <button type="button" class="btn-tertiary" data-nh-share>Share this estimate</button>
  <button type="button" class="btn-tertiary" data-nh-print>Print</button>
  <span class="t-small text-slate" data-nh-share-status role="status"></span>
</div>`
    : '';

  return `<div class="nh-result">
<div>
  <h2 class="t-h2">${heading}</h2>
  <p class="calc-kicker mt-4">Recommended solar capacity</p>
  <p class="calc-system"><span class="t-value">${esc(kwRange(rec.kwRange))}</span></p>
  <p class="calc-cover">For about ${approxUnits(e.household.monthly)} units a month on average${e.ev?.timing === 'owned' ? ', plus your EV' : ''}. It’s a range because roof direction, shade and weather change what the panels make.</p>
</div>

<div>
  <h3 class="t-h3">Estimated electricity use</h3>
  <div class="table-scroll mt-3"><table class="spec-table calc-table">
    <tbody>
      <tr><th scope="row">A day, on average</th><td class="num">${approxUnits(e.household.daily)} units</td></tr>
      <tr class="calc-strong"><th scope="row">A month, on average</th><td class="num">${approxUnits(e.household.monthly)} units</td></tr>
      <tr><th scope="row">A month in peak summer<span class="calc-sub">ACs, coolers and fans all running</span></th><td class="num">${approxUnits(e.household.peakMonth)} units</td></tr>
      <tr><th scope="row">A year</th><td class="num">${approxUnits(e.household.annual)} units</td></tr>
      <tr><th scope="row">Connected load<span class="calc-sub">Everything switched on at once, in kW</span></th><td class="num">${esc(kw(e.connectedKw))}</td></tr>
    </tbody>
  </table></div>
  <p class="calc-fineprint mt-3">One unit is one kWh. Connected load decides the sanctioned load to ask PSPCL for on the new connection, and an on-grid system can’t be larger than the sanctioned load. The solar size itself comes from the units.</p>
</div>

${
  plans
    ? `<div><h3 class="t-h3">Now and after what you plan</h3><div class="table-scroll mt-3"><table class="spec-table calc-table"><thead><tr><th scope="col">Units a month, on average</th><th scope="col" class="num">Units</th></tr></thead><tbody>${planRows}</tbody></table></div></div>`
    : ''
}

${freeUnitsBlock(e, solar)}

<div>
  <h3 class="t-h3">Three ways to size it</h3>
  <p class="calc-fineprint mt-2">Which one suits you depends on your budget and your plans. They run from covering the basics to leaving room for what you add later.</p>
  <ul class="nh-cards mt-4">${e.scenarios.map((s) => scenarioCard(s, cfg, e.onGridMinKw)).join('')}</ul>
</div>

${
  e.battery
    ? `<div><h3 class="t-h3">Battery for power cuts</h3><p class="mt-2">About <strong>${e.battery.kwh} kWh</strong> of battery, for example ${e.battery.packs} × ${esc(cfg.battery.packLabel)}, runs ${e.battery.includesAc ? 'lights, fans, the fridge, Wi-Fi, the TV and one AC' : 'lights, fans, the fridge, Wi-Fi and the TV'} for about ${e.battery.hours} hours. That needs a hybrid system. ${e.battery.includesAc ? '' : 'Geysers, pumps and ACs are left off backup.'}</p><p class="calc-fineprint mt-2">See <a href="/hybrid-solar-systems/" class="underline">hybrid solar systems</a> and <a href="/blog/lithium-vs-tubular-battery-for-solar/" class="underline">lithium or tubular batteries</a>.</p></div>`
    : ''
}

<div>
  <h3 class="t-h3">Where the units go</h3>
  <div class="table-scroll mt-3"><table class="spec-table calc-table">
    <thead><tr><th scope="col">Group</th><th scope="col" class="num">Units a month</th><th scope="col" class="num">Share</th></tr></thead>
    <tbody>${e.groups.map((g) => `<tr><th scope="row">${esc(g.group)}</th><td class="num">${approxUnits(g.kwhYear / 12)}</td><td class="num">${pct(g.share)}</td></tr>`).join('')}</tbody>
  </table></div>
  <details class="nh-more mt-4"><summary>Every appliance</summary>
    <div class="table-scroll pb-4"><table class="spec-table calc-table"><thead><tr><th scope="col">Appliance</th><th scope="col" class="num">Units a year</th></tr></thead>
    <tbody>${e.lines.map((l) => `<tr><th scope="row">${esc(l.label)}</th><td class="num">${approxUnits(l.kwhYear)}</td></tr>`).join('')}</tbody></table></div>
  </details>
</div>

${notes.length ? `<ul class="calc-notes" role="note">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}

<div>
  <h3 class="t-h3">Turn this into a quote</h3>
  <p class="mt-2">Send us the estimate and your plans or site address. We check the roof, shade and your sanctioned load and come back with a system and a price.</p>
  <div class="calc-actions mt-4">
    <a class="btn btn-primary" href="${esc(whatsappUrl(houseMessage(e, input, o.shareUrl, o.page)))}" rel="noopener" target="_blank" data-wa>Get my solar quote</a>
    <a class="btn btn-secondary" href="${esc(whatsappUrl(withSource('Hi RSK Solar Energy, I am building a new house and have a question about solar.', o.shareUrl ?? o.page)))}" rel="noopener" target="_blank">WhatsApp us</a>
    <a class="btn btn-secondary" href="tel:${esc(PRIMARY_PHONE.tel)}">Call RSK Solar Energy</a>
  </div>
  ${share}
</div>

<p class="calc-fineprint">Treat this as a starting point for a conversation with us. Real use depends on your family’s habits and the season, and AC use swings the most. Solar output depends on shade, roof direction and tilt, the panels and inverter chosen, and the weather. It assumes ${digits(Math.round(solar.generation.annualYieldPerKwp * solar.generation.deratingFactor))} units per kW a year, give or take ${Math.round((cfg.generationRange[1] - 1) * 100)}%. We fix the size after a site survey, and we don’t promise a particular bill, saving or payback.</p>
</div>`;
}
