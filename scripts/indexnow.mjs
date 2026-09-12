// Submits every indexable URL to IndexNow, which tells participating search engines to crawl
// now rather than waiting to rediscover the site on their own schedule.
//
// IMPORTANT: IndexNow is Bing, Yandex, Seznam and Naver. It is NOT Google — Google trialled the
// protocol in 2021 and never adopted it, so this does nothing for Google rankings. Google
// discovery still comes from Search Console + sitemap-index.xml.
//
// Run this AFTER the built site is uploaded, not as part of `npm run build`: IndexNow verifies
// ownership by fetching https://rsksolarenergy.com/<key>.txt, so the key has to be live at the
// moment of submission. Submitting before the upload just earns a 403.
//
// URLs come from the built sitemap rather than from a directory walk, so the two can never
// disagree about what is indexable — the sitemap already excludes the noindex pages (see the
// sitemap filter in astro.config.mjs).
//
// Everything below returns an exit code rather than calling process.exit(): on Windows,
// process.exit() while fetch's socket is still closing trips a libuv assertion and reports a
// bogus exit code.
import { readFileSync, existsSync } from 'node:fs';

const site = 'https://rsksolarenergy.com';
// Issued by Bing Webmaster Tools, so it is already associated with RSK's Bing account.
const KEY = '5784d5d2e08d472c90ea8b5cf645d375';
const distDir = new URL('../dist/', import.meta.url);
const dryRun = process.argv.includes('--dry-run');

const EXPLAIN = {
  200: 'Accepted — the URLs are queued for crawling.',
  202: 'Accepted, key validation still pending. Nothing more to do.',
  400: 'Bad request — the payload was rejected.',
  403: 'Key rejected. The key file is not valid for this host.',
  422: 'URLs do not belong to this host, or the key does not match.',
  429: 'Rate limited — too many submissions. Try again later.',
};

async function main() {
  const keyFile = new URL(`${KEY}.txt`, distDir);
  if (!existsSync(keyFile)) {
    console.error(`Key file missing from the build: dist/${KEY}.txt`);
    console.error(`Expected public/${KEY}.txt to be copied in by \`npm run build\`. Has the key changed?`);
    return 1;
  }
  if (readFileSync(keyFile, 'utf8').trim() !== KEY) {
    console.error(`dist/${KEY}.txt does not contain the key this script submits. Fix one or the other.`);
    return 1;
  }

  const sitemapPath = new URL('sitemap-0.xml', distDir);
  if (!existsSync(sitemapPath)) {
    console.error('dist/sitemap-0.xml not found — run `npm run build` first.');
    return 1;
  }
  const urlList = [...readFileSync(sitemapPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urlList.length === 0) {
    console.error('No URLs found in dist/sitemap-0.xml.');
    return 1;
  }

  console.log(`${urlList.length} URLs from dist/sitemap-0.xml`);

  if (dryRun) {
    console.log('--dry-run: nothing submitted. First three URLs:');
    urlList.slice(0, 3).forEach((u) => console.log('  ' + u));
    return 0;
  }

  // Ownership check before submitting, so a missed upload reads as "the key isn't live yet"
  // rather than as an opaque 403 from the API.
  const keyUrl = `${site}/${KEY}.txt`;
  try {
    const live = await fetch(keyUrl);
    const body = live.ok ? (await live.text()).trim() : '';
    if (body !== KEY) {
      console.error(`Key not live at ${keyUrl} (HTTP ${live.status}).`);
      console.error('Upload the built site first — IndexNow fetches this file to verify ownership.');
      return 1;
    }
  } catch (err) {
    console.error(`Could not reach ${keyUrl}: ${err.message}`);
    return 1;
  }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(site).host, key: KEY, keyLocation: keyUrl, urlList }),
  });

  console.log(`IndexNow responded ${res.status}: ${EXPLAIN[res.status] ?? 'unrecognised status.'}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (text.trim()) console.error(text.trim().slice(0, 400));
    return 1;
  }
  console.log(`Submitted ${urlList.length} URLs to IndexNow (Bing, Yandex, Seznam, Naver — not Google).`);
  return 0;
}

process.exitCode = await main();
