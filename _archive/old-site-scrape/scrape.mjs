// One-off scraper: pulls TEXT content from the old site. No markup or scripts are kept.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const urls = readFileSync(new URL('urls-product.txt', dir), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);

const decode = (s) => s
  .replace(/&#8211;/g, '–').replace(/&#8217;/g, '’').replace(/&#8216;/g, '‘').replace(/&#8220;/g, '“').replace(/&#8221;/g, '”')
  .replace(/&#038;|&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#8243;/g, '″').replace(/&#215;/g, '×').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const text = (s) => decode(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim();

function between(html, start, end) {
  const i = html.indexOf(start);
  if (i < 0) return '';
  const j = html.indexOf(end, i + start.length);
  return html.slice(i + start.length, j < 0 ? undefined : j);
}

const out = [];
for (const url of urls) {
  const res = await fetch(url);
  const html = await res.text();
  const heading = between(html, '<div class="blog_heading">', '<div class="btn_block');
  const title = text(between(heading, '<h2>', '</h2>'));
  const short = text(between(heading, '<p>', '</p>')).split('\n').map((l) => l.trim()).filter(Boolean);
  const image = (between(html, '<div class="blog_bg">', '</div>').match(/src="([^"]+)"/) || [])[1] || '';
  const descHtml = between(html, 'id="home" role="tabpanel" aria-labelledby="home-tab">', '<div class="tab-pane fade" id="profile"');
  const specHtml = between(html, 'id="profile" role="tabpanel" aria-labelledby="profile-tab">', '</table>');
  const headings = [...descHtml.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/g)].map((m) => text(m[1]));
  const paras = [...descHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).filter(Boolean);
  const bullets = [...descHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1])).filter(Boolean);
  const rows = [...specHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => text(c[1])),
  ).filter((r) => r.some(Boolean));
  const price = (html.match(/woocommerce-Price-amount[^>]*>[\s\S]*?(\d[\d,]*\.?\d*)/) || [])[1] || null;
  out.push({ oldUrl: url, slug: url.split('/').filter(Boolean).pop(), title, short, image, headings, paras, bullets, specs: rows, price });
  process.stdout.write('.');
}
writeFileSync(new URL('products-raw.json', dir), JSON.stringify(out, null, 2));
console.log(`\n${out.length} products`);

// Posts + key pages: plain text only
const pages = [
  ...readFileSync(new URL('urls-post.txt', dir), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean),
  'https://rsksolarenergy.com/about-us/',
  'https://rsksolarenergy.com/',
  'https://rsksolarenergy.com/privacy-policy/',
  ...readFileSync(new URL('urls-project.txt', dir), 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean),
];
const pageOut = [];
for (const url of pages) {
  const html = await (await fetch(url)).text();
  const body = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<header[\s\S]*?<\/header>/, '')
    .replace(/<footer[\s\S]*?<\/footer>/, '');
  const blocks = [...body.matchAll(/<(h[1-6]|p|li|td|time|span class="date[^"]*")[^>]*>([\s\S]*?)<\/(h[1-6]|p|li|td|time|span)>/g)]
    .map((m) => `${m[1].startsWith('h') ? '#'.repeat(+m[1][1]) + ' ' : m[1] === 'li' ? '- ' : ''}${text(m[2])}`)
    .filter((l) => l.replace(/[#\- ]/g, '').length > 0);
  const footer = text((html.match(/<footer[\s\S]*?<\/footer>/) || [''])[0]);
  const links = [...html.matchAll(/href="(https?:\/\/(?!rsksolarenergy\.com)[^"]+)"/g)].map((m) => m[1]);
  pageOut.push({ url, blocks, footer: footer.replace(/\s+/g, ' ').slice(0, 1500), externalLinks: [...new Set(links)] });
}
writeFileSync(new URL('pages-raw.json', dir), JSON.stringify(pageOut, null, 2));
console.log(`${pageOut.length} pages`);
