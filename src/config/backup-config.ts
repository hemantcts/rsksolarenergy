/**
 * Every assumption the hybrid and off-grid (battery) calculator uses. Nothing numeric lives in the
 * component or the estimate code. Status: 'assumption' throughout, shown to the visitor.
 *
 * Battery planning figures match the ones already published on the site
 * (/blog/how-many-batteries-for-3kw-solar-system/, /blog/lithium-vs-tubular-battery-for-solar/):
 * tubular used to about half its capacity each day, lithium to 80%, and 90% inverter efficiency.
 * Solar generation comes from SOLAR_CONFIG.generation, so every calculator on the site agrees.
 */

export interface BackupLoad {
  id: string;
  label: string;
  /** Running watts per unit. */
  watts: number;
  /** Average draw as a share of running watts (compressors and thermostats cycle). */
  duty?: number;
  /** Starting surge as a multiple of running watts, for motors and compressors. */
  surge?: number;
  /**
   * Used in short bursts (an iron, a pump filling the tank). Only the largest one is counted in
   * the peak load, because they are rarely all on together.
   */
  intermittent?: boolean;
  /** Hybrid mode: the most hours it runs during one power cut. Omitted = for the whole cut. */
  maxHoursPerCut?: number;
  /** Pre-filled quantities for each mode. */
  qty: { hybrid: number; offGrid: number };
  /** Off-grid mode: pre-filled hours a day. */
  hoursPerDay: number;
}

