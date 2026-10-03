import { bindTool, str } from './bind';
import { selectSystem, type SelectorInput } from '../../lib/tools/selector';
import { renderSelection } from '../../lib/tools/render';

const pick = <T extends string>(v: string, allowed: readonly T[], fallback: T): T => ((allowed as readonly string[]).includes(v) ? (v as T) : fallback);

bindTool('selector', (d) => {
  const input: SelectorInput = {
    use: pick(str(d, 'use'), ['home', 'business', 'pump'] as const, 'home'),
    grid: pick(str(d, 'grid'), ['yes', 'no'] as const, 'yes'),
    cuts: pick(str(d, 'cuts'), ['rare', 'sometimes', 'often'] as const, 'rare'),
    units: pick(str(d, 'units'), ['under', 'over', 'unknown'] as const, 'unknown'),
    want: pick(str(d, 'want'), ['bill', 'backup', 'both'] as const, 'bill'),
  };
  return renderSelection(selectSystem(input), location.pathname);
});
