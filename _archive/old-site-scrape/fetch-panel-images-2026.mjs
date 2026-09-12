// One-off: download real product images for the 2026 solar-panel catalogue recheck.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dir = new URL('.', import.meta.url);
const products = JSON.parse(readFileSync('C:/Users/hp/AppData/Local/Temp/claude/C--xampp-htdocs-rsksolarenergy/bdfaabf0-c719-4609-9e8b-36b5d863df42/scratchpad/new-panels.json', 'utf8'));
const outDir = fileURLToPath(new URL('../../src/assets/products/', dir));

for (const p of products) {
  try {
    const res = await fetch(p.oldImage, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf)
      .resize(600, 600, { fit: 'contain', background: '#ffffff' })
      .flatten({ background: '#ffffff' })
      .webp({ quality: 82 })
      .toFile(`${outDir}${p.slug}.webp`);
    console.log('ok', p.slug);
  } catch (e) {
    console.log('FAIL', p.slug, e.message);
  }
}
