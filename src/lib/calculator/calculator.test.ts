import { describe, expect, it } from 'vitest';
import { SOLAR_CONFIG, type SolarConfig } from '../../config/solar-config';
import { calculate, confirmedPrice, grossCost, isPriceConfirmed, lifetimeSaving } from './calculate';
import { inr, inrRange, inrWords, yearsRange } from './format';
import { largestSizeWithin, nearestSize, sizeAtLeast, sizesForType } from './sizing';
import { computeSubsidy, residentialSubsidy, societySubsidy } from './subsidy';
import { minimumBillAboveThreshold, monthlyBill, telescopicCharge, unitsFromBill, type TariffContext } from './tariff';
import type { CalcInput, Category } from './types';

/**
 * Fixed fixture so exact-value assertions do not break when RSK updates real rates.
 * Invariant tests further down run against the live SOLAR_CONFIG as well.
 */
const T: SolarConfig = {
  ...SOLAR_CONFIG,
  pspcl: {
    ...SOLAR_CONFIG.pspcl,
    domestic: [
      { maxLoadKw: 2, slabs: [{ upTo: 300, rate: 4 }, { upTo: Infinity, rate: 7 }], fixedPerKwMonth: 50 },
      { maxLoadKw: 7, slabs: [{ upTo: 300, rate: 4 }, { upTo: Infinity, rate: 7 }], fixedPerKwMonth: 70 },
      { maxLoadKw: 20, slabs: [{ upTo: 300, rate: 5 }, { upTo: Infinity, rate: 7 }], fixedPerKwMonth: 100 },
    ],
    commercial: [
      { maxLoadKw: 20, slabs: [{ upTo: 500, rate: 6 }, { upTo: Infinity, rate: 7 }], fixedPerKwMonth: 100 },
      { maxLoadKw: Infinity, slabs: [{ upTo: Infinity, rate: 6.5 }], fixedPerKwMonth: 140 },
    ],
    electricityDutyPercent: 10,
    fuelAdjustmentPerUnit: 0,
  },
  generation: { ...SOLAR_CONFIG.generation, annualYieldPerKwp: 1500, deratingFactor: 0.8 }, // 100 units/kW/month
  pricing: {
    ...SOLAR_CONFIG.pricing,
    onGrid: [{ upToKw: Infinity, perKw: [50000, 60000] }],
    hybrid: [{ upToKw: Infinity, perKw: [80000, 90000] }],
    offGrid: [{ upToKw: Infinity, perKw: [70000, 80000] }],
    // Fixture-only confirmed price, deliberately distinct from RSK's real numbers, so this
    // suite stays isolated from them (kw 3 exercises the exact-price path; kw 5 exercises the
    // band-estimate fallback).
    hybridConfirmed: [{ kw: 3, amount: 99000 }],
  },
};

// Sanctioned load is required by validate() for every category except agricultural, so every
// test gets a default 5 kW unless it overrides or deliberately omits it via `extra`.
const units = (value: number, category: Category = 'domestic', extra: Partial<CalcInput> = {}): CalcInput => ({
  consumption: { kind: 'units', value, periodMonths: 1 },
  category,
  sanctionedLoadKw: 5,
  ...extra,
});
const bill = (value: number, category: Category = 'domestic', extra: Partial<CalcInput> = {}): CalcInput => ({
  consumption: { kind: 'bill', value, periodMonths: 1 },
  category,
  sanctionedLoadKw: 5,
  ...extra,
});

const ctx = (over: Partial<TariffContext> = {}): TariffContext => ({
  category: 'domestic',
  scheme: 'general',
  loadKw: 5,
  config: T,
  ...over,
});

describe('telescopic slabs', () => {
  const slabs = T.pspcl.domestic[1]!.slabs;
  it('charges each band at its own rate', () => {
    expect(telescopicCharge(0, 300, slabs)).toBe(1200);
    expect(telescopicCharge(0, 301, slabs)).toBe(1207);
    expect(telescopicCharge(0, 400, slabs)).toBe(1900);
  });
  it('supports a partial range (reserved-category billing)', () => {
    expect(telescopicCharge(300, 400, slabs)).toBe(700);
  });
  it('handles the NRS boundary at 500 units', () => {
    const nrs = T.pspcl.commercial[0]!.slabs;
    expect(telescopicCharge(0, 500, nrs)).toBe(3000);
    expect(telescopicCharge(0, 501, nrs)).toBe(3007);
  });
});

