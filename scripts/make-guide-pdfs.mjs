// Prints every guide in the /solar-guides/ library to an A5 PDF, from the built page in dist/.
// Runs as part of `npm run build`, after astro build. No dependencies: it serves dist/ itself and
// drives the installed Chrome (or Edge) in headless mode. The page's print styles
// (src/styles/library.css) give the PDF its cover, page numbers and layout.
//
// Chrome is found at CHROME_PATH, or the usual install locations on Windows and Linux. GitHub's
// Ubuntu runners have it preinstalled.
import { createServer } from 'node:http';
import { existsSync, readdirSync, readFileSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const LIB = join(DIST, 'solar-guides');

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chrome = CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('No Chrome or Edge found for printing the guide PDFs. Set CHROME_PATH.');
  process.exit(1);
}

const slugs = existsSync(LIB) ? readdirSync(LIB).filter((d) => statSync(join(LIB, d)).isDirectory() && existsSync(join(LIB, d, 'index.html'))) : [];
if (!slugs.length) {
  console.log('No guides in dist/solar-guides/, so no PDFs to print.');
  process.exit(0);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = join(DIST, path);
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const profile = mkdtempSync(join(tmpdir(), 'rsk-pdf-'));
let failed = 0;
try {
  for (const slug of slugs) {
    const out = join(LIB, `${slug}.pdf`);
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profile}`,
      '--no-pdf-header-footer',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=15000',
      `--print-to-pdf=${out}`,
      `http://127.0.0.1:${port}/solar-guides/${slug}/`,
    ];
    if (process.platform === 'linux') args.unshift('--no-sandbox');
    try {
      // Asynchronous, so this process keeps serving the page Chrome is loading.
      await promisify(execFile)(chrome, args, { timeout: 120000 });
    } catch (e) {
      // Chrome can exit non-zero after writing the file; the file check below decides.
      if (process.env.DEBUG_PDF) console.error(String(e.stderr ?? e).slice(0, 1500));
    }
    if (process.env.DEBUG_PDF) console.error('size', existsSync(out) ? statSync(out).size : 'missing');
    const ok = existsSync(out) && statSync(out).size > 20000;
    if (!ok) failed++;
    const pages = ok ? (readFileSync(out, 'latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length : 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${slug}.pdf${ok ? `  ${pages} pages, ${(statSync(out).size / 1024).toFixed(0)} KB` : ''}`);
  }
} finally {
  server.close();
  rmSync(profile, { recursive: true, force: true });
}
if (failed) {
  console.error(`${failed} guide PDF(s) were not printed.`);
  process.exit(1);
}
