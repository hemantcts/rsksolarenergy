import { SOLAR_CONFIG, type PriceBand, type SolarConfig } from '../../config/solar-config';
import { computeSubsidy } from './subsidy';
import {
  effectiveYieldPerKw,
  kwForMonthlyUnits,
  largestSizeWithin,
  monthlyGenerationPerKw,
  nearestSize,
  sizeAtLeast,
  sizesForType,
} from './sizing';
import { minimumBillAboveThreshold, monthlyBill, unitsFromBill, type TariffContext } from './tariff';
import type { BillBreakdown, CalcInput, CalcResult, Note, Range, SystemType } from './types';

/** Inputs beyond these are treated as typos, not consumption. */
export const INPUT_LIMITS = {
  maxMonthlyUnits: 500_000,
  maxMonthlyBill: 50_000_000,
  maxLoadKw: 5_000,
} as const;

const ZERO: BillBreakdown = { chargeableUnits: 0, energy: 0, fixed: 0, duty: 0, total: 0 };

function priceBands(type: SystemType, config: SolarConfig): readonly PriceBand[] {
  if (type === 'hybrid') return config.pricing.hybrid;
  if (type === 'off-grid') return config.pricing.offGrid;
  return config.pricing.onGrid;
}

/** RSK's confirmed exact total for this size and type, if one has been supplied. */
export function confirmedPrice(kw: number, type: SystemType, config: SolarConfig = SOLAR_CONFIG): number | null {
  if (type !== 'hybrid') return null;
  return config.pricing.hybridConfirmed.find((p) => p.kw === kw)?.amount ?? null;
}

/** True when the price behind grossCost() is a real confirmed figure, not the placeholder band estimate. */
export function isPriceConfirmed(kw: number, type: SystemType, config: SolarConfig = SOLAR_CONFIG): boolean {
  return confirmedPrice(kw, type, config) != null;
}

export function grossCost(kw: number, type: SystemType, config: SolarConfig = SOLAR_CONFIG): Range {
  const exact = confirmedPrice(kw, type, config);
  if (exact != null) return [exact, exact];
  const bands = priceBands(type, config);
  const band = bands.find((b) => kw <= b.upToKw) ?? bands[bands.length - 1];
  if (!band) return [0, 0];
  return [kw * band.perKw[0], kw * band.perKw[1]];
}

/** Sum of annual savings over the horizon with tariff escalation and panel degradation. */
export function lifetimeSaving(annual: number, config: SolarConfig = SOLAR_CONFIG): number {
  const { tariffEscalationPercent, panelDegradationPercent, horizonYears } = config.projection;
  const factor = (1 + tariffEscalationPercent / 100) * (1 - panelDegradationPercent / 100);
  let total = 0;
  for (let y = 0; y < horizonYears; y++) total += annual * factor ** y;
  return total;
}

function blank(input: CalcInput, outcome: CalcResult['outcome'], error?: string): CalcResult {
  return {
    outcome,
    ...(error ? { error } : {}),
    monthlyUnits: 0,
    estimated: input.consumption.kind === 'bill',
    category: input.category,
    scheme: input.scheme ?? 'general',
    systemType: input.systemType ?? 'on-grid',
    loadKw: input.sanctionedLoadKw ?? 0,
    loadKnown: input.sanctionedLoadKw != null,
    systemKw: 0,
    priceConfirmed: false,
    offsetKw: 0,
    strategy: 'offset',
    coversPercent: 0,
    roofSqFt: 0,
    annualGeneration: 0,
    monthlyGeneration: 0,
    grossCost: [0, 0],
    subsidy: { amount: 0, scheme: 'none', ineligibleReason: null },
    netCost: [0, 0],
    billBefore: ZERO,
    billAfter: ZERO,
    annualSaving: 0,
    zeroBill: false,
    paybackYears: null,
    lifetimeSaving: 0,
    notes: [],
  };
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

export function validate(input: CalcInput): string | null {
  const { value, kind, periodMonths } = input.consumption;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return kind === 'bill' ? 'Enter your bill amount in rupees, digits only.' : 'Enter the units on your bill, digits only.';
  }
  if (value < 0) return 'The figure cannot be negative.';
  if (value === 0 && kind === 'units') return 'Enter the units consumed from your bill. It must be more than zero.';
  if (periodMonths !== 1 && periodMonths !== 2) return 'Choose whether your bill covers one month or two.';
  const monthly = value / periodMonths;
  if (kind === 'units' && monthly > INPUT_LIMITS.maxMonthlyUnits) {
    return 'That is more units than any single connection uses. Check the figure on your bill.';
  }
  if (kind === 'bill' && monthly > INPUT_LIMITS.maxMonthlyBill) {
    return 'That bill is larger than any single connection. Check the amount.';
  }
  const load = input.sanctionedLoadKw;
  if (load != null && (!Number.isFinite(load) || load <= 0 || load > INPUT_LIMITS.maxLoadKw)) {
    return 'Sanctioned load should be a number in kW, as printed on your bill. Leave it empty if you are unsure.';
  }
  const roof = input.roofAreaSqFt;
  if (roof != null && (!Number.isFinite(roof) || roof <= 0)) {
    return 'Roof area should be in square feet. Leave it empty if you are unsure.';
  }
  return null;
}

