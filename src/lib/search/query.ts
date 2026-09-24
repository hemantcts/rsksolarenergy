/**
 * Site search matching. Pure functions, no DOM, so the header box and /search/ behave identically
 * and the rules can be tested.
 *
 * The index itself is built from the pages that were actually built
 * (scripts/make-search-index.mjs), so a new page is searchable with no list to update here.
 */

export interface SearchPage {
  /** URL path */
  u: string;
  /** Title, without the brand suffix */
  t: string;
  /** Meta description */
  d: string;
  /** Headings, joined */
  h: string;
  /** First few hundred characters of the page text */
  b: string;
  /** product | place | price | guide | tool | page */
  k: string;
}

export interface Hit {
  page: SearchPage;
  score: number;
  /** The words that actually matched, for highlighting. */
  words: string[];
}

export const GROUP_LABELS: Record<string, string> = {
  tool: 'Calculators',
  page: 'Pages',
  guide: 'Guides and blog',
  price: 'System prices',
  place: 'Places we serve',
  product: 'Products',
};
export const GROUP_ORDER = ['tool', 'page', 'price', 'guide', 'place', 'product'];

/**
 * Words customers use for the same thing. Each line maps one typed word to the words that should
 * also count as a match, so "pcu" finds inverters and "kimat" finds prices.
 */
const SYNONYMS: Record<string, string[]> = {
  pcu: ['inverter'],
  inverter: ['pcu'],
  module: ['panel'],
  panel: ['module'],
  panels: ['module'],
  cell: ['panel'],
  price: ['cost', 'rate', 'kimat', 'quotation'],
  cost: ['price'],
  rate: ['price'],
  kimat: ['price'],
  quote: ['quotation', 'price'],
  subsidy: ['yojana', 'surya', 'ghar', 'scheme'],
  yojana: ['subsidy'],
  scheme: ['subsidy'],
  loan: ['finance', 'financing', 'emi'],
  emi: ['loan'],
  finance: ['loan'],
  battery: ['batteries', 'storage'],
  batteries: ['battery'],
  lithium: ['lifepo4'],
  lifepo4: ['lithium'],
  offgrid: ['off', 'grid'],
  ongrid: ['on', 'grid'],
  ac: ['air', 'conditioner'],
  geyser: ['water', 'heater'],
  pump: ['tubewell', 'borewell', 'motor'],
  tubewell: ['pump'],
  borewell: ['pump'],
  motor: ['pump'],
  netmetering: ['net', 'metering'],
  bijli: ['electricity', 'bill'],
  bill: ['electricity'],
  dealer: ['distributor', 'supplier'],
  distributor: ['dealer'],
  installer: ['installation', 'company'],
  charger: ['charging'],
  ev: ['electric', 'vehicle', 'rickshaw'],
  roof: ['rooftop'],
  rooftop: ['roof'],
  home: ['house', 'domestic', 'residential'],
  house: ['home'],
  shop: ['commercial', 'business'],
  factory: ['industrial', 'industry'],
  society: ['rwa', 'housing'],
  kw: ['kilowatt'],
  kva: ['kw'],
  contact: ['phone', 'address', 'number', 'call', 'whatsapp'],
  address: ['contact', 'office', 'directions'],
  phone: ['contact', 'call', 'number'],
  number: ['phone', 'contact'],
  call: ['phone', 'contact'],
  whatsapp: ['contact', 'phone'],
  review: ['reviews', 'rating'],
  job: ['career', 'careers', 'vacancy'],
  warranty: ['guarantee'],
};

/** Words too common on this site to narrow anything down. */
const STOP = new Set(['solar', 'the', 'a', 'an', 'of', 'for', 'in', 'to', 'is', 'and', 'my', 'me', 'i', 'do', 'you', 'what', 'how', 'much', 'can', 'with', 'please', 'need', 'want']);

export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * "3kw price" → ["3", "kw", "price"]. Numbers stuck to units are split, so "3kw", "3 kw" and
 * "3-kw" all behave the same.
 */
export function tokenise(q: string): string[] {
  return normalise(q)
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .split(' ')
    .filter(Boolean);
}

