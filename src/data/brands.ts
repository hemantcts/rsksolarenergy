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

export interface Brand {
  name: string;
  logo: ImageMetadata | null;
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
      { name: 'UTL Solar', logo: utlLogo },
      { name: 'Luminous', logo: luminousLogo },
      { name: 'Polycab', logo: polycabLogo },
      { name: 'Fujiyama Solar', logo: fujiyamaLogo },
    ],
  },
  {
    title: 'Fans & coolers',
    blurb: 'Home and commercial cooling brands we stock alongside solar equipment.',
    brands: [
      { name: 'Kenstar', logo: kenstarLogo },
      { name: 'Khaitan', logo: khaitanLogo },
      { name: 'Orient', logo: orientLogo },
    ],
  },
  {
    title: 'Home appliances',
    blurb: 'Everyday appliance brands available through RSK.',
    brands: [
      { name: 'Sujata', logo: sujataLogo },
      { name: 'Bajaj', logo: bajajLogo },
    ],
  },
  {
    title: 'Tubewell & submersible motors',
    blurb: 'Motor brands for solar tubewells and agricultural pumping.',
    brands: [
      { name: 'Falcon', logo: falconLogo },
      { name: 'Duke', logo: dukeLogo },
      { name: 'CG', logo: null },
    ],
  },
];
