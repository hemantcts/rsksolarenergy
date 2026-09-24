import { describe, expect, it } from 'vitest';
import { groupHits, isTypo, search, snippet, tokenise, type SearchPage } from './query';

const page = (u: string, t: string, k: string, d = '', h = '', b = ''): SearchPage => ({ u, t, d, h, b, k });

const PAGES: SearchPage[] = [
  page('/', 'Solar Panel Dealer & Distributor in Mohali', 'page', 'UTL Solar distributor and dealer in Mohali, Punjab.'),
  page('/3kw-solar-system-price-punjab/', '3 kW Solar System Price in Punjab 2026, After Subsidy', 'price', '3 kW on-grid solar in Punjab: ₹1,78,000 to 1,96,000 installed.'),
  page('/pm-surya-ghar-subsidy-punjab/', 'PM Surya Ghar Subsidy in Punjab 2026: Amounts and Steps', 'page', 'How the PM Surya Ghar subsidy works for PSPCL homes.'),
  page('/products/inverters/', 'Solar inverters and PCUs', 'page', '137 solar inverters and PCUs from UTL Solar.'),
  page('/products/gamma-plus-mppt-solar-inverter-3-kva/', 'Gamma Plus MPPT Solar Inverter 3 kVA', 'product', 'UTL hybrid inverter.', '', 'MPPT solar inverter for a 48 V battery bank'),
  page('/solar-company-ludhiana/', 'Solar Company in Ludhiana, Punjab', 'place', 'Rooftop solar in Ludhiana by RSK Solar Energy.'),
  page('/blog/lithium-vs-tubular-battery-for-solar/', 'Lithium or Tubular Battery for Solar: Which Should You Buy?', 'guide', 'Tubular costs less to buy. Lithium lasts about twice the cycles.'),
  page('/products/batteries/', 'Batteries', 'page', 'Tubular, SMF and lithium-ion batteries for inverters and solar systems.'),
  page('/contact/', 'Contact RSK Solar Energy in Mohali', 'page', 'Phone, WhatsApp, address and opening hours.'),
  page('/solar-pumps/', 'Solar Water Pumps and Tubewells for Punjab Farmers', 'page', 'Solar-powered tubewells for agriculture in Punjab.'),
];

const top = (q: string, n = 1) => search(PAGES, q).slice(0, n).map((h) => h.page.u);

describe('site search', () => {
  it('splits numbers from units so "3kw" works like "3 kW"', () => {
    expect(tokenise('3kw price')).toEqual(['3', 'kw', 'price']);
    expect(top('3kw price')).toEqual(['/3kw-solar-system-price-punjab/']);
    expect(top('3 kw')).toEqual(['/3kw-solar-system-price-punjab/']);
  });

  it('puts an exact title match first', () => {
    expect(top('batteries')).toEqual(['/products/batteries/']);
    expect(top('pm surya ghar subsidy')).toEqual(['/pm-surya-ghar-subsidy-punjab/']);
  });

  it('understands words customers use for the same thing', () => {
    expect(top('pcu')).toEqual(['/products/inverters/']);
    expect(top('yojana')).toEqual(['/pm-surya-ghar-subsidy-punjab/']);
    expect(top('tubewell motor')).toEqual(['/solar-pumps/']);
    expect(top('phone number')).toEqual(['/contact/']);
  });

  it('forgives a typo in a longer word', () => {
    expect(isTypo('lithium', 'lithuim')).toBe(true);
    expect(isTypo('kw', 'kv')).toBe(false); // too short to guess
    expect(top('lithuim battery')).toEqual(['/blog/lithium-vs-tubular-battery-for-solar/']);
    expect(top('ludhiaana')).toEqual(['/solar-company-ludhiana/']);
  });

  it('ignores words that are on every page here', () => {
    expect(top('solar ludhiana')).toEqual(['/solar-company-ludhiana/']);
    expect(search(PAGES, 'solar').length).toBeGreaterThan(0);
  });

  it('needs every meaningful word to appear', () => {
    expect(search(PAGES, 'ludhiana aquarium')).toHaveLength(0);
    expect(search(PAGES, 'battery ludhiana')).toHaveLength(0);
  });

  it('prefers a category page over a single product, unless the product is the better match', () => {
    expect(top('inverters')).toEqual(['/products/inverters/']);
    expect(top('gamma mppt')).toEqual(['/products/gamma-plus-mppt-solar-inverter-3-kva/']);
  });

  it('returns nothing for an empty query', () => {
    expect(search(PAGES, '   ')).toEqual([]);
    expect(search(PAGES, '')).toEqual([]);
  });

  it('groups results in a fixed order', () => {
    const groups = groupHits(search(PAGES, 'punjab'));
    expect(groups.map((g) => g.kind)).toEqual([...groups.map((g) => g.kind)].sort((a, b) => ['tool', 'page', 'price', 'guide', 'place', 'product'].indexOf(a) - ['tool', 'page', 'price', 'guide', 'place', 'product'].indexOf(b)));
    expect(groups.every((g) => g.hits.length > 0)).toBe(true);
  });

  it('snippets start near the matching word', () => {
    const p = page('/x/', 'X', 'page', '', '', 'A long page about many things. The lithium battery section is far into the text, well past the start of it all.');
    expect(snippet(p, ['lithium'], 40)).toContain('lithium');
  });

  it('caps results when asked', () => {
    expect(search(PAGES, 'solar', { limit: 3 })).toHaveLength(3);
  });
});
