import { SOLAR_CONFIG } from '../config/solar-config';
import { confirmedPrice, grossCost, isPriceConfirmed } from '../lib/calculator/calculate';
import { effectiveYieldPerKw, monthlyGenerationPerKw } from '../lib/calculator/sizing';
import { residentialSubsidy } from '../lib/calculator/subsidy';
import type { Range, SystemType } from '../lib/calculator/types';

export interface SizeFacts {
  kw: number;
  slug: string;
  monthlyUnits: number;
  annualUnits: number;
  roofSqFt: number;
  /** PM Surya Ghar residential subsidy at this size — same whether the system is on-grid or hybrid. */
  subsidy: number;
  /** Which type this page centres on: on-grid isn't offered below 3 kW, so hybrid takes over. */
  primaryType: SystemType;
  offersOnGrid: boolean;
  prices: { onGrid: Range | null; hybrid: Range; offGrid: Range };
  priceConfirmed: { hybrid: boolean; offGrid: boolean };
  /** Gross price and net-after-subsidy for the primary type. */
  primaryGross: Range;
  primaryGrossConfirmed: boolean;
  primaryNet: Range;
  /** Monthly home consumption this size takes to a zero bill (general category, net-units assumption). */
  zeroBillRange: [number, number];
}

export const sizeSlug = (kw: number) => `${kw}kw-solar-system-price-punjab`;
export const sizePath = (kw: number) => `/${sizeSlug(kw)}/`;

const target = SOLAR_CONFIG.sizing.zeroBillTargetUnits;
const threshold = SOLAR_CONFIG.freeUnits.perMonth;
// Every standard size is sellable via some type now (hybrid/off-grid fill 1-2 kW, on-grid takes
// over from 3 kW), so the "next smaller size" ladder for the zero-bill band is the full ladder.
const allSizes = [...SOLAR_CONFIG.sizing.standardSizesKw].sort((a, b) => a - b);

export function primaryTypeForKw(kw: number, config = SOLAR_CONFIG): SystemType {
  return kw >= config.sizing.minKwByType['on-grid'] ? 'on-grid' : 'hybrid';
}

function zeroBillRange(kw: number): [number, number] {
  const upper = Math.floor(target + kw * monthlyGenerationPerKw(SOLAR_CONFIG));
  const smaller = allSizes.filter((s) => s < kw).pop();
  const lower = smaller ? Math.floor(target + smaller * monthlyGenerationPerKw(SOLAR_CONFIG)) + 1 : threshold + 1;
  return [lower, upper];
}

export function sizeFacts(kw: number): SizeFacts {
  const annualUnits = kw * effectiveYieldPerKw(SOLAR_CONFIG);
  const subsidy = residentialSubsidy(kw, SOLAR_CONFIG);
  const primaryType = primaryTypeForKw(kw);
  const offersOnGrid = primaryType === 'on-grid';
  const hybrid = grossCost(kw, 'hybrid');
  const offGrid = grossCost(kw, 'off-grid');
  const primaryGross = primaryType === 'on-grid' ? grossCost(kw, 'on-grid') : hybrid;
  return {
    kw,
    slug: sizeSlug(kw),
    monthlyUnits: annualUnits / 12,
    annualUnits,
    roofSqFt: kw * SOLAR_CONFIG.generation.sqFtPerKw,
    subsidy,
    primaryType,
    offersOnGrid,
    prices: { onGrid: offersOnGrid ? grossCost(kw, 'on-grid') : null, hybrid, offGrid },
    priceConfirmed: { hybrid: isPriceConfirmed(kw, 'hybrid'), offGrid: isPriceConfirmed(kw, 'off-grid') },
    primaryGross,
    primaryGrossConfirmed: isPriceConfirmed(kw, primaryType),
    primaryNet: [primaryGross[0] - subsidy, primaryGross[1] - subsidy],
    zeroBillRange: zeroBillRange(kw),
  };
}

/** RSK's confirmed hybrid price points, for display outside the calculator (e.g. the hybrid guide). */
export const HYBRID_CONFIRMED = SOLAR_CONFIG.pricing.hybridConfirmed;
export const hybridConfirmedAt = (kw: number) => confirmedPrice(kw, 'hybrid');

export const SIZE_PAGES: SizeFacts[] = SOLAR_CONFIG.sizing.sizePagesKw.map(sizeFacts);

/** Editorial copy per size. Facts only; every number on the page comes from sizeFacts(). */
export const SIZE_COPY: Record<number, { suits: string; notes: string[] }> = {
  1: {
    suits: 'Homes just over the 300-unit line, where a small system is enough to bring net use back under it. RSK does not install on-grid systems this small, so this size comes as hybrid (with a battery) or off-grid.',
    notes: [
      'Hybrid at 1 kW still receives the PM Surya Ghar subsidy, the same as on-grid — RSK’s hybrid installs are grid-tied and net-metered, not disconnected from PSPCL.',
      'Off-grid does not receive the subsidy, at any size, because it is not net-metered.',
      'A 1 kW system needs at least 1 kW of sanctioned load. Most homes already have more.',
    ],
  },
  2: {
    suits: 'Homes further over the 300-unit line, where summer air-conditioning pushes the bill up. Available as hybrid or off-grid; on-grid starts at 3 kW.',
    notes: [
      'The subsidy is ₹30,000 per kW for the first 2 kW, so a 2 kW hybrid system receives ₹60,000.',
      'Check your sanctioned load on the bill. It must be at least 2 kW.',
    ],
  },
  3: {
    suits: 'The size where on-grid starts, and where the PM Surya Ghar subsidy reaches its ₹78,000 maximum. Available on-grid or hybrid, both subsidised.',
    notes: [
      'The subsidy stops rising at 3 kW. A 5 kW or 10 kW home system gets the same ₹78,000, so every kW above 3 is paid for in full.',
      'Check your units before settling on 3 kW. Under Punjab’s free-units rules, a smaller hybrid system may already take your bill to zero, and the calculator will show you if it does.',
    ],
  },
  5: {
    suits: 'Big homes with several air conditioners, and small shops and offices that pay from the first unit.',
    notes: [
      'For a home, the subsidy is capped at ₹78,000, the same as 3 kW, whether on-grid or hybrid.',
      'A 5 kW system needs 5 kW of sanctioned load. If yours is lower, PSPCL load enhancement comes first, before the subsidy application.',
    ],
  },
  10: {
    suits: 'Shops, clinics, schools, small factories and very large homes. Businesses get no free units, so savings start from the first unit.',
    notes: [
      'Commercial and industrial connections do not qualify for PM Surya Ghar. Housing societies can claim ₹18,000 per kW for common facilities.',
      'Systems at this size are designed after a site survey: roof layout, shading and the connection type decide the final configuration.',
    ],
  },
};