export const BACKUP_CONFIG = {
  status: 'assumption' as const,
  updated: '2026-09-22',

  limits: { qty: 30, hoursPerDay: 24, watts: 10000, backupHours: 24 },

  loads: [
    { id: 'led-bulb', label: 'LED bulbs (9 W)', watts: 9, qty: { hybrid: 6, offGrid: 8 }, hoursPerDay: 6 },
    { id: 'led-tube', label: 'LED tube lights (20 W)', watts: 20, qty: { hybrid: 2, offGrid: 2 }, hoursPerDay: 5 },
    { id: 'fan', label: 'Ceiling fans, regular', watts: 75, qty: { hybrid: 3, offGrid: 3 }, hoursPerDay: 10 },
    { id: 'fan-bldc', label: 'Ceiling fans, BLDC', watts: 30, qty: { hybrid: 0, offGrid: 0 }, hoursPerDay: 10 },
    { id: 'fridge', label: 'Refrigerator', watts: 200, duty: 0.4, surge: 3, qty: { hybrid: 1, offGrid: 1 }, hoursPerDay: 24 },
    { id: 'tv', label: 'TV', watts: 70, qty: { hybrid: 1, offGrid: 1 }, hoursPerDay: 5 },
    { id: 'router', label: 'Wi-Fi router', watts: 10, qty: { hybrid: 1, offGrid: 1 }, hoursPerDay: 24 },
    { id: 'laptop', label: 'Laptop', watts: 50, qty: { hybrid: 0, offGrid: 0 }, hoursPerDay: 5 },
    { id: 'desktop', label: 'Desktop computer', watts: 150, qty: { hybrid: 0, offGrid: 0 }, hoursPerDay: 4 },
    { id: 'cctv', label: 'CCTV system (4 cameras)', watts: 40, qty: { hybrid: 0, offGrid: 0 }, hoursPerDay: 24 },
    { id: 'cooler', label: 'Air cooler', watts: 200, surge: 2, qty: { hybrid: 0, offGrid: 0 }, hoursPerDay: 8 },
    { id: 'ac-1', label: '1 ton inverter AC', watts: 1200, duty: 0.5, surge: 1.5, qty: { hybrid: 0, offGrid: 0 }, hoursPerDay: 6 },
    { id: 'ac-15', label: '1.5 ton inverter AC', watts: 1700, duty: 0.53, surge: 1.5, qty: { hybrid: 0, offGrid: 0 }, hoursPerDay: 6 },
    { id: 'pump', label: 'Water pump, 1 HP', watts: 1000, surge: 3, intermittent: true, maxHoursPerCut: 0.5, qty: { hybrid: 0, offGrid: 1 }, hoursPerDay: 0.5 },
    { id: 'washer', label: 'Washing machine', watts: 500, duty: 0.6, surge: 2, intermittent: true, maxHoursPerCut: 1, qty: { hybrid: 0, offGrid: 0 }, hoursPerDay: 0.5 },
    { id: 'iron', label: 'Iron', watts: 1000, duty: 0.6, intermittent: true, maxHoursPerCut: 0.3, qty: { hybrid: 0, offGrid: 0 }, hoursPerDay: 0.3 },
    { id: 'mixer', label: 'Mixer grinder', watts: 750, surge: 2, intermittent: true, maxHoursPerCut: 0.2, qty: { hybrid: 0, offGrid: 1 }, hoursPerDay: 0.2 },
    { id: 'microwave', label: 'Microwave', watts: 1200, intermittent: true, maxHoursPerCut: 0.2, qty: { hybrid: 0, offGrid: 0 }, hoursPerDay: 0.2 },
  ] satisfies BackupLoad[] as BackupLoad[],

  /** Hybrid mode: pre-filled length of a power cut, and the choices offered. */
  backupHours: { default: 4, options: [2, 3, 4, 6, 8, 12] },

  /** Off-grid: share of the day's units used after sunset, which the battery must supply. */
  offGridNightShare: 0.6,
  /** Off-grid: extra days of full use the battery can cover in cloudy or foggy spells. */
  autonomyDays: { default: 0, options: [0, 1, 2] },
  /** Off-grid panels are sized for December and January, when fog cuts output in Punjab. */
  winterYieldFactor: 0.75,

  inverter: {
    /** Power factor used to turn watts into VA. */
    powerFactor: 0.8,
    /** An inverter can carry roughly this multiple of its rating for the few seconds a motor starts. */
    surgeCapability: 2,
    efficiency: 0.9,
    /** Standard sizes, and the battery voltage UTL uses at each (from UTL model names in the catalogue). */
    sizes: [
      { kva: 1, volts: 24 },
      { kva: 2, volts: 48 },
      { kva: 3, volts: 48 },
      { kva: 5, volts: 96 },
      { kva: 7.5, volts: 96 },
      { kva: 10, volts: 120 },
      { kva: 15, volts: 180 },
    ],
  },

  battery: {
    tubular: {
      label: 'Tubular',
      usable: 0.5,
      unitVolts: 12,
      /** UTL heavy-duty solar tubular batteries in the catalogue. */
      units: [
        { ah: 150, name: 'UTL UST1560 (150 Ah)', slug: 'utl-150ah-solar-inverter-battery-ust-1560' },
        { ah: 200, name: 'UTL UST2060 (200 Ah)', slug: 'utl-200ah-solar-inverter-battery-ust-2060' },
      ],
    },
    lithium: {
      label: 'Lithium (LiFePO4)',
      usable: 0.8,
      /** 100 Ah UTL lithium packs by system voltage, with the energy each holds. */
      packs: [
        { volts: 12, kwh: 1.28, name: 'UTL 12.8 V, 100 Ah lithium', slug: 'lithium-ion-lifepo4-lfp-battery-12-8v-100ah-wm' },
        { volts: 24, kwh: 2.56, name: 'UTL 25.6 V, 100 Ah lithium', slug: 'lithium-ion-lifepo4-lfp-battery-25-6v-100ah-sm' },
        { volts: 48, kwh: 4.8, name: 'UTL 48 V, 100 Ah lithium', slug: 'lithium-ion-lifepo4-lfp-battery-48v-100ah' },
        { volts: 96, kwh: 9.6, name: 'UTL 96 V, 100 Ah lithium', slug: 'lithium-ion-lifepo4-lfp-battery-96v-100ah-nm' },
        { volts: 120, kwh: 12, name: 'UTL 120 V, 100 Ah lithium', slug: 'lithium-ion-lifepo4-lfp-battery-120v-100ah-sm' },
        { volts: 180, kwh: 18, name: 'UTL 180 V, 100 Ah lithium', slug: 'utl-lithium-ion-battery-for-inverter-180v-100ah' },
      ],
    },
    /** More parallel strings than this and we suggest bigger batteries or lithium instead. */
    maxTubularStrings: 2,
  },

  /** kW figures are rounded up to this step. */
  kwStep: 0.5,
};

export type BackupConfig = typeof BACKUP_CONFIG;
