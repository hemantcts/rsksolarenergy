// One-off scraper: upsinverter.com UTL product pages -> raw JSON. Text only, no markup kept.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const urls = readFileSync(new URL('upsinverter-product-urls.txt', dir), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);

const decode = (s) =>
  s
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#215;/g, '×')
    .replace(/&#8730;/g, '√')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const text = (s) =>
  decode(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+/g, ' ')
    .trim();

function between(html, start, end) {
  const i = html.indexOf(start);
  if (i < 0) return '';
  const j = end ? html.indexOf(end, i + start.length) : -1;
  return html.slice(i + start.length, j < 0 ? undefined : j);
}

const out = [];
for (const url of urls) {
  const res = await fetch(url, { redirect: 'follow' });
  const finalUrl = res.url;
  const html = await res.text();
  const slug = finalUrl.split('/').filter(Boolean).pop();

  // Title: h1 (newer theme) or h2 (older Elementor pages), same class either way.
  const titleMatch = html.match(/<h[12][^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/);
  const title = titleMatch ? text(titleMatch[1]) : '';

  const brandBlock = between(html, '<g:brand>', '</g:brand>');
  const brand = text(brandBlock);

  // Short description: stop at the next sibling block, not an arbitrary literal string.
  const shortMatch = html.match(/woocommerce-product-details__short-description">([\s\S]*?)<\/div>\s*<\/div>/);
  const shortHtml = shortMatch ? shortMatch[1] : '';
  const shortBullets = [...shortHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1])).filter(Boolean);
  const shortParas = [...shortHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).filter(Boolean);

  // Description tab: bounded by the next Woo tab panel (pwb_tab / specifications / additional_information),
  // whichever appears first, so JS/widgets after an unclosed section never leak in.
  const descStart = html.indexOf('id="tab-description"');
  let descHtml = '';
  if (descStart >= 0) {
    const rest = html.slice(descStart);
    const nextTab = rest.slice(50).search(/woocommerce-Tabs-panel woocommerce-Tabs-panel--(?!description)/);
    descHtml = nextTab >= 0 ? rest.slice(0, nextTab + 50) : rest.slice(0, 4000);
  }
  const descParas = [...descHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).filter((p) => p && p.length > 15);
  const descBullets = [...descHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1])).filter(Boolean);
  const descHeadings = [...descHtml.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g)].map((m) => text(m[1])).filter((h) => h && h.toLowerCase() !== 'description');

  // Specifications live in one of two tabs depending on the page template: "specifications"
  // (often just a scanned datasheet image) or "technical-specifications" (a real HTML table).
  // Try every tab whose id contains "technical" or "specification" and keep the first real table.
  // Products can carry TWO separate spec tables (a short "Model/Weight/Warranty" one under
  // "specifications" and a detailed electrical one under "technical-specifications") — merge
  // both rather than keep only the longer, or fields like Model get silently dropped.
  const tabIds = [...html.matchAll(/id="(tab-[a-z-]*(?:technical|specification)[a-z-]*)"/g)].map((m) => m[1]);
  const seenLabels = new Set();
  let specRows = [];
  let specFigure = null;
  for (const id of [...new Set(tabIds)]) {
    const start = html.indexOf(`id="${id}"`);
    if (start < 0) continue;
    const rest = html.slice(start);
    const nextTab = rest.slice(50).search(new RegExp(`woocommerce-Tabs-panel woocommerce-Tabs-panel--(?!${id.replace(/^tab-/, '')})`));
    const panelHtml = nextTab >= 0 ? rest.slice(0, nextTab + 50) : rest.slice(0, 6000);
    for (const tableMatch of panelHtml.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)) {
      const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
        .map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => text(c[1])))
        .filter((r) => r.some(Boolean));
      for (const r of rows) {
        const key = (r[0] ?? '').toLowerCase();
        if (seenLabels.has(key)) continue;
        seenLabels.add(key);
        specRows.push(r);
      }
    }
    if (!specFigure) {
      specFigure = (panelHtml.match(/<img[^>]+src="([^"]+)"[^>]*alt="[^"]*(?:technical|spec|datasheet)[^"]*"/i) || [])[1] || null;
    }
  }

  const image = (html.match(/property="og:image"\s+content="([^"]+)"/) || [])[1] || '';
  const sku = (html.match(/SKU:\s*([A-Z0-9-]+)/) || [])[1] || null;

  out.push({
    oldUrl: url,
    finalUrl,
    slug,
    title,
    brand,
    shortBullets,
    shortParas,
    descParas,
    descBullets,
    descHeadings,
    specs: specRows,
    specFigure,
    image,
    sku,
  });
  process.stdout.write('.');
}
writeFileSync(new URL('upsinverter-raw.json', dir), JSON.stringify(out, null, 2));
console.log(`\n${out.length} products`);
for (const p of out) {
  console.log(
    p.slug.padEnd(45),
    '|',
    (p.brand || 'NO-BRAND').padEnd(8),
    '|',
    p.title.padEnd(55).slice(0, 55),
    '|',
    p.specs.length,
    'rows',
    p.specFigure ? '(+figure)' : '',
    '| desc paras', p.descParas.length, '| short bullets', p.shortBullets.length,
  );
}
