import { BUSINESS } from '../config/business';
import { inr, inrRange, kw } from './calculator/format';
import type { CalcResult } from './calculator/types';

/** wa.me deep link with a pre-filled message. */
export function whatsappUrl(message: string, number: string = BUSINESS.whatsapp): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const GENERIC_MESSAGE =
  'Hi RSK, I found you on your website. I would like to discuss rooftop solar. I can send my last electricity bill.';

export function billMessage(): string {
  return 'Hi RSK, I am sending my last electricity bill. Please tell me what size of solar system suits it and the cost after subsidy.';
}

export function sizeMessage(sizeKw: number, type = 'on-grid'): string {
  return `Hi RSK, I would like to ask about a ${sizeKw}kW ${type} solar system. My location is: `;
}

export function productMessage(title: string, model?: string): string {
  return `Hi RSK, I would like the price and availability of: ${title}${model ? ` (model ${model})` : ''}.`;
}

export function topicMessage(topic: string): string {
  return `Hi RSK, I read your page on ${topic}. I would like to discuss my case.`;
}

export function dealerMessage(): string {
  return [
    'Hi RSK, I would like to apply for a UTL Solar dealership.',
    'Business name: ',
    'City / area: ',
    'Current business (electrical shop, installer, other): ',
    'GST number, if registered: ',
  ].join('\n');
}

const TYPE_LABEL = { 'on-grid': 'on-grid', hybrid: 'hybrid', 'off-grid': 'off-grid' } as const;

/** Message carrying the calculator context, per SPEC-calculator §7. */
export function calculatorMessage(
  r: CalcResult,
  input: { kind: 'units' | 'bill'; value: number; periodMonths: number; district?: string },
): string {
  const lines = ['Hi RSK, I used the calculator on your site.'];
  const period = input.periodMonths === 2 ? ' (2-month bill)' : '';
  if (input.kind === 'bill') {
    lines.push(`Bill: ${inr(input.value)}${period}${r.monthlyUnits ? `, about ${Math.round(r.monthlyUnits)} units a month` : ''}`);
  } else {
    lines.push(`Units: ${Math.round(input.value)}${period}`);
  }
  const category = {
    domestic: 'Home',
    commercial: 'Shop / office',
    industrial: 'Industry',
    society: 'Housing society',
    agricultural: 'Agricultural',
  }[r.category];
  lines.push(`Connection: ${category}${r.loadKnown ? `, sanctioned load ${r.loadKw} kW` : ''}`);

  if (r.outcome === 'ok') {
    lines.push(`Recommended: ${kw(r.systemKw)} ${TYPE_LABEL[r.systemType]}`);
    if (r.subsidy.amount > 0) lines.push(`Subsidy: ${inr(r.subsidy.amount)}`);
    lines.push(`Estimated net cost: ${inrRange(r.netCost)}`);
  } else if (r.outcome === 'free-units' || r.outcome === 'bill-below-threshold') {
    lines.push('My usage is around the 300 free units. I would like to know whether solar makes sense for me.');
  }
  if (input.district) lines.push(`Location: ${input.district}`);
  lines.push("I'd like to discuss this.");
  return lines.join('\n');
}
