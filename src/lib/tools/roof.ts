/**
 * Roof capacity: how many kW of panels a roof can take, at the same area per kW the calculators
 * use, and what that system would make and cost. Every figure comes from src/config/solar-config.ts.
 */
import { SOLAR_CONFIG, type SolarConfig } from '../../config/solar-config';
import { largestSizeWithin, monthlyGenerationPerKw, sizesForType } from '../calculator/sizing';
import { residentialSubsidy } from '../calculator/subsidy';
import { grossCost } from '../calculator/calculate';
import type { Range } from '../calculator/types';

export interface RoofInput {
  /** Total roof area in sq ft, or length and width in feet. */
  areaSqFt?: number;
  lengthFt?: number;
  widthFt?: number;
  /** Share of the roof that is free of shade, tanks, stairs and parapet setbacks, 0 to 1. */
  usableShare: number;
  /** Sanctioned load in kW, if known: a net-metered system cannot exceed it. */
  loadKw?: number;
  /** Panel size in watts, to count panels. */
  panelW?: number;
  home: boolean;
}

export interface RoofResult {
  ok: true;
  roofSqFt: number;
  usableSqFt: number;
  /** Raw capacity the usable area takes. */
  fitsKw: number;
  /** The standard on-grid size that fits the roof and the load. */
  systemKw: number | null;
  limitedBy: 'roof' | 'load';
  panels: number | null;
  unitsPerMonth: number;
  price: Range | null;
  subsidy: number;
}

export type RoofOutcome = RoofResult | { ok: false; message: string };

export function roofEstimate(input: RoofInput, config: SolarConfig = SOLAR_CONFIG): RoofOutcome {
  const area = input.areaSqFt && input.areaSqFt > 0 ? input.areaSqFt : (input.lengthFt ?? 0) * (input.widthFt ?? 0);
  if (!(area > 0)) return { ok: false, message: 'Enter the roof area, or its length and width in feet.' };
  const share = Math.min(Math.max(input.usableShare, 0), 1);
  const usable = area * share;
  const fitsKw = Math.floor((usable / config.generation.sqFtPerKw) * 10) / 10;

  const loadKw = input.loadKw && input.loadKw > 0 ? input.loadKw : null;
  const limit = loadKw !== null ? Math.min(fitsKw, loadKw) : fitsKw;
  const limitedBy = loadKw !== null && loadKw < fitsKw ? 'load' : 'roof';
  const systemKw = largestSizeWithin(limit, config, sizesForType('on-grid', config));

  const unitsPerMonth = systemKw ? Math.round(systemKw * monthlyGenerationPerKw(config)) : 0;
  const panels = systemKw && input.panelW && input.panelW > 0 ? Math.ceil((systemKw * 1000) / input.panelW) : null;
  return {
    ok: true,
    roofSqFt: Math.round(area),
    usableSqFt: Math.round(usable),
    fitsKw,
    systemKw,
    limitedBy,
    panels,
    unitsPerMonth,
    price: systemKw ? grossCost(systemKw, 'on-grid', config) : null,
    subsidy: systemKw && input.home ? residentialSubsidy(systemKw, config) : 0,
  };
}
