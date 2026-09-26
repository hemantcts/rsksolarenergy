/**
 * Brands and partners RSK stocks or installs alongside UTL Solar. A brand appears here only
 * once we have its real, official logo — no placeholder logos, no invented ones (CLAUDE.md §7).
 * A brand with `logo: null` still renders (as a plain text tile) so the list stays honest about
 * what we actually carry, even before its logo is added.
 */
import type { ImageMetadata } from 'astro';
import utlLogo from '../assets/brand/utl-logo.png';
import luminousLogo from '../assets/brand/luminous.png';
import polycabLogo from '../assets/brand/polycab.png';
import fujiyamaLogo from '../assets/brand/fujiyama.png';
import kenstarLogo from '../assets/brand/kenstar.png';
import bajajLogo from '../assets/brand/bajaj.png';
import falconLogo from '../assets/brand/falcon.png';
import dukeLogo from '../assets/brand/duke.png';
import khaitanLogo from '../assets/brand/khaitan.png';
import orientLogo from '../assets/brand/orient.png';
import sujataLogo from '../assets/brand/sujata.png';

/**
 * How RSK Solar Energy works with a brand. Only relationships RSK has stated are used:
 *   distributor — UTL Solar: RSK distributes, installs and supplies dealers (CLAUDE.md §1).
 *   stocked     — RSK stocks and supplies the brand's products. No dealership, authorisation or
 *                 partnership is claimed; add one here only once RSK confirms it in writing.
 */
export type BrandRelationship = 'distributor' | 'stocked';

export interface Brand {
  name: string;
  logo: ImageMetadata | null;
  relationship: BrandRelationship;
  /** A page on this site that helps someone interested in this brand, if there is one. */
  link?: { href: string; label: string };
}

export interface BrandCategory {
  title: string;
  blurb: string;
  brands: Brand[];
}

export const BRAND_CATEGORIES: BrandCategory[] = [
  {
    title: 'Solar & power',
    blurb: 'Panels, inverters, batteries and cabling for the systems we design and install.',
    brands: [
      { name: 'UTL Solar', logo: utlLogo, relationship: 'distributor', link: { href: '/utl-solar-distributor-punjab/', label: 'UTL Solar range and dealer supply' } },
      { name: 'Luminous', logo: luminousLogo, relationship: 'stocked', link: { href: '/utl-vs-luminous/', label: 'UTL and Luminous compared' } },
      { name: 'Polycab', logo: polycabLogo, relationship: 'stocked', link: { href: '/utl-vs-polycab/', label: 'UTL and Polycab compared' } },
      { name: 'Fujiyama Solar', logo: fujiyamaLogo, relationship: 'stocked', link: { href: '/utl-vs-fujiyama-solar/', label: 'Same maker as UTL' } },
    ],
  },
  {
    title: 'Fans & coolers',
    blurb: 'Home and commercial cooling brands we stock alongside solar equipment.',
    brands: [
      { name: 'Kenstar', logo: kenstarLogo, relationship: 'stocked' },
      { name: 'Khaitan', logo: khaitanLogo, relationship: 'stocked' },
      { name: 'Orient', logo: orientLogo, relationship: 'stocked' },
    ],
  },
  {
    title: 'Home appliances',
    blurb: 'Everyday appliance brands available through RSK Solar Energy.',
    brands: [
      { name: 'Sujata', logo: sujataLogo, relationship: 'stocked' },
      { name: 'Bajaj', logo: bajajLogo, relationship: 'stocked' },
    ],
  },
  {
    title: 'Tubewell & submersible motors',
    blurb: 'Motor brands for solar tubewells and agricultural pumping.',
    brands: [
      { name: 'Falcon', logo: falconLogo, relationship: 'stocked', link: { href: '/solar-pumps/', label: 'Solar pumps for tubewells' } },
      { name: 'Duke', logo: dukeLogo, relationship: 'stocked', link: { href: '/solar-pumps/', label: 'Solar pumps for tubewells' } },
    ],
  },
];
