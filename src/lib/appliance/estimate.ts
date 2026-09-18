/**
 * New-house solar estimate: appliances and usage in, consumption and a solar size range out.
 * Pure functions, no DOM. Used at build time (the worked example on the page), in the browser, and
 * by the tests. Every figure comes from APPLIANCE_CONFIG or SOLAR_CONFIG.
 *
 * This is an indicative estimate for sizing a first conversation, not an engineering design.
 */
import { APPLIANCE_CONFIG, type ApplianceConfig, type ApplianceDef } from '../../config/appliance-config';
import { SOLAR_CONFIG, type SolarConfig } from '../../config/solar-config';
import { effectiveYieldPerKw, nearestSize } from '../calculator/sizing';

export type Backup = 'none' | 'essentials' | 'ac';
export type EvMode = 'none' | 'planned' | 'owned';

export interface AcSlot {
  tons: number;
  inverter: boolean;
  qty: number;
  hours: number;
}
export interface ApplianceUse {
  qty: number;
  /** Hours a day ('hours') or uses a week ('weekly'). */
  amount: number;
  /** Lights: watts per unit. */
  watts?: number;
  /** Pumps: HP rating. */
  hp?: number;
}
export interface GeyserUse {
  qty: number;
  usesPerDay: number;
}
export interface EvInput {
  mode: EvMode;
  vehicle: string;
  kmPerDay: number;
  batteryKwh: number;
  chargesPerWeek: number;
}
export interface CustomSlot {
  name: string;
  qty: number;
  /** 0 = not given. */
  watts: number;
  hours: number;
  daysPerWeek: number;
}
export interface HouseInput {
  people: number;
  home: string;
  district: string;
  backup: Backup;
  acs: AcSlot[];
  acSeason: string;
  appliances: Record<string, ApplianceUse>;
  geysers: Record<string, GeyserUse>;
  geyserSeason: string;
  ev: EvInput;
  custom: CustomSlot[];
  future: string[];
  futureOther: { watts: number; hours: number };
}

/** Something the parser changed (a value capped or ignored), shown to the visitor. */
export interface InputNote {
  field: string;
  message: string;
}

export type Group = 'Cooling' | 'Kitchen' | 'Lights and fans' | 'Electronics' | 'Laundry' | 'Water heating' | 'Water pumps' | 'Other appliances';

export interface Line {
  id: string;
  label: string;
  group: Group;
  kwhYear: number;
  /** Units in a peak-summer month. */
  kwhPeakMonth: number;
}

export interface Scenario {
  id: 'essential' | 'recommended' | 'future';
  label: string;
  description: string;
  /** Yearly units this scenario is sized for. */
  targetKwhYear: number;
  /** Capacity range, rounded to APPLIANCE_CONFIG.kwStep. */
  kwRange: [number, number];
  /** Nearest standard size RSK Solar Energy installs. */
  exampleKw: number;
  panels: number;
  roofSqFt: number;
  /** Yearly units the example system makes, low to high. */
  generationRange: [number, number];
  /** Share of current yearly use the example system covers, 0 to 1 (can exceed 1). */
  coverage: number;
}

export interface Estimate {
  household: { daily: number; monthly: number; annual: number; peakMonth: number };
  lines: Line[];
  groups: { group: Group; kwhYear: number; share: number }[];
  ev: { kwhYear: number; monthly: number; timing: 'owned' | 'planned'; method: 'km' | 'battery' | 'default'; vehicle: string } | null;
  futureLines: { id: string; label: string; detail: string; kwhYear: number }[];
  /** Yearly units: household plus an EV already owned. */
  currentAnnual: number;
  /** Yearly units after the EV (if planned) and planned additions. */
  futureAnnual: number;
  connectedKw: number;
  scenarios: Scenario[];
  battery: { kwh: number; packs: number; hours: number; includesAc: boolean } | null;
  /** How the current average compares with Punjab's 300 free units a month. */
  freeUnits: 'under' | 'summer-over' | 'over';
  onGridMinKw: number;
  unusuallyHigh: boolean;
  notes: InputNote[];
}

const GROUP_BY_STEP: Record<string, Group> = {
  cooling: 'Cooling',
  kitchen: 'Kitchen',
  lights: 'Lights and fans',
  electronics: 'Electronics',
  laundry: 'Laundry',
  water: 'Water pumps',
};

// ---------------------------------------------------------------- parsing and validation

interface Reader {
  get(name: string): FormDataEntryValue | string | null;
  getAll(name: string): (FormDataEntryValue | string)[];
}

