import raw from './products.json';
import type { ImageMetadata } from 'astro';

/**
 * Real product photos, sourced from the old RSK site and from UTL's own catalogue site
 * (upsinverter.com), re-encoded to webp and hosted locally rather than hotlinked — see
 * fetch-product-images.mjs in _archive/old-site-scrape for how these were produced. Not stock:
 * every image is the actual product it's shown against.
 */
const imageModules = import.meta.glob<{ default: ImageMetadata }>('/src/assets/products/*.webp', { eager: true });
export const PRODUCT_IMAGES: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(imageModules).map(([path, mod]) => [path.split('/').pop()!.replace(/\.webp$/, ''), mod.default]),
);

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
  /** Slug on the old rsksolarenergy.com WordPress site, for the 301 map. Null for products that
   * were never on the old RSK site (e.g. added from UTL's own catalogue). */
  oldSlug: string | null;
  title: string;
  category: ProductCategory;
  brand: string;
  model: string | null;
  summary: string;
  description: string[];
  features: string[];
  specs: { columns: string[] | null; rows: SpecRow[] } | null;
  /** Where this listing's text was sourced from, for provenance. */
  source: 'rsk-old-site' | 'utl-catalogue';
  /** Original source image URL, kept for provenance — the real, local, re-hosted photo actually shown is looked up from PRODUCT_IMAGES by slug. */
  oldImage: string;
}

export const PRODUCTS = raw as Product[];

export const CATEGORIES: { id: ProductCategory; name: string; blurb: string }[] = [
  {
    id: 'solar-systems',
    name: 'Complete solar systems',
    blurb: 'UTL hybrid and off-grid kits from 1 kW to 5 kW: panels, inverter and batteries matched.',
  },
  { id: 'solar-panels', name: 'Solar panels', blurb: 'Mono PERC, N-Type TOPCon and bifacial modules from 40 W to 735 W, including DCR and non-DCR panels.' },
  {
    id: 'inverters',
    name: 'Solar inverters and PCUs',
    blurb: 'Home inverters, hybrid solar PCUs and on-grid string inverters — Heliac, Shamsi, Gamma+, Alfa+, Sigma+, Zeta, Sun-lion and more, 675 VA to 125 kW.',
  },
  { id: 'batteries', name: 'Batteries', blurb: 'Tubular, SMF and lithium-ion (LiFePO4) batteries for inverters, solar systems and e-rickshaws.' },
  {
    id: 'charge-controllers',
    name: 'Charge controllers',
    blurb: 'PWM and rMPPT controllers and solar management units that convert a normal inverter to solar.',
  },
  { id: 'ev-chargers', name: 'EV battery chargers', blurb: 'Lead-acid, SMF and lithium-ion chargers for e-rickshaws and e-bikes, 48V to 72V.' },
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
