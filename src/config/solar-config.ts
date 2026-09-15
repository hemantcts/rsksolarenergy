/**
 * Every constant the calculator uses. Nothing numeric is hardcoded in components.
 *
 * Status of each group:
 *   verified    — confirmed by RSK against the primary source (fill verifiedOn)
 *   researched  — taken from a published source (listed), NOT yet confirmed by RSK
 *   assumption  — an engineering assumption, always shown to the user
 *   placeholder — invented stand-in. Must be replaced before launch.
 *
 * `npm run build` refuses to build while any group is 'placeholder'
 * (see src/lib/launch-guard.ts). Use `npm run build:draft` for review builds.
 */

export type ConfigStatus = 'verified' | 'researched' | 'assumption' | 'placeholder';

export interface Slab {
  /** Upper bound of the band in units per month. Use Infinity for the last band. */
  upTo: number;
  /** ₹ per unit */
  rate: number;
}

export interface TariffBand {
  /** Upper bound of sanctioned load for this band, kW. */
  maxLoadKw: number;
  slabs: Slab[];
  /** ₹ per kW of sanctioned load per month */
  fixedPerKwMonth: number;
}

export interface PriceBand {
  /** Upper bound of system size for this band, kW (inclusive). */
  upToKw: number;
  /** ₹ per kW, low and high */
  perKw: [number, number];
}

