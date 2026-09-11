export type Category = 'domestic' | 'commercial' | 'industrial' | 'society' | 'agricultural';
/** Punjab free-units treatment: 'reserved' = SC / non-SC BPL / BC / Freedom Fighter. */
export type DomesticScheme = 'general' | 'reserved';
export type SystemType = 'on-grid' | 'hybrid' | 'off-grid';
export type Range = [number, number];

export interface CalcInput {
  consumption: {
    kind: 'units' | 'bill';
    /** Figure as printed on the bill (units or ₹). */
    value: number;
    /** Months the figure covers. PSPCL home bills usually cover 2. */
    periodMonths: 1 | 2;
  };
  category: Category;
  scheme?: DomesticScheme;
  /** kW. null/undefined = unknown. */
  sanctionedLoadKw?: number | null;
  systemType?: SystemType;
  ownsRoof?: boolean;
  roofAreaSqFt?: number | null;
  district?: string;
}

export interface BillBreakdown {
  chargeableUnits: number;
  energy: number;
  fixed: number;
  duty: number;
  total: number;
}

export type SubsidyIneligibleReason = 'category' | 'system-type' | 'ownership';

export interface SubsidyResult {
  amount: number;
  scheme: 'pmsg-residential' | 'pmsg-society' | 'none';
  ineligibleReason: SubsidyIneligibleReason | null;
}

export type Note =
  | { code: 'estimated-from-bill' }
  | { code: 'load-assumed'; assumedKw: number }
  | { code: 'capped-by-load'; requiredKw: number; loadKw: number }
  | { code: 'capped-by-roof'; requiredKw: number; roofKw: number }
  | { code: 'zero-bill-sizing'; offsetKw: number }
  | { code: 'net-units-assumption' }
  | { code: 'subsidy-ineligible'; reason: SubsidyIneligibleReason }
  | { code: 'large-system' }
  | { code: 'industrial-kvah' }
  | { code: 'off-grid-no-export' };

export type Outcome =
  /** Normal result with cost, subsidy and savings. */
  | 'ok'
  /** Domestic home at or under the free-units threshold. No payback is ever shown. */
  | 'free-units'
  /** A ₹ bill that cannot occur under the domestic tariff (between ₹0 and the 301-unit bill). */
  | 'bill-below-threshold'
  /** Agricultural connections get free power in Punjab. */
  | 'agricultural'
  /** Sanctioned load below the smallest system size. */
  | 'load-too-small'
  | 'invalid';

export interface CalcResult {
  outcome: Outcome;
  error?: string;

  monthlyUnits: number;
  /** True when units were derived from a ₹ bill. Every result is then an estimate. */
  estimated: boolean;
  category: Category;
  scheme: DomesticScheme;
  systemType: SystemType;
  loadKw: number;
  loadKnown: boolean;

  /** Lowest monthly bill possible above the free-units line (bill-below-threshold outcome). */
  minimumBillAboveThreshold?: number;

  systemKw: number;
  /** Size that would offset 100% of annual consumption. */
  offsetKw: number;
  strategy: 'zero-bill' | 'offset';
  coversPercent: number;
  roofSqFt: number;

  annualGeneration: number;
  monthlyGeneration: number;

  grossCost: Range;
  subsidy: SubsidyResult;
  netCost: Range;

  billBefore: BillBreakdown;
  billAfter: BillBreakdown;
  annualSaving: number;
  zeroBill: boolean;
  /** null when there is no saving to pay back against. */
  paybackYears: Range | null;
  lifetimeSaving: number;

  notes: Note[];
}
