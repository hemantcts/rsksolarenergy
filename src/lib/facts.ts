/**
 * Formatted figures for use in prose (MDX guides, blog posts), sourced from config so the
 * words update when the numbers do. Import as `F` in MDX: {F.cap}, {F.free}, ...
 */
import { SOLAR_CONFIG as C } from '../config/solar-config';
import { BUSINESS } from '../config/business';
import { digits, inr } from './calculator/format';
import { monthlyBill } from './calculator/tariff';
import { monthlyGenerationPerKw } from './calculator/sizing';

const domesticBill = (u: number) => monthlyBill(u, { category: 'domestic', scheme: 'general', loadKw: 5, config: C }).total;
const dom0 = C.pspcl.domestic[0]!;
const nrs0 = C.pspcl.commercial[0]!;

export const F = {
  free: String(C.freeUnits.perMonth),
  freeCycle: String(C.freeUnits.perBillingCycle),
  cap: inr(C.subsidy.residential.cap),
  sub1: inr(C.subsidy.residential.firstBandPerKw),
  sub2: inr(C.subsidy.residential.firstBandPerKw * 2),
  subThird: inr(C.subsidy.residential.secondBandPerKw),
  societyPerKw: inr(C.subsidy.society.perKw),
  societyMax: `${C.subsidy.society.maxKw} kW`,
  days: `${C.subsidy.disbursementDays[0]} to ${C.subsidy.disbursementDays[1]}`,
  tariffYear: C.pspcl.tariffYear,
  duty: `${C.pspcl.electricityDutyPercent}%`,
  rateLow: `₹${dom0.slabs[0]!.rate.toFixed(2)}`,
  rateHigh: `₹${dom0.slabs[1]!.rate.toFixed(2)}`,
  nrsLow: `₹${nrs0.slabs[0]!.rate.toFixed(2)}`,
  nrsHigh: `₹${nrs0.slabs[1]!.rate.toFixed(2)}`,
  industrial: `₹${C.pspcl.industrial[0]!.slabs[0]!.rate}`,
  bill320: inr(domesticBill(320), 10),
  perKwMonth: digits(monthlyGenerationPerKw(C)),
  perKwYear: digits(monthlyGenerationPerKw(C) * 12),
  yieldRaw: digits(C.generation.annualYieldPerKwp),
  sqFtPerKw: String(C.generation.sqFtPerKw),
  zeroTarget: String(C.sizing.zeroBillTargetUnits),
  /** Smallest system RSK installs, by type — on-grid floors at 3 kW; hybrid and off-grid go lower. */
  onGridMinKw: String(C.sizing.minKwByType['on-grid']),
  hybridMinKw: String(C.sizing.minKwByType.hybrid),
  offGridMinKw: String(C.sizing.minKwByType['off-grid']),
  founded: String(BUSINESS.foundedYear),
  installsCommercial: BUSINESS.installs.commercial,
  installsResidential: BUSINESS.installs.residential,
  installsSolarPumps: BUSINESS.installs.solarPumps,
} as const;