describe('monthly bill — Punjab free units', () => {
  it('299 and 300 units cost nothing at all, including fixed charges', () => {
    expect(monthlyBill(299, ctx()).total).toBe(0);
    expect(monthlyBill(300, ctx()).total).toBe(0);
  });
  it('301 units (general) charges every unit plus fixed charges and duty', () => {
    const b = monthlyBill(301, ctx());
    expect(b.chargeableUnits).toBe(301);
    expect(b.energy).toBe(1207);
    expect(b.fixed).toBe(350);
    expect(b.total).toBeCloseTo((1207 + 350) * 1.1, 6);
  });
  it('301 units (reserved category) charges only the unit above 300', () => {
    const b = monthlyBill(301, ctx({ scheme: 'reserved' }));
    expect(b.chargeableUnits).toBe(1);
    expect(b.energy).toBe(7);
    expect(b.fixed).toBe(350);
  });
  it('commercial pays from the first unit — no free units', () => {
    expect(monthlyBill(100, ctx({ category: 'commercial' })).energy).toBe(600);
  });
  it('picks the tariff band by sanctioned load', () => {
    expect(monthlyBill(400, ctx({ loadKw: 2 })).fixed).toBe(100);
    expect(monthlyBill(400, ctx({ loadKw: 10 })).energy).toBe(300 * 5 + 100 * 7);
  });
  it('agricultural is never billed', () => {
    expect(monthlyBill(5000, ctx({ category: 'agricultural' })).total).toBe(0);
  });
});

describe('bill → units', () => {
  it('round-trips unit counts across the domestic slab boundary', () => {
    for (const u of [301, 350, 450, 600, 1200, 5000]) {
      const r = unitsFromBill(monthlyBill(u, ctx()).total, ctx());
      expect(r).toEqual({ kind: 'units', units: u });
    }
  });
  it('round-trips commercial across the 500-unit boundary', () => {
    for (const u of [50, 499, 500, 501, 2000]) {
      const r = unitsFromBill(monthlyBill(u, ctx({ category: 'commercial' })).total, ctx({ category: 'commercial' }));
      expect(r).toEqual({ kind: 'units', units: u });
    }
  });
  it('a ₹0 domestic bill means at or under the free-units line', () => {
    expect(unitsFromBill(0, ctx())).toEqual({ kind: 'zero-bill' });
  });
  it('flags a domestic bill that cannot exist under the tariff', () => {
    const r = unitsFromBill(500, ctx());
    expect(r.kind).toBe('below-threshold');
    if (r.kind === 'below-threshold') expect(r.minimumBill).toBeCloseTo(minimumBillAboveThreshold(ctx()), 6);
  });
});

describe('PM Surya Ghar subsidy', () => {
  it.each([
    [1, 30000],
    [2, 60000],
    [3, 78000],
    [4, 78000],
    [5, 78000],
    [10, 78000],
    [1.5, 45000],
    [2.5, 69000],
  ])('%s kW residential → ₹%s', (kwIn, amount) => {
    expect(residentialSubsidy(kwIn, T)).toBe(amount);
  });
  it('zero and negative sizes get nothing', () => {
    expect(residentialSubsidy(0, T)).toBe(0);
    expect(residentialSubsidy(-3, T)).toBe(0);
  });
  it('housing societies get ₹18,000/kW capped at 500 kW', () => {
    expect(societySubsidy(20, T)).toBe(360000);
    expect(societySubsidy(600, T)).toBe(500 * 18000);
  });
  it.each(['commercial', 'industrial', 'agricultural'] as const)('%s → ₹0 with reason', (c) => {
    expect(computeSubsidy(3, c, 'on-grid', true, T)).toEqual({ amount: 0, scheme: 'none', ineligibleReason: 'category' });
  });
  it('off-grid → ₹0 with reason (not grid-connected, not net-metered)', () => {
    expect(computeSubsidy(3, 'domestic', 'off-grid', true, T)).toEqual({ amount: 0, scheme: 'none', ineligibleReason: 'system-type' });
  });
  it('hybrid → subsidised the same as on-grid (RSK’s hybrid installs are grid-tied and net-metered)', () => {
    expect(computeSubsidy(3, 'domestic', 'hybrid', true, T)).toEqual({ amount: residentialSubsidy(3, T), scheme: 'pmsg-residential', ineligibleReason: null });
  });
  it('tenant (does not own the roof) → ₹0 with reason', () => {
    expect(computeSubsidy(3, 'domestic', 'on-grid', false, T).ineligibleReason).toBe('ownership');
  });
});

