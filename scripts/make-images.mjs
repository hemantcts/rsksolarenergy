// Generates brand images from assets-src/. Run with `npm run og` after changing the logo or OG copy.
// Outputs are committed, so this does not run during the normal build.
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const p = (rel) => new URL(rel, root).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const INK = '#0D1B2A';
const RULE = '#C9D3D8';
const FONTS = {
  condensed: p('assets-src/fonts-ttf/IBMPlexSansCondensed-SemiBold.ttf'),
  sans: p('assets-src/fonts-ttf/IBMPlexSans-Regular.ttf'),
  sansMedium: p('assets-src/fonts-ttf/IBMPlexSans-Medium.ttf'),
};

mkdirSync(p('src/assets/brand'), { recursive: true });
mkdirSync(p('public'), { recursive: true });

// 1. Logo, trimmed to its visible bounds.
const logo = await sharp(p('assets-src/logo-source.png')).trim({ threshold: 1 }).png().toBuffer();
await sharp(logo).toFile(p('src/assets/brand/logo.png'));
const meta = await sharp(logo).metadata();

// 2. Light logo for ink surfaces: near-black pixels become white, the green mark is kept.
const { data, info } = await sharp(logo).raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += info.channels) {
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 110 && max - min < 40) {
    data[i] = data[i + 1] = data[i + 2] = 255;
  }
}
const logoLight = await sharp(data, { raw: info }).png().toBuffer();
await sharp(logoLight).toFile(p('src/assets/brand/logo-light.png'));

// 3. Favicons from the circular mark at the left of the logo.
const markWidth = Math.round(meta.height * 1.02);
const mark = await sharp(logo).extract({ left: 0, top: 0, width: markWidth, height: meta.height }).trim({ threshold: 1 }).toBuffer();
const square = async (size, bg) =>
  sharp({ create: { width: size, height: size, channels: 4, background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(mark).resize(Math.round(size * 0.86), Math.round(size * 0.86), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(), gravity: 'center' }])
    .png()
    .toBuffer();
const fav32 = await square(32);
writeFileSync(p('public/favicon-32.png'), fav32);
writeFileSync(p('public/icon-192.png'), await square(192, '#FFFFFF'));
writeFileSync(p('public/icon-512.png'), await square(512, '#FFFFFF'));
writeFileSync(p('public/apple-touch-icon.png'), await square(180, '#FFFFFF'));
// favicon.ico: a single PNG wrapped in an ICO container (supported by every current browser).
const ico = Buffer.alloc(22);
ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
ico.writeUInt8(32, 6); ico.writeUInt8(32, 7); ico.writeUInt8(0, 8); ico.writeUInt8(0, 9);
ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); ico.writeUInt32LE(fav32.length, 14); ico.writeUInt32LE(22, 18);
writeFileSync(p('public/favicon.ico'), Buffer.concat([ico, fav32]));

// 4. Open Graph image, 1200×630: ink ground, the panel-cell grid, Plex type.
const W = 1200;
const H = 630;
const cell = 75;
let lines = '';
for (let x = cell * 8; x <= W; x += cell) lines += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
for (let y = 0; y <= H; y += cell) lines += `<line x1="${cell * 8}" y1="${y}" x2="${W}" y2="${y}"/>`;
const grid = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><g stroke="${RULE}" stroke-opacity="0.22" stroke-width="1">${lines}</g><line x1="72" y1="468" x2="${cell * 8 - 40}" y2="468" stroke="${RULE}" stroke-opacity="0.5"/></svg>`,
);
const text = (markup, font, fontfile, width, dpi) =>
  sharp({ text: { text: markup, font, fontfile, width, rgba: true, dpi, wrap: 'word' } }).png().toBuffer();

const headline = await text(
  `<span foreground="#FFFFFF" letter_spacing="-800">Rooftop solar in Mohali and Punjab, priced after subsidy</span>`,
  'IBM Plex Sans Condensed SemiBold',
  FONTS.condensed,
  520,
  300,
);
const sub = await text(
  `<span foreground="${RULE}">UTL Solar distributor, Phase 8-B Mohali. Free subsidy and savings calculator.</span>`,
  'IBM Plex Sans',
  FONTS.sans,
  500,
  110,
);
const url = await text(`<span foreground="#FFFFFF">rsksolarenergy.com</span>`, 'IBM Plex Sans Medium', FONTS.sansMedium, 500, 110);
const ogLogo = await sharp(logoLight).resize({ height: 44 }).toBuffer();

const og = await sharp({ create: { width: W, height: H, channels: 4, background: INK } })
  .composite([
    { input: grid, top: 0, left: 0 },
    { input: ogLogo, top: 64, left: 72 },
    { input: headline, top: 150, left: 72 },
    { input: sub, top: 492, left: 72 },
    { input: url, top: 552, left: 72 },
  ])
  .png({ compressionLevel: 9, palette: true })
  .toBuffer();
writeFileSync(p('public/og-default.png'), og);

console.log('logo', meta.width, 'x', meta.height, '| og', (og.length / 1024).toFixed(0), 'KB');
