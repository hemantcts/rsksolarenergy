/**
 * Hybrid and off-grid sizing: the loads a battery has to run in, inverter, battery bank and panels
 * out. Pure functions, used at build time (the worked examples), in the browser and in the tests.
 * An indicative estimate for a first conversation, not an engineering design.
 */
import { BACKUP_CONFIG, type BackupConfig } from '../../config/backup-config';
import { SOLAR_CONFIG, type SolarConfig } from '../../config/solar-config';
import { grossCost } from '../calculator/calculate';
import { effectiveYieldPerKw, sizeAtLeast, sizesForType } from '../calculator/sizing';
import { residentialSubsidy } from '../calculator/subsidy';
import type { Range } from '../calculator/types';

export type BackupMode = 'hybrid' | 'off-grid';
export type BatteryKind = 'lithium' | 'tubular';

export interface BackupInput {
  mode: BackupMode;
  battery: BatteryKind;
  /** Hybrid: length of a power cut, hours. */
  backupHours: number;
  /** Off-grid: extra cloudy days the battery covers. */
  autonomyDays: number;
  loads: Record<string, { qty: number; hours: number }>;
  custom: { name: string; watts: number; qty: number; hours: number };
}

export interface BackupNote {
  field: string;
  message: string;
}

export interface BatteryBank {
  kind: BatteryKind;
  volts: number;
  /** Usable kWh the bank has to supply. */
  neededKwh: number;
  /** Nameplate kWh of the suggested bank. */
  bankKwh: number;
  count: number;
  unitName: string;
  unitSlug: string;
  /** Tubular only: strings in parallel. */
  strings?: number;
}

export interface BackupEstimate {
  mode: BackupMode;
  /** Watts running together (continuous loads plus the largest short-burst load). */
  runningW: number;
  /** Extra watts for a few seconds while the biggest motor starts. */
  surgeW: number;
  inverterKva: number;
  /** Units the battery supplies: during one cut (hybrid) or overnight and cloudy days (off-grid). */
  batteryKwh: number;
  /** Off-grid: units used in a day. Hybrid: units used during one cut. */
  dailyKwh: number;
  bank: BatteryBank;
  /** Panel capacity needed, kW, before rounding to a standard kit. */
  panelKwNeeded: number;
  /** Standard system size we would start from. */
  kitKw: number;
  price: Range;
  subsidy: number;
  lines: { id: string; label: string; qty: number; watts: number; kwh: number }[];
  hasAc: boolean;
  notes: BackupNote[];
}

interface Reader {
  get(name: string): FormDataEntryValue | string | null;
}

function num(r: Reader, name: string, label: string, max: number, fallback: number, notes: BackupNote[], integer = false): number {
  const raw = r.get(name);
  if (typeof raw !== 'string' || raw.trim() === '') return fallback;
  let n = Number(raw.replace(/[,\s]/g, ''));
  if (!Number.isFinite(n)) {
    notes.push({ field: name, message: `${label}: "${raw.slice(0, 20)}" is not a number, so we used ${fallback}.` });
    return fallback;
  }
  if (integer) n = Math.round(n);
  if (n < 0) {
    notes.push({ field: name, message: `${label} can't be negative, so we used 0.` });
    return 0;
  }
  if (n > max) {
    notes.push({ field: name, message: `${label} was capped at ${max}.` });
    return max;
  }
  return n;
}

