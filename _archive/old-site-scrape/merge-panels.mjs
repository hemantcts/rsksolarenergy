import { readFileSync, writeFileSync } from 'node:fs';

const productsPath = 'C:/xampp/htdocs/rsksolarenergy/src/data/products.json';
const existing = JSON.parse(readFileSync(productsPath, 'utf8'));
const newPanels = JSON.parse(readFileSync(new URL('new-panels.json', import.meta.url), 'utf8'));

const existingSlugs = new Set(existing.map((p) => p.slug));
let replaced = 0;
let appended = 0;
const merged = existing.map((p) => {
  const match = newPanels.find((n) => n.slug === p.slug);
  if (match) {
    replaced++;
    return match;
  }
  return p;
});
for (const n of newPanels) {
  if (!existingSlugs.has(n.slug)) {
    merged.push(n);
    appended++;
  }
}

writeFileSync(productsPath, JSON.stringify(merged, null, 2) + '\n');
console.log(`replaced ${replaced}, appended ${appended}, total products now ${merged.length}`);
