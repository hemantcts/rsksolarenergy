/**
 * Renders a hybrid or off-grid estimate to HTML, for the build-time worked example and the live
 * result alike. Everything interpolated is escaped, including the visitor's own appliance name.
 */
import { BACKUP_CONFIG } from '../../config/backup-config';
import { PRIMARY_PHONE } from '../../config/business';
import { SOLAR_CONFIG, type SolarConfig } from '../../config/solar-config';
import { digits, inr, inrRange, kw } from '../calculator/format';
import { whatsappUrl, withSource } from '../whatsapp';
import type { BackupEstimate, BackupInput } from './estimate';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const kwh = (n: number) => (n < 10 ? n.toFixed(1) : String(Math.round(n)));
const kva = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} kVA`;

function row(label: string, value: string, sub?: string, subHtml = false): string {
  return `<tr><th scope="row">${esc(label)}${sub ? `<span class="calc-sub">${subHtml ? sub : esc(sub)}</span>` : ''}</th><td class="num">${value}</td></tr>`;
}

export function backupMessage(e: BackupEstimate, input: BackupInput, shareUrl?: string, page?: string): string {
  const lines = [`Hi RSK Solar Energy, I used the ${e.mode === 'hybrid' ? 'hybrid' : 'off-grid'} solar calculator on your website.`];
  lines.push(`Loads: ${e.lines.map((l) => `${l.qty} × ${l.label}`).join(', ') || 'none chosen'}`);
  if (e.mode === 'hybrid') lines.push(`Backup for: ${input.backupHours} hours of a power cut`);
  else lines.push(`About ${kwh(e.dailyKwh)} units a day${input.autonomyDays ? `, ${input.autonomyDays} cloudy day${input.autonomyDays > 1 ? 's' : ''} of reserve` : ''}`);
  lines.push(`Suggested: ${kw(e.kitKw)} ${e.mode}, ${kva(e.inverterKva)} inverter, ${e.bank.count} × ${e.bank.unitName}`);
  if (shareUrl) lines.push(`My answers: ${shareUrl}`);
  lines.push('Please send me a quote.');
  return withSource(lines.join('\n'), shareUrl ? undefined : page);
}

export interface BackupRenderOptions {
  heading?: string;
  shareUrl?: string;
  /** The page this result is on, named in the message when there is no share link. */
  page?: string;
  interactive?: boolean;
  solar?: SolarConfig;
}

export function renderBackupResult(e: BackupEstimate, input: BackupInput, o: BackupRenderOptions = {}): string {
  const solar = o.solar ?? SOLAR_CONFIG;
  const hybrid = e.mode === 'hybrid';
  const roofSqFt = e.kitKw * solar.generation.sqFtPerKw;
  const heading = esc(o.heading ?? 'Your estimate');

  if (!e.lines.length) {
    return `<div class="nh-result"><h2 class="t-h2">${heading}</h2><p class="calc-error" role="alert">Choose at least one appliance to run on the battery.</p></div>`;
  }

  const cover = hybrid
    ? `Runs the appliances you chose for about ${input.backupHours} hours of a power cut, and cuts your bill the rest of the time.`
    : `Makes and stores about ${kwh(e.dailyKwh)} units a day for the appliances you chose, with no grid connection.`;
  const bankText = `${e.bank.count} × ${e.bank.kind === 'lithium' ? 'lithium' : 'tubular'}`;
  const bankSub = `<a href="/products/${esc(e.bank.unitSlug)}/" class="underline">${esc(e.bank.unitName)}</a>, ${kwh(e.bank.bankKwh)} kWh at ${e.bank.volts} V${e.bank.strings && e.bank.strings > 1 ? `, ${e.bank.strings} sets in parallel` : ''}`;
  const priceNote = hybrid
    ? 'Our standard hybrid kit of this size, which comes with one 51.2 V, 100 Ah lithium battery. The battery bank above can change the price, and we confirm it when we quote.'
    : 'Our standard off-grid system of this size. The battery bank above can change the price, and we confirm it when we quote.';

  const notes = e.notes.map((n) => n.message);
  const tools = o.interactive
    ? `<div class="nh-tools"><button type="button" class="btn-tertiary" data-bk-share>Share this estimate</button><button type="button" class="btn-tertiary" data-bk-print>Print</button><span class="t-small text-slate" data-bk-share-status role="status"></span></div>`
    : '';

  return `<div class="nh-result">
