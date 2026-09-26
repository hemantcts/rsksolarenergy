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
  /**
   * The page this section belongs to, shown first in the menu and linked from every page.
   *
   * Without one the menu is a flat list: a crawler reading it sees forty-odd pages of equal
   * standing, and nothing saying that /products/batteries/ sits under /products/. Naming a page per
   * section gives the site a top level, which is what Google asks for when deciding whether to show
   * a set of links underneath the search result.
   */
  hub?: NavLink;
  links: NavLink[];
}

/** Main menu, shared by the desktop dropdowns and the mobile menu in Header.astro. */
export const NAV: NavGroup[] = [
  {
    label: 'Solar systems',
    short: 'Systems',
    hub: { href: '/on-grid-vs-off-grid-vs-hybrid/', label: 'Which system type suits you', note: 'On-grid, off-grid and hybrid compared' },
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
    hub: { href: '/products/', label: 'All UTL products', note: 'The full catalogue, with specifications' },
    links: [
      ...CATEGORIES.map((c) => ({ href: `/products/${c.id}/`, label: c.name })),
      { href: '/utl-solar-vs-other-brands/', label: 'UTL vs other brands' },
      { href: '/brands/', label: 'All brands we supply' },
    ],
  },
  {
    label: 'Prices & subsidy',
    short: 'Prices',
    hub: { href: '/solar-calculator/', label: 'Solar calculator', note: 'Size, subsidy and payback from your bill' },
    links: [
      { href: '/solar-calculator/', label: 'Solar calculator', note: 'Size, subsidy and payback from your bill' },
      { href: '/new-house-solar-calculator/', label: 'New house solar calculator', note: 'No bill yet? Estimate from your appliances' },
      { href: '/hybrid-solar-calculator/', label: 'Hybrid solar calculator', note: 'Battery backup for power cuts' },
      { href: '/off-grid-solar-calculator/', label: 'Off-grid solar calculator', note: 'Sites with no grid connection' },
      { href: '/pm-surya-ghar-subsidy-punjab/', label: 'PM Surya Ghar subsidy' },
      { href: '/solar-loan-options/', label: 'Solar loans and finance', note: 'Five ways to spread the cost' },
      ...SOLAR_CONFIG.sizing.sizePagesKw.map((kw) => ({ href: sizePath(kw), label: `${kw} kW system price` })),
    ],
  },
  {
    label: 'Areas we serve',
    short: 'Areas',
    hub: { href: '/solar-company-punjab/', label: 'Everywhere we work in Punjab', note: 'Every town, and who installs there' },
    links: [
      ...CITIES.filter((c) => c.tier === 'direct').map((c) => ({ href: cityPath(c.slug), label: `Solar in ${c.name}` })),
    ],
  },
  {
    label: 'Guides',
    hub: { href: '/blog/', label: 'All solar guides', note: 'Plain answers on sizing, subsidy and cost' },
    links: [
      { href: '/blog/solar-with-300-free-units-punjab/', label: 'Is solar worth it with 300 free units?' },
      { href: '/blog/cheapest-solar-system-for-home-punjab/', label: 'The cheapest way to go solar' },
      { href: '/blog/how-many-units-1kw-solar-produces-punjab/', label: 'Units a 1 kW system makes a day' },
      { href: '/blog/solar-system-for-1-5-ton-ac/', label: 'Solar for a 1.5 ton AC' },
      { href: '/blog/how-many-batteries-for-3kw-solar-system/', label: 'Batteries for a 3 kW system' },
      { href: '/blog/lithium-vs-tubular-battery-for-solar/', label: 'Lithium or tubular battery?' },
      { href: '/blog/how-to-size-home-solar-punjab/', label: 'How to size a home system' },
    ],
  },
  {
    label: 'About',
    hub: { href: '/about/', label: 'About RSK Solar Energy', note: 'UTL Solar distributor in Mohali since 2022' },
    links: [
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
