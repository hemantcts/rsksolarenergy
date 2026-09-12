// Generates dist/image-sitemap.xml — one <url> per product page with its real product photo,
// per Google's image sitemap extension (https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps).
// Run after `astro build` (not before, like htaccess/llms-txt): it reads the already-built page
// HTML for the image URL, rather than re-deriving Astro's content-hashed asset path itself —
// the page's own Product JSON-LD (see src/lib/seo.ts `product()`) is the single source of truth
// for that URL, so this can't drift from what's actually rendered.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import PRODUCTS from '../src/data/products.json' with { type: 'json' };

const site = 'https://rsksolarenergy.com';
const distDir = new URL('../dist/', import.meta.url);

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const entries = [];
let skipped = 0;
for (const p of PRODUCTS) {
  const htmlPath = new URL(`products/${p.slug}/index.html`, distDir);
  if (!existsSync(htmlPath)) {
    skipped++;
    continue;
  }
  const html = readFileSync(htmlPath, 'utf8');
  const ldJsonMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (!ldJsonMatch) {
    skipped++;
    continue;
  }
  let image = null;
  try {
    const data = JSON.parse(ldJsonMatch[1]);
    const product = (data['@graph'] ?? []).find((n) => n['@type'] === 'Product');
    image = product?.image ?? null;
  } catch {
    // malformed JSON-LD would already fail launch-check elsewhere; just skip this one image entry
  }
  if (!image) {
    skipped++;
    continue;
  }
  entries.push({ loc: `${site}/products/${p.slug}/`, image, title: p.title });
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries
  .map(
    (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <image:image>
      <image:loc>${escapeXml(e.image)}</image:loc>
      <image:title>${escapeXml(e.title)}</image:title>
    </image:image>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

writeFileSync(new URL('image-sitemap.xml', distDir), xml);
console.log(`image-sitemap.xml written: ${entries.length} product images${skipped ? `, ${skipped} skipped (no image)` : ''}`);
