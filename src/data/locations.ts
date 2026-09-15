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
   * Real, well-known, publicly verifiable facts about the city's economy, used to make the
   * solar case locally relevant. Never a claim about RSK's own presence or activity there;
   * that lives in `tier` and the shared copy on the page template.
   */
  profile: string;
  /** Reviews naming this city specifically. Only Mohali has these (see data/reviews.ts). */
  reviews?: Review[];
  /**
   * Set only for cities outside Punjab. Punjab's 300 free units, the PSPCL tariff and PSPCL's
   * net-metering process don't apply there, so the page template must not say they do.
   * `place` is how the city is named in titles and headings.
   */
  outsidePunjab?: { place: string; utility: string };
}

// Only Mohali has reviews that explicitly name it: real reviewers, real install sizes,
// nothing invented (see data/reviews.ts). No other city gets a testimonial section.
const mohaliReviews = REVIEWS.filter((r) => r.install?.includes('Mohali'));

export const CITIES: CityLocation[] = [
  // Direct service area: RSK's own installers (matches BUSINESS.serviceArea)
  {
    slug: 'mohali',
    name: 'Mohali',
    district: 'Sahibzada Ajit Singh Nagar (Mohali)',
    tier: 'direct',
    profile:
      'Home to RSK’s office at Phase 8B, and to a large share of Tricity’s new residential construction and IT-sector offices. Both are strong candidates for rooftop solar on newly built, unshaded roofs.',
    reviews: mohaliReviews,
  },
  {
    slug: 'kharar',
    name: 'Kharar',
    district: 'Sahibzada Ajit Singh Nagar (Mohali)',
    tier: 'direct',
    profile:
      'A fast-growing residential town on Mohali’s northwestern edge, with a large stock of independent houses, which is the roof type rooftop solar suits best.',
  },
  {
    slug: 'zirakpur',
    name: 'Zirakpur',
    district: 'Sahibzada Ajit Singh Nagar (Mohali)',
    tier: 'direct',
    profile:
      'A commercial and residential hub on the Chandigarh–Ambala highway, with showrooms, warehousing and housing societies side by side. Good ground for both home and commercial systems.',
  },
  {
    slug: 'derabassi',
    name: 'Derabassi',
    district: 'Sahibzada Ajit Singh Nagar (Mohali)',
    tier: 'direct',
    profile:
      'An industrial town with a large pharmaceutical and manufacturing base and a growing residential population. Industrial connections here pay from the first unit, with no free-units offset.',
  },
  {
    slug: 'chandigarh',
    name: 'Chandigarh',
    district: 'Chandigarh (UT)',
    tier: 'direct',
    profile:
      'The planned capital shared by Punjab and Haryana, with wide flat-roofed sectors that are close to ideal for panel layout, and a well-established rooftop solar and net-metering process through its own utility.',
    outsidePunjab: { place: 'Chandigarh', utility: 'Chandigarh’s own electricity distribution utility' },
  },
  {
    slug: 'panchkula',
    name: 'Panchkula',
    district: 'Panchkula, Haryana',
    tier: 'direct',
    profile:
      'A planned residential and business town bordering Chandigarh, with newer housing sectors and low-rise commercial buildings well suited to rooftop arrays.',
    outsidePunjab: { place: 'Panchkula, Haryana', utility: 'UHBVN (Uttar Haryana Bijli Vitran Nigam)' },
  },

  // Dealer-network reach across Punjab
  {
    slug: 'ludhiana',
    name: 'Ludhiana',
    district: 'Ludhiana',
    tier: 'partner',
    profile:
      'Punjab’s largest city and its industrial centre (hosiery, bicycle parts and auto components), with heavy daytime commercial and industrial power use that solar offsets well, since none of it qualifies for the domestic free-units scheme.',
  },
  {
    slug: 'amritsar',
    name: 'Amritsar',
    district: 'Amritsar',
    tier: 'partner',
    profile:
      'A major pilgrimage and tourism centre around the Golden Temple, surrounded by Punjab’s agricultural belt. Hospitality businesses, retail and farm loads here each suit a different system type.',
  },
  {
    slug: 'jalandhar',
    name: 'Jalandhar',
    district: 'Jalandhar',
    tier: 'partner',
    profile:
      'A manufacturing hub known for sports and leather goods, with a large NRI population and plenty of bigger independent houses. Those homes are good candidates for larger systems.',
  },
  {
    slug: 'patiala',
    name: 'Patiala',
    district: 'Patiala',
    tier: 'partner',
    profile:
      'A heritage city and district headquarters with older heritage buildings, newer residential colonies and a university population. Roof suitability varies more here than in newer towns, so a site check matters.',
  },
  {
    slug: 'bathinda',
    name: 'Bathinda',
    district: 'Bathinda',
    tier: 'partner',
    profile:
      'A power and refining hub in Punjab’s cotton belt, with large industrial and agricultural electricity demand. Both categories pay from the first unit, with no free-units offset to work around.',
  },
  {
    slug: 'hoshiarpur',
    name: 'Hoshiarpur',
    district: 'Hoshiarpur',
    tier: 'partner',
    profile:
      'A sub-mountainous district with a large NRI population and a strong tradition of well-built independent housing. Homes here often have the roof area for a bigger system than the bill alone would suggest.',
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
      'At the heart of Punjab’s paddy and wheat belt, with heavy agricultural power use and groundwater pumping. Agricultural and domestic solar both have a real role here.',
  },
  {
    slug: 'khanna',
    name: 'Khanna',
    district: 'Ludhiana',
    tier: 'partner',
    profile:
      'Home to one of Asia’s largest grain markets, with a business community built around agricultural trade, warehousing and transport. Those are daytime commercial loads that solar offsets well.',
  },
  {
    // Renamed from "rupnagar" on 2026-09-15: people search "Ropar". The old URL 301s here.
    slug: 'ropar',
    name: 'Ropar',
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

  // Added 2026-09-15 at RSK's request: the remaining district headquarters and major towns, so
  // every part of Punjab has a page. All reached through the dealer network until RSK confirms
  // its own team works there (then change tier to 'direct').
  {
    slug: 'morinda',
    name: 'Morinda',
    district: 'Rupnagar (Ropar)',
    tier: 'partner',
    profile:
      'A market town on the Kharar–Ludhiana road, with a cooperative sugar mill and a farming belt of paddy, wheat and sugarcane around it. Independent houses and shops here suit on-grid systems, and the farms suit solar pumps.',
  },
  {
    slug: 'kurali',
    name: 'Kurali',
    district: 'Sahibzada Ajit Singh Nagar (Mohali)',
    tier: 'partner',
    profile:
      'A growing town on the Chandigarh–Ropar highway between Kharar and Ropar, where new residential colonies sit next to farmland. Most homes are independent houses with their own roofs.',
  },
  {
    slug: 'nangal',
    name: 'Nangal',
    district: 'Rupnagar (Ropar)',
    tier: 'partner',
    profile:
      'A township built around the Bhakra Nangal hydro project, with the National Fertilizers plant and planned residential colonies. Flat-roofed government-era housing here is well suited to panels.',
  },
  {
    slug: 'anandpur-sahib',
    name: 'Anandpur Sahib',
    district: 'Rupnagar (Ropar)',
    tier: 'partner',
    profile:
      'A historic Sikh town, home to Takht Sri Kesgarh Sahib and the Hola Mohalla festival, with guest houses, shops and farms around it. Daytime commercial loads here pay from the first unit.',
  },
  {
    slug: 'rajpura',
    name: 'Rajpura',
    district: 'Patiala',
    tier: 'partner',
    profile:
      'A railway junction and industrial town on the Delhi–Amritsar highway, with an industrial focal point and warehousing. Commercial and industrial connections here pay for power from the first unit, so solar offsets it straight away.',
  },
  {
    slug: 'nabha',
    name: 'Nabha',
    district: 'Patiala',
    tier: 'partner',
    profile:
      'A former princely-state town with a grain market, schools and an agricultural hinterland. Older town-centre buildings and newer colonies differ a lot in roof condition, so a site check matters.',
  },
  {
    slug: 'fatehgarh-sahib',
    name: 'Fatehgarh Sahib',
    district: 'Fatehgarh Sahib',
    tier: 'partner',
    profile:
      'The district headquarters and a major Sikh pilgrimage site, twinned with Sirhind and its grain market. Homes, shops and rice-shelling units here each suit a different system type.',
  },
  {
    slug: 'mandi-gobindgarh',
    name: 'Mandi Gobindgarh',
    district: 'Fatehgarh Sahib',
    tier: 'partner',
    profile:
      'Punjab’s steel town, with a large cluster of rolling mills and furnaces. Industrial units here run heavy daytime loads, which rooftop solar offsets on every sunny working day.',
  },
  {
    slug: 'phagwara',
    name: 'Phagwara',
    district: 'Kapurthala',
    tier: 'partner',
    profile:
      'An industrial town on the Jalandhar–Ludhiana stretch of NH-44, known for its textile and manufacturing units and Lovely Professional University nearby. Hostels, PGs and factories here all run daytime loads.',
  },
  {
    slug: 'nawanshahr',
    name: 'Nawanshahr',
    district: 'Shaheed Bhagat Singh Nagar (Nawanshahr)',
    tier: 'partner',
    profile:
      'The headquarters of Shaheed Bhagat Singh Nagar district in the Doaba region, with a large NRI population and many spacious independent houses. Those roofs often fit a bigger system than the bill needs.',
  },
  {
    slug: 'gurdaspur',
    name: 'Gurdaspur',
    district: 'Gurdaspur',
    tier: 'partner',
    profile:
      'A district headquarters in the Majha region near the border, mostly agricultural, with a town centre of shops, schools and offices.',
  },
  {
    slug: 'batala',
    name: 'Batala',
    district: 'Gurdaspur',
    tier: 'partner',
    profile:
      'An industrial town long known for its iron foundries and agricultural machinery makers. Workshops and foundries here pay for daytime power from the first unit.',
  },
  {
    slug: 'tarn-taran',
    name: 'Tarn Taran',
    district: 'Tarn Taran',
    tier: 'partner',
    profile:
      'A district town near Amritsar, built around Gurdwara Sri Tarn Taran Sahib and its large sarovar, with an agricultural district around it.',
  },
  {
    slug: 'barnala',
    name: 'Barnala',
    district: 'Barnala',
    tier: 'partner',
    profile:
      'A Malwa district town with a strong farming base and large textile and paper manufacturing nearby. Industrial and commercial loads here pay from the first unit.',
  },
  {
    slug: 'malerkotla',
    name: 'Malerkotla',
    district: 'Malerkotla',
    tier: 'partner',
    profile:
      'Punjab’s newest district, formed in 2021, a historic town with a busy trading and small-industry base alongside its farming villages.',
  },
  {
    slug: 'mansa',
    name: 'Mansa',
    district: 'Mansa',
    tier: 'partner',
    profile:
      'A cotton-belt district in southern Malwa, mostly agricultural, with a district town of markets, schools and offices.',
  },
  {
    slug: 'faridkot',
    name: 'Faridkot',
    district: 'Faridkot',
    tier: 'partner',
    profile:
      'A district headquarters and a medical education centre, home to Baba Farid University of Health Sciences and its teaching hospital, with a farming district around it.',
  },
  {
    slug: 'muktsar',
    name: 'Sri Muktsar Sahib',
    district: 'Sri Muktsar Sahib',
    tier: 'partner',
    profile:
      'A historic district town known for its gurdwaras and the Maghi Mela, in a farming belt of cotton, wheat and kinnow.',
  },
  {
    slug: 'fazilka',
    name: 'Fazilka',
    district: 'Fazilka',
    tier: 'partner',
    profile:
      'A border district on Punjab’s south-western edge, farming cotton, wheat and kinnow, with a district town built around trade.',
  },
  {
    slug: 'abohar',
    name: 'Abohar',
    district: 'Fazilka',
    tier: 'partner',
    profile:
      'The centre of Punjab’s kinnow belt, a large citrus and cotton market town. Cold storage, grading units and shops here run daytime loads that solar offsets well.',
  },
];

export const cityPath = (slug: string) => `/solar-company-${slug}/`;

/** How a city is named in titles and headings: "Ludhiana, Punjab", "Panchkula, Haryana", "Chandigarh". */
export const cityPlace = (c: CityLocation) => c.outsidePunjab?.place ?? `${c.name}, Punjab`;

export function cityBySlug(slug: string): CityLocation | undefined {
  return CITIES.find((c) => c.slug === slug);
}
