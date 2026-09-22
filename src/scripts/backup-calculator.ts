/**
 * Hybrid and off-grid calculator in the browser: mode switch, steppers, input clean-up, live
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
  let edited = false;

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
    const offGrid = form!.querySelector<HTMLInputElement>('[name="mode"]:checked')?.value === 'off-grid';
    form!.dataset.mode = offGrid ? 'off-grid' : 'hybrid';
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
    edited = true;
    if (shown) compute(false);
  });

  form.addEventListener('change', (ev) => {
    const t = ev.target as HTMLInputElement;
    if (t.name === 'mode') {
      // Until the visitor changes a quantity, switching mode loads that mode's typical set.
      if (!edited) form.querySelectorAll<HTMLInputElement>('input[data-hybrid]').forEach((i) => (i.value = t.value === 'off-grid' ? i.dataset.offgrid ?? '0' : i.dataset.hybrid ?? '0'));
      sync();
    } else if (t instanceof HTMLInputElement && t.type === 'text') {
      clean(t);
      if (t.name.startsWith('q-')) edited = true;
    }
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

  // A shared link (or ?mode=off-grid from the guides) fills the form. Only real answers compute.
  const q = new URLSearchParams(location.search);
  if (q.get('mode') === 'off-grid' || q.get('mode') === 'hybrid') {
    const radio = form.querySelector<HTMLInputElement>(`[name="mode"][value="${q.get('mode')}"]`);
    if (radio && !radio.checked) {
      radio.checked = true;
      form.querySelectorAll<HTMLInputElement>('input[data-hybrid]').forEach((i) => (i.value = radio.value === 'off-grid' ? i.dataset.offgrid ?? '0' : i.dataset.hybrid ?? '0'));
    }
  }
  const answered = [...q.keys()].some((k) => k !== 'mode');
  if (answered) {
    for (const el of form.elements) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement) || !el.name || !q.has(el.name)) continue;
      const v = q.get(el.name) ?? '';
      if (el instanceof HTMLInputElement && el.type === 'radio') el.checked = el.value === v;
      else if (el instanceof HTMLSelectElement) {
        if ([...el.options].some((o) => o.value === v)) el.value = v;
      } else {
        el.value = v.slice(0, 40);
        clean(el);
      }
    }
    edited = true;
  }
  sync();
  if (answered) compute(false);
}

document.querySelectorAll<HTMLElement>('[data-bk]').forEach(init);
