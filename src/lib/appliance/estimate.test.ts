import { describe, expect, it } from 'vitest';
import { APPLIANCE_CONFIG } from '../../config/appliance-config';
import { SOLAR_CONFIG } from '../../config/solar-config';
import { effectiveYieldPerKw } from '../calculator/sizing';
import { estimateFrom, parseHouseInput } from './estimate';

const run = (fields: Record<string, string | string[]>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) p.append(k, x);
  return estimateFrom(p);
};
/** Every appliance and geyser set to zero, so a test can add only what it needs. */
const zeros = (): Record<string, string> => {
  const z: Record<string, string> = { 'ac0-qty': '0' };
  for (const a of APPLIANCE_CONFIG.appliances) z[`q-${a.id}`] = '0';
  for (const g of APPLIANCE_CONFIG.geyser.sizes) z[`g-${g.id}-qty`] = '0';
  return z;
};
const finite = (n: number) => Number.isFinite(n) && n >= 0;
const scenario = (e: ReturnType<typeof run>['estimate'], id: string) => e.scenarios.find((s) => s.id === id)!;

/** Every number in the result is a finite, non-negative figure. */
function expectSane(e: ReturnType<typeof run>['estimate']) {
  for (const n of [e.household.daily, e.household.monthly, e.household.annual, e.household.peakMonth, e.currentAnnual, e.futureAnnual, e.connectedKw]) expect(finite(n)).toBe(true);
  for (const s of e.scenarios) {
    for (const n of [...s.kwRange, s.exampleKw, s.panels, s.roofSqFt, ...s.generationRange, s.coverage]) expect(finite(n)).toBe(true);
    expect(s.kwRange[0]).toBeLessThanOrEqual(s.kwRange[1]);
  }
}