describe('sizing helpers', () => {
  // Sizes: 1, 2, 3, 4, 5, 6, 8, 10, then 15, 20, 25 ...
  it('nearest offered size, ties to the larger', () => {
    expect(nearestSize(0.3, T)).toBe(1);
    expect(nearestSize(2.4, T)).toBe(2);
    expect(nearestSize(2.5, T)).toBe(3);
    expect(nearestSize(4, T)).toBe(4);
    expect(nearestSize(6.9, T)).toBe(6);
    expect(nearestSize(7, T)).toBe(8);
    expect(nearestSize(12.4, T)).toBe(10);
    expect(nearestSize(23, T)).toBe(25);
  });
  it('size at least', () => {
    expect(sizeAtLeast(1.01, T)).toBe(2);
    expect(sizeAtLeast(3, T)).toBe(3);
    expect(sizeAtLeast(6.2, T)).toBe(8);
    expect(sizeAtLeast(10.5, T)).toBe(15);
  });
  it('largest size within a limit', () => {
    expect(largestSizeWithin(4.5, T)).toBe(4);
    expect(largestSizeWithin(7, T)).toBe(6);
    expect(largestSizeWithin(5, T)).toBe(5);
    expect(largestSizeWithin(0.5, T)).toBeNull();
  });
  it('sizesForType restricts on-grid to 3 kW+; hybrid and off-grid keep the full ladder', () => {
    expect(sizesForType('on-grid', T)).toEqual([3, 4, 5, 6, 8, 10]);
    expect(sizesForType('hybrid', T)).toEqual([1, 2, 3, 4, 5, 6, 8, 10]);
    expect(sizesForType('off-grid', T)).toEqual([1, 2, 3, 4, 5, 6, 8, 10]);
  });
  it('a sizes override is never undercut by the full ladder', () => {
    const onGrid = sizesForType('on-grid', T);
    expect(nearestSize(0.3, T, onGrid)).toBe(3);
    expect(sizeAtLeast(0.5, T, onGrid)).toBe(3);
    expect(largestSizeWithin(2, T, onGrid)).toBeNull();
  });
});

describe('calculate — the free-units threshold (299 / 300 / 301)', () => {
  it('299 units → free-units outcome, no payback, no savings pitch', () => {
    const r = calculate(units(299), T);
    expect(r.outcome).toBe('free-units');
    expect(r.paybackYears).toBeNull();
    expect(r.annualSaving).toBe(0);
  });
  it('300 units → free-units outcome', () => {
    expect(calculate(units(300), T).outcome).toBe('free-units');
  });
  it('301 units → ok, and our smallest on-grid system (3 kW) takes the bill to zero', () => {
    const r = calculate(units(301), T);
    expect(r.outcome).toBe('ok');
    expect(r.systemKw).toBe(3);
    expect(r.zeroBill).toBe(true);
    expect(r.paybackYears).not.toBeNull();
  });
  it('a 2-month bill of 600 units is 300 a month → free units', () => {
    expect(calculate({ ...units(600), consumption: { kind: 'units', value: 600, periodMonths: 2 } }, T).outcome).toBe('free-units');
  });
  it('a ₹0 bill → free-units', () => {
    expect(calculate(bill(0), T).outcome).toBe('free-units');
  });
});

describe('calculate — sizing strategy', () => {
  it('domestic 450 units: zero-bill sizing beats full offset', () => {
    // (450 − 250) / 100 = 2 kW would bring net units to 250, but RSK's smallest on-grid
    // system is 3 kW, which comfortably clears the line too. Full offset would be 5 kW.
    const r = calculate(units(450), T);
    expect(r.strategy).toBe('zero-bill');
    expect(r.systemKw).toBe(3);
    expect(r.offsetKw).toBe(5);
    expect(r.zeroBill).toBe(true);
    expect(r.notes).toContainEqual({ code: 'zero-bill-sizing', offsetKw: 5 });
    expect(r.notes).toContainEqual({ code: 'net-units-assumption' });
  });
  it('commercial sizes to offset annual use', () => {
    const r = calculate(units(1000, 'commercial', { sanctionedLoadKw: 20 }), T);
    expect(r.strategy).toBe('offset');
    expect(r.systemKw).toBe(10);
  });
  it('large commercial goes past 10 kW in 5 kW steps and is flagged', () => {
    const r = calculate(units(4000, 'commercial', { sanctionedLoadKw: 100 }), T);
    expect(r.systemKw).toBe(40);
    expect(r.notes).toContainEqual({ code: 'large-system' });
  });
});

