import { SOLAR_CONFIG } from '../config/solar-config';
import { grossCost } from '../lib/calculator/calculate';
import { effectiveYieldPerKw, monthlyGenerationPerKw, sizesForType } from '../lib/calculator/sizing';
import { residentialSubsidy } from '../lib/calculator/subsidy';
import type { Range } from '../lib/calculator/types';

export interface SizeFacts {
  kw: number;
  slug: string;
  monthlyUnits: number;
  annualUnits: number;
  roofSqFt: number;
  subsidy: number;
  prices: { onGrid: Range; hybrid: Range; offGrid: Range };
  netOnGrid: Range;
  /** Monthly home consumption this size takes to a zero bill (general category, net-units assumption). */
  zeroBillRange: [number, number];
}

export const sizeSlug = (kw: number) => `${kw}kw-solar-system-price-punjab`;
export const sizePath = (kw: number) => `/${sizeSlug(kw)}/`;

const target = SOLAR_CONFIG.sizing.zeroBillTargetUnits;
const threshold = SOLAR_CONFIG.freeUnits.perMonth;
// The size pages are about on-grid (the subsidised, primary product), whose ladder starts at
// 3 kW — not the full ladder, which would wrongly imply a 1 or 2 kW on-grid tier exists.
const allSizes = sizesForType('on-grid', SOLAR_CONFIG);

function zeroBillRange(kw: number): [number, number] {
  const upper = Math.floor(target + kw * monthlyGenerationPerKw(SOLAR_CONFIG));
  const smaller = allSizes.filter((s) => s < kw).pop();
  const lower = smaller ? Math.floor(target + smaller * monthlyGenerationPerKw(SOLAR_CONFIG)) + 1 : threshold + 1;
  return [lower, upper];
}

export function sizeFacts(kw: number): SizeFacts {
  const annualUnits = kw * effectiveYieldPerKw(SOLAR_CONFIG);
  const subsidy = residentialSubsidy(kw, SOLAR_CONFIG);
  const onGrid = grossCost(kw, 'on-grid');
  return {
    kw,
    slug: sizeSlug(kw),
    monthlyUnits: annualUnits / 12,
    annualUnits,
    roofSqFt: kw * SOLAR_CONFIG.generation.sqFtPerKw,
    subsidy,
    prices: { onGrid, hybrid: grossCost(kw, 'hybrid'), offGrid: grossCost(kw, 'off-grid') },
    netOnGrid: [onGrid[0] - subsidy, onGrid[1] - subsidy],
    zeroBillRange: zeroBillRange(kw),
  };
}

export const SIZE_PAGES: SizeFacts[] = SOLAR_CONFIG.sizing.sizePagesKw.map(sizeFacts);

/** Editorial copy per size. Facts only; every number on the page comes from sizeFacts(). */
export const SIZE_COPY: Record<number, { suits: string; notes: string[] }> = {
  3: {
    suits: 'Our smallest on-grid and hybrid system, and the size we recommend to most homes just over the 300-unit line: it is also where the PM Surya Ghar subsidy reaches its ₹78,000 maximum.',
    notes: [
      'RSK installs on-grid and hybrid systems from 3 kW upwards. If your roof and budget only need 1 or 2 kW of generation, a 3 kW system still zeroes the bill and comes with the full ₹78,000 subsidy, so the extra capacity costs less than it looks like it should.',
      'Want something smaller? Off-grid systems are available from 1 kW, though off-grid does not carry the PM Surya Ghar subsidy.',
      'The subsidy stops rising at 3 kW. A 5 kW or 10 kW home system gets the same ₹78,000, so every kW above 3 is paid for in full.',
    ],
  },
  5: {
    suits: 'Big homes with several air conditioners, and small shops and offices that pay from the first unit.',
    notes: [
      'For a home, the subsidy is capped at ₹78,000, the same as 3 kW.',
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