/** Form fields (FormData or URLSearchParams) to a valid input. Missing fields take the defaults for the mode. */
export function parseBackupInput(r: Reader, cfg: BackupConfig = BACKUP_CONFIG): { input: BackupInput; notes: BackupNote[] } {
  const notes: BackupNote[] = [];
  const L = cfg.limits;
  const mode: BackupMode = r.get('mode') === 'off-grid' ? 'off-grid' : 'hybrid';
  const battery: BatteryKind = r.get('battery') === 'tubular' ? 'tubular' : 'lithium';
  const loads: BackupInput['loads'] = {};
  for (const l of cfg.loads) {
    loads[l.id] = {
      qty: num(r, `q-${l.id}`, `${l.label} quantity`, L.qty, mode === 'hybrid' ? l.qty.hybrid : l.qty.offGrid, notes, true),
      hours: num(r, `h-${l.id}`, `${l.label} hours a day`, L.hoursPerDay, l.hoursPerDay, notes),
    };
  }
  const name = r.get('c-name');
  return {
    input: {
      mode,
      battery,
      backupHours: num(r, 'backup-hours', 'Power cut length', L.backupHours, cfg.backupHours.default, notes),
      autonomyDays: Math.min(num(r, 'autonomy', 'Cloudy days', 3, cfg.autonomyDays.default, notes, true), 3),
      loads,
      custom: {
        name: typeof name === 'string' ? name.replace(/[<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40) : '',
        watts: num(r, 'c-watts', 'Other appliance watts', L.watts, 0, notes),
        qty: num(r, 'c-qty', 'Other appliance quantity', L.qty, 0, notes, true),
        hours: num(r, 'c-hours', 'Other appliance hours a day', L.hoursPerDay, 0, notes),
      },
    },
    notes,
  };
}

const roundUp = (n: number, step: number) => Math.ceil(n / step - 1e-9) * step;

export function estimateBackup(input: BackupInput, notes: BackupNote[] = [], cfg: BackupConfig = BACKUP_CONFIG, solar: SolarConfig = SOLAR_CONFIG): BackupEstimate {
  const hybrid = input.mode === 'hybrid';
  const eff = cfg.inverter.efficiency;
  let continuousW = 0;
  let largestBurstW = 0;
  let surgeW = 0;
  let energyKwh = 0;
  const lines: BackupEstimate['lines'] = [];

  const add = (id: string, label: string, qty: number, watts: number, duty: number, hours: number, surge: number, intermittent: boolean) => {
    if (qty <= 0 || watts <= 0) return;
    if (intermittent) largestBurstW = Math.max(largestBurstW, watts);
    else continuousW += qty * watts;
    surgeW = Math.max(surgeW, watts * (surge - 1));
    const kwh = (qty * watts * duty * hours) / 1000;
    energyKwh += kwh;
    lines.push({ id, label, qty, watts, kwh });
  };

  for (const l of cfg.loads) {
    const u = input.loads[l.id];
    if (!u) continue;
    const hours = hybrid ? Math.min(input.backupHours, l.maxHoursPerCut ?? Infinity) : u.hours;
    add(l.id, l.label, u.qty, l.watts, l.duty ?? 1, hours, l.surge ?? 1, !!l.intermittent);
  }
  const c = input.custom;
  if (c.qty > 0 && c.watts > 0) add('custom', c.name || 'Other appliance', c.qty, c.watts, 1, hybrid ? Math.min(input.backupHours, c.hours || input.backupHours) : c.hours, 1, false);

  const runningW = continuousW + largestBurstW;
  const pf = cfg.inverter.powerFactor;
  const needKva = Math.max(runningW / pf, (runningW + surgeW) / pf / cfg.inverter.surgeCapability) / 1000;
  const inv = cfg.inverter.sizes.find((s) => s.kva >= needKva - 1e-9) ?? cfg.inverter.sizes[cfg.inverter.sizes.length - 1]!;
  if (needKva > inv.kva) notes.push({ field: 'loads', message: `The loads need more than a ${inv.kva} kVA inverter. A system this size is designed after a site survey, often split across two inverters.` });

  // Battery: units it must supply, then the bank that supplies them without deep discharge.
  const batteryKwh = hybrid ? energyKwh : energyKwh * (cfg.offGridNightShare + input.autonomyDays);
  const b = cfg.battery;
  let bank: BatteryBank;
  if (input.battery === 'lithium') {
    const pack = b.lithium.packs.find((p) => p.volts === inv.volts) ?? b.lithium.packs[b.lithium.packs.length - 1]!;
    const count = Math.max(1, Math.ceil(batteryKwh / (pack.kwh * b.lithium.usable * eff) - 1e-9));
    bank = { kind: 'lithium', volts: inv.volts, neededKwh: batteryKwh, bankKwh: count * pack.kwh, count, unitName: pack.name, unitSlug: pack.slug };
  } else {
    const series = inv.volts / b.tubular.unitVolts;
    const perString = (unit: { ah: number }) => (inv.volts * unit.ah) / 1000;
    const options = b.tubular.units.map((u) => ({ u, strings: Math.max(1, Math.ceil(batteryKwh / (perString(u) * b.tubular.usable * eff) - 1e-9)) }));
    // Fewest batteries; ties go to the smaller battery.
    const best = options.reduce((a, o) => (o.strings < a.strings ? o : a));
    bank = { kind: 'tubular', volts: inv.volts, neededKwh: batteryKwh, bankKwh: best.strings * perString(best.u), count: best.strings * series, unitName: best.u.name, unitSlug: best.u.slug, strings: best.strings };
    if (best.strings > b.maxTubularStrings) notes.push({ field: 'battery', message: `That needs ${best.strings} sets of tubular batteries in parallel. Lithium, or a higher-voltage system, is usually the better way to store this much.` });
  }

  // Panels: refill the battery after a cut (hybrid), or make a whole winter day's units (off-grid).
  const perKwDay = effectiveYieldPerKw(solar) / 365;
  const panelKwNeeded = hybrid ? energyKwh / eff / perKwDay : energyKwh / eff / (perKwDay * cfg.winterYieldFactor);
  const type = hybrid ? 'hybrid' : 'off-grid';
  const kitKw = sizeAtLeast(Math.max(roundUp(panelKwNeeded, cfg.kwStep), inv.kva, 1), solar, sizesForType(type, solar));

  const hasAc = lines.some((l) => l.id.startsWith('ac-'));
  if (hasAc && hybrid) notes.push({ field: 'ac', message: 'Running an AC on battery takes a lot of storage. Many homes keep the AC on the grid and back up only lights, fans and the fridge.' });
  if (!hybrid && input.battery === 'tubular') notes.push({ field: 'battery', message: 'An off-grid battery is used every night. Lithium costs more to buy but lasts about twice as many cycles, so it often works out cheaper over the years.' });

  return {
    mode: input.mode,
    runningW,
    surgeW,
    inverterKva: inv.kva,
    batteryKwh,
    dailyKwh: energyKwh,
    bank,
    panelKwNeeded,
    kitKw,
    price: grossCost(kitKw, type, solar),
    subsidy: hybrid ? residentialSubsidy(kitKw, solar) : 0,
    lines: lines.sort((a, z) => z.kwh - a.kwh),
    hasAc,
    notes,
  };
}

export function estimateBackupFrom(r: Reader, cfg: BackupConfig = BACKUP_CONFIG, solar: SolarConfig = SOLAR_CONFIG) {
  const { input, notes } = parseBackupInput(r, cfg);
  return { input, estimate: estimateBackup(input, notes, cfg, solar) };
}