describe('calculate — sanctioned load', () => {
  it('recommended size exactly equal to sanctioned load is not capped', () => {
    const r = calculate(units(1000, 'commercial', { sanctionedLoadKw: 10 }), T);
    expect(r.systemKw).toBe(10);
    expect(r.notes.find((n) => n.code === 'capped-by-load')).toBeUndefined();
  });
  it('one step above sanctioned load is capped with a load-enhancement note', () => {
    const r = calculate(units(1000, 'commercial', { sanctionedLoadKw: 9 }), T);
    expect(r.systemKw).toBe(8);
    expect(r.notes).toContainEqual({ code: 'capped-by-load', requiredKw: 10, loadKw: 9 });
  });
  it('sanctioned load is required — missing it is invalid, not assumed', () => {
    const r = calculate(units(1000, 'commercial', { sanctionedLoadKw: undefined }), T);
    expect(r.outcome).toBe('invalid');
    expect(r.error).toMatch(/sanctioned load/i);
  });
  it('sanctioned load is required for every category except agricultural', () => {
    for (const category of ['domestic', 'commercial', 'industrial', 'society'] as const) {
      expect(calculate(units(1000, category, { sanctionedLoadKw: undefined }), T).outcome).toBe('invalid');
    }
    // Agricultural never uses load — Punjab supplies farm connections free.
    expect(calculate(units(1000, 'agricultural', { sanctionedLoadKw: undefined }), T).outcome).toBe('agricultural');
  });
  it('load below the smallest size → load-too-small', () => {
    expect(calculate(units(500, 'commercial', { sanctionedLoadKw: 0.5 }), T).outcome).toBe('load-too-small');
  });
  it('roof area caps the system', () => {
    const r = calculate(units(1000, 'commercial', { roofAreaSqFt: 350 }), T);
    expect(r.systemKw).toBe(3);
    expect(r.notes.some((n) => n.code === 'capped-by-roof')).toBe(true);
  });
});

describe('calculate — RSK sells on-grid from 3 kW; hybrid and off-grid from 1 kW', () => {
  it('a home just over the line never gets a sub-3kW on-grid system, even though less would zero the bill', () => {
    const r = calculate(units(310, 'domestic', { systemType: 'on-grid' }), T);
    expect(r.systemKw).toBe(3);
    expect(r.systemKw).toBeGreaterThanOrEqual(T.sizing.minKwByType['on-grid']);
    expect(r.zeroBill).toBe(true);
  });
  it('the same home on hybrid can go as low as 1 kW', () => {
    const r = calculate(units(310, 'domestic', { systemType: 'hybrid' }), T);
    expect(r.systemKw).toBe(1);
    expect(r.zeroBill).toBe(true);
  });
  it('the same home on off-grid can also go as low as 1 kW', () => {
    const r = calculate(units(310, 'domestic', { systemType: 'off-grid' }), T);
    expect(r.systemKw).toBe(1);
    expect(r.zeroBill).toBe(true);
  });
  it('a sanctioned load under 3 kW rules out on-grid, but not hybrid', () => {
    const onGrid = calculate(units(500, 'domestic', { systemType: 'on-grid', sanctionedLoadKw: 2 }), T);
    expect(onGrid.outcome).toBe('load-too-small');
    const hybrid = calculate(units(500, 'domestic', { systemType: 'hybrid', sanctionedLoadKw: 2 }), T);
    expect(hybrid.outcome).toBe('ok');
    expect(hybrid.systemKw).toBeLessThanOrEqual(2);
  });
  it('the same 2 kW sanctioned load is enough for off-grid too', () => {
    const r = calculate(units(500, 'domestic', { systemType: 'off-grid', sanctionedLoadKw: 2 }), T);
    expect(r.outcome).toBe('ok');
    expect(r.systemKw).toBeLessThanOrEqual(2);
  });
});

