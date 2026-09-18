/**
 * Every assumption the new-house (appliance) calculator uses. Nothing numeric lives in the
 * components or the estimate code: change a figure here and the page, the worked example and the
 * tests all follow.
 *
 * Status: 'assumption' throughout. These are typical figures for Indian appliances in Punjab's
 * climate, not measurements from a customer's home. They are shown to the visitor as assumptions.
 * Solar generation itself comes from SOLAR_CONFIG.generation, so both calculators agree.
 */

export type SeasonId = 'all' | 'fans' | 'cooler' | 'heater';
export type StepId = 'home' | 'cooling' | 'kitchen' | 'lights' | 'electronics' | 'laundry' | 'water' | 'ev' | 'custom' | 'future';

/**
 * How an appliance's energy is worked out.
 *   hours  — rated kW × duty × hours a day (the visitor enters hours a day)
 *   weekly — kWh per use × uses a week (the visitor enters uses or loads a week)
 *   always — a fixed kWh a day per unit (fridges, routers, CCTV)
 */
export type UseKind = 'hours' | 'weekly' | 'always';

export interface ApplianceDef {
  id: string;
  label: string;
  hint?: string;
  step: StepId;
  use: UseKind;
  /** Rated power per unit, kW. Used for connected load, and for energy on 'hours' appliances. */
  kw: number;
  /** Average draw as a share of rated power while in use (thermostats, compressors cycling). */
  duty?: number;
  /** 'weekly' appliances: kWh per use or load. */
  kwhPerUse?: number;
  /** 'always' appliances: kWh a day per unit. */
  kwhPerDay?: number;
  /** Pre-filled usage: hours a day ('hours') or uses a week ('weekly'). */
  defaultAmount: number;
  maxAmount: number;
  /** Pre-filled quantity (a typical home), so most visitors only adjust. */
  defaultQty?: number;
  /** Which part of the year it runs. */
  season?: SeasonId;
  /** Lights: the visitor picks the wattage instead of us assuming it. */
  wattOptions?: number[];
  /** Pumps: the visitor picks the HP rating. */
  hpOptions?: number[];
  defaultHp?: number;
  /** Counted in the backup (battery) estimate. */
  essential?: boolean;
}

const LED_WATTS = [5, 7, 9, 12, 15, 18, 20, 36, 40];
const PUMP_HP = [0.5, 1, 1.5, 2, 3, 5];

