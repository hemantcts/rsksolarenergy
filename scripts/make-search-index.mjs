/**
 * Builds dist/search-index.json from the pages that were actually built, so a new page is
 * searchable as soon as it exists. No page list to maintain.
 *
 * Runs after `astro build` (see package.json). Pages marked noindex (the 404 page, /search/ and
 * the unfinished awards page) are skipped, so the site search shows only pages visitors can reach.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
/** Characters of body text kept per page. Enough to match a phrase, small enough to stay light. */
const BODY_CHARS = 420;

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name === 'index.html') files.push(p);
  }
})(DIST);

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/g, ' ');

const clean = (s) => decode(s).replace(/\s+/g, ' ').trim();

/** Which part of the site a page belongs to, from its URL. Used for the result groups. */
function kindOf(path) {
  if (/^\/products\/[^/]+\/$/.test(path)) return 'product';
  if (path === '/products/') return 'page';
  if (/^\/solar-company-[^/]+\/$/.test(path)) return 'place';
  if (/^\/\d+kw-solar-system-price-punjab\/$/.test(path)) return 'price';
  if (/^\/blog\//.test(path)) return 'guide';
  if (/-solar-calculator\/$|^\/solar-calculator\/$/.test(path)) return 'tool';
  return 'page';
}

const entries = [];
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) continue;
  const path = '/' + relative(DIST, file).split(sep).join('/').replace(/index\.html$/, '');

  const rawTitle = clean((html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? '');
  // Results show the first part of the title; the SEO suffix after "|" still matches, through `h`.
  const [title, ...suffix] = rawTitle.split(/\s*\|\s*/);
  const description = clean((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] ?? '');

  // Body: drop the shared header, footer, scripts and styles so every page doesn't match the menu.
  const body = html
    .replace(/[\s\S]*?<\/header>/, '')
    .replace(/<footer[\s\S]*$/, '')
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>/g, ' ');
  const headings = [...body.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)].map((m) => clean(m[1].replace(/<[^>]+>/g, ' '))).filter(Boolean);
  const text = clean(body.replace(/<[^>]+>/g, ' ')).slice(0, BODY_CHARS);

  if (!title) continue;
  entries.push({ u: path, t: title, d: description, h: [...new Set([...suffix, ...headings])].slice(0, 12).join(' · '), b: text, k: kindOf(path) });
}

entries.sort((a, b) => a.u.localeCompare(b.u));
const out = join(DIST, 'search-index.json');
writeFileSync(out, JSON.stringify({ built: new Date().toISOString().slice(0, 10), pages: entries }));
const kb = Math.round(statSync(out).size / 1024);
console.log(`search-index.json written: ${entries.length} pages, ${kb} KB`);
