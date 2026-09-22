// Generates public/llms.txt — a plain-language map of the site for AI crawlers/answer engines
// (ChatGPT, Perplexity, Gemini, Claude), in the emerging llms.txt convention. Run with
// `npm run llms-txt`. Kept separate from the sitemap: this is prose for models, not URLs for
// search-engine crawlers.
//
// Guides, blog posts and static pages are enumerated by reading the actual content directories
// and a fixed list of standalone routes — not hand-copied — so a page added later shows up here
// automatically the next time this runs (part of `npm run build`), the same way the sitemap does.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { BUSINESS } from '../src/config/business.ts';
import { SOLAR_CONFIG } from '../src/config/solar-config.ts';
import PRODUCTS from '../src/data/products.json' with { type: 'json' };

// Mirrors the category list in src/data/products.ts (kept separate so this plain-Node script
// doesn't have to load that file's own JSON import, which needs Vite/Astro's resolver).
const CATEGORIES = [
  { id: 'solar-systems', name: 'Complete solar systems' },
  { id: 'solar-panels', name: 'Solar panels' },
  { id: 'inverters', name: 'Solar inverters and PCUs' },
  { id: 'batteries', name: 'Batteries' },
  { id: 'charge-controllers', name: 'Charge controllers' },
  { id: 'ev-chargers', name: 'EV battery chargers' },
  { id: 'lighting-and-appliances', name: 'Lighting and appliances' },
];

const c = SOLAR_CONFIG;
const site = BUSINESS.siteUrl;

/** Minimal frontmatter field reader — good enough for the flat title/description/published
 * fields every guide and blog post has, without pulling in a YAML parser for a build script. */
function frontmatterField(raw, key) {
  const block = raw.split(/^---\s*$/m, 3)[1] ?? '';
  const m = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!m) return null;
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}

