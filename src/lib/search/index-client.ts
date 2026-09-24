/** Loads the search index once per page and hands the same promise to every caller. */
import type { SearchPage } from './query';

let pending: Promise<SearchPage[]> | null = null;

export function loadIndex(): Promise<SearchPage[]> {
  pending ??= fetch('/search-index.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((data: { pages: SearchPage[] }) => data.pages ?? [])
    .catch(() => {
      pending = null;
      return [];
    });
  return pending;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Escapes the text, then marks the words that matched. */
export function highlight(text: string, words: string[]): string {
  let html = esc(text);
  for (const w of [...new Set(words)].filter((w) => w.length > 1).sort((a, b) => b.length - a.length)) {
    html = html.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  }
  return html;
}

export { esc };

/** The last few searches, so the panel has something useful to show before typing. */
const KEY = 'rsk-recent-searches';

export function recentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(q: string) {
  const query = q.trim();
  if (query.length < 2) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([query, ...recentSearches().filter((r) => r.toLowerCase() !== query.toLowerCase())].slice(0, 5)));
  } catch {
    /* private mode: recent searches just aren't kept */
  }
}
