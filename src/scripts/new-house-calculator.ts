/**
 * New-house calculator in the browser: one step at a time, steppers, input clean-up, back button,
 * refresh-safe answers, share and print. The estimate and its HTML come from src/lib/appliance/,
 * the same code that renders the worked example at build time.
 */
import { estimateFrom } from '../lib/appliance/estimate';
import { renderHouseResult } from '../lib/appliance/render';

const STORE_KEY = 'nh-answers';
const store = {
  get(): string | null {
    try {
      return sessionStorage.getItem(STORE_KEY);
    } catch {
      return null;
    }
  },
  set(v: string) {
    try {
      sessionStorage.setItem(STORE_KEY, v);
    } catch {
      /* private mode: answers just won't survive a refresh */
    }
  },
};

function init(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-nh-form]');
  const result = root.querySelector<HTMLElement>('[data-nh-result]');
  const progress = root.querySelector<HTMLElement>('[data-nh-progress]');
  const status = root.querySelector<HTMLElement>('[data-nh-status]');
  if (!form || !result || !progress || !status) return;
  const steps = [...form.querySelectorAll<HTMLFieldSetElement>('[data-nh-step]')];
  const back = form.querySelector<HTMLButtonElement>('[data-nh-back]')!;
  const next = form.querySelector<HTMLButtonElement>('[data-nh-next]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-nh-submit]')!;
  const RESULT = steps.length;
  let current = 0;

  // The pre-filled form is the "default" state: the share link only carries what differs from it,
  // and the parser falls back to the same defaults (both come from APPLIANCE_CONFIG).
  const defaults = new URLSearchParams(new FormData(form) as unknown as Record<string, string>);

  form.classList.add('is-stepped');
  progress.hidden = false;
  status.hidden = false;

  // ---------------------------------------------------------------- inputs

  /** Clean one numeric input in place: never negative, never above its max, whole numbers where required. */
  function clean(input: HTMLInputElement): string | null {
    const min = Number(input.dataset.min ?? 0);
    const max = Number(input.dataset.max ?? Infinity);
    const raw = input.value.trim();
    input.removeAttribute('aria-invalid');
    if (raw === '') {
      // An empty count means none; an empty optional figure (EV, watts) stays empty.
      if (input.hasAttribute('data-int') && input.name !== 'people') input.value = '0';
      return null;
    }
    let n = Number(raw.replace(/,/g, ''));
    const labelledBy = input.getAttribute('aria-labelledby');
    const label =
      input.getAttribute('aria-label') ??
      (labelledBy ? document.getElementById(labelledBy)?.firstChild?.textContent : null) ??
      input.labels?.[0]?.textContent ??
      'That value';
    if (!Number.isFinite(n)) {
      input.value = input.hasAttribute('data-int') ? String(min) : '';
      input.setAttribute('aria-invalid', 'true');
      return `${label.trim()}: please enter a number.`;
    }
    if (input.hasAttribute('data-int')) n = Math.round(n);
    let msg: string | null = null;
    if (n < min) {
      n = min;
      msg = `${label.trim()} can’t be below ${min}.`;
    } else if (n > max) {
      n = max;
      msg = `${label.trim()} is capped at ${max}.`;
    }
    input.value = String(n);
    return msg;
  }

  form.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-nh-inc]');
    if (!btn) return;
    const input = btn.parentElement?.querySelector<HTMLInputElement>('input');
    if (!input) return;
    const n = Number(input.value) || 0;
    input.value = String(n + Number(btn.dataset.nhInc));
    const msg = clean(input);
    if (msg) say(msg);
    save();
  });

  form.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t instanceof HTMLInputElement && t.hasAttribute('data-min')) {
      const msg = clean(t);
      if (msg) say(msg);
    }
    syncEv();
    save();
  });

  // Enter moves to the next step instead of submitting half a form.
  form.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target instanceof HTMLInputElement && current < RESULT - 1) {
      ev.preventDefault();
      go(current + 1);
    }
  });

  const evSelect = form.querySelector<HTMLSelectElement>('[data-nh-ev]');
  function syncEv() {
    const on = evSelect?.value !== 'none';
    form!.querySelectorAll<HTMLElement>('[data-nh-ev-only]').forEach((el) => (el.hidden = !on));
  }

  function say(msg: string) {
    status!.textContent = msg;
  }

  // ---------------------------------------------------------------- state

  function params(): URLSearchParams {
    const all = new URLSearchParams(new FormData(form!) as unknown as Record<string, string>);
    const out = new URLSearchParams();
    for (const [k, v] of all) if (k === 'future' || defaults.get(k) !== v) out.append(k, v);
    return out;
  }

  function save() {
    const p = params();
    p.set('_step', String(current));
    store.set(p.toString());
  }

  /** Put saved or shared answers back into the form. */
  function restore(p: URLSearchParams) {
    for (const el of form!.elements) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement) || !el.name) continue;
      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        el.checked = p.getAll(el.name).includes(el.value);
      } else if (p.has(el.name)) {
        const v = p.get(el.name) ?? '';
        if (el instanceof HTMLSelectElement && ![...el.options].some((o) => o.value === v)) continue;
        el.value = v.slice(0, 40);
        if (el instanceof HTMLInputElement && el.hasAttribute('data-min')) clean(el);
      }
    }
    syncEv();
  }

  // ---------------------------------------------------------------- steps

  function show(step: number, focus: boolean) {
    current = Math.max(0, Math.min(step, RESULT));
    steps.forEach((s, i) => s.classList.toggle('is-current', i === current));
    const onResult = current === RESULT;
    form!.hidden = onResult;
    result!.hidden = !onResult;
    back.hidden = current === 0;
    next.hidden = current >= RESULT - 1;
    submit.hidden = current !== RESULT - 1;
    progress!.querySelectorAll<HTMLElement>('[data-nh-dot]').forEach((d) => {
      const i = Number(d.dataset.nhDot);
      d.classList.toggle('is-done', i < current);
      if (i === current) d.setAttribute('aria-current', 'step');
      else d.removeAttribute('aria-current');
    });
    if (!onResult) say(`Step ${current + 1} of ${RESULT + 1}`);
    if (onResult) compute();
    if (focus) {
      const target = onResult ? result! : steps[current]?.querySelector<HTMLElement>('.nh-step-title');
      target?.focus({ preventScroll: true });
      const top = root.getBoundingClientRect().top + window.scrollY - 96;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
    }
  }

  function go(step: number) {
    // Tidy every number in the step being left, so nothing odd is carried forward.
    const msgs = [...(steps[current]?.querySelectorAll<HTMLInputElement>('input[data-min]') ?? [])].map(clean).filter(Boolean);
    show(step, true);
    if (msgs.length) say(msgs.join(' '));
    save();
    history.pushState({ nhStep: current }, '', step === RESULT ? `?${params().toString()}#result` : location.pathname);
  }

  function compute() {
    const p = params();
    const { input, estimate } = estimateFrom(new URLSearchParams(new FormData(form!) as unknown as Record<string, string>));
    const shareUrl = `${location.origin}${location.pathname}?${p.toString()}`;
    result!.innerHTML = renderHouseResult(estimate, input, { interactive: true, shareUrl });
    result!.classList.remove('calc-enter');
    void result!.offsetWidth;
    result!.classList.add('calc-enter');
    say('Your estimate is ready.');
  }

  back.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    go(RESULT);
  });
  progress.addEventListener('click', (ev) => {
    const dot = (ev.target as HTMLElement).closest<HTMLElement>('[data-nh-dot]');
    if (dot && dot.classList.contains('is-done')) go(Number(dot.dataset.nhDot));
  });

  window.addEventListener('popstate', (ev) => {
    const step = typeof ev.state?.nhStep === 'number' ? ev.state.nhStep : 0;
    show(step, true);
    save();
  });

  result.addEventListener('click', async (ev) => {
    const t = ev.target as HTMLElement;
    if (t.closest('[data-nh-edit]')) go(0);
    else if (t.closest('[data-nh-print]')) window.print();
    else if (t.closest('[data-nh-share]')) {
      const url = `${location.origin}${location.pathname}?${params().toString()}`;
      const out = result!.querySelector<HTMLElement>('[data-nh-share-status]');
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

  // ---------------------------------------------------------------- start

  const shared = new URLSearchParams(location.search);
  const saved = store.get();
  if ([...shared.keys()].length) {
    restore(shared);
    history.replaceState({ nhStep: RESULT }, '', location.href);
    show(RESULT, false);
  } else if (saved) {
    const p = new URLSearchParams(saved);
    restore(p);
    const step = Math.max(0, Math.min(Number(p.get('_step')) || 0, RESULT - 1));
    history.replaceState({ nhStep: step }, '', location.pathname);
    show(step, false);
  } else {
    history.replaceState({ nhStep: 0 }, '', location.pathname + location.hash);
    syncEv();
    show(0, false);
  }
}

document.querySelectorAll<HTMLElement>('[data-nh]').forEach(init);
