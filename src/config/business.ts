/**
 * Business facts. Every public-facing fact about RSK lives here and nowhere else.
 * NAP must match the Google Business Profile exactly (CLAUDE.md §6).
 * Anything marked TODO is listed in files/TODO-content.md.
 */
export const BUSINESS = {
  name: 'RSK Solar Energy',
  siteUrl: 'https://rsksolarenergy.com',
  description:
    'UTL Solar distributor and rooftop solar installer at Phase 8-B, Mohali. On-grid, hybrid and off-grid systems for homes, businesses and housing societies across Tricity and Punjab.',
  foundedYear: 2022,

  address: {
    street: 'Plot No E-203, Phase 8-B',
    locality: 'Sahibzada Ajit Singh Nagar (Mohali)',
    region: 'Punjab',
    country: 'IN',
    // TODO: confirm PIN code as shown on the Google Business Profile before adding it.
    postalCode: '',
  },

  // TODO: exact coordinates from the Google Business Profile pin.
  geo: null as null | { lat: number; lng: number },

  phones: [
    { display: '+91 94170 30347', tel: '+919417030347' },
    { display: '+91 90419 96918', tel: '+919041996918' },
  ],

  /**
   * WhatsApp number for every enquiry link.
   * TODO: CONFIRM. The spec names 94170 30347, but the WhatsApp widget on the
   * old site was configured with 90419 96918. Whichever line has WhatsApp
   * Business installed should go here.
   */
  whatsapp: '919417030347',

  email: 'rsksolarenergy@gmail.com',

  // TODO: opening hours from the Google Business Profile. Not shown until supplied.
  hours: null as null | { days: string; opens: string; closes: string }[],

  google: {
    rating: 5.0,
    reviewCount: 33,
    // Recorded from the review widget on the old site, September 2026.
    ratingCheckedOn: '2026-09-11',
    mapsUrl: 'https://maps.google.com/?cid=3900928441643699717',
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJK-ncoCnvDzkRBQ5k6r_hIjY',
  },

  /**
   * Installation counts. Source: RSK's own 2023 website copy.
   * They are lower bounds and still true, but should be updated.
   * TODO: current figures from RSK.
   */
  installs: {
    commercial: '80+',
    residential: '50+',
    asOf: '2023',
  },

  serviceArea: ['Mohali', 'Kharar', 'Zirakpur', 'Derabassi', 'Chandigarh', 'Panchkula'],
  brand: 'UTL Solar',
} as const;

export const PRIMARY_PHONE = BUSINESS.phones[0];

export function formatAddressLines(): string[] {
  const a = BUSINESS.address;
  return [a.street, a.locality, [a.region, a.postalCode].filter(Boolean).join(' ')];
}
