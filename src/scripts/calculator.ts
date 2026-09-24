import { calculate } from '../lib/calculator/calculate';
import { fromQuery, renderResult, toQuery } from '../lib/calculator/render';
import type { CalcInput, Category, SystemType } from '../lib/calculator/types';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const indian = new Intl.NumberFormat('en-IN');

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[,\s₹]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : Number.NaN;
}

function readForm(form: HTMLFormElement): CalcInput & { district?: string } {
  const f = new FormData(form);
  const kind = f.get('kind') === 'units' ? 'units' : 'bill';
  const period = f.get('period') === '1' ? 1 : 2;
  const category = (f.get('category') as Category | null) ?? 'domestic';
  const value = parseNumber(String(f.get('value') ?? ''));
  const load = parseNumber(String(f.get('load') ?? ''));
  const roof = parseNumber(String(f.get('roof') ?? ''));
  const district = String(f.get('district') ?? '');
  return {
    consumption: { kind, value: value ?? Number.NaN, periodMonths: period },
    category,
    scheme: f.get('scheme') === 'reserved' ? 'reserved' : 'general',
    sanctionedLoadKw: load,
    systemType: ((f.get('type') as SystemType | null) ?? 'on-grid'),
    ownsRoof: f.get('tenant') !== 'on',
    roofAreaSqFt: roof,
    ...(district ? { district } : {}),
  };
}

function writeForm(form: HTMLFormElement, input: CalcInput) {
  const set = (name: string, value: string) => {
    const els = form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
    els.forEach((el) => {
      if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox')) el.checked = el.value === value;
      else el.value = value;
    });
  };
  set('kind', input.consumption.kind);
  set('value', Number.isFinite(input.consumption.value) ? String(input.consumption.value) : '');
  set('period', String(input.consumption.periodMonths));
  set('category', input.category);
  set('scheme', input.scheme ?? 'general');
  set('type', input.systemType ?? 'on-grid');
  set('load', input.sanctionedLoadKw ? String(input.sanctionedLoadKw) : '');
  set('roof', input.roofAreaSqFt ? String(input.roofAreaSqFt) : '');
  const tenant = form.querySelector<HTMLInputElement>('[name="tenant"]');
  if (tenant) tenant.checked = input.ownsRoof === false;
  syncForm(form);
}

/** Label, prefix and visible fields follow the current choices. */
function syncForm(form: HTMLFormElement) {
  const kind = (form.querySelector<HTMLInputElement>('[name="kind"]:checked')?.value ?? 'bill') as 'bill' | 'units';
  const category = form.querySelector<HTMLSelectElement>('[name="category"]')?.value ?? 'domestic';
  form.dataset.kind = kind;
  const label = form.querySelector<HTMLElement>('[data-value-label]');
  if (label) label.textContent = kind === 'bill' ? label.dataset.billLabel ?? '' : label.dataset.unitsLabel ?? '';
  form.querySelectorAll<HTMLElement>('[data-domestic-only]').forEach((el) => (el.hidden = category !== 'domestic'));

  // Sanctioned load is required everywhere except agricultural (Punjab farm connections are
  // free, so it's never used for that category — see calculate.ts's validate()).
  form.querySelectorAll<HTMLElement>('[data-needs-load]').forEach((el) => {
    const needsLoad = category !== 'agricultural';
    el.hidden = !needsLoad;
    const input = el.querySelector<HTMLInputElement>('input');
    if (input) input.required = needsLoad;
  });
}

