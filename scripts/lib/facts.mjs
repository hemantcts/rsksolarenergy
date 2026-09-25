// The only figures a generated post may use, and the only ones it is allowed to print.
//
// Everything here is derived from the site's own config, so a change to a price or a tariff flows
// through to what a draft is allowed to say. The draft writer gets FACTS_TEXT; the checker uses
// allowedNumber() to reject any figure that is not one of ours or arithmetic on one.
import { SOLAR_CONFIG as C } from '../../src/config/solar-config.ts';
import { BACKUP_CONFIG as B } from '../../src/config/backup-config.ts';
import { APPLIANCE_CONFIG as A } from '../../src/config/appliance-config.ts';

// The site's own helpers import each other without file extensions, which Vite resolves and plain
// Node does not, so the three formulas this checker needs are repeated here. They read from the
// same config, so a price or tariff change still flows through.
const priceKey = { 'on-grid': 'onGrid', hybrid: 'hybrid', 'off-grid': 'offGrid' };
function grossCost(kw, type, cfg = C) {
  const model = cfg.pricing[priceKey[type]];
  const quote = cfg.pricing.quotes[priceKey[type]].find((q) => q.kw === kw)?.amount;
  const fromModel = Math.max(model.base + model.perKw * kw, (model.minPerKw ?? 0) * kw);
  const start = quote ?? fromModel;
  return [start, (start * (100 + cfg.pricing.rangeUpPercent)) / 100];
}
function residentialSubsidy(kw, cfg = C) {
  const r = cfg.subsidy.residential;
  const first = Math.min(kw, r.firstBandKw) * r.firstBandPerKw;
  const second = Math.max(0, Math.min(kw, r.secondBandUpToKw) - r.firstBandKw) * r.secondBandPerKw;
  return Math.min(first + second, r.cap);
}

const perKwYear = C.generation.annualYieldPerKwp * C.generation.deratingFactor;
const perKwMonth = perKwYear / 12;
const perKwDay = perKwYear / 365;

export const FACTS_TEXT = `
- Punjab gives homes ${C.freeUnits.perMonth} free units a month (${C.freeUnits.perBillingCycle} per two-month bill). At or below that a home's bill is already zero, so solar has nothing to save.
- PM Surya Ghar pays ₹${C.subsidy.residential.firstBandPerKw.toLocaleString('en-IN')} per kW for the first ${C.subsidy.residential.firstBandKw} kW and ₹${C.subsidy.residential.secondBandPerKw.toLocaleString('en-IN')} for the third, capped at ₹${C.subsidy.residential.cap.toLocaleString('en-IN')}. Housing societies: ₹${C.subsidy.society.perKw.toLocaleString('en-IN')} per kW up to ${C.subsidy.society.maxKw} kW.
- The subsidy is paid into the applicant's own bank account ${C.subsidy.disbursementDays[0]} to ${C.subsidy.disbursementDays[1]} days after the DISCOM inspection. It never comes off the invoice, and it never goes to a lender or an installer.
- On-grid and hybrid systems qualify for the subsidy. Off-grid does not. Panels must be DCR and on the ALMM list.
- Generation: ${C.generation.annualYieldPerKwp} units per kWp a year, less ${Math.round((1 - C.generation.deratingFactor) * 100)}% for losses, which is ${Math.round(perKwYear)} units per kW a year, about ${Math.round(perKwMonth)} a month or ${perKwDay.toFixed(1)} a day. In December and January fog, plan on about ${Math.round(B.winterYieldFactor * 100)}% of that.
- Roof: about ${C.generation.sqFtPerKw} sq ft of shade-free roof per kW.
- A rooftop system can be at most ${C.netMetering.maxSystemPercentOfSanctionedLoad}% of the sanctioned load.
- Net metering: the units a home uses as they are made are the ones worth most, because they replace units that would have been bought. Surplus sent to the grid is credited under net metering rules at a lower value, and our calculations give it no value at all, so no saving figure is ever built on export.
- Smallest systems RSK Solar Energy installs: on-grid ${C.sizing.minKwByType['on-grid']} kW, hybrid and off-grid ${C.sizing.minKwByType.hybrid} kW.
- Installed price ranges, before subsidy: ${[3, 5]
  .map((kw) => {
    const [lo, hi] = grossCost(kw, 'on-grid', C);
    return `${kw} kW on-grid ₹${Math.round(lo).toLocaleString('en-IN')} to ₹${Math.round(hi).toLocaleString('en-IN')}`;
  })
  .join(', ')}. Every price on the site is a range and is described as an estimate.
- Batteries: lithium is planned at ${Math.round(B.battery.lithium.usable * 100)}% usable each cycle, tubular at ${Math.round(B.battery.tubular.usable * 100)}%.
- RSK Solar Energy is a UTL Solar distributor at Phase 8B, Mohali, since 2022. Own team in Mohali, Kharar, Zirakpur, Derabassi, Chandigarh, Panchkula, Kurali, Morinda, Ropar, Fatehgarh Sahib, Chamkaur Sahib and Khamanon; UTL dealers elsewhere in Punjab. No warranty of its own: product warranties are the manufacturer's.
`;