export const SOLAR_CONFIG = {
  pspcl: {
    status: 'researched' as ConfigStatus,
    tariffYear: 'FY 2026-27',
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
    sources: [
      'PSERC tariff order FY 2026-27 (issued March 2026) — pserc.gov.in/pages/tariff-orders.html',
      'PSPCL tariff comparison FY 2025-26 vs FY 2026-27 — docs.pspcl.in/docs/cecommercial2620260409130617682.pdf',
      'Load-band rates and fixed charges: thediscombill.com/tariffs/punjab (secondary, "provisional")',
    ],
    // TODO: RSK to confirm every rate below against the PSERC order and fill in the date.
    verifiedOn: '',

    /** Domestic Supply (DS). Telescopic: units in each band are charged at that band's rate. */
    domestic: [
      { maxLoadKw: 2, slabs: [{ upTo: 300, rate: 3.85 }, { upTo: Infinity, rate: 7.05 }], fixedPerKwMonth: 50 },
      { maxLoadKw: 7, slabs: [{ upTo: 300, rate: 4.25 }, { upTo: Infinity, rate: 7.05 }], fixedPerKwMonth: 70 },
      { maxLoadKw: 20, slabs: [{ upTo: 300, rate: 5.0 }, { upTo: Infinity, rate: 7.05 }], fixedPerKwMonth: 100 },
    ] satisfies TariffBand[],

    /** Non-Residential Supply (NRS) — shops, offices, clinics, schools. */
    commercial: [
      { maxLoadKw: 7, slabs: [{ upTo: 500, rate: 6.1 }, { upTo: Infinity, rate: 7.1 }], fixedPerKwMonth: 70 },
      { maxLoadKw: 20, slabs: [{ upTo: 500, rate: 6.1 }, { upTo: Infinity, rate: 7.1 }], fixedPerKwMonth: 100 },
      { maxLoadKw: 100, slabs: [{ upTo: Infinity, rate: 6.25 }], fixedPerKwMonth: 130 },
      { maxLoadKw: Infinity, slabs: [{ upTo: Infinity, rate: 6.45 }], fixedPerKwMonth: 140 },
    ] satisfies TariffBand[],

    /**
     * Industrial manufacturing (SP/MS/LS). Punjab Govt subsidised energy charge for
     * FY 2026-27: ₹5.835/kVAh (Dept of Power memo 13/01/2023-EV2/442, 04.03.2026).
     * Billed per kVAh; treated here as per kWh, which slightly understates savings.
     * Fixed charges: full waiver for SP, 50% for MS — solar does not change them, so 0 here.
     */
    industrial: [
      { maxLoadKw: Infinity, slabs: [{ upTo: Infinity, rate: 5.835 }], fixedPerKwMonth: 0 },
    ] satisfies TariffBand[],

    /**
     * Housing society common-area supply.
     * TODO: confirm which PSPCL category a Tricity group housing society's
     * common-area connection falls under. Modelled as DS bulk supply (20–100 kVA).
     */
    society: [
      { maxLoadKw: Infinity, slabs: [{ upTo: Infinity, rate: 6.2 }], fixedPerKwMonth: 130 },
    ] satisfies TariffBand[],

    /** % on energy + fixed charges. 13% municipal, 15% rural reported. TODO: verify, and add IDF / municipal tax / cow cess if applicable. */
    electricityDutyPercent: 13,
    /** Revised periodically. TODO: verify. 0 until confirmed. */
    fuelAdjustmentPerUnit: 0,
  },

  /** Punjab free electricity for domestic (residential) consumers. */
  freeUnits: {
    status: 'researched' as ConfigStatus,
    source:
      'Govt of Punjab, Dept of Power memo 13/01/2023-EV2/442 dated 04.03.2026 (subsidy for FY 2026-27)',
    perMonth: 300,
    perBillingCycle: 600,
    /**
     * General category: above 300/month, ENERGY CHARGES ON ALL UNITS plus fixed charges and levies.
     * SC / non-SC BPL / BC / Freedom Fighter: only the units above 300, plus fixed charges and levies.
     */
    /**
     * TODO: CONFIRM with a real post-solar PSPCL bill. Assumed: the 300-unit test applies to
     * NET units (import minus export) under net metering. This drives the zero-bill sizing.
     */
    appliesToNetUnits: true,
  },

  generation: {
    status: 'assumption' as ConfigStatus,
    /** units per kWp per year. TODO: replace with RSK's own commissioned-system data. */
    annualYieldPerKwp: 1530,
    /**
     * Real-world losses. NOTE: if 1,530 is already a measured AC yield, applying 0.80 on top
     * double-counts losses and makes every estimate ~20% conservative. RSK's real data resolves this.
     */
    deratingFactor: 0.8,
    sqFtPerKw: 100,
  },

  sizing: {
    /**
     * The full size ladder, kW. Finer than the size pages because surplus export currently
     * earns nothing (exportCreditPerUnit = 0), so over-rounding wastes money.
     * Hybrid and off-grid are offered across the whole ladder. On-grid is filtered down to
     * `minKwByType` below — RSK does not install on-grid systems under 3 kW.
     */
    standardSizesKw: [1, 2, 3, 4, 5, 6, 8, 10],
    /**
     * Smallest system RSK will install, per system type. Confirmed by RSK: on-grid starts at
     * 3 kW ("for sure" — asked twice, same answer both times). Hybrid and off-grid are both
     * available from 1 kW (off-grid quoted by RSK as "1 kVA").
     */
    minKwByType: { 'on-grid': 3, hybrid: 1, 'off-grid': 1 } as Record<'on-grid' | 'hybrid' | 'off-grid', number>,
    /**
     * Sizes with their own /Nkw-solar-system-price-punjab/ page. 1 and 2 kW feature hybrid as
     * the primary system (on-grid isn't offered that small); 3 kW and up feature on-grid.
     * See primaryTypeForKw() in src/data/sizes.ts.
     */
    sizePagesKw: [1, 2, 3, 4, 5, 6, 8, 10],
    /** Above the largest standard size, round up to this step (commercial). */
    largeStepKw: 5,
    /**
     * Assumption: for domestic homes above 300 units, size so net monthly units land at or
     * below this figure, leaving headroom for high-use summer months under the 300 line.
     */
    zeroBillTargetUnits: 250,
    /** Used when the user doesn't know their sanctioned load. Shown as an assumption. */
    defaultSanctionedLoadKw: 5,
  },

  pricing: {
    // Overall status stays 'placeholder': on-grid (the primary, subsidised product line) and
    // off-grid are band estimates, not RSK's price list. RSK approved publishing them as estimated
    // ranges on 2026-09-15; every page that shows one labels it as an estimate (DraftNote).
    // Hybrid at 3/5/6 kW is real (see hybridConfirmed below) and is used in place of the band
    // estimate wherever it applies — see grossCost() in src/lib/calculator/calculate.ts.
    status: 'placeholder' as ConfigStatus,
    note: 'Includes panels, inverter, mounting structure, wiring, installation. Excludes net meter fee.',
    onGrid: [
      { upToKw: 3, perKw: [60000, 66000] },
      { upToKw: 10, perKw: [55000, 60000] },
      { upToKw: Infinity, perKw: [48000, 54000] },
    ] satisfies PriceBand[],
    hybrid: [
      { upToKw: 3, perKw: [85000, 95000] },
      { upToKw: 10, perKw: [78000, 88000] },
      { upToKw: Infinity, perKw: [72000, 82000] },
    ] satisfies PriceBand[],
    offGrid: [
      { upToKw: 3, perKw: [80000, 90000] },
      { upToKw: 10, perKw: [74000, 84000] },
      { upToKw: Infinity, perKw: [70000, 80000] },
    ] satisfies PriceBand[],
    /**
     * Real, itemised hybrid pricing from RSK (lithium hybrid kit: panels, hybrid inverter,
     * 51.2V/100Ah lithium battery, mounting structure, DC/AC wiring, earthing, ACDB+DCDB,
     * lightning arrester, cable tray, changeover switch, labour, net metering). Confirmed
     * totals — used exactly, not as a range, wherever the system is exactly one of these sizes.
     */
    hybridConfirmed: [
      { kw: 3, amount: 278010 },
      { kw: 5, amount: 358030 },
      { kw: 6, amount: 388320 },
    ] as { kw: number; amount: number }[],
    hybridConfirmedSource: 'RSK itemised BOM pricing, supplied 2026-09-11',
  },

  subsidy: {
    status: 'researched' as ConfigStatus,
    source:
      'MNRE PM Surya Ghar CFA structure — pmsg-production-public.s3.ap-south-1.amazonaws.com/CFA_structure20240307.pdf; pmsuryaghar.gov.in',
    verifiedOn: '',
    /** Residential: ₹30,000/kW for the first 2 kW, ₹18,000 for the 3rd kW, capped at ₹78,000. */
    residential: {
      firstBandKw: 2,
      firstBandPerKw: 30000,
      secondBandUpToKw: 3,
      secondBandPerKw: 18000,
      cap: 78000,
    },
    /** Group Housing Society / RWA common facilities (incl. EV charging): ₹18,000/kW up to 500 kW. */
    society: {
      perKw: 18000,
      maxKw: 500,
    },
    requiresAlmmPanels: true,
    disbursementDays: [30, 45] as [number, number],
  },

  projection: {
    status: 'assumption' as ConfigStatus,
    tariffEscalationPercent: 3.0,
    panelDegradationPercent: 0.5,
    horizonYears: 25,
  },

  /** Net metering export credit, ₹/unit. TODO: verify PSERC net metering settlement rate. 0 = conservative. */
  netMetering: {
    status: 'researched' as ConfigStatus,
    exportCreditPerUnit: 0,
    maxSystemPercentOfSanctionedLoad: 100,
  },
} as const;

export type SolarConfig = typeof SOLAR_CONFIG;

/** Groups still on placeholder values. Drives the draft banner and the launch guard. */
export function placeholderGroups(config: SolarConfig = SOLAR_CONFIG): string[] {
  const groups: [string, ConfigStatus][] = [
    ['PSPCL tariffs', config.pspcl.status],
    ['free-units rules', config.freeUnits.status],
    ['system pricing', config.pricing.status],
    ['subsidy', config.subsidy.status],
  ];
  return groups.filter(([, s]) => s === 'placeholder').map(([name]) => name);
}

/** Groups not yet confirmed by RSK (researched or placeholder). */
export function unverifiedGroups(config: SolarConfig = SOLAR_CONFIG): string[] {
  const groups: [string, ConfigStatus][] = [
    ['PSPCL tariffs', config.pspcl.status],
    ['free-units rules', config.freeUnits.status],
    ['system pricing', config.pricing.status],
    ['subsidy', config.subsidy.status],
    ['net metering credit', config.netMetering.status],
  ];
  return groups.filter(([, s]) => s === 'placeholder' || s === 'researched').map(([name]) => name);
}
