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
 * Deliberately no aggregateRating and no Review markup anywhere on the site. The 4.9 rating and
 * the reviews quoted on /reviews/ were collected on Google Maps, and Google's review-snippet
 * policy rules out marking up ratings gathered on another platform, as well as self-serving
 * reviews on a LocalBusiness. Visitors still see the figures; they just aren't structured data.
 */
export function localBusiness() {
  const a = BUSINESS.address;
  const sameAs = [BUSINESS.google.mapsUrl, BUSINESS.social.facebook, BUSINESS.social.instagram, BUSINESS.social.youtube, BUSINESS.social.x, BUSINESS.justdial.url].filter(
    (u): u is string => !!u,
  );
  return {
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness'],
    '@id': BUSINESS_ID,
    name: BUSINESS.name,
    url: `${BUSINESS.siteUrl}/`,
    description: BUSINESS.description,
    logo: abs('/icon-512.png'),
    image: [abs('/images/rsk-solar-energy-office-mohali.jpg'), abs('/og-default.png')],
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
    ...(BUSINESS.hours?.length
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
    sameAs,
    areaServed: [...BUSINESS.serviceArea.map((c) => ({ '@type': 'City', name: c })), { '@type': 'State', name: 'Punjab' }],
    knowsAbout: [
      'Rooftop solar',
      'PM Surya Ghar Muft Bijli Yojana',
      'Net metering in Punjab',
      'On-grid solar systems',
      'Hybrid solar systems',
      'Off-grid solar systems',
      'Solar inverters',
      'Solar batteries',
      'Solar water pumps',
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

export function service(opts: { name: string; description: string; path: string; serviceType: string; areaServed?: object }) {
  return {
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    serviceType: opts.serviceType,
    provider: { '@id': BUSINESS_ID },
    areaServed: opts.areaServed ?? { '@type': 'State', name: 'Punjab' },
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
    // No `offers`/price: RSK doesn't publish prices (CLAUDE.md §7), and an offer without a real
    // price would be either fabricated or misleadingly absent.
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

/** Marks a page as the business's contact page, pointing back at the site-wide LocalBusiness. */
export function contactPage(path: string) {
  return {
    '@type': 'ContactPage',
    url: abs(path),
    about: { '@id': BUSINESS_ID },
  };
}

export function graph(nodes: object[]) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
}
