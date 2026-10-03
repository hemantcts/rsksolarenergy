import { bindTool, num, str } from './bind';
import { dieselPerYear, feetToMetres, pumpEstimate, type PumpInput } from '../../lib/tools/pump';
import { renderPump } from '../../lib/tools/render';

bindTool('pump', (d) => {
  const rawHead = num(d, 'head') ?? 0;
  const head = str(d, 'head-unit') === 'ft' ? feetToMetres(rawHead) : rawHead;
  const hp = num(d, 'hp');
  const input: PumpInput = {
    kind: str(d, 'kind') === 'surface' ? 'surface' : 'submersible',
    motor: str(d, 'motor') === 'dc' ? 'dc' : 'ac',
    head: Math.round(head * 10) / 10,
    ...(hp ? { hp } : { litresPerDay: num(d, 'litres') }),
  };
  const diesel = dieselPerYear(num(d, 'd-lph') ?? 0, num(d, 'd-hours') ?? 0, num(d, 'd-days') ?? 0, num(d, 'd-price') ?? 0);
  return renderPump(pumpEstimate(input), input, location.pathname, diesel);
});