export const APPLIANCE_CONFIG = {
  status: 'assumption' as const,
  updated: '2026-09-18',

  limits: {
    qty: 20,
    people: 20,
    hoursPerDay: 24,
    usesPerDay: 10,
    usesPerWeek: 50,
    daysPerWeek: 7,
    customWatts: 10000,
    kmPerDay: 400,
    evBatteryKwh: 120,
    chargesPerWeek: 14,
    /** Above this many units a month for a home, the result asks the visitor to check the inputs. */
    sanityMonthlyUnits: 3000,
    acSlots: 3,
    customSlots: 3,
  },

  /** Days a year each season-bound appliance runs in Punjab. */
  seasons: {
    all: 365,
    /** Ceiling and exhaust fans: roughly March to October. */
    fans: 240,
    /** Air coolers: roughly mid-April to August. */
    cooler: 120,
    /** Room heaters: roughly mid-November to mid-February. */
    heater: 90,
  } as Record<SeasonId, number>,

  /**
   * ACs. Punjab summers run past 40 °C, so an AC works hard while it is on, but the compressor
   * still cycles: average draw is well under the rating, and lower again for inverter models.
   * avgKw: average draw while switched on, kW. ratedKw: nameplate input, for connected load only.
   */
  ac: {
    tons: [0.75, 1, 1.5, 2, 2.5, 3] as const,
    avgKw: {
      inverter: { 0.75: 0.45, 1: 0.6, 1.5: 0.9, 2: 1.2, 2.5: 1.5, 3: 1.8 },
      standard: { 0.75: 0.65, 1: 0.85, 1.5: 1.25, 2: 1.65, 2.5: 2.05, 3: 2.45 },
    } as Record<'inverter' | 'standard', Record<number, number>>,
    ratedKw: { 0.75: 0.9, 1: 1.2, 1.5: 1.7, 2: 2.2, 2.5: 2.7, 3: 3.3 } as Record<number, number>,
    seasons: [
      { id: 'peak', label: 'Peak summer only (about 3 months)', days: 90 },
      { id: 'summer', label: 'Summer (about 5 months)', days: 150 },
      { id: 'long', label: 'Most of the year (about 7 months)', days: 210 },
    ],
    defaultSeason: 'summer',
    defaultSlot: { tons: 1.5, inverter: true, qty: 1, hours: 8 },
    defaultHours: 6,
  },

  /**
   * Geysers. A storage geyser heats a tank and then only tops it up, so energy follows how much
   * hot water is used, not rated kW × hours. kWhPerUse: one tank heated from cold water in a
   * Punjab winter. standbyKwh: heat lost a day while the geyser is kept on.
   */
  geyser: {
    sizes: [
      { id: 'instant', label: 'Instant (3 L)', kw: 3, kwhPerUse: 0.3, standbyKwh: 0 },
      { id: '10', label: '10 litre', kw: 2, kwhPerUse: 0.45, standbyKwh: 0.15 },
      { id: '15', label: '15 litre', kw: 2, kwhPerUse: 0.65, standbyKwh: 0.2 },
      { id: '25', label: '25 litre', kw: 2, kwhPerUse: 1.0, standbyKwh: 0.3, defaultQty: 2 },
      { id: '50', label: '50 litre', kw: 2, kwhPerUse: 1.9, standbyKwh: 0.45 },
    ],
    seasons: [
      { id: 'winter', label: 'Winter only (about 4 months)', days: 120 },
      { id: 'long', label: 'Winter, spring and autumn (about 6 months)', days: 180 },
      { id: 'year', label: 'All year', days: 365 },
    ],
    defaultSeason: 'winter',
    defaultUsesPerDay: 2,
  },

  /** A pump motor draws a little more than its HP rating (1 HP = 0.746 kW) because of motor losses. */
  pump: { kwPerHp: 1.0 },

  /** Electric vehicles. kWh per km includes charging losses. */
  ev: {
    vehicles: [
      { id: 'car', label: 'Car', kwhPerKm: 0.15, defaultKm: 30, defaultBatteryKwh: 30, chargerKw: 3.3 },
      { id: 'scooter', label: 'Scooter or motorbike', kwhPerKm: 0.035, defaultKm: 25, defaultBatteryKwh: 3, chargerKw: 0.8 },
    ],
    /** Charging losses when the visitor gives battery size and charges a week instead of km. */
    chargingLossFactor: 1.1,
  },

  /** Custom appliance with no wattage given. Used only when the visitor leaves wattage blank. */
  customDefaultKw: 0.1,

  /**
   * Battery estimate when the visitor wants backup. Essentials = everything marked `essential`
   * (lights, fans, fridge, Wi-Fi, TV, laptop). usableFraction: depth of discharge for lithium.
   */
  battery: {
    backupHours: 4,
    usableFraction: 0.8,
    packKwh: 5.12,
    packLabel: '51.2 V, 100 Ah lithium',
    /** "Essentials plus one AC": one 1.5 ton inverter AC for this many hours of the backup. */
    oneAcHours: 3,
  },

  /** Planned additions (step: future). Each is a typical case, stated in the result. */
  future: [
    { id: 'ac', label: 'Another AC', detail: '1.5 ton inverter, 6 hours a day in summer', kwhPerYear: 0.9 * 6 * 150 },
    { id: 'geyser', label: 'Another geyser', detail: '25 litre, two uses a day in winter', kwhPerYear: (1.0 * 2 + 0.3) * 120 },
    { id: 'fridge', label: 'A larger refrigerator', detail: 'the extra units over a standard one', kwhPerYear: 0.6 * 365 },
    { id: 'office', label: 'A home office', detail: 'computer, screen and lights, 8 hours on weekdays', kwhPerYear: 0.25 * 8 * 260 },
    { id: 'pump', label: 'Another water pump', detail: '1 HP, 1 hour a day', kwhPerYear: 1.0 * 365 },
    { id: 'pool', label: 'Pool or fountain pump', detail: '1 HP, 4 hours a day for 6 months', kwhPerYear: 1.0 * 4 * 180 },
  ],

  /** Result scenarios. */
  scenarios: {
    /** Essential coverage: this share of the home's current yearly use. */
    essentialShare: 0.7,
    /** Higher coverage when nothing is planned: this much headroom on top of current use. */
    futureHeadroom: 0.2,
  },

  /** Generation range around SOLAR_CONFIG's effective yield: roof direction, tilt, shade, dust, weather. */
  generationRange: [0.9, 1.1] as [number, number],
  /** Panel used for the panel count. UTL's range runs from 40 W to 735 W; 550 W is a common rooftop size. */
  panelWatts: 550,
  /** kW figures in the result are rounded to this step, to avoid false precision. */
  kwStep: 0.5,

  appliances: [
    // Cooling extras (ACs are handled separately)
    { id: 'cooler', label: 'Air cooler', step: 'cooling', use: 'hours', kw: 0.2, defaultAmount: 8, maxAmount: 24, season: 'cooler', essential: true },
    { id: 'purifier', label: 'Air purifier', step: 'cooling', use: 'hours', kw: 0.05, defaultAmount: 8, maxAmount: 24 },
    { id: 'dehumidifier', label: 'Dehumidifier', step: 'cooling', use: 'hours', kw: 0.3, duty: 0.6, defaultAmount: 4, maxAmount: 24 },
    { id: 'heater', label: 'Room heater', hint: 'Winter', step: 'cooling', use: 'hours', kw: 2, duty: 0.6, defaultAmount: 3, maxAmount: 24, season: 'heater' },

    // Kitchen
    { id: 'fridge', label: 'Refrigerator, standard', hint: 'Single or double door, up to about 300 litres', step: 'kitchen', use: 'always', kw: 0.2, kwhPerDay: 1.0, defaultAmount: 0, maxAmount: 0, defaultQty: 1, essential: true },
    { id: 'fridge-large', label: 'Refrigerator, large', hint: 'About 300 to 500 litres', step: 'kitchen', use: 'always', kw: 0.3, kwhPerDay: 1.4, defaultAmount: 0, maxAmount: 0, essential: true },
    { id: 'fridge-sbs', label: 'Refrigerator, side-by-side', step: 'kitchen', use: 'always', kw: 0.4, kwhPerDay: 2.0, defaultAmount: 0, maxAmount: 0, essential: true },
    { id: 'deep-freezer', label: 'Deep freezer', step: 'kitchen', use: 'always', kw: 0.3, kwhPerDay: 1.5, defaultAmount: 0, maxAmount: 0 },
    { id: 'ro', label: 'RO water purifier', step: 'kitchen', use: 'hours', kw: 0.04, defaultAmount: 2, maxAmount: 24, defaultQty: 1 },
    { id: 'mixer', label: 'Mixer grinder', step: 'kitchen', use: 'hours', kw: 0.75, duty: 0.8, defaultAmount: 0.25, maxAmount: 4, defaultQty: 1 },
    { id: 'microwave', label: 'Microwave', step: 'kitchen', use: 'hours', kw: 1.2, defaultAmount: 0.25, maxAmount: 4 },
    { id: 'otg', label: 'OTG oven', step: 'kitchen', use: 'weekly', kw: 1.5, kwhPerUse: 0.6, defaultAmount: 2, maxAmount: 21 },
    { id: 'induction', label: 'Induction cooktop', step: 'kitchen', use: 'hours', kw: 2, duty: 0.6, defaultAmount: 1, maxAmount: 8 },
    { id: 'kettle', label: 'Electric kettle', step: 'kitchen', use: 'weekly', kw: 1.5, kwhPerUse: 0.1, defaultAmount: 14, maxAmount: 50 },
    { id: 'toaster', label: 'Toaster or sandwich maker', step: 'kitchen', use: 'weekly', kw: 0.8, kwhPerUse: 0.05, defaultAmount: 5, maxAmount: 50 },
    { id: 'airfryer', label: 'Air fryer', step: 'kitchen', use: 'weekly', kw: 1.5, kwhPerUse: 0.4, defaultAmount: 3, maxAmount: 21 },
    { id: 'chimney', label: 'Kitchen chimney', step: 'kitchen', use: 'hours', kw: 0.2, defaultAmount: 1.5, maxAmount: 12 },
    { id: 'dishwasher', label: 'Dishwasher', step: 'kitchen', use: 'weekly', kw: 1.8, kwhPerUse: 1.1, defaultAmount: 5, maxAmount: 21 },

    // Lights and fans
    { id: 'led-bulb', label: 'LED bulbs', step: 'lights', use: 'hours', kw: 0.009, defaultAmount: 6, maxAmount: 24, defaultQty: 10, wattOptions: LED_WATTS, essential: true },
    { id: 'led-panel', label: 'LED panels and downlights', step: 'lights', use: 'hours', kw: 0.012, defaultAmount: 5, maxAmount: 24, wattOptions: LED_WATTS, essential: true },
    { id: 'led-tube', label: 'LED tube lights', step: 'lights', use: 'hours', kw: 0.02, defaultAmount: 5, maxAmount: 24, defaultQty: 2, wattOptions: LED_WATTS, essential: true },
    { id: 'outdoor', label: 'Outdoor and gate lights', step: 'lights', use: 'hours', kw: 0.012, defaultAmount: 10, maxAmount: 24, wattOptions: LED_WATTS },
    { id: 'decor', label: 'Decorative and strip lights', step: 'lights', use: 'hours', kw: 0.012, defaultAmount: 4, maxAmount: 24, wattOptions: LED_WATTS },
    { id: 'fan', label: 'Ceiling fans, regular', step: 'lights', use: 'hours', kw: 0.075, defaultAmount: 10, maxAmount: 24, defaultQty: 4, season: 'fans', essential: true },
    { id: 'fan-bldc', label: 'Ceiling fans, BLDC (energy-saving)', step: 'lights', use: 'hours', kw: 0.03, defaultAmount: 10, maxAmount: 24, season: 'fans', essential: true },
    { id: 'exhaust', label: 'Exhaust fans', step: 'lights', use: 'hours', kw: 0.04, defaultAmount: 2, maxAmount: 24, defaultQty: 2 },

    // Electronics
    { id: 'tv', label: 'TV, up to 43 inch', step: 'electronics', use: 'hours', kw: 0.07, defaultAmount: 5, maxAmount: 24, defaultQty: 1, essential: true },
    { id: 'tv-large', label: 'TV, 50 inch or larger', step: 'electronics', use: 'hours', kw: 0.13, defaultAmount: 5, maxAmount: 24 },
    { id: 'settop', label: 'Set-top box', step: 'electronics', use: 'hours', kw: 0.015, defaultAmount: 5, maxAmount: 24 },
    { id: 'router', label: 'Wi-Fi router', step: 'electronics', use: 'always', kw: 0.01, kwhPerDay: 0.24, defaultAmount: 0, maxAmount: 0, defaultQty: 1, essential: true },
    { id: 'desktop', label: 'Desktop computer', step: 'electronics', use: 'hours', kw: 0.15, defaultAmount: 4, maxAmount: 24 },
    { id: 'laptop', label: 'Laptop', step: 'electronics', use: 'hours', kw: 0.05, defaultAmount: 5, maxAmount: 24, defaultQty: 1, essential: true },
    { id: 'cctv', label: 'CCTV cameras', hint: 'Count the cameras', step: 'electronics', use: 'always', kw: 0.008, kwhPerDay: 0.19, defaultAmount: 0, maxAmount: 0 },
    { id: 'theatre', label: 'Home theatre or soundbar', step: 'electronics', use: 'hours', kw: 0.1, defaultAmount: 2, maxAmount: 24 },
    { id: 'console', label: 'Gaming console', step: 'electronics', use: 'hours', kw: 0.15, defaultAmount: 2, maxAmount: 24 },
    { id: 'phone', label: 'Phone and small chargers', hint: 'Count the people charging', step: 'electronics', use: 'always', kw: 0.02, kwhPerDay: 0.03, defaultAmount: 0, maxAmount: 0, defaultQty: 3 },

    // Laundry
    { id: 'washer', label: 'Washing machine', hint: 'Loads a week', step: 'laundry', use: 'weekly', kw: 0.5, kwhPerUse: 0.5, defaultAmount: 4, maxAmount: 21, defaultQty: 1 },
    { id: 'washer-heat', label: 'Washing machine with hot wash', hint: 'Loads a week', step: 'laundry', use: 'weekly', kw: 2, kwhPerUse: 1.2, defaultAmount: 4, maxAmount: 21 },
    { id: 'dryer', label: 'Clothes dryer', hint: 'Loads a week', step: 'laundry', use: 'weekly', kw: 2.5, kwhPerUse: 2.5, defaultAmount: 3, maxAmount: 21 },
    { id: 'iron', label: 'Iron', hint: 'Uses a week, about 20 minutes each', step: 'laundry', use: 'weekly', kw: 1, kwhPerUse: 0.25, defaultAmount: 4, maxAmount: 21, defaultQty: 1 },

    // Water pumps (geysers are handled separately)
    { id: 'pump-domestic', label: 'Domestic water pump', hint: 'Fills the overhead tank', step: 'water', use: 'hours', kw: 1.0, defaultAmount: 0.5, maxAmount: 24, defaultQty: 1, hpOptions: PUMP_HP, defaultHp: 1 },
    { id: 'pump-submersible', label: 'Submersible pump', step: 'water', use: 'hours', kw: 1.5, defaultAmount: 1, maxAmount: 24, hpOptions: PUMP_HP, defaultHp: 1.5 },
    { id: 'pump-booster', label: 'Pressure booster pump', step: 'water', use: 'hours', kw: 0.5, defaultAmount: 1, maxAmount: 24, hpOptions: PUMP_HP, defaultHp: 0.5 },
    { id: 'pump-other', label: 'Other pump', step: 'water', use: 'hours', kw: 1.0, defaultAmount: 1, maxAmount: 24, hpOptions: PUMP_HP, defaultHp: 1 },
  ] satisfies ApplianceDef[] as ApplianceDef[],
};

export type ApplianceConfig = typeof APPLIANCE_CONFIG;
