// Performance budget check (CLAUDE.md §2, hard limits). Run after `npm run build` with
// `npm run budget`. Reporting only — does not fail the build; failures are printed loudly so a
// human decides whether the budget or the feature gives way (CLAUDE.md: "the budget wins").
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LIMITS = {
  homepageJsGzipKb: 100, // "JS shipped to /" — script tags the homepage document itself pulls in
  homepageTotalKb: 800, // total page weight, homepage (HTML + its own JS/CSS; fonts/images are cached, counted separately below for visibility)
};

if (!existsSync(DIST)) {
  console.log('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const gzipKb = (buf) => gzipSync(buf).length / 1024;

const homepageHtml = readFileSync(join(DIST, 'index.html'), 'utf8');
const scriptSrcs = [...homepageHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
const inlineScripts = [...homepageHtml.matchAll(/<script(?:(?!src)[^>])*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter(Boolean);

let jsGzipKb = 0;
for (const src of scriptSrcs) {
  const file = join(DIST, src.replace(/^\//, ''));
  if (existsSync(file)) jsGzipKb += gzipKb(readFileSync(file));
}
for (const code of inlineScripts) jsGzipKb += gzipKb(Buffer.from(code));

// "Total page weight" here: every file the homepage document itself references directly
// (HTML, its CSS, its JS) — not fonts/images, which are cached across visits and not part of
// the CLAUDE.md figure's intent (a first paint's critical-path weight).
const cssSrcs = [...homepageHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
let totalBytes = Buffer.byteLength(homepageHtml);
for (const src of [...scriptSrcs, ...cssSrcs]) {
  const file = join(DIST, src.replace(/^\//, ''));
  if (existsSync(file)) totalBytes += statSync(file).size;
}
const totalKb = totalBytes / 1024;

const allFiles = walk(DIST).filter((f) => statSync(f).isFile());
const bySize = allFiles.map((f) => ({ f: f.slice(DIST.length), kb: statSync(f).size / 1024 })).sort((a, b) => b.kb - a.kb);

console.log('Homepage JS (gzipped):', jsGzipKb.toFixed(1), 'KB', jsGzipKb <= LIMITS.homepageJsGzipKb ? '✅' : `🔴 over ${LIMITS.homepageJsGzipKb} KB`);
console.log('Homepage HTML+CSS+JS (uncompressed):', totalKb.toFixed(1), 'KB', totalKb <= LIMITS.homepageTotalKb ? '✅' : `🔴 over ${LIMITS.homepageTotalKb} KB`);
console.log('\nLargest files in dist/ (top 10, uncompressed):');
for (const { f, kb } of bySize.slice(0, 10)) console.log(' ', kb.toFixed(0).padStart(6), 'KB ', f);

const overBudget = jsGzipKb > LIMITS.homepageJsGzipKb || totalKb > LIMITS.homepageTotalKb;
console.log(overBudget ? '\n🔴 Over budget — see CLAUDE.md §2. The budget wins; cut something.' : '\n✅ Within budget.');
