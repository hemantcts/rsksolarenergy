import { describe, expect, it } from 'vitest';
import { SOLAR_CONFIG } from '../../config/solar-config';
import { effectiveYieldPerKw, monthlyGenerationPerKw } from '../calculator/sizing';
import { residentialSubsidy } from '../calculator/subsidy';
import { MIN_ARRAY_WP } from '../../data/pump-spec';
import { dieselPerYear, feetToMetres, litresPerWpAt, pumpEstimate } from './pump';
import { roofEstimate } from './roof';
import { generationFor, PUNJAB_AVERAGE, TOWNS } from './generation';
import { compareQuotes, perKwSpread, QUOTE_ITEMS } from './quotes';
import { selectSystem } from './selector';

const sqFt = SOLAR_CONFIG.generation.sqFtPerKw;

describe('roof capacity', () => {
  it('fits area divided by the planning area per kW, then the largest on-grid size', () => {
    const r = roofEstimate({ areaSqFt: 600, usableShare: 1, home: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fitsKw).toBeCloseTo(600 / sqFt, 1);
    expect(r.systemKw).toBeLessThanOrEqual(r.fitsKw);
    expect(r.limitedBy).toBe('roof');
    expect(r.unitsPerMonth).toBe(Math.round((r.systemKw ?? 0) * monthlyGenerationPerKw(SOLAR_CONFIG)));
    expect(r.subsidy).toBe(residentialSubsidy(r.systemKw ?? 0, SOLAR_CONFIG));
  });
  it('takes length times width when no area is given', () => {
    const r = roofEstimate({ lengthFt: 30, widthFt: 20, usableShare: 0.5, home: true });
    expect(r.ok && r.usableSqFt).toBe(300);
  });
  it('caps at the sanctioned load', () => {
    const r = roofEstimate({ areaSqFt: 2000, usableShare: 1, loadKw: 5, home: true });
    expect(r.ok && r.systemKw).toBe(5);
    expect(r.ok && r.limitedBy).toBe('load');
  });
  it('has no on-grid size when the roof is below the smallest one', () => {
    const r = roofEstimate({ areaSqFt: 150, usableShare: 1, home: true });
    expect(r.ok && r.systemKw).toBeNull();
  });
  it('gives businesses no subsidy, and counts panels', () => {
    const r = roofEstimate({ areaSqFt: 1000, usableShare: 1, panelW: 540, home: false });
    expect(r.ok && r.subsidy).toBe(0);
    if (r.ok && r.systemKw) expect(r.panels).toBe(Math.ceil((r.systemKw * 1000) / 540));
  });
  it('asks for an area', () => {
    expect(roofEstimate({ usableShare: 1, home: true }).ok).toBe(false);
  });
});

describe('solar pump', () => {
  it('reads the minimum array straight from the specification', () => {
    const r = pumpEstimate({ kind: 'submersible', motor: 'dc', head: 30, hp: 3 });
    expect(r.ok && r.arrayWp).toBe(3000);
    expect(r.ok && r.litresPerDay).toBe(3000 * 38);
  });
  it('matches the specification table: 5 HP DC submersible at 50 m gives 1,10,400 litres', () => {
    const r = pumpEstimate({ kind: 'submersible', motor: 'dc', head: 50, hp: 5 });
    expect(r.ok && r.litresPerDay).toBe(110400);
  });
  it('reads a head between listed points at the next deeper one, never overstating', () => {
    expect(litresPerWpAt('ac', 35)?.head).toBe(50);
    expect(litresPerWpAt('dc', 10)?.litres).toBe(110);
    expect(litresPerWpAt('dc', 260)).toBeNull();
  });
  it('picks the smallest pump that meets a daily water need', () => {
    const r = pumpEstimate({ kind: 'submersible', motor: 'dc', head: 30, litresPerDay: 100000 });
    expect(r.ok && r.hp).toBe(3);
    expect(r.ok && r.litresPerDay).toBeGreaterThanOrEqual(100000);
  });
  it('flags a need no pump in the table meets', () => {
    const r = pumpEstimate({ kind: 'submersible', motor: 'dc', head: 100, litresPerDay: 10_000_000 });
    expect(r.ok && r.fromNeed?.enough).toBe(false);
  });
  it('warns when a surface pump is asked to lift too far', () => {
    const r = pumpEstimate({ kind: 'surface', motor: 'ac', head: 50, hp: 5 });
    expect(r.ok && r.notes.some((n) => n.includes('submersible'))).toBe(true);
  });
  it('has every pump size for both kinds', () => {
    for (const k of ['surface', 'submersible'] as const) expect(Object.keys(MIN_ARRAY_WP[k])).toHaveLength(6);
  });
  it('converts feet and works out diesel from the user’s own figures', () => {
    expect(feetToMetres(328.084)).toBeCloseTo(100, 3);
    expect(dieselPerYear(2, 5, 100, 90)).toBe(90000);
    expect(dieselPerYear(0, 5, 100, 90)).toBeNull();
  });
});

describe('generation by location', () => {
  it('has the whole town list, with twelve months each', () => {
    expect(TOWNS.length).toBeGreaterThanOrEqual(40);
    for (const t of TOWNS) expect(t.monthly).toHaveLength(12);
  });
  it('averages to the planning figure across Punjab', () => {
    const mean = TOWNS.reduce((s, t) => s + (generationFor(t.slug, 1)?.year ?? 0), 0) / TOWNS.length;
    expect(mean).toBeCloseTo(effectiveYieldPerKw(SOLAR_CONFIG), 6);
  });
  it('splits the year by month and scales with size', () => {
    const g = generationFor('mohali', 3)!;
    expect(g.months.reduce((a, b) => a + b, 0)).toBeCloseTo(g.year, 6);
    expect(g.year).toBeCloseTo(3 * effectiveYieldPerKw(SOLAR_CONFIG) * (g.town.annual / PUNJAB_AVERAGE), 6);
  });
  it('returns nothing for an unknown town or size', () => {
    expect(generationFor('nowhere', 3)).toBeNull();
    expect(generationFor('mohali', 0)).toBeNull();
  });
});

describe('quote comparison', () => {
  const all = QUOTE_ITEMS.map((i) => i.id);
  it('works out price per kW and the subsidy only for DCR home systems', () => {
    const [a, b] = compareQuotes(
      [
        { name: 'A', kw: 3, price: 180000, type: 'on-grid', dcr: 'yes', panelWarranty: 10, inverterWarranty: 5, includes: all },
        { name: 'B', kw: 3, price: 150000, type: 'on-grid', dcr: 'no', includes: [] },
      ],
      true,
    );
    expect(a!.perKw).toBe(60000);
    expect(a!.subsidy).toBe(residentialSubsidy(3, SOLAR_CONFIG));
    expect(a!.missing).toHaveLength(0);
    expect(b!.subsidy).toBe(0);
    expect(b!.flags.some((f) => f.includes('Non-DCR'))).toBe(true);
    expect(b!.missing).toHaveLength(QUOTE_ITEMS.length);
  });
  it('gives businesses and off-grid systems no subsidy', () => {
    const [biz] = compareQuotes([{ name: '', kw: 10, price: 500000, type: 'on-grid', dcr: 'yes', includes: [] }], false);
    expect(biz!.subsidy).toBe(0);
    const [off] = compareQuotes([{ name: '', kw: 3, price: 300000, type: 'off-grid', dcr: 'yes', includes: [] }], true);
    expect(off!.subsidy).toBe(0);
  });
  it('skips empty quotes and measures the spread', () => {
    const rows = compareQuotes(
      [
        { name: 'A', kw: 3, price: 150000, type: 'on-grid', dcr: 'yes', includes: [] },
        { name: 'B', kw: 3, price: 180000, type: 'on-grid', dcr: 'yes', includes: [] },
        { name: 'C', kw: 0, price: 0, type: 'on-grid', dcr: 'yes', includes: [] },
      ],
      true,
    );
    expect(rows).toHaveLength(2);
    expect(perKwSpread(rows)).toBeCloseTo(0.2, 6);
  });
});

describe('system selector', () => {
  const base = { use: 'home', grid: 'yes', cuts: 'rare', units: 'over', want: 'bill' } as const;
  it('sends a home over the line with rare cuts to on-grid', () => expect(selectSystem(base).pick).toBe('on-grid'));
  it('sends frequent cuts to hybrid', () => expect(selectSystem({ ...base, cuts: 'often' }).pick).toBe('hybrid'));
  it('sends no grid to off-grid', () => expect(selectSystem({ ...base, grid: 'no' }).pick).toBe('off-grid'));
  it('sends a tubewell to a solar pump', () => expect(selectSystem({ ...base, use: 'pump' }).pick).toBe('pump'));
  it('tells a home under the free units it may not need solar', () => expect(selectSystem({ ...base, units: 'under' }).pick).toBe('none'));
  it('still offers hybrid under the free units when backup is wanted', () => expect(selectSystem({ ...base, units: 'under', want: 'backup' }).pick).toBe('hybrid'));
  it('never offers a business the subsidy', () => expect(selectSystem({ ...base, use: 'business' }).subsidy).toContain('no subsidy'));
});