<div>
  <h2 class="t-h2">${heading}</h2>
  <p class="calc-kicker mt-4">Suggested system</p>
  <p class="calc-system"><span class="t-value">${esc(kw(e.kitKw))}</span> ${hybrid ? 'hybrid' : 'off-grid'}</p>
  <p class="calc-cover">${esc(cover)}</p>
  <p class="calc-cover">Needs about <strong>${digits(roofSqFt)} sq ft</strong> of shade-free roof, at ${digits(solar.generation.sqFtPerKw)} sq ft per kW.</p>
</div>

<div>
  <h3 class="t-h3">What goes into it</h3>
  <div class="table-scroll mt-3"><table class="spec-table calc-table bk-spec"><tbody>
    ${row('Inverter', esc(kva(e.inverterKva)), `${digits(e.runningW)} W running together, plus starting surge`)}
    ${row('Battery bank', bankText, bankSub, true)}
    ${row('Solar panels', esc(kw(e.kitKw)), hybrid ? `at least ${kw(Math.ceil(e.panelKwNeeded * 2) / 2)} to refill the battery on a sunny day` : `at least ${kw(Math.ceil(e.panelKwNeeded * 2) / 2)} for a foggy winter day`)}
    ${row('Roof area', `about ${digits(roofSqFt)} sq ft`)}
    ${row(hybrid ? 'Units from the battery in one cut' : 'Units from the battery each night', `${kwh(e.batteryKwh)} units`)}
  </tbody></table></div>
</div>

<div>
  <h3 class="t-h3">Price</h3>
  <p class="calc-draft mt-3" role="note"><strong>Estimated price range.</strong> Prices are indicative and subject to change. Contact us for the latest pricing and a customised quotation.</p>
  <div class="table-scroll mt-3"><table class="spec-table calc-table"><tbody>
    ${row(`${kw(e.kitKw)} ${hybrid ? 'hybrid' : 'off-grid'} system, installed`, esc(inrRange(e.price)), priceNote)}
    ${hybrid ? row('PM Surya Ghar subsidy, homes', `− ${esc(inr(e.subsidy))}`, 'paid to your bank after PSPCL inspects the system') : row('PM Surya Ghar subsidy', '₹0', 'off-grid systems are not connected to PSPCL, so they don’t qualify')}
    ${hybrid ? row('After subsidy', esc(inrRange([e.price[0] - e.subsidy, e.price[1] - e.subsidy]))) : ''}
  </tbody></table></div>
</div>

<details class="nh-more"><summary>Units by appliance</summary>
  <div class="table-scroll pb-4"><table class="spec-table calc-table"><thead><tr><th scope="col">Appliance</th><th scope="col" class="num">${hybrid ? 'Units in one cut' : 'Units a day'}</th></tr></thead>
  <tbody>${e.lines.map((l) => `<tr><th scope="row">${l.qty} × ${esc(l.label)}</th><td class="num">${kwh(l.kwh)}</td></tr>`).join('')}</tbody></table></div>
</details>

${notes.length ? `<ul class="calc-notes" role="note">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}

<div>
  <h3 class="t-h3">Turn this into a quote</h3>
  <p class="mt-2">Send us the estimate and your address. We check the roof, the wiring and which circuits to back up, and come back with a system and a price.</p>
  <div class="calc-actions mt-4">
    <a class="btn btn-primary" href="${esc(whatsappUrl(backupMessage(e, input, o.shareUrl, o.page)))}" rel="noopener" target="_blank" data-wa>Get my solar quote</a>
    <a class="btn btn-secondary" href="tel:${esc(PRIMARY_PHONE.tel)}">Call RSK Solar Energy</a>
  </div>
  ${tools}
</div>

<p class="calc-fineprint">This is an estimate for a first conversation. The inverter is sized to what runs together plus a motor starting, the battery to be used to about ${Math.round(BACKUP_CONFIG.battery.lithium.usable * 100)}% (lithium) or ${Math.round(BACKUP_CONFIG.battery.tubular.usable * 100)}% (tubular) each cycle, and the panels to ${((solar.generation.annualYieldPerKwp * solar.generation.deratingFactor) / 365).toFixed(1)} units per kW a day${hybrid ? '' : ', less for winter fog'}. We fix the design after a site survey, and we don’t promise a particular backup time, bill or saving.</p>
</div>`;
}
