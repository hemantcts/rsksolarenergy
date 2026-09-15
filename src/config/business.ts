/**
 * Business facts. Every public-facing fact about RSK lives here and nowhere else.
 * NAP must match the Google Business Profile exactly (CLAUDE.md §6).
 * Anything marked TODO is listed in files/TODO-content.md.
 */
export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/** One opening-hours rule. Times are 24-hour "HH:MM", the format schema.org expects. */
export interface OpeningHours {
  days: Weekday[];
  opens: string;
  closes: string;
}

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

  /** Primary number listed first, confirmed by RSK. */
  phones: [
    { display: '+91 90419 96918', tel: '+919041996918' },
    { display: '+91 94170 30347', tel: '+919417030347' },
  ],

  /** WhatsApp number for every enquiry link. Confirmed by RSK as the primary line. */
  whatsapp: '919041996918',

  email: 'rsksolarenergy@gmail.com',

  /**
   * TODO: opening hours from RSK, matching the Google Business Profile exactly.
   * Everything that shows hours (header strip, footer, contact page, schema) reads this one
   * field, so filling it in updates the whole site at once. Until then no hours are shown
   * anywhere, rather than a guess. Example shape:
   *   [{ days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:30', closes: '18:30' }]
   */
  hours: null as null | OpeningHours[],

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

  /**
   * Social profile URLs. Left null until RSK supplies the real profile/channel URLs. A social
   * link is never shown until it is genuinely confirmed (CLAUDE.md §6, same rule as Justdial's URL).
   */
  social: {
    facebook: 'https://www.facebook.com/rsksolarenergy/' as string | null,
    instagram: 'https://www.instagram.com/rsksolarenergy' as string | null,
    // TODO: RSK's YouTube channel URL, once supplied.
    youtube: null as string | null,
  },

  /** Registration numbers, shown in the footer and About for credibility. Confirmed by RSK. */
  registrations: {
    gst: '03GKGPK1207P1Z4',
    // As supplied by RSK. Udyam registration numbers are usually printed "UDYAM-..." (no H),
    // so this needs checking against the certificate.
    msme: 'UDHYAM-PB-20-0093804',
  },

  /**
   * Google Analytics 4 measurement ID, supplied by RSK. Loaded site-wide from
   * `src/layouts/BaseLayout.astro`. Set to null to remove Google Analytics from every page
   * without touching the layout. See the developer guide's "Google Analytics" section.
   */
  gaMeasurementId: 'G-VJHJ211TLW' as string | null,
} as const;

export const PRIMARY_PHONE = BUSINESS.phones[0];

export function formatAddressLines(): string[] {
  const a = BUSINESS.address;
  return [a.street, a.locality, [a.region, a.postalCode].filter(Boolean).join(' ')];
}

const WEEK: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const shortDay = (i: number) => WEEK[i].slice(0, 3);

function clock(t: string) {
  const [h, m] = t.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'pm' : 'am'}`;
}

/** "Mon–Sat", or "Sat, Sun" for a two-day run, from any set of weekdays. */
function dayRange(days: readonly Weekday[]) {
  const idx = [...new Set(days.map((d) => WEEK.indexOf(d)))].sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const i of idx) {
    const run = runs.at(-1);
    if (run && i === run.at(-1)! + 1) run.push(i);
    else runs.push([i]);
  }
  return runs.map((r) => (r.length > 2 ? `${shortDay(r[0])}–${shortDay(r.at(-1)!)}` : r.map(shortDay).join(', '))).join(', ');
}

/**
 * Opening hours as display lines ("Mon–Sat, 9:30 am to 6:30 pm") plus the closed days, or null
 * while BUSINESS.hours is unset. Every place that shows hours goes through this.
 */
export function formatHours(): { lines: string[]; closed: string | null } | null {
  const hours = BUSINESS.hours;
  if (!hours?.length) return null;
  const lines = hours.map((h) => `${dayRange(h.days)}, ${clock(h.opens)} to ${clock(h.closes)}`);
  const open = new Set(hours.flatMap((h) => h.days));
  const closedDays = WEEK.filter((d) => !open.has(d));
  return { lines, closed: closedDays.length ? `${dayRange(closedDays)}: closed` : null };
}
