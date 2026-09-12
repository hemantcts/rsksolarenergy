// One-off scraper: upsinverter.com solar-panel product pages (2026 recheck) -> raw JSON.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const urls = readFileSync(new URL('panel-urls-2026.txt', dir), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);

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
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
    const finalUrl = res.url;
    const status = res.status;
    const html = await res.text();
    const slug = finalUrl.split('/').filter(Boolean).pop();

    const titleMatch = html.match(/<h[12][^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/);
    const title = titleMatch ? text(titleMatch[1]) : '';
    const isProductPage = /product_title/.test(html);

    const shortMatch = html.match(/woocommerce-product-details__short-description">([\s\S]*?)<\/div>\s*<\/div>/);
    const shortHtml = shortMatch ? shortMatch[1] : '';
    const shortBullets = [...shortHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1])).filter(Boolean);
    const shortParas = [...shortHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).filter(Boolean);

    const descStart = html.indexOf('id="tab-description"');
    let descHtml = '';
    if (descStart >= 0) {
      const rest = html.slice(descStart);
      const nextTab = rest.slice(50).search(/woocommerce-Tabs-panel woocommerce-Tabs-panel--(?!description)/);
      descHtml = nextTab >= 0 ? rest.slice(0, nextTab + 50) : rest.slice(0, 4000);
    }
    const descParas = [...descHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).filter((p) => p && p.length > 15);
    const descBullets = [...descHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1])).filter(Boolean);

    // Capture every wc-tab panel (not just ones literally named "technical"/"specification") —
    // this template also uses "manufacturing-details" and others for real spec tables, while
    // "specifications" itself is often just a scanned datasheet image.
    const tabIds = [...html.matchAll(/id="(tab-[a-z-]+)"[^>]*role="tabpanel"/g)].map((m) => m[1]).filter((id) => id !== 'tab-reviews');
    const seenLabels = new Set();
    let specRows = [];
    let specFigure = null;
    for (const id of [...new Set(tabIds)]) {
      const start = html.indexOf(`id="${id}"`);
      if (start < 0) continue;
      const rest = html.slice(start);
      const nextTab = rest.slice(50).search(new RegExp(`woocommerce-Tabs-panel woocommerce-Tabs-panel--(?!${id.replace(/^tab-/, '')})`));
      const panelHtml = nextTab >= 0 ? rest.slice(0, nextTab + 50) : rest.slice(0, 8000);
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
        const figMatch = panelHtml.match(/<a href="([^"]+\.(?:jpe?g|png))"[^>]*rel="nofollow noopener"/);
        specFigure = figMatch ? figMatch[1] : null;
      }
    }

    const image = (html.match(/property="og:image"\s+content="([^"]+)"/) || [])[1] || '';
    const sku = (html.match(/SKU:\s*([A-Z0-9-]+)/) || [])[1] || null;
    const priceMatch = html.match(/<p class="price">([\s\S]*?)<\/p>/);
    const category = (html.match(/"posted_in">[\s\S]*?<a[^>]*>([^<]+)</) || [])[1] || null;

    out.push({ oldUrl: url, finalUrl, status, isProductPage, slug, title, shortBullets, shortParas, descParas, descBullets, specs: specRows, image, sku, category });
    process.stdout.write('.');
  } catch (e) {
    out.push({ oldUrl: url, error: String(e) });
    process.stdout.write('x');
  }
}
writeFileSync(new URL('panels-raw-2026.json', dir), JSON.stringify(out, null, 2));
console.log(`\n${out.length} fetched`);
for (const p of out) {
  console.log((p.slug || p.oldUrl).padEnd(55), '|', p.isProductPage ? 'PRODUCT' : 'NOT-PRODUCT', '|', (p.title || '').padEnd(50).slice(0,50), '|', (p.specs||[]).length, 'specs');
}
