import { REVIEWS, type Review } from './reviews';

export type ServiceTier =
  /** RSK's own installers work here directly. The confirmed service area. */
  | 'direct'
  /** Reached through RSK's UTL dealer network and remote consultation, not a local RSK crew. */
  | 'partner';

export interface CityLocation {
  slug: string;
  name: string;
  district: string;
  tier: ServiceTier;
  /**
   * Real, well-known, publicly verifiable facts about the city's economy — used to make the
   * solar case locally relevant. Never a claim about RSK's own presence or activity there;
   * that lives in `tier` and the shared copy on the page template.
   */
  profile: string;
  /** Reviews naming this city specifically. Only Mohali has these — see data/reviews.ts. */
  reviews?: Review[];
}

// Only Mohali has reviews that explicitly name it — real reviewers, real install sizes,
// nothing invented (see data/reviews.ts). No other city gets a testimonial section.
const mohaliReviews = REVIEWS.filter((r) => r.install?.includes('Mohali'));

export const CITIES: CityLocation[] = [
  // --- Direct service area: RSK's own installers (matches BUSINESS.serviceArea) ---
  {
    slug: 'mohali',
    name: 'Mohali',
    district: 'Sahibzada Ajit Singh Nagar (Mohali)',
    tier: 'direct',
    profile:
      'Home to RSK’s office at Phase 8-B, and to a large share of Tricity’s new residential construction and IT-sector offices — both strong candidates for rooftop solar on newly built, unshaded roofs.',
    reviews: mohaliReviews,
  },
  {
    slug: 'kharar',
    name: 'Kharar',
    district: 'Sahibzada Ajit Singh Nagar (Mohali)',
    tier: 'direct',
    profile:
      'A fast-growing residential town on Mohali’s northwestern edge, with a large stock of independent houses — the roof type rooftop solar suits best.',
  },
  {
    slug: 'zirakpur',
    name: 'Zirakpur',
    district: 'Sahibzada Ajit Singh Nagar (Mohali)',
    tier: 'direct',
    profile:
      'A commercial and residential hub on the Chandigarh–Ambala highway, with a mix of showrooms, warehousing and housing societies — good ground for both home and commercial systems.',
  },
  {
    slug: 'derabassi',
    name: 'Derabassi',
    district: 'Sahibzada Ajit Singh Nagar (Mohali)',
    tier: 'direct',
    profile:
      'An industrial town with a significant pharmaceutical and manufacturing base, alongside a growing residential population — industrial connections here pay from the first unit, with no free-units offset.',
  },
  {
    slug: 'chandigarh',
    name: 'Chandigarh',
    district: 'Chandigarh (UT)',
    tier: 'direct',
    profile:
      'The planned capital shared by Punjab and Haryana, with wide flat-roofed sectors that are close to ideal for panel layout, and a well-established rooftop solar and net-metering process through its own utility.',
  },
  {
    slug: 'panchkula',
    name: 'Panchkula',
    district: 'Panchkula, Haryana',
    tier: 'direct',
    profile:
      'A planned residential and business town bordering Chandigarh, with newer housing sectors and low-rise commercial buildings well suited to rooftop arrays.',
  },

  // --- Dealer-network reach across Punjab ---
  {
    slug: 'ludhiana',
    name: 'Ludhiana',
    district: 'Ludhiana',
    tier: 'partner',
    profile:
      'Punjab’s largest city and its industrial centre — hosiery, bicycle parts and auto components — with heavy daytime commercial and industrial power use that solar offsets well, since none of it qualifies for the domestic free-units scheme.',
  },
  {
    slug: 'amritsar',
    name: 'Amritsar',
    district: 'Amritsar',
    tier: 'partner',
    profile:
      'A major pilgrimage and tourism centre around the Golden Temple, surrounded by Punjab’s agricultural belt — a mix of hospitality businesses, retail and farm loads that all suit different system types.',
  },
  {
    slug: 'jalandhar',
    name: 'Jalandhar',
    district: 'Jalandhar',
    tier: 'partner',
    profile:
      'A manufacturing hub known for sports goods and leather goods, with a large NRI population and a correspondingly large stock of bigger independent houses — good candidates for larger home systems.',
  },
  {
    slug: 'patiala',
    name: 'Patiala',
    district: 'Patiala',
    tier: 'partner',
    profile:
      'A heritage city and district headquarters with a mix of older heritage buildings, newer residential colonies and a university population — roof suitability varies more here than in newer towns, so a site check matters.',
  },
  {
    slug: 'bathinda',
    name: 'Bathinda',
    district: 'Bathinda',
    tier: 'partner',
    profile:
      'A power and refining hub in Punjab’s cotton belt, with significant industrial and agricultural electricity demand — both categories pay from the first unit, with no free-units offset to work around.',
  },
  {
    slug: 'hoshiarpur',
    name: 'Hoshiarpur',
    district: 'Hoshiarpur',
    tier: 'partner',
    profile:
      'A sub-mountainous district with a large NRI population and a strong tradition of well-built independent housing — homes here often have the roof area for a larger system than the bill alone would suggest.',
  },
  {
    slug: 'pathankot',
    name: 'Pathankot',
    district: 'Pathankot',
    tier: 'partner',
    profile:
      'A cantonment and gateway town at Punjab’s northern edge, on the route into Himachal and Jammu, with a mix of defence-linked institutions, transport businesses and residential housing.',
  },
  {
    slug: 'moga',
    name: 'Moga',
    district: 'Moga',
    tier: 'partner',
    profile:
      'An agricultural market town and a major dairy-processing centre, with significant agricultural electricity demand alongside its residential and commercial load.',
  },
  {
    slug: 'firozpur',
    name: 'Firozpur',
    district: 'Firozpur',
    tier: 'partner',
    profile:
      'A border district along the Sutlej, predominantly agricultural, with a district town that combines administrative offices, retail and farm-linked business.',
  },
  {
    slug: 'sangrur',
    name: 'Sangrur',
    district: 'Sangrur',
    tier: 'partner',
    profile:
      'At the heart of Punjab’s paddy and wheat belt, with heavy agricultural power use and groundwater pumping — a district where agricultural and domestic solar both have a real role to play.',
  },
  {
    slug: 'khanna',
    name: 'Khanna',
    district: 'Ludhiana',
    tier: 'partner',
    profile:
      'Home to one of Asia’s largest grain markets, with a business community built around agricultural trade, warehousing and transport — commercial and industrial loads that run through the day.',
  },
  {
    slug: 'rupnagar',
    name: 'Rupnagar',
    district: 'Rupnagar (Ropar)',
    tier: 'partner',
    profile:
      'An industrial town on the Sutlej with IIT Ropar and a cluster of manufacturing units, alongside a mostly residential and agricultural district around it.',
  },
  {
    slug: 'kapurthala',
    name: 'Kapurthala',
    district: 'Kapurthala',
    tier: 'partner',
    profile:
      'A heritage town best known for the Rail Coach Factory, one of Indian Railways’ largest manufacturing units, alongside a mostly agricultural district.',
  },
];

export const cityPath = (slug: string) => `/solar-company-${slug}/`;

export function cityBySlug(slug: string): CityLocation | undefined {
  return CITIES.find((c) => c.slug === slug);
}
