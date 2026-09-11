import type { SolarConfig } from '../../config/solar-config';
import type { Category, SubsidyResult, SystemType } from './types';

/** PM Surya Ghar residential CFA for a system size, before any eligibility gates. */
export function residentialSubsidy(kw: number, config: SolarConfig): number {
  if (!(kw > 0)) return 0;
  const r = config.subsidy.residential;
  const first = Math.min(kw, r.firstBandKw) * r.firstBandPerKw;
  const second = Math.max(0, Math.min(kw, r.secondBandUpToKw) - r.firstBandKw) * r.secondBandPerKw;
  return Math.min(first + second, r.cap);
}

/** PM Surya Ghar CFA for group housing societies / RWAs (common facilities). */
export function societySubsidy(kw: number, config: SolarConfig): number {
  if (!(kw > 0)) return 0;
  const s = config.subsidy.society;
  return Math.min(kw, s.maxKw) * s.perKw;
}

/**
 * Applies every eligibility gate in order and reports the first failure.
 * The load gate is enforced upstream by capping the system at sanctioned load.
 * The ALMM gate is RSK's responsibility at supply time and is stated in the result copy.
 */
export function computeSubsidy(
  kw: number,
  category: Category,
  systemType: SystemType,
  ownsRoof: boolean,
  config: SolarConfig,
): SubsidyResult {
  if (category !== 'domestic' && category !== 'society') {
    return { amount: 0, scheme: 'none', ineligibleReason: 'category' };
  }
  if (systemType !== 'on-grid') {
    return { amount: 0, scheme: 'none', ineligibleReason: 'system-type' };
  }
  if (category === 'domestic' && !ownsRoof) {
    return { amount: 0, scheme: 'none', ineligibleReason: 'ownership' };
  }
  if (category === 'society') {
    return { amount: societySubsidy(kw, config), scheme: 'pmsg-society', ineligibleReason: null };
  }
  return { amount: residentialSubsidy(kw, config), scheme: 'pmsg-residential', ineligibleReason: null };
}