describe('confirmed hybrid pricing overrides the band estimate exactly', () => {
  it('an exact match uses the confirmed price, not the band estimate', () => {
    expect(confirmedPrice(3, 'hybrid', T)).toBe(99000);
    expect(isPriceConfirmed(3, 'hybrid', T)).toBe(true);
    expect(grossCost(3, 'hybrid', T)).toEqual([99000, 99000]);
  });
  it('a size with no confirmed price falls back to the band estimate', () => {
    expect(confirmedPrice(5, 'hybrid', T)).toBeNull();
    expect(isPriceConfirmed(5, 'hybrid', T)).toBe(false);
    expect(grossCost(5, 'hybrid', T)).toEqual([400000, 450000]); // 5 × [80000, 90000]
  });
  it('confirmed prices only apply to hybrid', () => {
    expect(confirmedPrice(3, 'on-grid', T)).toBeNull();
    expect(confirmedPrice(3, 'off-grid', T)).toBeNull();
  });
  it('calculate() reports priceConfirmed on the result', () => {
    const confirmed = calculate(units(500, 'domestic', { systemType: 'hybrid', sanctionedLoadKw: 10 }), T);
    expect(confirmed.systemKw).toBe(3);
    expect(confirmed.priceConfirmed).toBe(true);
    expect(confirmed.grossCost).toEqual([99000, 99000]);

    const estimated = calculate(units(750, 'domestic', { systemType: 'hybrid', sanctionedLoadKw: 10 }), T);
    expect(estimated.systemKw).toBe(5);
    expect(estimated.priceConfirmed).toBe(false);
  });
});

describe('calculate — subsidy gates flow through', () => {
  it('commercial and industrial get ₹0 subsidy', () => {
    expect(calculate(units(800, 'commercial'), T).subsidy.amount).toBe(0);
    expect(calculate(units(800, 'industrial'), T).subsidy.amount).toBe(0);
  });
  it('off-grid gets ₹0 subsidy, with the reason noted', () => {
    const r = calculate(units(800, 'domestic', { systemType: 'off-grid' }), T);
    expect(r.subsidy.amount).toBe(0);
    expect(r.notes).toContainEqual({ code: 'subsidy-ineligible', reason: 'system-type' });
  });
  it('hybrid gets the subsidy, same as on-grid', () => {
    const r = calculate(units(800, 'domestic', { systemType: 'hybrid' }), T);
    expect(r.subsidy.amount).toBeGreaterThan(0);
    expect(r.notes).not.toContainEqual({ code: 'subsidy-ineligible', reason: 'system-type' });
  });
  it('the 3 kW cap holds for a large home system', () => {
    const r = calculate(units(1400, 'domestic', { sanctionedLoadKw: 20 }), T);
    expect(r.systemKw).toBeGreaterThan(3);
    expect(r.subsidy.amount).toBe(78000);
  });
  it('net cost = gross − subsidy', () => {
    const r = calculate(units(450), T);
    expect(r.grossCost).toEqual([150000, 180000]);
    expect(r.netCost).toEqual([72000, 102000]);
  });
  it('agricultural → its own outcome', () => {
    expect(calculate(units(900, 'agricultural'), T).outcome).toBe('agricultural');
  });
});

describe('calculate — savings and payback', () => {
  it('saving equals the bill avoided', () => {
    const r = calculate(units(450), T);
    const before = monthlyBill(450, ctx()).total;
    expect(r.billBefore.total).toBeCloseTo(before, 6);
    expect(r.billAfter.total).toBe(0);
    expect(r.annualSaving).toBeCloseTo(before * 12, 6);
    expect(r.paybackYears![0]).toBeCloseTo(72000 / r.annualSaving, 6);
  });
  it('lifetime saving applies escalation and degradation', () => {
    const f = 1.03 * 0.995;
    const expected = (1000 * (1 - f ** 25)) / (1 - f);
    expect(lifetimeSaving(1000, T)).toBeCloseTo(expected, 6);
  });
  it('commercial saving is the energy charge avoided, fixed charges unchanged', () => {
    const r = calculate(units(1000, 'commercial', { sanctionedLoadKw: 20 }), T);
    expect(r.billAfter.fixed).toBe(r.billBefore.fixed);
    expect(r.annualSaving).toBeGreaterThan(0);
  });
});