export function calculate(input: CalcInput, config: SolarConfig = SOLAR_CONFIG): CalcResult {
  const error = validate(input);
  if (error) return blank(input, 'invalid', error);

  const category = input.category;
  const scheme = category === 'domestic' ? (input.scheme ?? 'general') : 'general';
  const systemType: SystemType = input.systemType ?? 'on-grid';
  const loadKnown = isPositiveFinite(input.sanctionedLoadKw);
  const loadKw = loadKnown ? (input.sanctionedLoadKw as number) : config.sizing.defaultSanctionedLoadKw;
  const ownsRoof = input.ownsRoof ?? true;
  const notes: Note[] = [];
  const ctx: TariffContext = { category, scheme, loadKw, config };

  const base = { ...blank(input, 'ok'), category, scheme, systemType, loadKw, loadKnown };

  if (category === 'agricultural') return { ...base, outcome: 'agricultural' };

  // 1. Consumption in units per month.
  const monthlyFigure = input.consumption.value / input.consumption.periodMonths;
  let monthlyUnits: number;
  const estimated = input.consumption.kind === 'bill';
  if (estimated) {
    const derived = unitsFromBill(monthlyFigure, ctx);
    if (derived.kind === 'zero-bill') {
      return { ...base, outcome: 'free-units', estimated };
    }
    if (derived.kind === 'below-threshold') {
      return { ...base, outcome: 'bill-below-threshold', estimated, minimumBillAboveThreshold: derived.minimumBill };
    }
    monthlyUnits = derived.units;
    if (monthlyUnits <= 0) {
      return blank(input, 'invalid', 'That bill is below the fixed charges for this connection. Enter the units from your bill instead.');
    }
    notes.push({ code: 'estimated-from-bill' });
  } else {
    monthlyUnits = monthlyFigure;
  }
  if (!loadKnown) notes.push({ code: 'load-assumed', assumedKw: loadKw });

  // 2. The Punjab constraint: at or under the free-units line, solar cannot pay back on bill savings.
  if (category === 'domestic' && monthlyUnits <= config.freeUnits.perMonth) {
    return { ...base, outcome: 'free-units', monthlyUnits, estimated, notes };
  }

  // 3. Sizing. RSK's installed size ladder for this system type — on-grid starts at
  //    config.sizing.minKwByType['on-grid'] (3 kW); hybrid and off-grid from 1 kW.
  const sizes = sizesForType(systemType, config);
  const perKwMonth = monthlyGenerationPerKw(config);
  const offsetKw = nearestSize(kwForMonthlyUnits(monthlyUnits, config), config, sizes);
  let requiredKw = offsetKw;
  let strategy: CalcResult['strategy'] = 'offset';

  if (category === 'domestic' && config.freeUnits.appliesToNetUnits) {
    // Bring net units under the free-units line with headroom; beyond that, extra capacity
    // saves almost nothing because the bill is already zero. Never below the smallest size
    // RSK installs for this system type, even if less would technically do the job.
    const target = Math.min(config.sizing.zeroBillTargetUnits, config.freeUnits.perMonth);
    const zeroBillKw = sizeAtLeast((monthlyUnits - target) / perKwMonth, config, sizes);
    if (zeroBillKw < offsetKw) {
      requiredKw = zeroBillKw;
      strategy = 'zero-bill';
      notes.push({ code: 'zero-bill-sizing', offsetKw });
    }
    notes.push({ code: 'net-units-assumption' });
  }

  let systemKw = requiredKw;
  if (isPositiveFinite(input.roofAreaSqFt)) {
    const roofKw = input.roofAreaSqFt / config.generation.sqFtPerKw;
    if (systemKw > roofKw) {
      const fits = largestSizeWithin(roofKw, config, sizes);
      if (fits == null) return { ...base, outcome: 'load-too-small', monthlyUnits, estimated, notes };
      notes.push({ code: 'capped-by-roof', requiredKw: systemKw, roofKw });
      systemKw = fits;
    }
  }
  const loadLimit = (loadKw * config.netMetering.maxSystemPercentOfSanctionedLoad) / 100;
  if (loadKnown && systemKw > loadLimit) {
    const fits = largestSizeWithin(loadLimit, config, sizes);
    if (fits == null) return { ...base, outcome: 'load-too-small', monthlyUnits, estimated, notes };
    notes.push({ code: 'capped-by-load', requiredKw: systemKw, loadKw });
    systemKw = fits;
  }
  if (systemKw > Math.max(...config.sizing.standardSizesKw)) notes.push({ code: 'large-system' });
  if (category === 'industrial') notes.push({ code: 'industrial-kvah' });
  if (systemType === 'off-grid') notes.push({ code: 'off-grid-no-export' });

  // 4. Generation.
  const annualGeneration = systemKw * effectiveYieldPerKw(config);
  const monthlyGeneration = annualGeneration / 12;

  // 5. Cost and subsidy.
  const gross = grossCost(systemKw, systemType, config);
  const priceConfirmed = isPriceConfirmed(systemKw, systemType, config);
  const subsidy = computeSubsidy(systemKw, category, systemType, ownsRoof, config);
  if (subsidy.ineligibleReason) notes.push({ code: 'subsidy-ineligible', reason: subsidy.ineligibleReason });
  const netCost: Range = [Math.max(0, gross[0] - subsidy.amount), Math.max(0, gross[1] - subsidy.amount)];

  // 6. Savings. Solar displaces the most expensive units first; the bill function captures
  //    slabs, the free-units cliff, fixed charges and duty in one place.
  const billBefore = monthlyBill(monthlyUnits, ctx);
  const netUnits = Math.max(0, monthlyUnits - monthlyGeneration);
  const billAfter = monthlyBill(netUnits, ctx);
  const exportUnits = systemType === 'off-grid' ? 0 : Math.max(0, monthlyGeneration - monthlyUnits);
  const annualSaving = 12 * (billBefore.total - billAfter.total) + 12 * exportUnits * config.netMetering.exportCreditPerUnit;
  const paybackYears: Range | null = annualSaving > 0 ? [netCost[0] / annualSaving, netCost[1] / annualSaving] : null;

  return {
    ...base,
    outcome: 'ok',
    monthlyUnits,
    estimated,
    systemKw,
    priceConfirmed,
    offsetKw,
    strategy,
    coversPercent: Math.min(100, (annualGeneration / (monthlyUnits * 12)) * 100),
    roofSqFt: systemKw * config.generation.sqFtPerKw,
    annualGeneration,
    monthlyGeneration,
    grossCost: gross,
    subsidy,
    netCost,
    billBefore,
    billAfter,
    annualSaving,
    zeroBill: billBefore.total > 0 && billAfter.total === 0,
    paybackYears,
    lifetimeSaving: annualSaving > 0 ? lifetimeSaving(annualSaving, config) : 0,
    notes,
  };
}

export { minimumBillAboveThreshold };
