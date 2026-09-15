// SEO guard. Runs at the end of `npm run build` and fails the build if any page breaks the SEO
// rules this site was built on (files/CLAUDE.md §6 and §7, and the Highprime playbook: one question
// per page, narrow slugs, brand kept out of titles). A failing rule means fix the page, not the
// rule; change a rule here only when the policy itself changes, and update CLAUDE.md with it.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://rsksolarenergy.com';
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

/** Pages allowed to carry the brand in the <title>: branded queries, contact, trust and legal. */
const BRAND_IN_TITLE = new Set([
  '/',
  '/about/',
  '/contact/',
  '/reviews/',
  '/careers/',
  '/why-choose-rsk-solar-energy/',
  '/make-a-payment/',
  '/privacy-policy/',
  '/terms-and-conditions/',
  '/refund-and-cancellation-policy/',
  '/awards-and-recognition/',
]);
/** The only pages allowed to be noindex. Keep in sync with the sitemap filter in astro.config.mjs. */
const NOINDEX_ALLOWED = new Set(['/404.html', '/awards-and-recognition/']);
const TITLE_MAX = 65;
/** Product names come from UTL's catalogue and can run long; those only warn up to this. */
const PRODUCT_TITLE_MAX = 80;
const DESC_MAX = 160;
const DESC_MIN = 70;