describe('new-house estimate', () => {
  it('A: a typical home lands in a realistic range', () => {
    const { estimate: e } = run({
      'ac0-qty': '2', 'ac0-tons': '1.5', 'ac0-type': 'inverter', 'ac0-hours': '8',
      'g-25-qty': '2', 'q-led-bulb': '10', 'q-fan': '5', 'q-washer': '1',
    });
    expectSane(e);
    // A 3-bedroom Punjab home with two ACs typically uses 300 to 600 units a month on average.
    expect(e.household.monthly).toBeGreaterThan(300);
    expect(e.household.monthly).toBeLessThan(600);
    expect(e.household.peakMonth).toBeGreaterThan(e.household.monthly);
    const rec = scenario(e, 'recommended');
    expect(rec.kwRange[0]).toBeGreaterThanOrEqual(3);
    expect(rec.kwRange[1]).toBeLessThanOrEqual(6);
    expect(rec.kwRange[0] % APPLIANCE_CONFIG.kwStep).toBe(0);
    expect(e.freeUnits).toBe('over');
    expect(e.ev).toBeNull();
  });

  it('B: a larger home with a future EV needs more, and the EV stays separate', () => {
    const { estimate: e } = run({
      'ac0-qty': '3', 'ac0-tons': '1.5', 'ac1-qty': '1', 'ac1-tons': '2', 'ac1-type': 'standard', 'ac1-hours': '6',
      'g-25-qty': '3', 'q-fridge': '0', 'q-fridge-sbs': '1', 'q-tv-large': '2', 'q-pump-submersible': '1', 'q-led-bulb': '20',
      ev: 'planned', 'ev-vehicle': 'car', 'ev-km': '40',
    });
    expectSane(e);
    expect(e.household.monthly).toBeGreaterThan(600);
    expect(e.ev?.timing).toBe('planned');
    expect(e.ev?.method).toBe('km');
    expect(e.currentAnnual).toBeCloseTo(e.household.annual);
    expect(e.futureAnnual).toBeCloseTo(e.currentAnnual + 40 * 0.15 * 365);
    expect(scenario(e, 'future').kwRange[1]).toBeGreaterThan(scenario(e, 'recommended').kwRange[1]);
  });

  it('C: a small home can sit under the 300 free units', () => {
    const { estimate: e } = run({ 'ac0-qty': '1', 'ac0-tons': '1', 'ac0-hours': '5', 'q-fan': '3', 'q-led-bulb': '6' });
    expectSane(e);
    expect(e.household.monthly).toBeLessThan(300);
    expect(['under', 'summer-over']).toContain(e.freeUnits);
  });

  it('D: an EV already owned counts in current use but is reported on its own', () => {
    const { estimate: e } = run({ ev: 'owned', 'ev-vehicle': 'car', 'ev-battery': '30', 'ev-charges': '2' });
    expect(e.ev?.method).toBe('battery');
    expect(e.ev!.kwhYear).toBeCloseTo((30 * 2 * APPLIANCE_CONFIG.ev.chargingLossFactor * 365) / 7);
    expect(e.currentAnnual).toBeCloseTo(e.household.annual + e.ev!.kwhYear);
    expect(e.lines.some((l) => /EV/.test(l.label))).toBe(false);
    // With no km and no battery, the default km is used.
    expect(run({ ev: 'planned', 'ev-vehicle': 'scooter' }).estimate.ev?.method).toBe('default');
  });

  it('E: a custom appliance works with and without wattage', () => {
    const withW = run({ 'c0-name': 'Aquarium', 'c0-qty': '1', 'c0-watts': '200', 'c0-hours': '10', 'c0-days': '7' }).estimate;
    const noW = run({ 'c0-name': 'Aquarium', 'c0-qty': '1', 'c0-hours': '10', 'c0-days': '7' }).estimate;
    expect(withW.lines.find((l) => l.id === 'c0')!.kwhYear).toBeCloseTo(0.2 * 10 * 365);
    expect(noW.lines.find((l) => l.id === 'c0')!.kwhYear).toBeCloseTo(APPLIANCE_CONFIG.customDefaultKw * 10 * 365);
    expect(noW.lines.find((l) => l.id === 'c0')!.label).toMatch(/assumed/);
  });

  it('F: bad input never produces NaN, Infinity or negatives', () => {
    const { input, estimate: e } = run({
      people: '-3', 'ac0-qty': 'abc', 'ac0-hours': '99', 'q-fan': '1e9', 'h-fan': '-5', 'q-led-bulb': '2.6', 'ac0-tons': '7',
      'g-25-qty': 'Infinity', 'ev': 'maybe', 'ev-km': 'NaN', 'c0-name': '<script>alert(1)</script>', 'c0-qty': '1', 'c0-hours': '3',
      future: ['ac', 'bogus', 'ac'],
    });
    expectSane(e);
    expect(input.people).toBe(1);
    expect(input.acs[0]!.hours).toBe(24);
    expect(input.acs[0]!.tons).toBe(1.5);
    expect(input.appliances['fan']!.qty).toBe(APPLIANCE_CONFIG.limits.qty);
    expect(input.appliances['fan']!.amount).toBe(0);
    expect(input.appliances['led-bulb']!.qty).toBe(3);
    expect(input.ev.mode).toBe('none');
    expect(input.custom[0]!.name).not.toMatch(/[<>]/);
    expect(input.future).toEqual(['ac']);
    expect(e.notes.length).toBeGreaterThan(0);
  });

  it('F: an empty home (everything zero) gives no scenarios instead of crashing', () => {
    const { estimate: e } = run(zeros());
    expect(e.currentAnnual).toBe(0);
    expect(e.scenarios).toEqual([]);
    expect(e.freeUnits).toBe('under');
  });

  it('flags a total far beyond a normal home', () => {
    const { estimate: e } = run({ 'ac0-qty': '20', 'ac0-tons': '3', 'ac0-type': 'standard', 'ac0-hours': '24', 'ac-season': 'long' });
    expect(e.unusuallyHigh).toBe(true);
  });

  it('sizes from energy, not connected load', () => {
    // Two 3 kW instant geysers are 6 kW of connected load but little energy.
    const { estimate: e } = run({ ...zeros(), 'g-instant-qty': '2', 'g-instant-uses': '1' });
    expect(e.connectedKw).toBe(6);
    expect(scenario(e, 'recommended').kwRange[1]).toBeLessThan(3);
  });

  it('scenario figures follow the shared solar generation config', () => {
    const { estimate: e } = run({});
    const rec = scenario(e, 'recommended');
    const y = effectiveYieldPerKw(SOLAR_CONFIG);
    expect(rec.generationRange[0]).toBeCloseTo(rec.exampleKw * y * APPLIANCE_CONFIG.generationRange[0]);
    expect(rec.panels).toBe(Math.ceil((rec.exampleKw * 1000) / APPLIANCE_CONFIG.panelWatts));
  });

  it('battery only when backup is asked for, and bigger with an AC', () => {
    expect(run({}).estimate.battery).toBeNull();
    const ess = run({ backup: 'essentials' }).estimate.battery!;
    const ac = run({ backup: 'ac' }).estimate.battery!;
    expect(ess.kwh).toBeGreaterThan(0);
    expect(ac.kwh).toBeGreaterThan(ess.kwh);
  });

  it('parses FormData-like readers with defaults for missing fields', () => {
    const { input } = parseHouseInput(new URLSearchParams());
    expect(input.appliances['fridge']!.qty).toBe(1);
    expect(input.acs[0]!.qty).toBe(APPLIANCE_CONFIG.ac.defaultSlot.qty);
  });
});
