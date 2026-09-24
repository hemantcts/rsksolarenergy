import { BUSINESS } from '../config/business';
import { SOLAR_CONFIG } from '../config/solar-config';
import { CITIES, cityPath } from './locations';
import { CATEGORIES } from './products';
import { sizePath } from './sizes';

export interface NavLink {
  href: string;
  label: string;
  note?: string;
}
export interface NavGroup {
  label: string;
  /** Shorter wording for the desktop bar, where seven items share one row. */
  short?: string;
  links: NavLink[];
}

/** Main menu, shared by the desktop dropdowns and the mobile menu in Header.astro. */
export const NAV: NavGroup[] = [
  {
    label: 'Solar systems',
    short: 'Systems',
    links: [
      { href: '/on-grid-vs-off-grid-vs-hybrid/', label: 'On-grid, off-grid or hybrid', note: 'Which type suits your connection' },
      { href: '/hybrid-solar-systems/', label: 'Hybrid solar systems', note: 'Battery backup for power cuts' },
      { href: '/off-grid-solar-systems/', label: 'Off-grid solar systems', note: 'Farmhouses and sites without supply' },
      { href: '/solar-panels/', label: 'Solar panels', note: '40 W to 735 W' },
      { href: '/solar-pumps/', label: 'Solar water pumps', note: 'Tubewells and irrigation' },
      { href: '/commercial-solar-punjab/', label: 'Commercial and industrial' },
      { href: '/housing-society-solar/', label: 'Housing societies and RWAs' },
    ],
  },
  {
    label: 'Products',
    links: [
      ...CATEGORIES.map((c) => ({ href: `/products/${c.id}/`, label: c.name })),
      { href: '/products/', label: 'All UTL products' },
      { href: '/utl-solar-vs-other-brands/', label: 'UTL vs other brands' },
      { href: '/brands/', label: 'All brands we supply' },
    ],
  },
  {
    label: 'Prices & subsidy',
    short: 'Prices',
    links: [
      { href: '/solar-calculator/', label: 'Solar calculator', note: 'Size, subsidy and payback from your bill' },
      { href: '/new-house-solar-calculator/', label: 'New house solar calculator', note: 'No bill yet? Estimate from your appliances' },
      { href: '/hybrid-solar-calculator/', label: 'Hybrid solar calculator', note: 'Battery backup for power cuts' },
      { href: '/off-grid-solar-calculator/', label: 'Off-grid solar calculator', note: 'Sites with no grid connection' },
      { href: '/pm-surya-ghar-subsidy-punjab/', label: 'PM Surya Ghar subsidy' },
      ...SOLAR_CONFIG.sizing.sizePagesKw.map((kw) => ({ href: sizePath(kw), label: `${kw} kW system price` })),
    ],
  },
  {
    label: 'Areas we serve',
    short: 'Areas',
    links: [
      ...CITIES.filter((c) => c.tier === 'direct').map((c) => ({ href: cityPath(c.slug), label: `Solar in ${c.name}` })),
      { href: '/solar-company-punjab/', label: 'All locations in Punjab' },
    ],
  },
  {
    label: 'Guides',
    links: [
      { href: '/blog/solar-with-300-free-units-punjab/', label: 'Is solar worth it with 300 free units?' },
      { href: '/blog/cheapest-solar-system-for-home-punjab/', label: 'The cheapest way to go solar' },
      { href: '/blog/how-many-units-1kw-solar-produces-punjab/', label: 'Units a 1 kW system makes a day' },
      { href: '/blog/solar-system-for-1-5-ton-ac/', label: 'Solar for a 1.5 ton AC' },
      { href: '/blog/how-many-batteries-for-3kw-solar-system/', label: 'Batteries for a 3 kW system' },
      { href: '/blog/lithium-vs-tubular-battery-for-solar/', label: 'Lithium or tubular battery?' },
      { href: '/blog/how-to-size-home-solar-punjab/', label: 'How to size a home system' },
      { href: '/blog/', label: 'All solar guides' },
    ],
  },
  {
    label: 'About',
    links: [
      { href: '/about/', label: 'About RSK Solar Energy' },
      { href: '/why-choose-rsk-solar-energy/', label: 'Why choose RSK Solar Energy' },
      { href: '/installations/', label: 'Installations', note: `${BUSINESS.installs.commercial} commercial, ${BUSINESS.installs.residential} homes` },
      { href: '/reviews/', label: 'Customer reviews', note: `${BUSINESS.google.rating.toFixed(1)} from ${BUSINESS.google.reviewCount} Google reviews` },
      { href: '/utl-solar-distributor-punjab/', label: 'UTL Solar distributorship' },
      { href: '/solar-dealership-punjab/', label: 'Become a dealer' },
      { href: '/careers/', label: 'Careers' },
    ],
  },
];

export const CONTACT_LINK: NavLink = { href: '/contact/', label: 'Contact' };
