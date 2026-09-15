/**
 * Business facts. Every public-facing fact about RSK lives here and nowhere else.
 * NAP must match the Google Business Profile exactly (CLAUDE.md §6).
 * Anything marked TODO is listed in files/TODO-content.md.
 */
export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/** One opening-hours block. Times are 24-hour "HH:MM", the format schema.org expects. */
export interface OpeningHours {
  days: Weekday[];
  opens: string;
  closes: string;
}

const MON_TO_SAT: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const BUSINESS = {
  name: 'RSK Solar Energy',
  siteUrl: 'https://rsksolarenergy.com',
  description:
    'UTL Solar distributor and rooftop solar installer at Phase 8B, Mohali. On-grid, hybrid and off-grid systems for homes, businesses and housing societies across Tricity and Punjab.',
  foundedYear: 2022,

  /**
   * Written exactly as the Google Business Profile shows it (RSK chose to match Google,
   * 2026-09-15): "E 203, Phase 8B, Industrial Area, Sector 74, Sahibzada Ajit Singh Nagar,
   * Punjab 140307".
   */
  address: {
    street: 'E 203, Phase 8B, Industrial Area, Sector 74',
    locality: 'Sahibzada Ajit Singh Nagar',
    region: 'Punjab',
    country: 'IN',
    postalCode: '140307',
    /**
     * From RSK's own Justdial listing. Shown on the contact page as a directions hint only; it is
     * deliberately not part of formatAddressLines(), so the NAP lines stay identical everywhere.
     */
    landmark: 'Opposite Nexa Tower',
  },

  /** Google Maps pin for the listing, supplied by RSK, 2026-09-15 (the place's own coordinates). */
  geo: { lat: 30.709732, lng: 76.6890954 } as null | { lat: number; lng: number },

  /** Primary number listed first, confirmed by RSK. */
  phones: [
    { display: '+91 90419 96918', tel: '+919041996918' },
    { display: '+91 94170 30347', tel: '+919417030347' },
  ],

  /** WhatsApp number for every enquiry link. Confirmed by RSK as the primary line. */
  whatsapp: '919041996918',

  email: 'rsksolarenergy@gmail.com',

  /**
   * Confirmed by RSK, 2026-09-15: Monday to Saturday 9:30 am to 7 pm, closed 2 pm to 2:45 pm,
   * closed Sunday. schema.org has no "break" field, so the day is two blocks, which is how
   * Google expects a midday closure. Everything that shows hours (header strip, footer, contact
   * page, mobile menu, schema) reads this one field.
   */
  hours: [
    { days: MON_TO_SAT, opens: '09:30', closes: '14:00' },
    { days: MON_TO_SAT, opens: '14:45', closes: '19:00' },
  ] as null | OpeningHours[],

  google: {
    rating: 4.9,
    reviewCount: 38,
    // Confirmed by RSK from the live Google Business Profile card, 2026-09-12.
    ratingCheckedOn: '2026-09-12',
    mapsUrl: 'https://maps.google.com/?cid=3900928441643699717',
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJK-ncoCnvDzkRBQ5k6r_hIjY',
  },

  /** Secondary review platform. Profile URL supplied by RSK, 2026-09-15. */
  justdial: {
    rating: 5.0,
    reviewCount: 40,
    ratingCheckedOn: '2026-09-12',
    url: 'https://www.justdial.com/Mohali/Rsk-Solar-Energy-Opposite-Nexa-Tower-Mohali-Sector-74/0172PX172-X172-230604155006-M4D9_BZDET' as string | null,
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
   * link is never shown until it is genuinely confirmed (CLAUDE.md §6).
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
    // Corrected from "UDHYAM-" to "UDYAM-" at RSK's instruction, 2026-09-15.
    msme: 'UDYAM-PB-20-0093804',
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
const shortDay = (i: number) => (WEEK[i] ?? '').slice(0, 3);
const minutes = (t: string) => {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return h * 60 + m;
};

function clock(t: string) {
  const [h = 0, m = 0] = t.split(':').map(Number);
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
  return runs.map((r) => (r.length > 2 ? `${shortDay(r[0] ?? 0)}–${shortDay(r.at(-1) ?? 0)}` : r.map(shortDay).join(', '))).join(', ');
}

/**
 * Opening hours for display, or null while BUSINESS.hours is unset. Blocks that share the same
 * days are merged into one line, with any gap between them reported as a break, so two schema
 * blocks read as "Mon–Sat, 9:30 am to 7 pm" plus "Closed 2 pm to 2:45 pm".
 */
export function formatHours(): { lines: string[]; breaks: string[]; closed: string | null } | null {
  const hours = BUSINESS.hours;
  if (!hours?.length) return null;
  const groups = new Map<string, OpeningHours[]>();
  for (const h of hours) {
    const key = [...h.days].sort((a, b) => WEEK.indexOf(a) - WEEK.indexOf(b)).join(',');
    groups.set(key, [...(groups.get(key) ?? []), h]);
  }
  const lines: string[] = [];
  const breaks: string[] = [];
  for (const blocks of groups.values()) {
    const sorted = [...blocks].sort((a, b) => minutes(a.opens) - minutes(b.opens));
    const first = sorted[0];
    const last = sorted.at(-1);
    if (!first || !last) continue;
    lines.push(`${dayRange(first.days)}, ${clock(first.opens)} to ${clock(last.closes)}`);
    sorted.slice(1).forEach((block, i) => {
      const previous = sorted[i];
      if (previous) breaks.push(`Closed ${clock(previous.closes)} to ${clock(block.opens)}`);
    });
  }
  const open = new Set(hours.flatMap((h) => h.days));
  const closedDays = WEEK.filter((d) => !open.has(d));
  return { lines, breaks, closed: closedDays.length ? `${dayRange(closedDays)}: closed` : null };
}
