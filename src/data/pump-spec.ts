/**
 * Solar water pump figures from the MNRE specification, as published by SECI.
 *
 * "Specification for Solar Photovoltaic Water Pumping Systems", Annexure-A (Technical
 * Specifications) to SECI's RfS, revision superseding the version uploaded with amendment-01 on
 * 17 February 2023. Clause 4.1 (minimum water output per watt of panels), Annexures IV and V
 * (indicative models). Every figure here is copied from that document; none is RSK's own.
 *
 * The water output figures are minimums on a clear sunny day, with the panels turned three times a
 * day to follow the sun, under "Average Daily Solar Radiation" of 7.15 kWh/m² on the panel surface.
 * A fixed structure, a hazy day or a winter day gives less.
 */
export const PUMP_SPEC_SOURCE = {
  title: 'Specification for Solar Photovoltaic Water Pumping Systems (MNRE), Annexure-A to SECI RfS',
  url: 'https://www.seci.co.in/Upload/Tender/SECI000093-1494342-Annexure-ATechnicalSpecifications(R2).pdf',
  checked: '2026-10-04',
  radiation: 7.15,
};

export type PumpKind = 'surface' | 'submersible';
export type MotorKind = 'dc' | 'ac';

/** Minimum panel capacity (Wp) for each pump size, Annexures IV and V. AC and DC use the same arrays. */
export const MIN_ARRAY_WP: Record<PumpKind, Record<string, number>> = {
  surface: { '1': 900, '2': 1800, '3': 2700, '5': 4800, '7.5': 6750, '10': 9000 },
  submersible: { '1': 1200, '2': 1800, '3': 3000, '5': 4800, '7.5': 6750, '10': 9000 },
};

export const PUMP_HP = [1, 2, 3, 5, 7.5, 10] as const;

/** Clause 4.1: minimum litres of water a day per watt of panels, at each total dynamic head (metres). */
export const LITRES_PER_WP: Record<MotorKind, { head: number; litres: number }[]> = {
  dc: [
    { head: 10, litres: 110 },
    { head: 20, litres: 55 },
    { head: 30, litres: 38 },
    { head: 50, litres: 23 },
    { head: 70, litres: 15 },
    { head: 100, litres: 10.5 },
    { head: 120, litres: 9.5 },
    { head: 150, litres: 7.5 },
    { head: 200, litres: 5.5 },
    { head: 250, litres: 4.5 },
  ],
  ac: [
    { head: 10, litres: 99 },
    { head: 20, litres: 49 },
    { head: 30, litres: 35 },
    { head: 50, litres: 21 },
    { head: 70, litres: 14 },
    { head: 100, litres: 9 },
    { head: 120, litres: 8.5 },
    { head: 150, litres: 6.7 },
    { head: 200, litres: 5 },
    { head: 250, litres: 4 },
  ],
};

/**
 * The deepest total head the specification's indicative models cover, by pump type: surface
 * pumps are listed up to a 30 m head (shut-off 45 m), submersibles to 100 m for these sizes.
 */
export const MAX_HEAD_IN_MODELS: Record<PumpKind, number> = { surface: 30, submersible: 100 };
