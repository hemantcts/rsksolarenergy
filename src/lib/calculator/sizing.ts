import type { SolarConfig } from '../../config/solar-config';

/** Effective units per kW per year after derating. */
export function effectiveYieldPerKw(config: SolarConfig): number {
  return config.generation.annualYieldPerKwp * config.generation.deratingFactor;
}

export function monthlyGenerationPerKw(config: SolarConfig): number {
  return effectiveYieldPerKw(config) / 12;
}

const ABSOLUTE_MAX_KW = 5000;

/** Every offered size up to `limitKw`: the standard sizes, then steps of largeStepKw. */
export function candidateSizes(config: SolarConfig, limitKw = ABSOLUTE_MAX_KW): number[] {
  const standard = [...config.sizing.standardSizesKw].sort((a, b) => a - b);
  const sizes = standard.filter((s) => s <= limitKw);
  const step = config.sizing.largeStepKw;
  const top = standard[standard.length - 1] ?? 0;
  for (let s = Math.ceil((top + 1) / step) * step; s <= limitKw; s += step) sizes.push(s);
  return sizes;
}

/** Nearest offered size; ties go to the larger size. Never below the smallest size. */
export function nearestSize(kw: number, config: SolarConfig): number {
  const sizes = candidateSizes(config, Math.max(kw * 2, 20));
  let best = sizes[0] ?? 1;
  for (const s of sizes) {
    if (Math.abs(s - kw) <= Math.abs(best - kw)) best = s;
    if (s > kw && Math.abs(s - kw) > Math.abs(best - kw)) break;
  }
  return best;
}

/** Smallest offered size that is at least `kw`. */
export function sizeAtLeast(kw: number, config: SolarConfig): number {
  const sizes = candidateSizes(config, Math.max(kw + config.sizing.largeStepKw, 20));
  return sizes.find((s) => s >= kw - 1e-9) ?? sizes[sizes.length - 1] ?? 1;
}

/** Largest offered size that does not exceed `limitKw`, or null if none fits. */
export function largestSizeWithin(limitKw: number, config: SolarConfig): number | null {
  const sizes = candidateSizes(config, limitKw);
  return sizes.length ? (sizes[sizes.length - 1] ?? null) : null;
}

/** kW needed to generate `monthlyUnits` on average. */
export function kwForMonthlyUnits(monthlyUnits: number, config: SolarConfig): number {
  return monthlyUnits / monthlyGenerationPerKw(config);
}
