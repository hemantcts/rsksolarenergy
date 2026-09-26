// Generates brand images from assets-src/. Run with `npm run og` after changing the logo or OG copy.
// Outputs are committed, so this does not run during the normal build.
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const p = (rel) => new URL(rel, root).pathname.replace(/^\/([A-Za-z]:)/, '$1');

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

// 4. Open Graph image, 1200×630: the round logo supplied by the owner, centred on its own white ground.
const W = 1200;
const H = 630;
const BG = { r: 254, g: 254, b: 254, alpha: 1 };
const circle = await sharp(p('assets-src/og-logo-circle.webp')).trim({ threshold: 10 }).resize({ height: 570 }).png().toBuffer();
const og = await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
  .composite([{ input: circle, gravity: 'center' }])
  .flatten({ background: BG })
  .png({ compressionLevel: 9, palette: true })
  .toBuffer();
writeFileSync(p('public/og-rsk-logo.png'), og);

console.log('logo', meta.width, 'x', meta.height, '| og', (og.length / 1024).toFixed(0), 'KB');
