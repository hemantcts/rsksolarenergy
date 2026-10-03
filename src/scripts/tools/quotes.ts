import { bindTool, num, str } from './bind';
import { compareQuotes, perKwSpread, QUOTE_ITEMS, type QuoteInput, type QuoteItem, type QuoteType } from '../../lib/tools/quotes';
import { renderQuotes } from '../../lib/tools/render';

const TYPES: QuoteType[] = ['on-grid', 'hybrid', 'off-grid'];

bindTool('quotes', (d) => {
  const quotes: QuoteInput[] = [1, 2, 3].map((i) => {
    const type = str(d, `q${i}-type`) as QuoteType;
    const dcr = str(d, `q${i}-dcr`);
    const pw = num(d, `q${i}-pw`);
    const iw = num(d, `q${i}-iw`);
    return {
      name: str(d, `q${i}-name`) || `Quote ${i}`,
      kw: num(d, `q${i}-kw`) ?? 0,
      price: num(d, `q${i}-price`) ?? 0,
      type: TYPES.includes(type) ? type : 'on-grid',
      dcr: dcr === 'yes' || dcr === 'no' ? dcr : 'unknown',
      ...(pw ? { panelWarranty: pw } : {}),
      ...(iw ? { inverterWarranty: iw } : {}),
      includes: d.getAll(`q${i}-has`).filter((v): v is QuoteItem => QUOTE_ITEMS.some((q) => q.id === v)),
    };
  });
  const rows = compareQuotes(quotes, str(d, 'for') !== 'business');
  return renderQuotes(rows, perKwSpread(rows), location.pathname);
});
