// Pre-launch checklist. Run after `npm run build` with `npm run launch-check`.
// Two things it checks that are easy to get silently wrong:
//   1. Which config groups (tariffs, pricing, subsidy...) are still unverified by RSK.
//   2. Whether any internal link in the built site points at a page that doesn't exist —
//      catches exactly the class of bug where a page gets removed (e.g. a size page) but a
//      link to it survives somewhere in copy.
// This is a reporting tool, not a build gate — src/lib/launch-guard.ts already fails a
// production build outright while pricing is a placeholder.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { unverifiedGroups } from '../src/config/solar-config.ts';
import { BUSINESS } from '../src/config/business.ts';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
let exitCode = 0;
const section = (title) => console.log(`\n${title}\n${'-'.repeat(title.length)}`);

// 1. Config verification status.
section('Config verification (src/config/solar-config.ts)');
const unverified = unverifiedGroups();
if (unverified.length) {
  console.log(`🔴 Not yet confirmed by RSK: ${unverified.join(', ')}`);
  exitCode = 1;
} else {
  console.log('✅ Every group is RSK-verified.');
}

// 2. Business facts still marked TODO.
section('Business facts (src/config/business.ts)');
const businessTodos = [];
if (!BUSINESS.address.postalCode) businessTodos.push('address.postalCode');
if (!BUSINESS.geo) businessTodos.push('geo (map coordinates)');
if (!BUSINESS.hours) businessTodos.push('hours (opening hours)');
if (businessTodos.length) {
  console.log(`🟠 Not supplied yet: ${businessTodos.join(', ')}`);
} else {
  console.log('✅ No outstanding business facts.');
}

// 3. Broken internal links in the built site.
section('Internal links (dist/)');
if (!existsSync(DIST)) {
  console.log('⚠️  dist/ not found — run `npm run build` first.');
  exitCode = 1;
} else {
  const htmlFiles = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.html')) htmlFiles.push(full);
    }
  };
  walk(DIST);

  const exists = (path) => {
    const clean = path.split('#')[0].split('?')[0];
    if (clean === '/') return existsSync(join(DIST, 'index.html'));
    const noSlash = clean.replace(/\/$/, '');
    return (
      existsSync(join(DIST, `${noSlash}.html`)) ||
      existsSync(join(DIST, noSlash, 'index.html')) ||
      existsSync(join(DIST, noSlash)) // static file in public/ (images, .htaccess, etc.)
    );
  };

  const broken = new Map(); // target -> Set of pages linking to it
  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf8');
    const page = '/' + file.slice(DIST.length).replace(/\\/g, '/').replace(/index\.html$/, '');
    for (const m of html.matchAll(/href="(\/[^"#]*)"/g)) {
      const href = m[1];
      if (href.startsWith('//')) continue; // protocol-relative external
      if (!exists(href)) {
        if (!broken.has(href)) broken.set(href, new Set());
        broken.get(href).add(page);
      }
    }
  }
  if (broken.size) {
    console.log(`🔴 ${broken.size} broken internal link target(s):`);
    for (const [href, pages] of broken) {
      console.log(`   ${href}`);
      for (const p of pages) console.log(`     ← linked from ${p}`);
    }
    exitCode = 1;
  } else {
    console.log(`✅ Checked ${htmlFiles.length} pages, no broken internal links.`);
  }

  // 4. Stray noindex — flag every page carrying it so a human can confirm each is deliberate.
  section('Pages marked noindex');
  const noindexed = htmlFiles
    .filter((f) => readFileSync(f, 'utf8').includes('noindex'))
    .map((f) => '/' + f.slice(DIST.length).replace(/\\/g, '/').replace(/index\.html$/, ''));
  if (noindexed.length) {
    console.log(`ℹ️  ${noindexed.length} page(s) carry noindex — confirm each is intentional:`);
    noindexed.forEach((p) => console.log(`   ${p}`));
  } else {
    console.log('✅ No page is noindexed.');
  }
}

console.log(`\n${exitCode ? '🔴 Launch check found open items — see above.' : '✅ Launch check passed.'}\n`);
process.exit(exitCode);