describe('calculate — bill path and unit path agree', () => {
  it.each([350, 450, 700, 1200])('domestic %s units', (u) => {
    const byUnits = calculate(units(u, 'domestic', { sanctionedLoadKw: 5 }), T);
    const byBill = calculate(bill(monthlyBill(u, ctx()).total, 'domestic', { sanctionedLoadKw: 5 }), T);
    expect(byBill.monthlyUnits).toBe(u);
    expect(byBill.systemKw).toBe(byUnits.systemKw);
    expect(byBill.annualSaving).toBeCloseTo(byUnits.annualSaving, 6);
    expect(byBill.estimated).toBe(true);
    expect(byBill.notes).toContainEqual({ code: 'estimated-from-bill' });
  });
  it('a domestic bill below the smallest possible bill → bill-below-threshold', () => {
    const r = calculate(bill(800), T);
    expect(r.outcome).toBe('bill-below-threshold');
    expect(r.minimumBillAboveThreshold).toBeGreaterThan(800);
    expect(r.paybackYears).toBeNull();
  });
});

describe('calculate — bad input', () => {
  it.each([
    ['zero units', units(0)],
    ['negative units', units(-100)],
    ['NaN', units(Number.NaN)],
    ['Infinity', units(Number.POSITIVE_INFINITY)],
    ['absurd units', units(10_000_000)],
    ['absurd bill', bill(9e9)],
    ['non-numeric', units('abc' as unknown as number)],
    ['negative load', units(400, 'domestic', { sanctionedLoadKw: -2 })],
    ['zero roof', units(400, 'domestic', { roofAreaSqFt: 0 })],
    ['commercial bill below fixed charges', bill(50, 'commercial', { sanctionedLoadKw: 20 })],
  ])('%s → invalid with a message', (_, input) => {
    const r = calculate(input, T);
    expect(r.outcome).toBe('invalid');
    expect(r.error).toMatch(/\w/);
    expect(r.paybackYears).toBeNull();
  });
});

describe('INVARIANT: a domestic user at or under the threshold never sees a payback figure', () => {
  for (const config of [T, SOLAR_CONFIG]) {
    it(`holds for every unit count 0–300 and every option (${config === T ? 'fixture' : 'live config'})`, () => {
      for (let u = 0; u <= 300; u++) {
        for (const scheme of ['general', 'reserved'] as const) {
          for (const systemType of ['on-grid', 'hybrid', 'off-grid'] as const) {
            for (const periodMonths of [1, 2] as const) {
              const r = calculate(
                { consumption: { kind: 'units', value: u * periodMonths, periodMonths }, category: 'domestic', scheme, systemType, sanctionedLoadKw: 5 },
                config,
              );
              expect(r.paybackYears).toBeNull();
              expect(r.outcome).not.toBe('ok');
            }
          }
        }
      }
    });
    it(`holds for every small bill (${config === T ? 'fixture' : 'live config'})`, () => {
      const min = minimumBillAboveThreshold({ category: 'domestic', scheme: 'general', loadKw: 5, config });
      for (let b = 0; b < min; b += 25) {
        const r = calculate(bill(b, 'domestic', { sanctionedLoadKw: 5 }), config);
        expect(r.paybackYears).toBeNull();
      }
    });
  }
});

describe('live config sanity', () => {
  it('every standard size prices and subsidises without error', () => {
    for (const s of SOLAR_CONFIG.sizing.standardSizesKw) {
      const [lo, hi] = grossCost(s, 'on-grid');
      expect(lo).toBeGreaterThan(0);
      expect(hi).toBeGreaterThanOrEqual(lo);
    }
  });
  it('a typical Mohali home (500 units, 2-month bill of 1,000 units) gets a sensible result', () => {
    const r = calculate({ consumption: { kind: 'units', value: 1000, periodMonths: 2 }, category: 'domestic', sanctionedLoadKw: 5 });
    expect(r.outcome).toBe('ok');
    expect(r.systemKw).toBeGreaterThanOrEqual(2);
    expect(r.systemKw).toBeLessThanOrEqual(5);
    expect(r.paybackYears![0]).toBeGreaterThan(0);
    expect(r.paybackYears![1]).toBeLessThan(15);
  });
});

describe('format', () => {
  it('uses Indian digit grouping', () => {
    expect(inr(107000)).toBe('₹1,07,000');
    expect(inrRange([107000, 120000])).toBe('₹1,07,000 – 1,20,000');
    expect(inrRange([107400, 107400])).toBe('₹1,07,000');
    expect(inrWords(1140000)).toBe('₹11.4 lakh');
    expect(inrWords(12000000)).toBe('₹1.2 crore');
    expect(yearsRange([3.52, 3.94])).toBe('3.5 – 3.9 years');
  });
});
