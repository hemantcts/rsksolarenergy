import { describe, expect, it } from 'vitest';
import { BACKUP_CONFIG } from '../../config/backup-config';
import { estimateBackupFrom } from './estimate';

const run = (f: Record<string, string>) => estimateBackupFrom(new URLSearchParams(f)).estimate;
const finite = (n: number) => Number.isFinite(n) && n >= 0;

describe('hybrid and off-grid estimate', () => {
  it('hybrid defaults: lights, fans, fridge and TV for a 4-hour cut', () => {
    const e = run({ mode: 'hybrid' });
    expect(e.inverterKva).toBe(1);
    expect(e.bank.volts).toBe(24);
    // 6×9 + 2×20 + 3×75 + 200×0.4 + 70 + 10 W for 4 hours ≈ 1.9 units
    expect(e.dailyKwh).toBeCloseTo(((54 + 40 + 225 + 80 + 70 + 10) * 4) / 1000, 5);
    expect(e.bank.count).toBeGreaterThanOrEqual(1);
    expect(e.subsidy).toBeGreaterThan(0);
  });

  it('a 1 HP pump pushes the inverter up for its starting surge', () => {
    const without = run({ mode: 'hybrid' });
    const withPump = run({ mode: 'hybrid', 'q-pump': '1' });
    expect(withPump.inverterKva).toBeGreaterThan(without.inverterKva);
    // The pump runs half an hour of a cut, not all of it.
    expect(withPump.dailyKwh - without.dailyKwh).toBeCloseTo(0.5, 5);
  });

  it('an AC on backup needs far more battery, and says so', () => {
    const e = run({ mode: 'hybrid', 'q-ac-15': '1' });
    expect(e.batteryKwh).toBeGreaterThan(run({ mode: 'hybrid' }).batteryKwh * 2);
    expect(e.notes.some((n) => n.field === 'ac')).toBe(true);
  });

  it('tubular needs more nameplate storage than lithium for the same use', () => {
    const li = run({ mode: 'hybrid', battery: 'lithium', 'q-ac-1': '1' });
    const tu = run({ mode: 'hybrid', battery: 'tubular', 'q-ac-1': '1' });
    expect(tu.bank.bankKwh).toBeGreaterThanOrEqual(li.bank.bankKwh);
    expect(tu.bank.count % (tu.bank.volts / 12)).toBe(0);
  });

  it('off-grid: panels sized for winter, battery for the night plus cloudy days', () => {
    const e0 = run({ mode: 'off-grid' });
    const e1 = run({ mode: 'off-grid', autonomy: '1' });
    expect(e0.batteryKwh).toBeCloseTo(e0.dailyKwh * BACKUP_CONFIG.offGridNightShare, 5);
    expect(e1.batteryKwh).toBeCloseTo(e0.dailyKwh * (BACKUP_CONFIG.offGridNightShare + 1), 5);
    expect(e0.subsidy).toBe(0);
    expect(e0.kitKw).toBeGreaterThanOrEqual(e0.inverterKva);
    expect(e0.notes.some((n) => n.field === 'battery')).toBe(false);
    expect(run({ mode: 'off-grid', battery: 'tubular' }).notes.some((n) => n.field === 'battery')).toBe(true);
  });

  it('custom appliance with wattage is counted', () => {
    const base = run({ mode: 'off-grid' });
    const e = run({ mode: 'off-grid', 'c-name': 'Aquarium', 'c-watts': '100', 'c-qty': '1', 'c-hours': '10' });
    expect(e.dailyKwh - base.dailyKwh).toBeCloseTo(1, 5);
  });

  it('bad input never gives NaN, Infinity or negatives', () => {
    const e = run({ mode: 'weird', battery: 'x', 'backup-hours': '-4', 'q-fan': 'abc', 'q-tv': '1e9', 'h-tv': 'Infinity', 'c-watts': '99999999', 'c-qty': '2', 'c-name': '<b>x</b>' });
    for (const n of [e.runningW, e.surgeW, e.inverterKva, e.batteryKwh, e.dailyKwh, e.bank.count, e.bank.bankKwh, e.panelKwNeeded, e.kitKw, ...e.price]) expect(finite(n)).toBe(true);
    expect(e.mode).toBe('hybrid');
    expect(e.notes.length).toBeGreaterThan(0);
  });

  it('nothing selected still returns a sane minimum system', () => {
    const f: Record<string, string> = { mode: 'hybrid' };
    for (const l of BACKUP_CONFIG.loads) f[`q-${l.id}`] = '0';
    const e = run(f);
    expect(e.dailyKwh).toBe(0);
    expect(e.bank.count).toBe(1);
    expect(e.kitKw).toBeGreaterThanOrEqual(1);
  });
});
