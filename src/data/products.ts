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

/**
 * `name` is what the category is called around the site. `title` is what it goes after in search,
 * and `heading` is its H1 where the plain name would collide with another page.
 *
 * The titles name Punjab rather than Mohali on purpose. Mohali is carried by the homepage, the
 * Mohali page, forty-five town pages, the panels guide and the business schema on every page, so
 * six catalogue pages repeating it added nothing and left the state-wide product searches, "solar
 * inverter dealer in Punjab" and the like, with no page of their own.
 */
/** A brand comparison page, shown on the category it is about. */
export interface CategoryComparison {
  href: string;
  brand: string;
}

export const CATEGORIES: { id: ProductCategory; name: string; blurb: string; title: string; heading?: string; compare?: CategoryComparison[] }[] = [
  {
    id: 'solar-systems',
    name: 'Complete solar systems',
    title: 'Complete Solar Systems for Home and Business in Punjab',
    compare: [
      { href: '/utl-vs-tata-power-solar/', brand: 'Tata Power Solar' },
      { href: '/utl-vs-fujiyama-solar/', brand: 'Fujiyama Solar' },
    ],
    blurb: 'UTL hybrid and off-grid kits from 1 kW to 5 kW: panels, inverter and batteries matched.',
  },
  {
    id: 'solar-panels',
    name: 'Solar panels',
    title: 'Solar Panel Dealer and Distributor in Punjab',
    heading: 'Every solar panel we stock',
    compare: [
      { href: '/utl-vs-waaree/', brand: 'Waaree' },
      { href: '/utl-vs-adani-solar/', brand: 'Adani Solar' },
      { href: '/utl-vs-vikram-solar/', brand: 'Vikram Solar' },
      { href: '/utl-vs-saatvik-solar/', brand: 'Saatvik' },
      { href: '/utl-vs-rayzon-solar/', brand: 'Rayzon' },
      { href: '/utl-vs-loom-solar/', brand: 'Loom Solar' },
      { href: '/utl-vs-goldi-solar/', brand: 'Goldi Solar' },
      { href: '/utl-vs-servotech/', brand: 'Servotech' },
    ],
    blurb: 'Mono PERC, N-Type TOPCon and bifacial modules from 40 W to 735 W, including DCR and non-DCR panels.' },
  {
    id: 'inverters',
    name: 'Solar inverters and PCUs',
    title: 'Solar Inverter and PCU Dealer in Punjab',
    compare: [
      { href: '/utl-vs-luminous/', brand: 'Luminous' },
      { href: '/utl-vs-microtek/', brand: 'Microtek' },
      { href: '/utl-vs-polycab/', brand: 'Polycab' },
      { href: '/utl-vs-havells/', brand: 'Havells' },
      { href: '/utl-vs-growatt/', brand: 'Growatt' },
      { href: '/utl-vs-v-guard/', brand: 'V-Guard' },
    ],
    blurb: 'Home inverters, hybrid solar PCUs and on-grid string inverters from 675 VA to 125 kW: Heliac, Shamsi, Gamma+, Alfa+, Sigma+, Zeta, Sun-lion and more.',
  },
  {
    id: 'batteries',
    name: 'Batteries',
    title: 'Solar and Inverter Battery Dealer in Punjab',
    heading: 'Solar and inverter batteries',
    compare: [
      { href: '/utl-vs-exide/', brand: 'Exide' },
      { href: '/utl-vs-livguard/', brand: 'Livguard' },
      { href: '/utl-vs-luminous/', brand: 'Luminous' },
      { href: '/utl-vs-v-guard/', brand: 'V-Guard' },
    ],
    blurb: 'Tubular, SMF and lithium-ion (LiFePO4) batteries for inverters, solar systems and e-rickshaws.' },
  {
    id: 'charge-controllers',
    name: 'Charge controllers',
    title: 'Solar Charge Controller Dealer in Punjab',
    blurb: 'PWM and rMPPT controllers and solar management units that convert a normal inverter to solar.',
  },
  { id: 'ev-chargers', name: 'EV battery chargers', title: 'EV Battery Charger Dealer in Punjab', blurb: 'Lead-acid, SMF and lithium-ion chargers for e-rickshaws and e-bikes, 48V to 72V.' },
  { id: 'lighting-and-appliances', name: 'Lighting and appliances', title: 'Solar Lighting and Appliances in Punjab', blurb: 'Solar lighting kits, lanterns, torches and a solar air conditioner.' },
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
