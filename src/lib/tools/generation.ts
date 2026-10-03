/**
 * Solar generation by location. NASA POWER gives each town's sunshine (src/data/sunshine.json);
 * the yearly total is scaled to the planning figure the calculators use, so a town with more sun
 * than the Punjab average gets proportionally more, and the months follow the town's sunshine.
 */
import SUNSHINE from '../../data/sunshine.json';
import { SOLAR_CONFIG, type SolarConfig } from '../../config/solar-config';
import { effectiveYieldPerKw } from '../calculator/sizing';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface Town {
  slug: string;
  name: string;
  lat: number;
  lon: number;
  monthly: number[];
  annual: number;
}

export const TOWNS: Town[] = Object.entries(SUNSHINE.towns).map(([slug, t]) => ({ slug, ...t }));
export const SUNSHINE_META = { source: SUNSHINE.source, sourceUrl: SUNSHINE.sourceUrl, period: SUNSHINE.period, retrieved: SUNSHINE.retrieved, coordinates: SUNSHINE.coordinates };

/** Average yearly sunshine across every town, the baseline the planning figure stands for. */
export const PUNJAB_AVERAGE = TOWNS.reduce((s, t) => s + t.annual, 0) / TOWNS.length;

export interface Generation {
  town: Town;
  kw: number;
  /** Units a year from the system. */
  year: number;
  /** Units in each month, January first. */
  months: number[];
  /** Town's sunshine against the Punjab average, e.g. 1.03. */
  relative: number;
}

export function generationFor(slug: string, kw: number, config: SolarConfig = SOLAR_CONFIG): Generation | null {
  const town = TOWNS.find((t) => t.slug === slug);
  if (!town || !(kw > 0)) return null;
  const relative = town.annual / PUNJAB_AVERAGE;
  const year = effectiveYieldPerKw(config) * relative * kw;
  const weights = town.monthly.map((v, i) => v * DAYS[i]!);
  const total = weights.reduce((a, b) => a + b, 0);
  return { town, kw, year, months: weights.map((w) => (year * w) / total), relative };
}
