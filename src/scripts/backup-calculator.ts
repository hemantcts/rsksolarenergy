/**
 * Hybrid or off-grid calculator in the browser (the page fixes the mode): steppers, input clean-up, live
 * result after the first calculation, share link and print. Estimate and HTML come from
 * src/lib/backup/, the same code that renders the worked example at build time.
 */
import { estimateBackupFrom } from '../lib/backup/estimate';
import { renderBackupResult } from '../lib/backup/render';

function init(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-bk-form]');
  const result = root.querySelector<HTMLElement>('[data-bk-result]');
  if (!form || !result) return;
  let shown = false;

  const params = () => {
    const out = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === 'string' && v.trim() !== '') out.append(k, v.trim());
    return out;
  };

  /** Never negative, never above the field's max, whole numbers for counts. */
  function clean(input: HTMLInputElement) {
    const raw = input.value.trim();
    if (raw === '') {
      if (input.name.startsWith('q-') || input.name === 'c-qty') input.value = '0';
      return;
    }
    let n = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 0) n = 0;
    const max = Number(input.dataset.max ?? Infinity);
    if (n > max) n = max;
    if (input.name.startsWith('q-') || input.name === 'c-qty') n = Math.round(n);
    input.value = String(n);
  }

  function sync() {
    const offGrid = form!.querySelector<HTMLInputElement>('[name="mode"]')?.value === 'off-grid';
    root.querySelectorAll<HTMLElement>('[data-bk-hybrid-only]').forEach((el) => (el.hidden = offGrid));
    root.querySelectorAll<HTMLElement>('[data-bk-offgrid-only]').forEach((el) => (el.hidden = !offGrid));
  }

  function compute(focus: boolean) {
    const p = params();
    const { input, estimate } = estimateBackupFrom(p);
    const shareUrl = `${location.origin}${location.pathname}?${p.toString()}`;
    result!.innerHTML = renderBackupResult(estimate, input, { interactive: true, shareUrl });
    result!.hidden = false;
    shown = true;
    history.replaceState(null, '', `?${p.toString()}`);
    if (focus) {
      result!.focus({ preventScroll: true });
      result!.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  form.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-bk-inc]');
    const input = btn?.parentElement?.querySelector<HTMLInputElement>('input');
    if (!btn || !input) return;
    input.value = String((Number(input.value) || 0) + Number(btn.dataset.bkInc));
    clean(input);
    if (shown) compute(false);
  });

  form.addEventListener('change', (ev) => {
    const t = ev.target as HTMLInputElement;
    if (t instanceof HTMLInputElement && t.type === 'text') clean(t);
    if (shown) compute(false);
  });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    form.querySelectorAll<HTMLInputElement>('input[type="text"]').forEach(clean);
    compute(true);
  });

  result.addEventListener('click', async (ev) => {
    const t = ev.target as HTMLElement;
    if (t.closest('[data-bk-print]')) window.print();
    else if (t.closest('[data-bk-share]')) {
      const url = `${location.origin}${location.pathname}?${params().toString()}`;
      const out = result.querySelector<HTMLElement>('[data-bk-share-status]');
      try {
        if (navigator.share) await navigator.share({ title: 'My solar estimate', url });
        else {
          await navigator.clipboard.writeText(url);
          if (out) out.textContent = 'Link copied.';
        }
      } catch {
        if (out) out.textContent = url;
      }
    }
  });

  // A shared link fills the form. The page decides the mode, so a mode in the link is ignored.
  const q = new URLSearchParams(location.search);
  const answered = [...q.keys()].some((k) => k !== 'mode');
  if (answered) {
    for (const el of form.elements) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement) || !el.name || el.name === 'mode' || !q.has(el.name)) continue;
      const v = q.get(el.name) ?? '';
      if (el instanceof HTMLInputElement && el.type === 'radio') el.checked = el.value === v;
      else if (el instanceof HTMLSelectElement) {
        if ([...el.options].some((o) => o.value === v)) el.value = v;
      } else {
        el.value = v.slice(0, 40);
        clean(el);
      }
    }
  }
  sync();
  if (answered) compute(false);
}

document.querySelectorAll<HTMLElement>('[data-bk]').forEach(init);
