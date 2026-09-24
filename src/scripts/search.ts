/**
 * /search/: the same matching as the header box (src/lib/search/query.ts), with every result,
 * grouped by kind. The index covers every built page, so new pages are searchable straight away.
 */
import { esc, highlight, loadIndex, rememberSearch } from '../lib/search/index-client';
import { groupHits, search, snippet, type SearchPage } from '../lib/search/query';

const PER_GROUP = 40;

const form = document.querySelector<HTMLFormElement>('[data-search-form]');
const input = document.querySelector<HTMLInputElement>('[data-search-input]');
const out = document.querySelector<HTMLElement>('[data-search-results]');
const status = document.querySelector<HTMLElement>('[data-search-status]');

if (form && input && out && status) {
  let pages: SearchPage[] = [];

  function render(query: string) {
    const q = query.trim();
    if (!q) {
      out!.innerHTML = '';
      status!.textContent = '';
      return;
    }
    const hits = search(pages, q);
    if (!hits.length) {
      status!.textContent = `Nothing found for “${q}”.`;
      out!.innerHTML = `<p class="measure">Try fewer words, or search for a product name, a town or a system size, for example “3 kW price”, “subsidy”, “Ludhiana” or “lithium battery”. You can also <a href="/products/" class="underline">browse the products</a>, read the <a href="/blog/" class="underline">guides</a> or <a href="/contact/" class="underline">contact us</a>.</p>`;
      return;
    }
    status!.textContent = `${hits.length} result${hits.length === 1 ? '' : 's'} for “${q}”.`;
    out!.innerHTML = groupHits(hits)
      .map(({ label, hits: rows }) => {
        const shown = rows.slice(0, PER_GROUP);
        return `<section class="search-group"><h2 class="t-h3">${esc(label)} <span class="t-value text-slate">${rows.length}</span></h2>
<ul class="ruled mt-3">${shown
          .map(
            ({ page, words }) => `<li><a href="${esc(page.u)}" class="t-h3 underline decoration-rule underline-offset-4">${highlight(page.t, words)}</a>
<span class="t-small mt-1 block text-slate">${highlight(snippet(page, words), words)}</span>
<span class="t-small mt-1 block text-slate">${esc(page.u)}</span></li>`,
          )
          .join('')}</ul>
${rows.length > shown.length ? `<p class="t-small mt-3 text-slate">Showing the closest ${shown.length}. Add another word to narrow it down.</p>` : ''}</section>`;
      })
      .join('');
  }

  async function run(query: string, remember: boolean) {
    if (!pages.length) {
      status!.textContent = 'Searching…';
      pages = await loadIndex();
      if (!pages.length) {
        status!.textContent = 'The search index could not be loaded. Please reload the page, or use the links below.';
        return;
      }
    }
    render(query);
    if (remember) rememberSearch(query);
    const url = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : location.pathname;
    history.replaceState(null, '', url);
  }

  let timer: number | undefined;
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    void run(input.value, true);
    input.blur();
  });
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void run(input.value, false), 180);
  });

  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    input.value = q;
    void run(q, false);
  } else {
    void loadIndex().then((p) => (pages = p));
  }
}
