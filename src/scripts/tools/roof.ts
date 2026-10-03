import { bindTool, num, str } from './bind';
import { roofEstimate } from '../../lib/tools/roof';
import { renderRoof } from '../../lib/tools/render';

bindTool('roof', (d) =>
  renderRoof(
    roofEstimate({
      areaSqFt: num(d, 'area'),
      lengthFt: num(d, 'length'),
      widthFt: num(d, 'width'),
      usableShare: (num(d, 'usable') ?? 80) / 100,
      loadKw: num(d, 'load'),
      panelW: num(d, 'panel'),
      home: str(d, 'for') !== 'business',
    }),
    location.pathname,
  ),
);