/**
 * Figures a post may print, kept apart by kind. A price is only ever checked against prices, a
 * unit count against unit counts, and so on, because a figure that is near a real price by
 * accident is still wrong when it claims to be kilowatt hours.
 */
function buildSets() {
  const money = new Set([
    C.subsidy.residential.firstBandPerKw,
    C.subsidy.residential.secondBandPerKw,
    C.subsidy.residential.cap,
    C.subsidy.society.perKw,
    C.subsidy.residential.firstBandKw * C.subsidy.residential.firstBandPerKw,
  ]);
  const units = new Set([C.freeUnits.perMonth, C.freeUnits.perBillingCycle, C.generation.annualYieldPerKwp, Math.round(perKwYear), Math.round(perKwMonth), Number(perKwDay.toFixed(1))]);
  const kw = new Set([...C.sizing.standardSizesKw, ...C.sizing.sizePagesKw, ...Object.values(C.sizing.minKwByType), ...B.inverter.sizes.map((s) => s.kva), C.subsidy.society.maxKw, ...A.ac.tons]);
  const volts = new Set(B.inverter.sizes.map((s) => s.volts));
  const area = new Set([C.generation.sqFtPerKw]);
  const percent = new Set([
    Math.round((1 - C.generation.deratingFactor) * 100),
    C.netMetering.maxSystemPercentOfSanctionedLoad,
    C.projection.tariffEscalationPercent,
    C.projection.panelDegradationPercent,
    C.pricing.rangeUpPercent,
    Math.round(B.winterYieldFactor * 100),
    Math.round(B.offGridNightShare * 100),
    Math.round(B.battery.lithium.usable * 100),
    Math.round(B.battery.tubular.usable * 100),
    Math.round(A.scenarios.essentialShare * 100),
    Math.round(A.scenarios.futureHeadroom * 100),
    100,
  ]);
  const days = new Set([...C.subsidy.disbursementDays, 365, ...A.ac.seasons.map((s) => s.days), ...A.geyser.seasons.map((s) => s.days), ...Object.values(A.seasons)]);
  const years = new Set([C.projection.horizonYears, 2022, new Date().getFullYear()]);

  for (const size of C.sizing.standardSizesKw) {
    for (const type of ['on-grid', 'hybrid', 'off-grid']) {
      if (size < C.sizing.minKwByType[type]) continue;
      const [lo, hi] = grossCost(size, type, C);
      const subsidy = type === 'off-grid' ? 0 : residentialSubsidy(size, C);
      for (const v of [lo, hi, lo - subsidy, hi - subsidy]) money.add(Math.round(v));
    }
    units.add(Math.round(size * perKwMonth));
    units.add(Math.round(size * perKwYear));
    units.add(Math.round(size * perKwYear * B.winterYieldFactor));
    units.add(Number((size * perKwDay).toFixed(1)));
    area.add(size * C.generation.sqFtPerKw);
  }
  return { money, units, kw, volts, area, percent, days, years };
}

const SETS = buildSets();
/** Counts small enough that no reader treats them as a claim. */
const EVERYDAY = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

const near = (a, b) => Math.abs(a - b) <= Math.max(0.05, Math.abs(b) * 0.02);
const inSet = (value, set) => [...set].some((b) => near(value, b) || near(value, Math.round(b / 10) * 10) || near(value, Math.round(b / 100) * 100) || near(value, Math.round(b / 1000) * 1000));

/**
 * Is this figure one of ours? `kind` is what the sentence says it is: money, units, kw, area,
 * percent, days or years. Unit counts also allow arithmetic on the generation figure, which is how
 * a post works out what a given system size makes.
 */
export function allowedNumber(value, kind = 'other') {
  if (!Number.isFinite(value)) return false;
  if (value === 0) return true;
  if (kind !== 'money' && EVERYDAY.has(value)) return true;
  const set = SETS[kind];
  if (set && inSet(value, set)) return true;
  if (kind === 'units') {
    for (let size = 1; size <= 50; size++) {
      for (const per of [perKwDay, perKwMonth, perKwYear, perKwYear * B.winterYieldFactor]) if (near(value, size * per)) return true;
    }
  }
  if (kind === 'area') {
    for (let size = 1; size <= 50; size++) if (near(value, size * C.generation.sqFtPerKw)) return true;
  }
  if (kind === 'other') return Object.values(SETS).some((s) => inSet(value, s));
  return false;
}

export const LIMITS = { perKwDay, perKwMonth, perKwYear };
