import { bindTool, num, str } from './bind';
import { generationFor } from '../../lib/tools/generation';
import { renderGeneration } from '../../lib/tools/render';

bindTool('generation', (d) => {
  const g = generationFor(str(d, 'town'), num(d, 'kw') ?? 0);
  return g ? renderGeneration(g, location.pathname) : '<p class="calc-error" role="alert">Choose a town and enter a system size in kW.</p>';
});
