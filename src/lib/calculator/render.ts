/**
 * Renders a calculator result to HTML. Used at build time (server-rendered example, crawlable,
 * works without JS) and in the browser, so both always match.
 * Only numbers and fixed copy are interpolated — never user-typed text.
 */
import { BUSINESS } from '../../config/business';
import { SOLAR_CONFIG, type SolarConfig } from '../../config/solar-config';
import { calculatorMessage, whatsappUrl } from '../whatsapp';
import { digits, inr, inrRange, inrWords, kw, yearsRange } from './format';
import type { CalcInput, CalcResult, Note, Range } from './types';

export interface RenderOptions {
  variant: 'hero' | 'full';
  /** Query string that reproduces this result on /solar-calculator/. */
  shareQuery: string;
  district?: string;
  /** Mark figures for the count-up (client only). */
  animate?: boolean;
  config?: SolarConfig;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const TYPE = { 'on-grid': 'on-grid', hybrid: 'hybrid', 'off-grid': 'off-grid' } as const;

/** A figure that may count up. Digits tween; the ₹ sign and words never animate. */
function fig(text: string, animate: boolean): string {
  return animate ? `<span data-final="${esc(text)}">${esc(text)}</span>` : esc(text);
}

function row(label: string, value: string, opts: { strong?: boolean; sub?: string } = {}): string {
  return `<tr${opts.strong ? ' class="calc-strong"' : ''}><th scope="row">${esc(label)}${
    opts.sub ? `<span class="calc-sub">${esc(opts.sub)}</span>` : ''
  }</th><td class="num">${value}</td></tr>`;
}

export function noteText(n: Note, config: SolarConfig = SOLAR_CONFIG): string {
  switch (n.code) {
    case 'estimated-from-bill':
      return `Units estimated from your bill amount using the PSPCL ${config.pspcl.tariffYear} tariff. Enter the units printed on your bill for an exact figure.`;
    case 'load-assumed':
      return `Sanctioned load assumed to be ${n.assumedKw} kW. It is printed on your bill; enter it to confirm the size and your fixed charges.`;
    case 'capped-by-load':
      return `Your use needs about ${kw(n.requiredKw)}, but your sanctioned load is ${kw(n.loadKw)}. A PM Surya Ghar system cannot exceed sanctioned load, so this is capped. To go bigger, apply to PSPCL for load enhancement first. An oversized application is one of the most common reasons for rejection.`;
    case 'capped-by-roof':
      return `Your roof fits about ${kw(Math.floor(n.roofKw * 10) / 10)} at ${config.generation.sqFtPerKw} sq ft per kW, so the system is sized to the roof.`;
    case 'zero-bill-sizing':
      return `Covering all of your use would need ${kw(n.offsetKw)}. You do not need it: once your net units are under ${config.freeUnits.perMonth} a month, your bill is already zero, so the extra capacity would add almost nothing.`;
    case 'net-units-assumption':
      return `Assumes PSPCL applies the ${config.freeUnits.perMonth} free units to your net units after solar. We confirm this for your connection before quoting.`;
    case 'subsidy-ineligible':
      if (n.reason === 'category')
        return 'PM Surya Ghar covers homes and housing societies only. Businesses and industry get no subsidy, but they also get no free units, so solar saves from the first unit.';
      if (n.reason === 'system-type')
        return 'PM Surya Ghar covers grid-connected, net-metered systems. Off-grid systems are not connected to PSPCL, so they do not qualify. A hybrid system does qualify, because it is grid-tied with a battery added, not disconnected.';
      return 'The subsidy needs the applicant to own the house and hold the electricity connection. Tenants usually cannot claim it.';
    case 'large-system':
      return 'Systems above 10 kW are designed after a site survey. Treat this as a first estimate.';
    case 'industrial-kvah':
      return 'Industrial energy is billed per kVAh at the Punjab Government’s subsidised rate of ₹5.835 for FY 2026-27. Treated here as per unit, which slightly understates the saving.';
    case 'off-grid-no-export':
      return 'Off-grid systems are not connected to the grid, so surplus units are not exported.';
  }
}

function assumptions(config: SolarConfig): string {
  const g = config.generation;
  const pr = config.projection;
  return `Estimate based on ${digits(g.annualYieldPerKwp)} units per kW per year before an ${Math.round((1 - g.deratingFactor) * 100)}% allowance for losses, the PSPCL ${config.pspcl.tariffYear} tariff with ${config.pspcl.electricityDutyPercent}% electricity duty, a ${pr.tariffEscalationPercent}% yearly tariff rise and ${pr.panelDegradationPercent}% yearly panel degradation. Your actual figures depend on roof direction, shading and how you use power. A free site survey firms this up.`;
}

// Customer-facing note. Every price this calculator shows is an estimate — even the confirmed
// hybrid figures vary with roof, mounting and cable runs — so this always renders; it is not a
// "this data isn't ready yet" warning, and it never names which internal config groups are or
// aren't confirmed (that distinction matters for our own launch checklist, not for a customer).
function draftBanner(): string {
  return `<p class="calc-draft" role="note"><strong>Estimated price range.</strong> Prices are indicative and subject to change. Contact us for the latest pricing and a customised quotation.</p>`;
}

function waButton(r: CalcResult, input: CalcInput, district: string | undefined, label: string): string {
  const url = whatsappUrl(
    calculatorMessage(r, {
      kind: input.consumption.kind,
      value: input.consumption.value,
      periodMonths: input.consumption.periodMonths,
      ...(district ? { district } : {}),
    }),
  );
  return `<a class="btn btn-primary" href="${esc(url)}" rel="noopener" target="_blank" data-wa>${esc(label)}</a>`;
}

function freeUnitsBlock(r: CalcResult, input: CalcInput, o: RenderOptions, config: SolarConfig): string {
  const reserved = r.scheme === 'reserved';
  return `
<div class="calc-verdict">
  <p class="calc-kicker">Our honest answer</p>
  <h3 class="t-h2">Your bill is already zero. Solar will not pay for itself on savings.</h3>
</div>
<p>Punjab gives homes ${config.freeUnits.perMonth} free units a month (${config.freeUnits.perBillingCycle} on a two-month bill)${
    r.monthlyUnits ? `, and at about ${digits(r.monthlyUnits)} units a month you are inside that` : ''
  }. PSPCL charges you nothing, so there is no bill for solar to reduce. We would rather tell you now than sell you a system that can’t pay for itself.</p>
<p class="calc-subhead">Solar can still make sense if</p>
<ul class="ruled calc-cases">
  <li><strong>Your use is about to rise.</strong> A new AC, an EV, an extension or a bigger family can push you over ${config.freeUnits.perMonth} units. ${
    reserved
      ? 'Above that line you pay for every unit over it, plus fixed charges.'
      : 'Above that line, general-category homes pay for every unit, starting from the first.'
  }</li>
  <li><strong>You face frequent power cuts.</strong> A hybrid system with batteries keeps essentials running. The return is backup, not savings.</li>
  <li><strong>You are often close to the line.</strong> One hot month over ${config.freeUnits.perMonth} units brings a full bill.</li>
</ul>
<div class="calc-actions">${waButton(r, input, o.district, 'Talk to us about whether solar makes sense for you')}</div>`;
}

function belowThresholdBlock(r: CalcResult, input: CalcInput, o: RenderOptions, config: SolarConfig): string {
  const min = r.minimumBillAboveThreshold ?? 0;
  return `
<div class="calc-verdict">
  <p class="calc-kicker">Check your bill</p>
  <h3 class="t-h2">That amount does not match the PSPCL home tariff.</h3>
</div>
<p>Homes using ${config.freeUnits.perMonth} units a month or less pay ₹0. Once a general-category home goes over the line, every unit is charged, so the smallest possible bill is about <strong class="t-value">${inr(min, 10)}</strong> a month (<span class="t-value">${inr(min * 2, 10)}</span> on a two-month bill).</p>
<ul class="ruled calc-cases">
  <li>Does your bill cover two months? Choose <strong>2 months</strong> and enter the full amount.</li>
  <li>Is it a shop or office connection? Choose that connection type.</li>
  <li>Are you in the SC, BC, BPL or Freedom Fighter category? Those homes pay only for units above ${config.freeUnits.perMonth}. Use the full calculator and enter your units.</li>
</ul>
<div class="calc-actions">${waButton(r, input, o.district, 'Send us your bill on WhatsApp')}</div>`;
}

function simpleBlock(kicker: string, title: string, body: string, r: CalcResult, input: CalcInput, o: RenderOptions, cta: string): string {
  return `
<div class="calc-verdict"><p class="calc-kicker">${esc(kicker)}</p><h3 class="t-h2">${esc(title)}</h3></div>
<p>${body}</p>
<div class="calc-actions">${waButton(r, input, o.district, cta)}</div>`;
}

export function renderResult(r: CalcResult, input: CalcInput, o: RenderOptions): string {
  const config = o.config ?? SOLAR_CONFIG;
  const a = !!o.animate;

  if (r.outcome === 'invalid') {
    return `<p class="calc-error" role="alert">${esc(r.error ?? 'Check the figures and try again.')}</p>`;
  }
  if (r.outcome === 'free-units') return freeUnitsBlock(r, input, o, config);
  if (r.outcome === 'bill-below-threshold') return belowThresholdBlock(r, input, o, config);
  if (r.outcome === 'agricultural') {
    return simpleBlock(
      'Our honest answer',
      'Farm connections get free power, so rooftop solar won’t pay for itself through bill savings.',
      'Punjab supplies agricultural connections free of charge. There is no bill for solar to reduce. For solar water pumps, the relevant scheme is PM-KUSUM.',
      r,
      input,
      o,
      'Ask us about your case on WhatsApp',
    );
  }
  if (r.outcome === 'load-too-small') {
    const minKw = config.sizing.minKwByType[r.systemType];
    return simpleBlock(
      'Check your sanctioned load',
      'Your sanctioned load or roof is below our smallest system.',
      `Our smallest ${TYPE[r.systemType]} system is ${kw(minKw)}, and a subsidised system cannot exceed your sanctioned load. If your sanctioned load is the limit, apply to PSPCL for load enhancement first and we can tell you what to request. If it is roof space, send us a photo and we will see what actually fits.`,
      r,
      input,
      o,
      'Ask us about this on WhatsApp',
    );
  }

  const hasSubsidy = r.subsidy.amount > 0;
  const coverLine = r.zeroBill
    ? `Takes your PSPCL bill from ${inr(r.billBefore.total, 10)} a month to ₹0`
    : `Covers about ${Math.round(r.coversPercent)}% of your yearly use`;
  const netRange: Range = r.netCost;
  const estimate = r.estimated ? ' (estimate)' : '';

  const costRows = [
    row('System cost', fig(inrRange(r.grossCost), a)),
    hasSubsidy
      ? row('PM Surya Ghar subsidy', `− ${fig(inr(r.subsidy.amount), a)}`, {
          sub: `paid to your bank ${config.subsidy.disbursementDays[0]}–${config.subsidy.disbursementDays[1]} days after inspection`,
        })
      : row('PM Surya Ghar subsidy', '₹0', { sub: 'not eligible, see below' }),
  ].join('');

  const savingRows = [
    row('Your bill now', `${fig(inr(r.billBefore.total, 10), a)}<span class="calc-unit"> a month${estimate}</span>`),
    row('Your bill after solar', `${fig(inr(r.billAfter.total, 10), a)}<span class="calc-unit"> a month</span>`),
    o.variant === 'full' ? row('Yearly generation', `${fig(digits(r.annualGeneration), a)}<span class="calc-unit"> units</span>`) : '',
    row('Yearly saving', fig(inr(r.annualSaving, 100), a)),
    row('Payback', r.paybackYears ? esc(yearsRange(r.paybackYears)) : 'No bill saving to pay back against'),
    o.variant === 'full' ? row(`${config.projection.horizonYears}-year saving`, esc(inrWords(r.lifetimeSaving))) : '',
    o.variant === 'full' ? row('Roof area needed', `about ${digits(r.roofSqFt)}<span class="calc-unit"> sq ft</span>`) : '',
  ].join('');

  const notes = r.notes.filter((n) => o.variant === 'full' || ['capped-by-load', 'subsidy-ineligible', 'zero-bill-sizing'].includes(n.code));

  return `
${draftBanner()}
<div class="calc-verdict">
  <p class="calc-kicker">Recommended system</p>
  <p class="calc-system"><span class="t-value">${esc(String(r.systemKw))}</span> kW ${TYPE[r.systemType]}</p>
  <p class="calc-cover">${esc(coverLine)}</p>
</div>
<table class="spec-table calc-table">
  <tbody>${costRows}</tbody>
  <tbody class="calc-net"><tr><th scope="row">Your net cost${hasSubsidy ? ' after subsidy' : ''}</th><td class="num"><span class="t-readout">${fig(inrRange(netRange), a)}</span></td></tr></tbody>
  <tbody>${savingRows}</tbody>
</table>
${hasSubsidy ? `<p class="calc-fineprint"><strong>You pay the full system cost first.</strong> The subsidy is credited to your bank account about ${config.subsidy.disbursementDays[0]}–${config.subsidy.disbursementDays[1]} days after the DISCOM inspection. It is not deducted upfront.</p>` : ''}
${notes.length ? `<ul class="calc-notes">${notes.map((n) => `<li>${esc(noteText(n, config))}</li>`).join('')}</ul>` : ''}
${o.variant === 'full' ? `<p class="calc-fineprint">${esc(assumptions(config))}</p>` : ''}
<div class="calc-actions">
  ${waButton(r, input, o.district, 'Send this to RSK Solar Energy on WhatsApp')}
  ${
    o.variant === 'hero'
      ? `<a class="btn btn-secondary" href="/solar-calculator/?${esc(o.shareQuery)}">See the full breakdown</a>`
      : `<button class="btn btn-secondary" type="button" data-share="/solar-calculator/?${esc(o.shareQuery)}">Share this estimate</button>`
  }
</div>
<p class="calc-fineprint">Prefer to talk? Call <a href="tel:${BUSINESS.phones[0].tel}">${BUSINESS.phones[0].display}</a>.</p>`;
}

/** Stable query string for a calculator input (shareable, linkable state). */
export function toQuery(input: CalcInput): string {
  const q = new URLSearchParams();
  q.set(input.consumption.kind, String(input.consumption.value));
  q.set('period', String(input.consumption.periodMonths));
  q.set('category', input.category);
  if (input.scheme && input.scheme !== 'general') q.set('scheme', input.scheme);
  if (input.sanctionedLoadKw) q.set('load', String(input.sanctionedLoadKw));
  if (input.systemType && input.systemType !== 'on-grid') q.set('type', input.systemType);
  if (input.ownsRoof === false) q.set('tenant', '1');
  if (input.roofAreaSqFt) q.set('roof', String(input.roofAreaSqFt));
  return q.toString();
}

const CATEGORIES = ['domestic', 'commercial', 'industrial', 'society', 'agricultural'] as const;
const TYPES = ['on-grid', 'hybrid', 'off-grid'] as const;

/** Parse a query string back into an input. Returns null when there is nothing to calculate. */
export function fromQuery(search: string): CalcInput | null {
  const q = new URLSearchParams(search);
  const num = (k: string) => {
    const v = q.get(k);
    if (v == null || v.trim() === '') return null;
    const n = Number(v.replace(/[,\s₹]/g, ''));
    return Number.isFinite(n) ? n : Number.NaN;
  };
  const unitsV = num('units');
  const billV = num('bill');
  if (unitsV == null && billV == null) return null;
  const category = (CATEGORIES as readonly string[]).includes(q.get('category') ?? '') ? (q.get('category') as CalcInput['category']) : 'domestic';
  const type = (TYPES as readonly string[]).includes(q.get('type') ?? '') ? (q.get('type') as CalcInput['systemType']) : 'on-grid';
  const period = q.get('period') === '1' ? 1 : q.get('period') === '2' ? 2 : category === 'domestic' ? 2 : 1;
  const load = num('load');
  const roof = num('roof');
  return {
    consumption: unitsV != null ? { kind: 'units', value: unitsV, periodMonths: period } : { kind: 'bill', value: billV as number, periodMonths: period },
    category,
    scheme: q.get('scheme') === 'reserved' ? 'reserved' : 'general',
    sanctionedLoadKw: load,
    systemType: type,
    ownsRoof: q.get('tenant') !== '1',
    roofAreaSqFt: roof,
  };
}