const errors = [];
const warnings = [];
const err = (page, msg) => errors.push(`${page}  ${msg}`);
const warn = (page, msg) => warnings.push(`${page}  ${msg}`);

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === 'index.html' || f === '404.html') files.push(p);
  }
})(DIST);
const pathOf = (file) => '/' + relative(DIST, file).split(sep).join('/').replace(/index\.html$/, '');

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const meta = (h, attr, name) => {
  const m = h.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`));
  return m ? decode(m[1]) : null;
};
const visibleText = (h) =>
  decode(
    h
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ');

/** Every @type in a JSON-LD value, and every node, flattened (handles @graph and nesting). */
function nodesOf(value, out = []) {
  if (Array.isArray(value)) value.forEach((v) => nodesOf(v, out));
  else if (value && typeof value === 'object') {
    if (value['@type']) out.push(value);
    Object.values(value).forEach((v) => nodesOf(v, out));
  }
  return out;
}
const typesOf = (node) => [].concat(node['@type']);

const titles = new Map();
const descriptions = new Map();
const indexable = new Set();
let homeBusiness = null;
const officialPhones = new Set();

// Official phone numbers are whatever the contact page lists; every other page must match them.
{
  const contact = readFileSync(join(DIST, 'contact', 'index.html'), 'utf8');
  for (const m of contact.matchAll(/href="tel:([^"]+)"/g)) officialPhones.add(m[1]);
}

const sorted = files.sort((a, b) => (pathOf(a) === '/' ? -1 : pathOf(b) === '/' ? 1 : 0));
for (const file of sorted) {
  const page = pathOf(file);
  const h = readFileSync(file, 'utf8');
  const is404 = page === '/404.html';
  const robots = meta(h, 'name', 'robots') ?? '';
  const noindex = /noindex/.test(robots);

  if (noindex && !NOINDEX_ALLOWED.has(page)) err(page, 'is noindex but not on the allowlist');
  if (!noindex) indexable.add(page);

  // ---- Title and description ----
  const title = decode((h.match(/<title>([^<]*)<\/title>/) || [])[1] ?? '');
  const desc = meta(h, 'name', 'description');
  if (!is404) {
    if (!title) err(page, 'missing <title>');
    const isProduct = /^\/products\/[^/]+\/$/.test(page) && /"@type":"Product"/.test(h);
    if (title.length > (isProduct ? PRODUCT_TITLE_MAX : TITLE_MAX)) err(page, `title is ${title.length} characters (max ${isProduct ? PRODUCT_TITLE_MAX : TITLE_MAX}): "${title}"`);
    else if (isProduct && title.length > TITLE_MAX) warn(page, `product title is ${title.length} characters`);
    if (/\bRSK\b/i.test(title) && !BRAND_IN_TITLE.has(page)) err(page, `brand in title (keep it to branded/contact/legal pages): "${title}"`);
    if (title) titles.set(title, [...(titles.get(title) ?? []), page]);

    if (!desc) err(page, 'missing meta description');
    else {
      if (desc.length > DESC_MAX) err(page, `description is ${desc.length} characters (max ${DESC_MAX})`);
      if (desc.length < DESC_MIN) warn(page, `description is only ${desc.length} characters`);
      descriptions.set(desc, [...(descriptions.get(desc) ?? []), page]);
    }

    // ---- Canonical and social tags ----
    const canonical = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    if (!canonical) err(page, 'missing canonical');
    else if (canonical !== SITE + page) err(page, `canonical is ${canonical}, expected ${SITE + page}`);
    for (const p of ['og:title', 'og:description', 'og:image', 'og:url']) if (!meta(h, 'property', p)) err(page, `missing ${p}`);
    if (!meta(h, 'name', 'twitter:card')) err(page, 'missing twitter:card');
  }

  // ---- Headings ----
  const h1s = (h.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) err(page, `has ${h1s} <h1> elements (needs exactly one)`);
  let prev = 1;
  const body = h.replace(/[\s\S]*?<\/header>/, '');
  for (const m of body.matchAll(/<h([1-6])[\s>]/g)) {
    const level = Number(m[1]);
    if (level > prev + 1) {
      err(page, `heading jumps from h${prev} to h${level}`);
      break;
    }
    prev = level;
  }

  // ---- Structured data ----
  const nodes = [];
  for (const m of h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      nodesOf(JSON.parse(m[1]), nodes);
    } catch (e) {
      err(page, `invalid JSON-LD: ${e.message}`);
    }
  }
  const types = new Set(nodes.flatMap(typesOf));
  const has = (t) => types.has(t);
  const business = nodes.find((n) => typesOf(n).includes('LocalBusiness'));
  if (!is404) {
    if (!business) err(page, 'missing LocalBusiness schema');
    else if (page === '/') homeBusiness = JSON.stringify(business);
    else if (homeBusiness && JSON.stringify(business) !== homeBusiness) err(page, 'LocalBusiness schema differs from the homepage (NAP must be identical everywhere)');
    if (page !== '/' && !has('BreadcrumbList')) err(page, 'missing BreadcrumbList schema');
  }
  for (const banned of ['AggregateRating', 'Review']) if (has(banned)) err(page, `has ${banned} schema (not allowed: ratings come from Google Maps)`);

  if (/^\/\d+kw-solar-system-price-punjab\/$/.test(page) && !(has('Service') && has('FAQPage'))) err(page, 'size page needs Service and FAQPage schema');
  if (/^\/solar-company-[a-z-]+\/$/.test(page) && page !== '/solar-company-punjab/' && !(has('Service') && has('FAQPage'))) err(page, 'city page needs Service and FAQPage schema');
  if (/^\/blog\/[^/]+\/$/.test(page) && !has('Article')) err(page, 'blog post needs Article schema');
  if (/^\/products\/[^/]+\/$/.test(page) && !has('Product') && !has('ItemList')) err(page, 'product page needs Product schema');

  // FAQPage must match the questions visitors can see.
  const faq = nodes.find((n) => typesOf(n).includes('FAQPage'));
  const visibleFaq = [...h.matchAll(/class="faq"[^>]*>([\s\S]*?)<\/section>/g)].reduce((sum, m) => sum + (m[1].match(/<details[\s>]/g) || []).length, 0);
  const schemaFaq = faq ? [].concat(faq.mainEntity ?? []).length : 0;
  if (schemaFaq !== visibleFaq) err(page, `FAQPage schema has ${schemaFaq} questions but the page shows ${visibleFaq}`);

  // ---- Images ----
  for (const m of h.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    if (!/\salt(=|\s|>)/.test(tag)) err(page, `image without alt: ${tag.slice(0, 90)}`);
    if (!/\swidth=/.test(tag) || !/\sheight=/.test(tag)) err(page, `image without width/height: ${tag.slice(0, 90)}`);
  }

  // ---- Links ----
  for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) {
    const href = m[1];
    if (href.startsWith('//')) continue;
    const last = href.split('/').pop();
    if (last.includes('.')) {
      if (!existsSync(join(DIST, href))) err(page, `broken link ${href}`);
    } else if (!href.endsWith('/')) err(page, `internal link without trailing slash ${href}`);
    else if (!existsSync(join(DIST, href, 'index.html'))) err(page, `broken link ${href}`);
  }
  for (const m of h.matchAll(/href="tel:([^"]+)"/g)) if (!officialPhones.has(m[1])) err(page, `unofficial phone number ${m[1]}`);

  // ---- Content rules ----
  const text = visibleText(h);
  const warranty = text.match(/[^.]{0,60}\b(installation|workmanship) warranty\b[^.]{0,40}|[^.]{0,40}\b(RSK|we) (offer|offers|give|gives|provide|provides|guarantee|guarantees)\b[^.]{0,30}\b(warranty|guarantee)\b[^.]{0,30}|[^.]{0,40}\bguaranteed (savings|returns|payback)\b[^.]{0,30}/i);
  if (warranty) err(page, `RSK-side warranty or guarantee wording: "${warranty[0].trim()}"`);
  // The business is always "RSK Solar Energy" in copy, never bare "RSK" (RSK's instruction, 2026-09-16).
  const bareBrand = /\bRSK\b(?! Solar Energy| SOLAR ENERGY)/;
  const bareInText = text.match(new RegExp(`[^.]{0,40}${bareBrand.source}[^.]{0,40}`));
  if (bareInText) err(page, `brand written as bare "RSK" (use "RSK Solar Energy"): "${bareInText[0].trim()}"`);
  if (!is404 && (bareBrand.test(title) || (desc && bareBrand.test(desc)))) err(page, 'brand written as bare "RSK" in the title or description');
  if (!page.startsWith('/products/')) {
    const dash = text.match(/[^\s]{0,30}\s?\w[,.)]?\s?—\s?[\w(][^\s]{0,30}/);
    if (dash) err(page, `em dash in copy: "${dash[0].trim()}"`);
  }
}

// ---- Site-wide ----
for (const [title, pages] of titles) if (pages.length > 1) err(pages.join(', '), `duplicate title "${title}"`);
for (const [desc, pages] of descriptions) if (pages.length > 1) err(pages.join(', '), `duplicate description "${desc.slice(0, 60)}…"`);

const sitemap = readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8');
const listed = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, '')));
for (const page of indexable) if (!listed.has(page)) err(page, 'indexable page missing from sitemap');
for (const page of listed) if (!indexable.has(page)) err(page, 'in sitemap but not an indexable built page');
if (!readFileSync(join(DIST, 'sitemap-index.xml'), 'utf8').includes('sitemap-0.xml')) err('/sitemap-index.xml', 'does not reference sitemap-0.xml');

const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
if (/^Disallow:\s*\/\s*$/m.test(robots)) err('/robots.txt', 'blocks the whole site');
if (!robots.includes(`Sitemap: ${SITE}/sitemap-index.xml`)) err('/robots.txt', 'missing the sitemap line');
for (const f of ['image-sitemap.xml', 'llms.txt', '404.html']) if (!existsSync(join(DIST, f))) err(`/${f}`, 'missing');
if (!readFileSync(join(DIST, '.htaccess'), 'utf8').includes('ErrorDocument 404 /404.html')) err('/.htaccess', 'missing ErrorDocument 404');

// ---- Report ----
console.log(`SEO guard: ${files.length} pages, ${indexable.size} indexable, ${listed.size} in sitemap`);
if (warnings.length) console.log(`\n${warnings.length} warning(s):\n  ${warnings.join('\n  ')}`);
if (errors.length) {
  console.error(`\n❌ ${errors.length} SEO rule violation(s). Fix these before deploying:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log('✅ All SEO rules pass.');
