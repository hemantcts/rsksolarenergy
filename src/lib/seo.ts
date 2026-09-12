import { BUSINESS } from '../config/business';

export const abs = (path: string) => new URL(path, BUSINESS.siteUrl).toString();

/**
 * Truncate at a word boundary. A blind `.slice()` on a title or meta description chops
 * mid-word ("RSK Solar Energy Moh"), which is what Google then renders in the result.
 */
export function clampWords(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/, '');
}

/**
 * Append the longest suffix from `options` that still fits in `max`, or nothing if none do.
 * Keeps the brand/location suffix whole instead of letting it be cut in half.
 */
export function fitSuffix(base: string, options: string[], max: number) {
  return options.find((s) => base.length + s.length <= max) ?? '';
}

const BUSINESS_ID = `${BUSINESS.siteUrl}/#business`;

export interface Crumb {
  name: string;
  path: string;
}
export interface QA {
  q: string;
  /** Plain text. Rendered as paragraphs split on blank lines. */
  a: string;
}

/**
 * Site-wide LocalBusiness. NAP matches the Google Business Profile.
 *
 * aggregateRating IS emitted (CLAUDE.md §6 asks for it) using the real Google Business Profile
 * figure — see BUSINESS.google.ratingCheckedOn — and is backed by the individually-authored
 * Review nodes visibly on /reviews/, not by markup alone. Note the tension: the rating is
 * aggregated from Google Maps, and Google's review-snippet guidance is unenthusiastic about
 * self-serving LocalBusiness ratings, so it may simply not earn stars. If a structured-data
 * warning ever appears in Search Console, this field is the first thing to drop.
 */
export function localBusiness() {
  const a = BUSINESS.address;
  return {
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness'],
    '@id': BUSINESS_ID,
    name: BUSINESS.name,
    url: `${BUSINESS.siteUrl}/`,
    description: BUSINESS.description,
    logo: abs('/icon-512.png'),
    image: abs('/og-default.png'),
    telephone: BUSINESS.phones.map((p) => p.tel),
    email: BUSINESS.email,
    foundingDate: String(BUSINESS.foundedYear),
    taxID: BUSINESS.registrations.gst,
    address: {
      '@type': 'PostalAddress',
      streetAddress: a.street,
      addressLocality: a.locality,
      addressRegion: a.region,
      ...(a.postalCode ? { postalCode: a.postalCode } : {}),
      addressCountry: a.country,
    },
    ...(BUSINESS.geo ? { geo: { '@type': 'GeoCoordinates', latitude: BUSINESS.geo.lat, longitude: BUSINESS.geo.lng } } : {}),
    ...(BUSINESS.hours
      ? {
          openingHoursSpecification: BUSINESS.hours.map((h) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: h.days,
            opens: h.opens,
            closes: h.closes,
          })),
        }
      : {}),
    hasMap: BUSINESS.google.mapsUrl,
    // Real figure from the live Google Business Profile (see BUSINESS.google.ratingCheckedOn),
    // not invented — and backed by the actual Review nodes on /reviews/, not markup alone.
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: BUSINESS.google.rating,
      reviewCount: BUSINESS.google.reviewCount,
      bestRating: 5,
    },
    areaServed: [...BUSINESS.serviceArea.map((c) => ({ '@type': 'City', name: c })), { '@type': 'State', name: 'Punjab' }],
    knowsAbout: [
      'Rooftop solar',
      'PM Surya Ghar Muft Bijli Yojana',
      'Net metering in Punjab',
      'On-grid solar systems',
      'Hybrid solar systems',
      'Off-grid solar systems',
      'UTL Solar products',
    ],
    brand: { '@type': 'Brand', name: BUSINESS.brand },
  };
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': `${BUSINESS.siteUrl}/#website`,
    url: `${BUSINESS.siteUrl}/`,
    name: BUSINESS.name,
    inLanguage: 'en-IN',
    publisher: { '@id': BUSINESS_ID },
  };
}

export function breadcrumbs(items: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.path) })),
  };
}

export function faqPage(items: QA[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };
}

export function service(opts: { name: string; description: string; path: string; serviceType: string }) {
  return {
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    serviceType: opts.serviceType,
    provider: { '@id': BUSINESS_ID },
    areaServed: { '@type': 'State', name: 'Punjab' },
  };
}

export function product(p: { title: string; summary: string; slug: string; model: string | null; brand: string; category: string; image?: string }) {
  return {
    '@type': 'Product',
    name: p.title,
    description: p.summary || `${p.title} from ${p.brand}, supplied by ${BUSINESS.name}, Mohali.`,
    url: abs(`/products/${p.slug}/`),
    brand: { '@type': 'Brand', name: p.brand },
    ...(p.model ? { model: p.model, mpn: p.model } : {}),
    category: p.category,
    // No `offers`/price here — deliberate. RSK doesn't publish prices (CLAUDE.md §7); a Product
    // offer without a real price would be either fabricated or misleadingly absent to Google.
    ...(p.image ? { image: p.image } : {}),
  };
}

export function article(opts: { title: string; description: string; path: string; published: string; updated?: string }) {
  return {
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: abs(opts.path),
    datePublished: opts.published,
    dateModified: opts.updated ?? opts.published,
    author: { '@id': BUSINESS_ID },
    publisher: { '@id': BUSINESS_ID },
    image: abs('/og-default.png'),
    inLanguage: 'en-IN',
  };
}

/**
 * Individual customer Review nodes for the reviews page. These are what back the
 * aggregateRating on localBusiness() — Google's guidance is comfortable with genuine,
 * individually-authored reviews that are visibly present on the page, which these are.
 */
export function review(r: { name: string; date: string; rating: number; text: string }) {
  return {
    '@type': 'Review',
    itemReviewed: { '@id': BUSINESS_ID },
    author: { '@type': 'Person', name: r.name },
    datePublished: r.date,
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
    reviewBody: r.text,
  };
}

export function graph(nodes: object[]) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
}