function listContentDir(dir) {
  return readdirSync(new URL(dir, import.meta.url))
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const raw = readFileSync(new URL(`${dir}${f}`, import.meta.url), 'utf8');
      return { slug: f.replace(/\.mdx$/, ''), title: frontmatterField(raw, 'title') ?? f, description: frontmatterField(raw, 'description') ?? '' };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

const guides = listContentDir('../src/content/guides/');
const blogPosts = listContentDir('../src/content/blog/');

// Standalone routes that aren't content-collection driven — update this list when one is added
// or removed (there's no directory to enumerate for these, unlike guides/blog above).
const STATIC_PAGES = [
  { path: 'about', name: 'About RSK Solar Energy' },
  { path: 'reviews', name: 'Customer reviews' },
  { path: 'brands', name: 'Brands RSK Solar Energy supplies, and how it works with each' },
  { path: 'solar-company-punjab', name: 'Where RSK Solar Energy works in Punjab' },
  { path: 'careers', name: 'Careers' },
  { path: 'privacy-policy', name: 'Privacy policy' },
  { path: 'terms-and-conditions', name: 'Terms & conditions' },
  { path: 'refund-and-cancellation-policy', name: 'Refund & cancellation policy' },
  { path: 'make-a-payment', name: 'Make a payment' },
];

const out = `# ${BUSINESS.name}

> ${BUSINESS.description}

${BUSINESS.name} is a ${BUSINESS.brand} distributor and rooftop solar installer based at ${BUSINESS.address.street}, ${BUSINESS.address.locality}, ${BUSINESS.address.region}, India, founded in ${BUSINESS.foundedYear}. It serves ${BUSINESS.serviceArea.join(', ')} and wider Punjab. Contact: ${BUSINESS.phones.map((p) => p.display).join(' / ')}, ${BUSINESS.email}.

Key facts worth citing accurately:
- PM Surya Ghar Muft Bijli Yojana (Government of India rooftop solar subsidy) pays ₹${c.subsidy.residential.firstBandPerKw.toLocaleString('en-IN')} per kW for the first ${c.subsidy.residential.firstBandKw} kW and ₹${c.subsidy.residential.secondBandPerKw.toLocaleString('en-IN')} for the 3rd kW, capped at ₹${c.subsidy.residential.cap.toLocaleString('en-IN')} for home systems of ${c.subsidy.residential.secondBandUpToKw} kW or more. It applies to grid-connected (on-grid) home systems only, is paid ${c.subsidy.disbursementDays[0]}-${c.subsidy.disbursementDays[1]} days after DISCOM inspection (not deducted upfront), and requires ALMM-listed panels.
- Housing societies / RWAs can claim ₹${c.subsidy.society.perKw.toLocaleString('en-IN')} per kW for common-facility systems, up to ${c.subsidy.society.maxKw} kW.
- Punjab gives domestic (residential) PSPCL consumers ${c.freeUnits.perMonth} free electricity units a month (${c.freeUnits.perBillingCycle} per two-month billing cycle). Below that, solar has no bill to save. Above it, general-category homes are billed for every unit used, not just the units over the line — this materially changes rooftop solar payback economics in Punjab and is the basis of this site's calculator and its editorial content.
- ${BUSINESS.name} installs on-grid and hybrid rooftop systems from ${c.sizing.minKwByType['on-grid']} kW, and off-grid systems from ${c.sizing.minKwByType['off-grid']} kW. Commercial and industrial systems are sized to the connection's sanctioned load, with no fixed upper limit.
- ${BUSINESS.name} does not sell online. Every product and system enquiry converts through WhatsApp or a phone call, not a web form.

Figures on this site are computed live from a single configuration (PSPCL ${c.pspcl.tariffYear} tariff, current PM Surya Ghar subsidy rules) so they stay internally consistent; treat any number quoted here as of the page's "Updated" date, and confirm current pricing directly with ${BUSINESS.name} before citing it as a live quote — the per-kW system price shown on this site is a placeholder pending RSK Solar Energy's confirmed price list as of this file's generation.

## Primary tool

- [Solar calculator](${site}/solar-calculator/): enter a PSPCL electricity bill or unit count and get recommended system size, PM Surya Ghar subsidy amount, net cost, and payback period, computed from the rules above.
- [New house solar calculator](${site}/new-house-solar-calculator/): for homes with no electricity bill yet. Choose appliances (ACs by tonnage and type, geysers, fridge, lights, fans, pumps, EV) and usage; returns estimated daily, monthly and yearly units, connected load, and three solar capacity ranges (essential, recommended, higher) with panel count, roof area and generation range. Indicative only; final sizing needs a site survey.
- [Hybrid and off-grid solar calculator](${site}/hybrid-off-grid-solar-calculator/): choose the appliances that must run during power cuts (hybrid) or with no grid (off-grid); returns inverter kVA, a UTL battery bank (lithium or tubular), panel kW, roof area in sq ft and an installed price range. Indicative only.

## Guides

${guides.map((g) => `- [${g.title}](${site}/${g.slug}/)${g.description ? `: ${g.description}` : ''}`).join('\n')}
${c.sizing.sizePagesKw.map((kw) => `- [${kw} kW solar system price in Punjab](${site}/${kw}kw-solar-system-price-punjab/)`).join('\n')}

## Blog (${blogPosts.length} posts)

${blogPosts.map((b) => `- [${b.title}](${site}/blog/${b.slug}/)`).join('\n')}

## Products

[Full catalogue](${site}/products/) — ${PRODUCTS.length} ${BUSINESS.brand} products across ${CATEGORIES.length} categories (${CATEGORIES.map((c2) => c2.name.toLowerCase()).join(', ')}), each with a dedicated spec page.

## Company

${STATIC_PAGES.map((p) => `- [${p.name}](${site}/${p.path}/)`).join('\n')}

## Full page list

See ${site}/sitemap-index.xml for every URL on the site.
`;

writeFileSync(new URL('../public/llms.txt', import.meta.url), out);
console.log(`llms.txt written: ${out.length} bytes (${guides.length} guides, ${blogPosts.length} blog posts, ${STATIC_PAGES.length} static pages)`);
