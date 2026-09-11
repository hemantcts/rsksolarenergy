import type { SolarConfig, Slab, TariffBand } from '../../config/solar-config';
import type { BillBreakdown, Category, DomesticScheme } from './types';

export interface TariffContext {
  category: Category;
  scheme: DomesticScheme;
  loadKw: number;
  config: SolarConfig;
}

export function bandsFor(category: Category, config: SolarConfig): readonly TariffBand[] {
  switch (category) {
    case 'domestic':
      return config.pspcl.domestic;
    case 'commercial':
      return config.pspcl.commercial;
    case 'industrial':
      return config.pspcl.industrial;
    case 'society':
      return config.pspcl.society;
    case 'agricultural':
      // Free power in Punjab. Never billed; callers handle this category before reaching here.
      return [{ maxLoadKw: Infinity, slabs: [{ upTo: Infinity, rate: 0 }], fixedPerKwMonth: 0 }];
  }
}

export function bandForLoad(bands: readonly TariffBand[], loadKw: number): TariffBand {
  const band = bands.find((b) => loadKw <= b.maxLoadKw) ?? bands[bands.length - 1];
  if (!band) throw new Error('Tariff has no bands');
  return band;
}

/** Telescopic energy charge for the units between `from` and `to`. */
export function telescopicCharge(from: number, to: number, slabs: readonly Slab[]): number {
  let charge = 0;
  let lower = 0;
  for (const slab of slabs) {
    const bandStart = Math.max(from, lower);
    const bandEnd = Math.min(to, slab.upTo);
    if (bandEnd > bandStart) charge += (bandEnd - bandStart) * slab.rate;
    lower = slab.upTo;
    if (lower >= to) break;
  }
  return charge;
}

const ZERO_BILL: BillBreakdown = { chargeableUnits: 0, energy: 0, fixed: 0, duty: 0, total: 0 };

/**
 * Monthly PSPCL bill for a given consumption.
 *
 * Domestic, Punjab free-units scheme (Dept of Power memo, 04.03.2026):
 *  - at or under the threshold: nothing at all — no energy, fixed charges, rent or levies
 *  - general category above it: energy charges on ALL units, plus fixed charges and levies
 *  - reserved category above it: only units above the threshold, plus fixed charges and levies
 */
export function monthlyBill(units: number, ctx: TariffContext): BillBreakdown {
  const { config, category, scheme, loadKw } = ctx;
  if (category === 'agricultural') return ZERO_BILL;
  // Non-domestic connections pay fixed charges even with zero net consumption.
  if (!(units > 0)) units = 0;

  const band = bandForLoad(bandsFor(category, config), loadKw);
  const threshold = config.freeUnits.perMonth;

  let energy: number;
  let chargeableUnits: number;
  if (category === 'domestic') {
    if (units <= threshold) return ZERO_BILL;
    const from = scheme === 'reserved' ? threshold : 0;
    energy = telescopicCharge(from, units, band.slabs);
    chargeableUnits = units - from;
  } else {
    energy = telescopicCharge(0, units, band.slabs);
    chargeableUnits = units;
  }

  energy += chargeableUnits * config.pspcl.fuelAdjustmentPerUnit;
  const fixed = band.fixedPerKwMonth * loadKw;
  const duty = ((energy + fixed) * config.pspcl.electricityDutyPercent) / 100;
  return { chargeableUnits, energy, fixed, duty, total: energy + fixed + duty };
}

/** Smallest bill a domestic consumer can receive once over the free-units line. */
export function minimumBillAboveThreshold(ctx: TariffContext): number {
  return monthlyBill(ctx.config.freeUnits.perMonth + 1, ctx).total;
}

export type UnitsFromBill =
  | { kind: 'units'; units: number }
  /** Domestic bill of ₹0: at or under the threshold, exact units unknowable. */
  | { kind: 'zero-bill' }
  /** A positive domestic bill smaller than the smallest possible bill above the threshold. */
  | { kind: 'below-threshold'; minimumBill: number };

const MAX_UNITS_SEARCH = 5_000_000;

/**
 * Reverse a monthly ₹ bill into monthly units by walking the tariff.
 * The bill function is monotonic non-decreasing in units, so binary search is exact
 * to the nearest unit.
 */
export function unitsFromBill(bill: number, ctx: TariffContext): UnitsFromBill {
  const threshold = ctx.config.freeUnits.perMonth;
  if (ctx.category === 'domestic') {
    if (bill <= 0) return { kind: 'zero-bill' };
    const minimumBill = minimumBillAboveThreshold(ctx);
    if (bill < minimumBill) return { kind: 'below-threshold', minimumBill };
  }
  if (bill <= 0) return { kind: 'units', units: 0 };

  let lo = ctx.category === 'domestic' ? threshold + 1 : 0;
  let hi = MAX_UNITS_SEARCH;
  if (monthlyBill(hi, ctx).total < bill) return { kind: 'units', units: hi };
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (monthlyBill(mid, ctx).total >= bill) hi = mid;
    else lo = mid + 1;
  }
  // lo is the first unit count whose bill reaches the target; pick the closer neighbour.
  const above = monthlyBill(lo, ctx).total;
  const below = lo > 0 ? monthlyBill(lo - 1, ctx).total : -Infinity;
  const units = bill - below < above - bill && lo - 1 > (ctx.category === 'domestic' ? threshold : -1) ? lo - 1 : lo;
  return { kind: 'units', units };
}
