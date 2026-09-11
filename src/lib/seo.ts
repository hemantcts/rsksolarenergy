import { BUSINESS } from '../config/business';

export const abs = (path: string) => new URL(path, BUSINESS.siteUrl).toString();

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
 * aggregateRating is deliberately omitted even though CLAUDE.md §6 asks for it: Google's
 * review-snippet guidelines forbid marking up ratings aggregated from another site (the
 * 5.0 / 33 figure is from Google Maps), and self-serving LocalBusiness ratings are not
 * eligible for stars anyway. Marking it up risks a structured-data manual action.
 * The rating is shown visibly on the page instead, linked to the Google listing.
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

export function product(p: { title: string; summary: string; slug: string; model: string | null; brand: string; category: string }) {
  return {
    '@type': 'Product',
    name: p.title,
    description: p.summary || `${p.title} from ${p.brand}, supplied by ${BUSINESS.name}, Mohali.`,
    url: abs(`/products/${p.slug}/`),
    brand: { '@type': 'Brand', name: p.brand },
    ...(p.model ? { model: p.model, mpn: p.model } : {}),
    category: p.category,
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

export function graph(nodes: object[]) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
}
