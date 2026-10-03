/**
 * Solar quote comparison: puts up to three quotes on the same footing (price per kW, subsidy, what
 * each one leaves out) and flags what to ask the installer. It ranks nothing; it shows the gaps.
 */
import { SOLAR_CONFIG, type SolarConfig } from '../../config/solar-config';
import { residentialSubsidy } from '../calculator/subsidy';
import { grossCost } from '../calculator/calculate';
import type { Range } from '../calculator/types';

export type QuoteType = 'on-grid' | 'hybrid' | 'off-grid';

/** What a complete rooftop quote should spell out. The checklist the tool asks about. */
export const QUOTE_ITEMS = [
  { id: 'netmeter', label: 'Net meter application and PSPCL paperwork' },
  { id: 'subsidy', label: 'PM Surya Ghar portal application' },
  { id: 'structure', label: 'Mounting structure: material and height stated' },
  { id: 'earthing', label: 'Earthing and lightning arrester' },
  { id: 'boxes', label: 'AC and DC distribution boxes with protection' },
  { id: 'cables', label: 'Cable sizes and cable route' },
  { id: 'monitoring', label: 'Inverter monitoring (app or display)' },
  { id: 'warranties', label: 'Manufacturer warranty terms in writing' },
  { id: 'service', label: 'After-sales visits and who to call' },
] as const;
export type QuoteItem = (typeof QUOTE_ITEMS)[number]['id'];

export interface QuoteInput {
  name: string;
  kw: number;
  price: number;
  type: QuoteType;
  dcr: 'yes' | 'no' | 'unknown';
  panelWarranty?: number;
  inverterWarranty?: number;
  includes: QuoteItem[];
}

export interface QuoteRow {
  name: string;
  kw: number;
  price: number;
  perKw: number;
  subsidy: number;
  afterSubsidy: number;
  ourRange: Range;
  missing: string[];
  flags: string[];
}

export function compareQuotes(quotes: QuoteInput[], home: boolean, config: SolarConfig = SOLAR_CONFIG): QuoteRow[] {
  return quotes
    .filter((q) => q.kw > 0 && q.price > 0)
    .map((q) => {
      const subsidyEligible = home && q.type !== 'off-grid' && q.dcr === 'yes';
      const subsidy = subsidyEligible ? residentialSubsidy(q.kw, config) : 0;
      const flags: string[] = [];
      if (home && q.type === 'off-grid') flags.push('Off-grid systems get no PM Surya Ghar subsidy.');
      if (home && q.type !== 'off-grid' && q.dcr !== 'yes')
        flags.push(q.dcr === 'no' ? 'Non-DCR panels: no PM Surya Ghar subsidy.' : 'Ask whether the panels are DCR and ALMM-listed. Without that, no subsidy.');
      if (!home) flags.push('PM Surya Ghar covers homes and housing societies, not businesses.');
      if (!q.panelWarranty) flags.push('Panel warranty not stated. Ask for the manufacturer warranty in writing.');
      if (!q.inverterWarranty) flags.push('Inverter warranty not stated.');
      return {
        name: q.name.trim() || 'Quote',
        kw: q.kw,
        price: q.price,
        perKw: q.price / q.kw,
        subsidy,
        afterSubsidy: q.price - subsidy,
        ourRange: grossCost(q.kw, q.type, config),
        missing: QUOTE_ITEMS.filter((i) => !q.includes.includes(i.id)).map((i) => i.label),
        flags,
      };
    });
}

/** How far apart the quotes are on price per kW, as a share of the lowest. */
export function perKwSpread(rows: QuoteRow[]): number | null {
  if (rows.length < 2) return null;
  const v = rows.map((r) => r.perKw);
  return (Math.max(...v) - Math.min(...v)) / Math.min(...v);
}