/** One edit apart (a typo), for words long enough that a typo is likelier than a different word. */
export function isTypo(a: string, b: string): boolean {
  if (a === b) return false;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  // Two letters the wrong way round ("lithuim" for "lithium").
  if (a.length === b.length) {
    const diff = [...a].map((c, i) => (c === b[i] ? -1 : i)).filter((i) => i >= 0);
    if (diff.length === 2 && diff[1] === diff[0]! + 1 && a[diff[0]!] === b[diff[1]!] && a[diff[1]!] === b[diff[0]!]) return true;
  }
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

interface Field {
  text: string;
  weight: number;
}

function fields(p: SearchPage): Field[] {
  return [
    { text: normalise(p.t), weight: 30 },
    { text: normalise(p.h), weight: 10 },
    { text: normalise(p.d), weight: 7 },
    { text: normalise(p.b), weight: 3 },
    { text: normalise(p.u.replace(/[-/]/g, ' ')), weight: 12 },
  ];
}

/** Does `text` contain a word starting with `word`, or a near-miss of it? */
function match(text: string, word: string): 'exact' | 'typo' | null {
  if (new RegExp(`\\b${word}`).test(text)) return 'exact';
  for (const t of text.split(' ')) if (isTypo(t, word)) return 'typo';
  return null;
}

export interface SearchOptions {
  limit?: number;
  /** Pages of this kind score lower, so a guide beats a product that merely mentions the words. */
  demote?: string[];
}

export function search(pages: SearchPage[], query: string, options: SearchOptions = {}): Hit[] {
  const words = tokenise(query);
  if (!words.length) return [];
  const phrase = words.join(' ');
  const meaningful = words.filter((w) => !STOP.has(w));
  const required = meaningful.length ? meaningful : words;
  const demote = new Set(options.demote ?? ['product']);

  const hits: Hit[] = [];
  for (const page of pages) {
    const fs = fields(page);
    let score = 0;
    const matched: string[] = [];
    let missing = false;

    for (const word of required) {
      const alternatives = [word, ...(SYNONYMS[word] ?? [])];
      // Add up every field the word appears in, so a page with it in the title, the URL and the
      // text beats one that only mentions it once.
      let total = 0;
      let bestWord = '';
      let bestValue = 0;
      for (const alt of alternatives) {
        for (const f of fs) {
          const kind = match(f.text, alt);
          if (!kind) continue;
          const value = f.weight * (kind === 'typo' ? 0.5 : 1) * (alt === word ? 1 : 0.6);
          total += value;
          if (value > bestValue) {
            bestValue = value;
            bestWord = alt;
          }
        }
      }
      if (!total) {
        missing = true;
        break;
      }
      score += total;
      matched.push(bestWord);
    }
    if (missing) continue;

    // Whole phrase in the title or a heading beats the same words scattered about.
    const title = fs[0]!.text;
    if (title === phrase) score += 200;
    else if (title.includes(phrase)) score += 80;
    else if (fs[1]!.text.includes(phrase) || fs[2]!.text.includes(phrase)) score += 20;

    if (!demote.has(page.k)) score += 8;
    // Shallower URLs are the main pages on a topic.
    score += Math.max(0, 9 - page.u.split('/').filter(Boolean).length * 3);
    hits.push({ page, score, words: [...new Set([...matched, ...required])] });
  }

  hits.sort((a, b) => b.score - a.score || a.page.t.length - b.page.t.length || a.page.t.localeCompare(b.page.t));
  return options.limit ? hits.slice(0, options.limit) : hits;
}

/** Results grouped for display, in a fixed order. */
export function groupHits(hits: Hit[]): { kind: string; label: string; hits: Hit[] }[] {
  const byKind = new Map<string, Hit[]>();
  for (const hit of hits) byKind.set(hit.page.k, [...(byKind.get(hit.page.k) ?? []), hit]);
  return GROUP_ORDER.filter((k) => byKind.has(k)).map((k) => ({ kind: k, label: GROUP_LABELS[k] ?? 'Pages', hits: byKind.get(k)! }));
}

/** A short piece of the page around the first matching word. */
export function snippet(page: SearchPage, words: string[], length = 170): string {
  const source = page.d || page.b;
  if (!source) return '';
  const lower = source.toLowerCase();
  const at = words.map((w) => lower.indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = at > Math.floor(length / 2) ? Math.max(0, lower.lastIndexOf(' ', at - Math.floor(length / 3)) + 1) : 0;
  const text = source.slice(start, start + length).trim();
  return (start > 0 ? '…' : '') + text + (source.length > start + length ? '…' : '');
}