/**
 * Reads a number, never returning NaN, Infinity or a negative. Blank → fallback. Out of range →
 * clamped, with a note so the visitor knows we changed it.
 */
function num(r: Reader, name: string, label: string, min: number, max: number, fallback: number, notes: InputNote[], integer = false): number {
  const raw = r.get(name);
  if (raw === null || typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[,\s]/g, '');
  if (cleaned === '') return fallback;
  let n = Number(cleaned);
  if (!Number.isFinite(n)) {
    notes.push({ field: name, message: `${label}: "${raw.slice(0, 20)}" is not a number, so we used ${fallback}.` });
    return fallback;
  }
  if (integer) n = Math.round(n);
  if (n < min) {
    if (n < 0) notes.push({ field: name, message: `${label} can't be negative, so we used ${min}.` });
    return min;
  }
  if (n > max) {
    notes.push({ field: name, message: `${label} was capped at ${max}.` });
    return max;
  }
  return n;
}

function pick<T extends string>(r: Reader, name: string, allowed: readonly T[], fallback: T): T {
  const v = r.get(name);
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Plain text for a custom appliance name: no markup, bounded length. Escaped again on output. */
function cleanText(v: FormDataEntryValue | string | null, max = 40): string {
  return typeof v === 'string' ? v.replace(/[<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/**
 * Turns form fields (FormData or URLSearchParams — the share link carries the same names) into a
 * valid HouseInput. Anything missing takes the default, anything invalid is fixed and noted.
 */
export function parseHouseInput(r: Reader, cfg: ApplianceConfig = APPLIANCE_CONFIG): { input: HouseInput; notes: InputNote[] } {
  const L = cfg.limits;
  const notes: InputNote[] = [];
  const tons = cfg.ac.tons.map(String);

  const acs: AcSlot[] = [];
  for (let i = 0; i < L.acSlots; i++) {
    const first = i === 0;
    const d = cfg.ac.defaultSlot;
    acs.push({
      tons: Number(pick(r, `ac${i}-tons`, tons, String(d.tons))),
      inverter: pick(r, `ac${i}-type`, ['inverter', 'standard'], 'inverter') === 'inverter',
      qty: num(r, `ac${i}-qty`, `AC group ${i + 1} quantity`, 0, L.qty, first ? d.qty : 0, notes, true),
      hours: num(r, `ac${i}-hours`, `AC group ${i + 1} hours a day`, 0, L.hoursPerDay, first ? d.hours : cfg.ac.defaultHours, notes),
    });
  }

  const appliances: Record<string, ApplianceUse> = {};
  for (const a of cfg.appliances) {
    const max = a.use === 'weekly' ? Math.min(a.maxAmount, L.usesPerWeek) : Math.min(a.maxAmount, L.hoursPerDay);
    const use: ApplianceUse = {
      qty: num(r, `q-${a.id}`, `${a.label} quantity`, 0, L.qty, a.defaultQty ?? 0, notes, true),
      amount: a.use === 'always' ? 0 : num(r, `h-${a.id}`, `${a.label} ${a.use === 'weekly' ? 'uses a week' : 'hours a day'}`, 0, max, a.defaultAmount, notes),
    };
    if (a.wattOptions) use.watts = Number(pick(r, `w-${a.id}`, a.wattOptions.map(String), String(Math.round(a.kw * 1000))));
    if (a.hpOptions) use.hp = Number(pick(r, `hp-${a.id}`, a.hpOptions.map(String), String(a.defaultHp ?? 1)));
    appliances[a.id] = use;
  }

  const geysers: Record<string, GeyserUse> = {};
  for (const g of cfg.geyser.sizes) {
    geysers[g.id] = {
      qty: num(r, `g-${g.id}-qty`, `${g.label} geyser quantity`, 0, L.qty, ('defaultQty' in g ? g.defaultQty : 0) ?? 0, notes, true),
      usesPerDay: num(r, `g-${g.id}-uses`, `${g.label} geyser uses a day`, 0, L.usesPerDay, cfg.geyser.defaultUsesPerDay, notes),
    };
  }

  const vehicleIds = cfg.ev.vehicles.map((v) => v.id);
  const ev: EvInput = {
    mode: pick(r, 'ev', ['none', 'planned', 'owned'] as const, 'none'),
    vehicle: pick(r, 'ev-vehicle', vehicleIds, vehicleIds[0] ?? 'car'),
    kmPerDay: num(r, 'ev-km', 'EV kilometres a day', 0, L.kmPerDay, 0, notes),
    batteryKwh: num(r, 'ev-battery', 'EV battery size', 0, L.evBatteryKwh, 0, notes),
    chargesPerWeek: num(r, 'ev-charges', 'EV full charges a week', 0, L.chargesPerWeek, 0, notes),
  };

  const custom: CustomSlot[] = [];
  for (let i = 0; i < L.customSlots; i++) {
    custom.push({
      name: cleanText(r.get(`c${i}-name`)),
      qty: num(r, `c${i}-qty`, `Other appliance ${i + 1} quantity`, 0, L.qty, 0, notes, true),
      watts: num(r, `c${i}-watts`, `Other appliance ${i + 1} watts`, 0, L.customWatts, 0, notes),
      hours: num(r, `c${i}-hours`, `Other appliance ${i + 1} hours a day`, 0, L.hoursPerDay, 0, notes),
      daysPerWeek: num(r, `c${i}-days`, `Other appliance ${i + 1} days a week`, 0, L.daysPerWeek, 7, notes),
    });
  }

  const futureIds = [...cfg.future.map((f) => f.id), 'other'];
  const future = [...new Set(r.getAll('future').filter((v): v is string => typeof v === 'string' && futureIds.includes(v)))];

  return {
    input: {
      people: num(r, 'people', 'Number of people', 1, L.people, 4, notes, true),
      home: cleanText(r.get('home'), 30),
      district: cleanText(r.get('district'), 40),
      backup: pick(r, 'backup', ['none', 'essentials', 'ac'] as const, 'none'),
      acs,
      acSeason: pick(r, 'ac-season', cfg.ac.seasons.map((s) => s.id), cfg.ac.defaultSeason),
      appliances,
      geysers,
      geyserSeason: pick(r, 'g-season', cfg.geyser.seasons.map((s) => s.id), cfg.geyser.defaultSeason),
      ev,
      custom,
      future,
      futureOther: {
        watts: num(r, 'fo-watts', 'Planned appliance watts', 0, L.customWatts, 0, notes),
        hours: num(r, 'fo-hours', 'Planned appliance hours a day', 0, L.hoursPerDay, 0, notes),
      },
    },
    notes,
  };
}

/** The pre-filled starting point: a typical home, as set in APPLIANCE_CONFIG. */
export function defaultHouseInput(cfg: ApplianceConfig = APPLIANCE_CONFIG): HouseInput {
  return parseHouseInput(new URLSearchParams(), cfg).input;
}

// ---------------------------------------------------------------- the estimate

const round1 = (n: number) => Math.round(n * 10) / 10;
const roundStep = (n: number, step: number) => Math.round(n / step) * step;

function applianceKw(a: ApplianceDef, u: ApplianceUse, cfg: ApplianceConfig): number {
  if (a.wattOptions && u.watts) return u.watts / 1000;
  if (a.hpOptions && u.hp) return u.hp * cfg.pump.kwPerHp;
  return a.kw;
}

export function estimateHouse(
  input: HouseInput,
  notes: InputNote[] = [],
  cfg: ApplianceConfig = APPLIANCE_CONFIG,
  solar: SolarConfig = SOLAR_CONFIG,
): Estimate {
  const lines: Line[] = [];
  let connectedKw = 0;
  let backupKw = 0;
  const add = (id: string, label: string, group: Group, dailyKwh: number, days: number, inPeak: boolean) => {
    if (!(dailyKwh > 0) || !(days > 0)) return;
    lines.push({ id, label, group, kwhYear: dailyKwh * days, kwhPeakMonth: inPeak ? dailyKwh * 30 : 0 });
  };

  // ACs
  const acDays = cfg.ac.seasons.find((s) => s.id === input.acSeason)?.days ?? 150;
  input.acs.forEach((ac, i) => {
    if (ac.qty <= 0) return;
    const avg = cfg.ac.avgKw[ac.inverter ? 'inverter' : 'standard'][ac.tons] ?? 0;
    connectedKw += ac.qty * (cfg.ac.ratedKw[ac.tons] ?? 0);
    add(`ac${i}`, `${ac.qty} × ${ac.tons} ton ${ac.inverter ? 'inverter ' : ''}AC`, 'Cooling', ac.qty * avg * ac.hours, acDays, true);
  });

  // Listed appliances
  for (const a of cfg.appliances) {
    const u = input.appliances[a.id];
    if (!u || u.qty <= 0) continue;
    const kw = applianceKw(a, u, cfg);
    connectedKw += u.qty * kw;
    const season = a.season ?? 'all';
    const days = cfg.seasons[season];
    const inPeak = season !== 'heater';
    let daily = 0;
    if (a.use === 'always') daily = u.qty * (a.kwhPerDay ?? 0);
    else if (a.use === 'weekly') daily = (u.qty * (a.kwhPerUse ?? 0) * u.amount) / 7;
    else daily = u.qty * kw * (a.duty ?? 1) * u.amount;
    if (a.essential) backupKw += a.use === 'always' ? (u.qty * (a.kwhPerDay ?? 0)) / 24 : u.qty * kw * (a.duty ?? 1);
    const label = a.wattOptions ? `${a.label} (${u.qty} × ${Math.round(kw * 1000)} W)` : a.hpOptions ? `${a.label} (${u.qty} × ${u.hp} HP)` : `${a.label}${u.qty > 1 ? ` × ${u.qty}` : ''}`;
    add(a.id, label, GROUP_BY_STEP[a.step] ?? 'Other appliances', daily, days, inPeak);
  }

  // Geysers: energy follows hot-water use, not kW × hours
  const gSeason = cfg.geyser.seasons.find((s) => s.id === input.geyserSeason) ?? cfg.geyser.seasons[0]!;
  for (const g of cfg.geyser.sizes) {
    const u = input.geysers[g.id];
    if (!u || u.qty <= 0) continue;
    connectedKw += u.qty * g.kw;
    const daily = u.qty * (g.kwhPerUse * u.usesPerDay + (u.usesPerDay > 0 ? g.standbyKwh : 0));
    add(`g-${g.id}`, `${g.label} geyser × ${u.qty}`, 'Water heating', daily, gSeason.days, gSeason.id === 'year');
  }

  // Custom appliances
  input.custom.forEach((c, i) => {
    if (c.qty <= 0 || c.hours <= 0 || c.daysPerWeek <= 0) return;
    const kw = c.watts > 0 ? c.watts / 1000 : cfg.customDefaultKw;
    connectedKw += c.qty * kw;
    add(`c${i}`, `${c.name || `Other appliance ${i + 1}`}${c.watts > 0 ? '' : ' (wattage assumed)'}`, 'Other appliances', (c.qty * kw * c.hours * c.daysPerWeek) / 7, 365, true);
  });

  // EV, kept apart from the household
  let ev: Estimate['ev'] = null;
  if (input.ev.mode !== 'none') {
    const v = cfg.ev.vehicles.find((x) => x.id === input.ev.vehicle) ?? cfg.ev.vehicles[0]!;
    let daily: number;
    let method: 'km' | 'battery' | 'default';
    if (input.ev.kmPerDay > 0) {
      daily = input.ev.kmPerDay * v.kwhPerKm;
      method = 'km';
    } else if (input.ev.batteryKwh > 0 && input.ev.chargesPerWeek > 0) {
      daily = (input.ev.batteryKwh * input.ev.chargesPerWeek * cfg.ev.chargingLossFactor) / 7;
      method = 'battery';
    } else {
      daily = v.defaultKm * v.kwhPerKm;
      method = 'default';
    }
    ev = { kwhYear: daily * 365, monthly: (daily * 365) / 12, timing: input.ev.mode, method, vehicle: v.label };
    if (input.ev.mode === 'owned') connectedKw += v.chargerKw;
  }

  // Planned additions
  const futureLines = cfg.future.filter((f) => input.future.includes(f.id)).map((f) => ({ id: f.id, label: f.label, detail: f.detail, kwhYear: f.kwhPerYear }));
  if (input.future.includes('other') && input.futureOther.watts > 0 && input.futureOther.hours > 0) {
    futureLines.push({
      id: 'other',
      label: 'Another major appliance',
      detail: `${input.futureOther.watts} W, ${input.futureOther.hours} hours a day`,
      kwhYear: (input.futureOther.watts / 1000) * input.futureOther.hours * 365,
    });
  }

  // Totals
  const annual = lines.reduce((s, l) => s + l.kwhYear, 0);
  const peakMonth = lines.reduce((s, l) => s + l.kwhPeakMonth, 0);
  const evNow = ev && ev.timing === 'owned' ? ev.kwhYear : 0;
  const evLater = ev && ev.timing === 'planned' ? ev.kwhYear : 0;
  const currentAnnual = annual + evNow;
  const futureAnnual = currentAnnual + evLater + futureLines.reduce((s, f) => s + f.kwhYear, 0);

  const groupTotals = new Map<Group, number>();
  for (const l of lines) groupTotals.set(l.group, (groupTotals.get(l.group) ?? 0) + l.kwhYear);
  const groups = [...groupTotals].map(([group, kwhYear]) => ({ group, kwhYear, share: annual > 0 ? kwhYear / annual : 0 })).sort((a, b) => b.kwhYear - a.kwhYear);

  // Scenarios
  const yieldPerKw = effectiveYieldPerKw(solar);
  const [genLo, genHi] = cfg.generationRange;
  const step = cfg.kwStep;
  const scenario = (id: Scenario['id'], label: string, description: string, target: number): Scenario => {
    const center = target / yieldPerKw;
    let lo = Math.max(step, roundStep(target / (yieldPerKw * genHi), step));
    let hi = Math.max(step, roundStep(target / (yieldPerKw * genLo), step));
    if (hi < lo) [lo, hi] = [hi, lo];
    const exampleKw = nearestSize(Math.max(center, 1), solar);
    return {
      id,
      label,
      description,
      targetKwhYear: target,
      kwRange: [lo, hi],
      exampleKw,
      panels: Math.ceil((exampleKw * 1000) / cfg.panelWatts),
      roofSqFt: exampleKw * solar.generation.sqFtPerKw,
      generationRange: [exampleKw * yieldPerKw * genLo, exampleKw * yieldPerKw * genHi],
      coverage: currentAnnual > 0 ? (exampleKw * yieldPerKw) / currentAnnual : 0,
    };
  };
  const plannedSomething = futureAnnual > currentAnnual;
  const scenarios: Scenario[] =
    currentAnnual > 0
      ? [
          scenario('essential', 'Essential coverage', `Covers about ${Math.round(cfg.scenarios.essentialShare * 100)}% of your current yearly use. The rest, mostly summer AC use, comes from the grid.`, annual * cfg.scenarios.essentialShare),
          scenario('recommended', 'Recommended coverage', ev && ev.timing === 'owned' ? 'Sized for all of your current yearly use, including your EV.' : 'Sized for all of your current yearly use.', currentAnnual),
          scenario(
            'future',
            'Higher coverage',
            plannedSomething
              ? 'Sized for your use after the additions you plan, so you don’t need to add panels later.'
              : `Leaves about ${Math.round(cfg.scenarios.futureHeadroom * 100)}% room for appliances you add later.`,
            plannedSomething ? futureAnnual : currentAnnual * (1 + cfg.scenarios.futureHeadroom),
          ),
        ]
      : [];

  // Battery (only when the visitor wants backup)
  let battery: Estimate['battery'] = null;
  if (input.backup !== 'none' && backupKw > 0) {
    const b = cfg.battery;
    const withAc = input.backup === 'ac';
    const acKwh = withAc ? (cfg.ac.avgKw.inverter[1.5] ?? 0.9) * b.oneAcHours : 0;
    const kwh = (backupKw * b.backupHours + acKwh) / b.usableFraction;
    battery = { kwh: Math.max(0.5, roundStep(kwh, 0.5)), packs: Math.max(1, Math.ceil(kwh / b.packKwh)), hours: b.backupHours, includesAc: withAc };
  }

  const monthly = currentAnnual / 12;
  const free = solar.freeUnits.perMonth;
  const freeUnits: Estimate['freeUnits'] = monthly > free ? 'over' : peakMonth + evNow / 12 > free ? 'summer-over' : 'under';

  return {
    household: { daily: annual / 365, monthly: annual / 12, annual, peakMonth },
    lines: lines.sort((a, b) => b.kwhYear - a.kwhYear),
    groups,
    ev,
    futureLines,
    currentAnnual,
    futureAnnual,
    connectedKw: round1(connectedKw),
    scenarios,
    battery,
    freeUnits,
    onGridMinKw: solar.sizing.minKwByType['on-grid'],
    unusuallyHigh: monthly > cfg.limits.sanityMonthlyUnits,
    notes,
  };
}

/** Parse and estimate in one step. */
export function estimateFrom(r: Reader, cfg: ApplianceConfig = APPLIANCE_CONFIG, solar: SolarConfig = SOLAR_CONFIG): { input: HouseInput; estimate: Estimate } {
  const { input, notes } = parseHouseInput(r, cfg);
  return { input, estimate: estimateHouse(input, notes, cfg, solar) };
}
