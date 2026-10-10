/**
 * The words every page uses for how much solar makes, so the calculators, tables, tools and guides
 * all say the same thing. The figures come from config.generation (src/config/solar-config.ts).
 */
import { SOLAR_CONFIG, type SolarConfig } from '../config/solar-config';

/** "We plan on about 135 units a month from each kW of panels in Punjab, averaged over the year." */
export function planningLine(config: SolarConfig = SOLAR_CONFIG): string {
  return `We plan on about ${config.generation.unitsPerKwMonth} units a month from each kW of panels in Punjab, averaged over the year.`;
}

/** The TOPCon note: an "up to" for the sunniest months, never a year-round average. */
export function topconLine(config: SolarConfig = SOLAR_CONFIG): string {
  return `With TOPCon panels, output can reach up to about ${config.generation.topconPeakUnitsPerKwMonth} units per kW in the sunniest months.`;
}

/** The estimates line that goes wherever a generation figure is shown. */
export const ESTIMATE_LINE =
  'These are estimates: real output depends on the roof’s direction and shade, dust, the weather and the panels and inverter used.';

/** All three, for a footnote under a table or a result. */
export function generationNote(config: SolarConfig = SOLAR_CONFIG): string {
  return `${planningLine(config)} ${topconLine(config)} ${ESTIMATE_LINE}`;
}
