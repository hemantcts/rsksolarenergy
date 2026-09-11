import type { Range } from './types';

const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

/** Grouped Indian digits without the symbol: 107000 → "1,07,000". */
export function digits(n: number): string {
  return inrFormatter.format(Math.round(n));
}

/** ₹1,07,000 */
export function inr(n: number, step = 1): string {
  return `₹${digits(roundTo(n, step))}`;
}

/** ₹1,07,000 – 1,20,000. Collapses to one figure when both ends round equal. */
export function inrRange([lo, hi]: Range, step = 1000): string {
  const a = roundTo(lo, step);
  const b = roundTo(hi, step);
  return a === b ? `₹${digits(a)}` : `₹${digits(a)} – ${digits(b)}`;
}

/** ₹11.4 lakh, ₹1.2 crore, or plain rupees under a lakh. */
export function inrWords(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} crore`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} lakh`;
  return inr(n, 100);
}

/** 3.5 – 3.9 years. */
export function yearsRange([lo, hi]: Range): string {
  const a = lo.toFixed(1);
  const b = hi.toFixed(1);
  return a === b ? `${a} years` : `${a} – ${b} years`;
}

export function units(n: number): string {
  return `${digits(n)} units`;
}

export function kw(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1)} kW`;
}
