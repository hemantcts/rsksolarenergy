/**
 * Header search panel: opens on click or "/", shows results as you type, arrow keys to move,
 * Enter to open the highlighted result or see all of them. Matching is src/lib/search/query.ts.
 */
import { esc, highlight, loadIndex, recentSearches, rememberSearch } from '../lib/search/index-client';
import { GROUP_LABELS, search, snippet, type SearchPage } from '../lib/search/query';

const SUGGESTIONS = ['Solar calculator', 'PM Surya Ghar subsidy', '3 kW price', 'Lithium battery', 'Solar in Ludhiana'];
const MAX = 8;

const box = document.querySelector<HTMLElement>('[data-search-box]');
const toggle = box?.querySelector<HTMLButtonElement>('[data-search-toggle]');
const panel = box?.querySelector<HTMLElement>('[data-search-panel]');
const form = box?.querySelector<HTMLFormElement>('[data-search-form]');
const input = box?.querySelector<HTMLInputElement>('[data-search-input]');
const list = box?.querySelector<HTMLElement>('[data-search-suggest]');
const hint = box?.querySelector<HTMLElement>('[data-search-hint]');
const close = box?.querySelector<HTMLButtonElement>('[data-search-close]');

if (box && toggle && panel && form && input && list && hint) {
  let pages: SearchPage[] = [];
  let active = -1;

  const links = () => [...list.querySelectorAll<HTMLAnchorElement>('a')];

  function setOpen(open: boolean) {
    panel!.hidden = !open;
    toggle!.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('search-open', open);
    if (open) {
      void loadIndex().then((p) => {
        pages = p;
        if (input!.value.trim()) render(input!.value);
      });
      input!.focus();
      if (!input!.value.trim()) renderIdle();
    } else {
      list!.innerHTML = '';
      active = -1;
      toggle!.focus({ preventScroll: true });
    }
  }

  function renderIdle() {
    const recent = recentSearches();
    const rows = recent.length ? recent : SUGGESTIONS;
    list!.innerHTML =
      `<p class="s-head">${recent.length ? 'Recent searches' : 'Popular searches'}</p>` +
      rows.map((r) => `<a href="/search/?q=${encodeURIComponent(r)}" data-fill="${esc(r)}"><span class="s-title">${esc(r)}</span></a>`).join('');
    hint!.textContent = 'Type to search. Press Enter for all results.';
  }

  function render(query: string) {
    const q = query.trim();
    if (!q) {
      renderIdle();
      return;
    }
    if (!pages.length) {
      hint!.textContent = 'Loading the index…';
      return;
    }
    const hits = search(pages, q);
    active = -1;
    if (!hits.length) {
      list!.innerHTML = `<p class="s-head">Nothing found for “${esc(q)}”</p>`;
      hint!.textContent = 'Try fewer words, or a product name, town or system size.';
      return;
    }
    list!.innerHTML =
      hits
        .slice(0, MAX)
        .map(
          (h) => `<a href="${esc(h.page.u)}" role="option">
<span class="s-title">${highlight(h.page.t, h.words)}</span>
<span class="s-text">${highlight(snippet(h.page, h.words, 110), h.words)}</span>
<span class="s-meta">${esc(GROUP_LABELS[h.page.k] ?? 'Page')} · ${esc(h.page.u)}</span></a>`,
        )
        .join('') + `<a href="/search/?q=${encodeURIComponent(q)}" class="s-all">See all ${hits.length} result${hits.length === 1 ? '' : 's'}</a>`;
    hint!.textContent = `${hits.length} result${hits.length === 1 ? '' : 's'}. Use the arrow keys to move.`;
  }

  function move(step: number) {
    const all = links();
    if (!all.length) return;
    all[active]?.classList.remove('is-active');
    active = (active + step + all.length + 1) % (all.length + 1) - 1;
    if (active >= 0) {
      all[active]!.classList.add('is-active');
      all[active]!.scrollIntoView({ block: 'nearest' });
    }
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close?.addEventListener('click', () => setOpen(false));

  let timer: number | undefined;
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => render(input.value), 120);
  });

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      move(ev.key === 'ArrowDown' ? 1 : -1);
    } else if (ev.key === 'Escape') {
      setOpen(false);
    } else if (ev.key === 'Enter') {
      const target = active >= 0 ? links()[active] : null;
      if (target) {
        ev.preventDefault();
        rememberSearch(input.value);
        // A recent-search row fills the box instead of navigating.
        if (target.dataset.fill) {
          input.value = target.dataset.fill;
          render(input.value);
        } else location.assign(target.href);
      }
    }
  });

  form.addEventListener('submit', (ev) => {
    if (!input.value.trim()) {
      ev.preventDefault();
      return;
    }
    rememberSearch(input.value);
  });

  list.addEventListener('click', (ev) => {
    const a = (ev.target as HTMLElement).closest<HTMLAnchorElement>('a');
    if (!a) return;
    rememberSearch(a.dataset.fill ?? input.value);
    if (a.dataset.fill) {
      ev.preventDefault();
      input.value = a.dataset.fill;
      input.focus();
      render(input.value);
    }
  });

  document.addEventListener('click', (ev) => {
    if (!panel.hidden && !box.contains(ev.target as Node)) setOpen(false);
  });

  document.addEventListener('keydown', (ev) => {
    const el = document.activeElement;
    const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
    if (ev.key === '/' && !typing && panel.hidden) {
      ev.preventDefault();
      setOpen(true);
    } else if (ev.key === 'Escape' && !panel.hidden) {
      setOpen(false);
    }
  });
}
