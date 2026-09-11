import type { SolarConfig } from '../../config/solar-config';
import type { SystemType } from './types';

/** Effective units per kW per year after derating. */
export function effectiveYieldPerKw(config: SolarConfig): number {
  return config.generation.annualYieldPerKwp * config.generation.deratingFactor;
}

export function monthlyGenerationPerKw(config: SolarConfig): number {
  return effectiveYieldPerKw(config) / 12;
}

const ABSOLUTE_MAX_KW = 5000;

/** The size ladder RSK actually installs for a given system type (on-grid/hybrid start at 3 kW). */
export function sizesForType(type: SystemType, config: SolarConfig): number[] {
  const min = config.sizing.minKwByType[type];
  return [...config.sizing.standardSizesKw].filter((s) => s >= min).sort((a, b) => a - b);
}

/**
 * Every offered size up to `limitKw`: the standard sizes, then steps of largeStepKw.
 * Pass `sizes` (from `sizesForType`) to restrict the ladder to one system type; omitted, it
 * falls back to the full ladder (config.sizing.standardSizesKw).
 */
export function candidateSizes(config: SolarConfig, limitKw = ABSOLUTE_MAX_KW, sizes: readonly number[] = config.sizing.standardSizesKw): number[] {
  const standard = [...sizes].sort((a, b) => a - b);
  const out = standard.filter((s) => s <= limitKw);
  const step = config.sizing.largeStepKw;
  const top = standard[standard.length - 1] ?? 0;
  for (let s = Math.ceil((top + 1) / step) * step; s <= limitKw; s += step) out.push(s);
  return out;
}

/** Nearest offered size; ties go to the larger size. Never below the smallest size. */
export function nearestSize(kw: number, config: SolarConfig, sizes?: readonly number[]): number {
  const candidates = candidateSizes(config, Math.max(kw * 2, 20), sizes);
  let best = candidates[0] ?? 1;
  for (const s of candidates) {
    if (Math.abs(s - kw) <= Math.abs(best - kw)) best = s;
    if (s > kw && Math.abs(s - kw) > Math.abs(best - kw)) break;
  }
  return best;
}

/** Smallest offered size that is at least `kw`. */
export function sizeAtLeast(kw: number, config: SolarConfig, sizes?: readonly number[]): number {
  const candidates = candidateSizes(config, Math.max(kw + config.sizing.largeStepKw, 20), sizes);
  return candidates.find((s) => s >= kw - 1e-9) ?? candidates[candidates.length - 1] ?? 1;
}

/** Largest offered size that does not exceed `limitKw`, or null if none fits. */
export function largestSizeWithin(limitKw: number, config: SolarConfig, sizes?: readonly number[]): number | null {
  const candidates = candidateSizes(config, limitKw, sizes);
  return candidates.length ? (candidates[candidates.length - 1] ?? null) : null;
}

/** kW needed to generate `monthlyUnits` on average. */
export function kwForMonthlyUnits(monthlyUnits: number, config: SolarConfig): number {
  return monthlyUnits / monthlyGenerationPerKw(config);
}