/** Count-up on figures (MOTION.md §3.1): under 1s, digits only, width locked, final value for screen readers. */
function countUp(root: HTMLElement) {
  if (reducedMotion()) return;
  const els = [...root.querySelectorAll<HTMLElement>('[data-final]')];
  if (!els.length) return;
  const jobs = els.map((el) => {
    const final = el.dataset.final ?? '';
    const tokens = final.split(/(\d[\d,]*)/);
    const targets = tokens.map((t, i) => (i % 2 ? Number(t.replace(/,/g, '')) : 0));
    // Width is reserved with a hidden clone of the final text stacked in the same grid cell —
    // classes only, no direct .style writes, so this holds under a strict style-src CSP with
    // no 'unsafe-inline' (see astro.config.mjs). The clone's natural layout width pins the
    // container so digits growing from 0 to the final value never reflow neighbouring text.
    el.classList.add('calc-figure');
    const ghost = document.createElement('span');
    ghost.className = 'calc-figure-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.textContent = final;
    const counter = document.createElement('span');
    counter.setAttribute('aria-hidden', 'true');
    el.textContent = '';
    el.append(ghost, counter);
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = final;
    el.after(sr);
    return { el, counter, tokens, targets, sr };
  });
  const duration = 900;
  const start = performance.now();
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const p = 1 - (1 - t) * (1 - t); // power2.out
    for (const j of jobs) {
      j.counter.textContent = j.tokens.map((tok, i) => (i % 2 ? indian.format(Math.round((j.targets[i] ?? 0) * p)) : tok)).join('');
    }
    if (t < 1) requestAnimationFrame(frame);
    else
      for (const j of jobs) {
        j.el.textContent = j.el.dataset.final ?? '';
        j.el.classList.remove('calc-figure');
        j.sr.remove();
      }
  };
  requestAnimationFrame(frame);
}

function show(form: HTMLFormElement, output: HTMLElement, input: CalcInput & { district?: string }, opts: { animate: boolean; scroll: boolean }) {
  const variant = (form.dataset.variant as 'hero' | 'full') ?? 'full';
  const result = calculate(input);
  const valueInput = form.querySelector<HTMLInputElement>('[name="value"]');
  valueInput?.setAttribute('aria-invalid', String(result.outcome === 'invalid'));

  output.innerHTML = renderResult(result, input, {
    variant,
    shareQuery: toQuery(input),
    page: location.pathname,
    animate: opts.animate && result.outcome === 'ok',
    ...(input.district ? { district: input.district } : {}),
  });
  output.hidden = false;
  const caption = document.querySelector<HTMLElement>(`[data-result-caption="${output.id}"]`);
  if (caption) caption.textContent = caption.dataset.yours ?? '';

  if (result.outcome === 'invalid') {
    valueInput?.focus();
    return;
  }
  if (variant === 'full') history.replaceState(null, '', `?${toQuery(input)}`);

  if (opts.animate && !reducedMotion()) {
    output.classList.remove('calc-enter');
    void output.offsetWidth;
    output.classList.add('calc-enter');
  }
  if (opts.scroll) {
    const top = output.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.6 || top < 0) output.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    output.focus({ preventScroll: true });
  }
  countUp(output);
}

async function share(url: string, button: HTMLButtonElement) {
  const full = new URL(url, location.origin).toString();
  try {
    if (navigator.share) {
      await navigator.share({ title: 'My solar estimate', url: full });
      return;
    }
    await navigator.clipboard.writeText(full);
    const label = button.textContent;
    button.textContent = 'Link copied';
    setTimeout(() => (button.textContent = label), 2000);
  } catch {
    /* user cancelled the share sheet */
  }
}

function init(form: HTMLFormElement) {
  const output = document.getElementById(form.dataset.output ?? '');
  if (!output) return;
  let periodTouched = false;

  form.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.name === 'period') periodTouched = true;
    if (target.name === 'category' && !periodTouched) {
      // PSPCL home bills usually cover two months; business bills often one.
      const want = target.value === 'domestic' ? '2' : '1';
      form.querySelectorAll<HTMLInputElement>('[name="period"]').forEach((r) => (r.checked = r.value === want));
    }
    syncForm(form);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    show(form, output, readForm(form), { animate: true, scroll: true });
  });

  output.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-share]');
    if (btn) share(btn.dataset.share ?? '', btn);
  });

  syncForm(form);

  if (form.dataset.variant === 'full') {
    const fromUrl = fromQuery(location.search);
    if (fromUrl) {
      writeForm(form, fromUrl);
      show(form, output, fromUrl, { animate: false, scroll: false });
    }
  }
}

document.querySelectorAll<HTMLFormElement>('form[data-calculator]').forEach(init);
