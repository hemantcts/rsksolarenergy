/**
 * Shared wiring for the /tools/ pages: on submit, compute and show the result; keep the inputs in
 * the URL so a result can be shared or bookmarked; and on load, restore a shared result.
 */
import { applyBars } from '../../lib/tools/render';

export function bindTool(name: string, compute: (data: FormData) => string) {
  const form = document.querySelector<HTMLFormElement>(`form[data-tool="${name}"]`);
  const result = document.querySelector<HTMLElement>(`[data-tool-result="${name}"]`);
  if (!form || !result) return;

  const show = (scroll: boolean) => {
    const data = new FormData(form);
    result.innerHTML = compute(data);
    applyBars(result);
    result.hidden = false;
    const params = new URLSearchParams();
    for (const [k, v] of data) if (typeof v === 'string' && v.trim() !== '') params.append(k, v.trim());
    history.replaceState(null, '', `?${params.toString()}`);
    if (scroll) {
      result.focus({ preventScroll: true });
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    show(true);
  });

  // A shared link: put its values back into the form, then show the result.
  const q = new URLSearchParams(location.search);
  if ([...q.keys()].length) {
    const multi = new Map<string, string[]>();
    for (const [k, v] of q) multi.set(k, [...(multi.get(k) ?? []), v]);
    for (const [k, values] of multi) {
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(`[name="${CSS.escape(k)}"]`).forEach((el) => {
        if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox')) el.checked = values.includes(el.value);
        else el.value = values[0] ?? '';
      });
    }
    show(false);
  }
}

/** A number from a form field, or undefined when blank or invalid. Accepts "1,200". */
export function num(data: FormData, key: string): number | undefined {
  const raw = data.get(key);
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const n = Number(raw.replace(/[,\s₹]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export const str = (data: FormData, key: string) => {
  const v = data.get(key);
  return typeof v === 'string' ? v : '';
};
