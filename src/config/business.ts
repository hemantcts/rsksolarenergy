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

  /** Primary number listed first — confirmed by RSK. */
  phones: [
    { display: '+91 90419 96918', tel: '+919041996918' },
    { display: '+91 94170 30347', tel: '+919417030347' },
  ],

  /** WhatsApp number for every enquiry link. Confirmed by RSK as the primary line. */
  whatsapp: '919041996918',

  email: 'rsksolarenergy@gmail.com',

  // TODO: opening hours from the Google Business Profile. Not shown until supplied.
  hours: null as null | { days: string; opens: string; closes: string }[],

  google: {
    rating: 4.9,
    reviewCount: 38,
    // Confirmed by RSK from the live Google Business Profile card, 2026-09-12.
    ratingCheckedOn: '2026-09-12',
    mapsUrl: 'https://maps.google.com/?cid=3900928441643699717',
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJK-ncoCnvDzkRBQ5k6r_hIjY',
  },

  /**
   * Secondary review platform. RSK also has a Justdial listing.
   * TODO: get the Justdial profile URL from RSK so this can link out directly.
   */
  justdial: {
    rating: 5.0,
    reviewCount: 40,
    ratingCheckedOn: '2026-09-12',
    url: null as string | null,
  },

  /** Installation counts. Confirmed by RSK, 2026-09-12. */
  installs: {
    commercial: '240+',
    residential: '150+',
    /** Solar water pumps and tubewells for agricultural customers. */
    solarPumps: '100+',
    asOf: '2026',
  },

  serviceArea: ['Mohali', 'Kharar', 'Zirakpur', 'Derabassi', 'Chandigarh', 'Panchkula'],
  brand: 'UTL Solar',

  /** Registration numbers, shown in the footer and About for credibility. Confirmed by RSK. */
  registrations: {
    gst: '03GKGPK1207P1Z4',
    // As supplied by RSK. Udyam registration numbers are usually printed "UDYAM-..." (no H) —
    // worth checking this against the certificate before launch.
    msme: 'UDHYAM-PB-20-0093804',
  },
} as const;

export const PRIMARY_PHONE = BUSINESS.phones[0];

export function formatAddressLines(): string[] {
  const a = BUSINESS.address;
  return [a.street, a.locality, [a.region, a.postalCode].filter(Boolean).join(' ')];
}
