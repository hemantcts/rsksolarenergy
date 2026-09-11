import raw from './products.json';

export type ProductCategory =
  | 'solar-systems'
  | 'solar-panels'
  | 'inverters'
  | 'batteries'
  | 'charge-controllers'
  | 'ev-chargers'
  | 'lighting-and-appliances';

export type SpecRow = { section: string } | { label: string; values: string[] };

export interface Product {
  slug: string;
  /** Slug on the old WordPress site, for the 301 map. */
  oldSlug: string;
  title: string;
  category: ProductCategory;
  brand: string;
  model: string | null;
  summary: string;
  description: string[];
  features: string[];
  specs: { columns: string[] | null; rows: SpecRow[] } | null;
  /** Image URL on the old site. TODO: migrate product photos (see TODO-content.md). */
  oldImage: string;
}

export const PRODUCTS = raw as Product[];

export const CATEGORIES: { id: ProductCategory; name: string; blurb: string }[] = [
  {
    id: 'solar-systems',
    name: 'Complete solar systems',
    blurb: 'UTL hybrid and off-grid kits from 1 kW to 5 kW: panels, inverter and batteries matched.',
  },
  { id: 'solar-panels', name: 'Solar panels', blurb: 'Mono PERC and polycrystalline modules from 40 W to 400 W.' },
  {
    id: 'inverters',
    name: 'Solar inverters and PCUs',
    blurb: 'Heliac, Shamsi, Gamma+, Alfa+, Sigma+ and Combo+ units, 675 VA to 5 kVA.',
  },
  { id: 'batteries', name: 'Batteries', blurb: 'Tubular solar and inverter batteries, plus e-bike batteries.' },
  {
    id: 'charge-controllers',
    name: 'Charge controllers',
    blurb: 'PWM and rMPPT controllers and solar management units that convert a normal inverter to solar.',
  },
  { id: 'ev-chargers', name: 'EV battery chargers', blurb: 'Chargers for e-rickshaws and lithium-ion e-bikes.' },
  { id: 'lighting-and-appliances', name: 'Lighting and appliances', blurb: 'Solar lighting kits, lanterns, torches and a solar air conditioner.' },
];

export function productsIn(category: ProductCategory): Product[] {
  return PRODUCTS.filter((p) => p.category === category);
}

export function categoryName(id: ProductCategory): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

/** Up to three spec rows worth showing on a listing card. */
export function keyFacts(p: Product): { label: string; value: string }[] {
  if (!p.specs) return [];
  const wanted = /capacity|rating|system rating|maximum power|warranty|nominal voltage|panel quantity|solar battery|charging current|max\. solar current/i;
  const rows = p.specs.rows.filter((r): r is { label: string; values: string[] } => 'label' in r && wanted.test(r.label));
  return rows.slice(0, 3).map((r) => ({ label: r.label, value: r.values.join(' / ') }));
}
