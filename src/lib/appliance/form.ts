/** Server-side markup for one listed appliance row in the new-house calculator form. */
import { APPLIANCE_CONFIG, type ApplianceConfig, type ApplianceDef } from '../../config/appliance-config';

const amountLabel = (a: ApplianceDef) => (a.use === 'weekly' ? 'a week' : 'hrs a day');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** One listed appliance: name, quantity stepper, usage, and wattage or HP where it applies. */
export function applianceRow(a: ApplianceDef, id: string, cfg: ApplianceConfig = APPLIANCE_CONFIG): string {
  const L = cfg.limits;
  const n = esc(a.label.toLowerCase());
  const lid = `${id}-q-${a.id}-l`;
  const qty = `<div class="nh-stepper">
    <button type="button" data-nh-inc="-1" aria-label="One fewer: ${n}">−</button>
    <input class="input" name="q-${a.id}" type="text" inputmode="numeric" value="${a.defaultQty ?? 0}" data-min="0" data-max="${L.qty}" data-int aria-labelledby="${lid}" />
    <button type="button" data-nh-inc="1" aria-label="One more: ${n}">+</button>
  </div>`;
  const amount =
    a.use === 'always'
      ? '<span class="nh-amount nh-amount-fixed t-small text-slate">runs all day</span>'
      : `<label class="nh-amount"><input class="input" name="h-${a.id}" type="text" inputmode="decimal" value="${a.defaultAmount}" data-min="0" data-max="${a.maxAmount}" aria-label="${n}, ${a.use === 'weekly' ? 'uses a week' : 'hours a day'}" /><span>${amountLabel(a)}</span></label>`;
  const extra = a.wattOptions
    ? `<label class="nh-extra"><span class="sr-only">${n}, watts each</span><select class="select" name="w-${a.id}">${a.wattOptions
        .map((w) => `<option value="${w}"${w === Math.round(a.kw * 1000) ? ' selected' : ''}>${w} W each</option>`)
        .join('')}</select></label>`
    : a.hpOptions
      ? `<label class="nh-extra"><span class="sr-only">${n}, motor size</span><select class="select" name="hp-${a.id}">${a.hpOptions
          .map((h) => `<option value="${h}"${h === a.defaultHp ? ' selected' : ''}>${h} HP</option>`)
          .join('')}</select></label>`
      : '';
  return `<div class="nh-row"><p class="nh-row-name" id="${lid}">${esc(a.label)}${a.hint ? `<span class="calc-sub">${esc(a.hint)}</span>` : ''}</p><div class="nh-row-controls">${qty}${amount}${extra}</div></div>`;
}
