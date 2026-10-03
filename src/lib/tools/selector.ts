/**
 * Solar system selector: five questions to on-grid, hybrid, off-grid, a solar pump, or "you may
 * not need solar". The rules are the ones in /on-grid-vs-off-grid-vs-hybrid/, applied in order.
 */
import { SOLAR_CONFIG } from '../../config/solar-config';

export interface SelectorInput {
  use: 'home' | 'business' | 'pump';
  grid: 'yes' | 'no';
  cuts: 'rare' | 'sometimes' | 'often';
  units: 'under' | 'over' | 'unknown';
  want: 'bill' | 'backup' | 'both';
}

export type Pick = 'on-grid' | 'hybrid' | 'off-grid' | 'pump' | 'none';

export interface Selection {
  pick: Pick;
  title: string;
  reasons: string[];
  subsidy: string;
  next: { href: string; label: string }[];
}

const free = SOLAR_CONFIG.freeUnits.perMonth;
const onGridMin = SOLAR_CONFIG.sizing.minKwByType['on-grid'];
const hybridMin = SOLAR_CONFIG.sizing.minKwByType.hybrid;

export function selectSystem(i: SelectorInput): Selection {
  const home = i.use === 'home';
  const subsidyYes = home ? 'Qualifies for the PM Surya Ghar subsidy, if the panels are DCR and the system is no larger than your sanctioned load.' : 'PM Surya Ghar covers homes and housing societies only, so a business system gets no subsidy. It saves from the first unit instead.';

  if (i.use === 'pump') {
    return {
      pick: 'pump',
      title: 'A solar water pump',
      reasons: ['A tubewell or irrigation pump runs best on its own solar pump set, which drives the pump directly from the panels with no battery.', 'Pumping happens in daylight, which is when the panels produce.'],
      subsidy: 'Standalone solar pumps come under PM-KUSUM Component B, run in Punjab through PEDA. The share and whether applications are open change between rounds, so check the current terms.',
      next: [
        { href: '/tools/solar-pump-calculator/', label: 'Size the pump and panels' },
        { href: '/solar-pumps/', label: 'Solar pumps and tubewells' },
      ],
    };
  }
  if (i.grid === 'no') {
    return {
      pick: 'off-grid',
      title: 'An off-grid system',
      reasons: ['With no PSPCL connection, the panels and batteries have to make and store everything you use.', 'Size it for the worst month, December or January, not for summer.'],
      subsidy: 'Off-grid systems are not net-metered, so they get no PM Surya Ghar subsidy.',
      next: [
        { href: '/off-grid-solar-calculator/', label: 'Size an off-grid system' },
        { href: '/off-grid-solar-systems/', label: 'Off-grid solar systems' },
      ],
    };
  }
  const needsBackup = i.cuts === 'often' || i.want !== 'bill' || (i.cuts === 'sometimes' && i.want === 'both');
  if (home && i.units === 'under' && !needsBackup) {
    return {
      pick: 'none',
      title: 'You may not need solar yet',
      reasons: [`At ${free} units a month or less, a Punjab home's bill is already zero, so solar has nothing to save.`, 'If your use is about to rise, for a new AC or more people at home, size for that instead.'],
      subsidy: 'Nothing to claim until there is a bill to save.',
      next: [
        { href: '/blog/solar-with-300-free-units-punjab/', label: 'Is solar worth it with 300 free units?' },
        { href: '/solar-calculator/', label: 'Check your bill in the calculator' },
      ],
    };
  }
  if (needsBackup) {
    return {
      pick: 'hybrid',
      title: 'A hybrid system',
      reasons: [
        'It stays connected to PSPCL and adds a battery, so the chosen circuits keep running in a power cut.',
        home && i.units === 'under' ? `Your bill is already zero, so the case for it is backup, not savings.` : 'It also cuts the bill, like an on-grid system.',
        `Hybrid systems start at ${hybridMin} kW. They cost more than on-grid because of the battery, which needs replacing during the life of the panels.`,
      ],
      subsidy: subsidyYes,
      next: [
        { href: '/hybrid-solar-calculator/', label: 'Size the battery and inverter' },
        { href: '/hybrid-solar-systems/', label: 'Hybrid solar systems' },
      ],
    };
  }
  return {
    pick: 'on-grid',
    title: 'An on-grid system',
    reasons: [
      'It is the cheapest way to cut the bill: daytime solar runs the building and the net meter credits what goes out.',
      'It switches off in a power cut, by design, so it suits places where cuts are rare.',
      home ? `Our on-grid systems start at ${onGridMin} kW.` : 'For a business, size it to daytime use, capped at the sanctioned load.',
    ],
    subsidy: subsidyYes,
    next: [
      { href: home ? '/solar-calculator/' : '/solar-calculator/?category=commercial', label: 'Size it from your bill' },
      { href: home ? '/on-grid-vs-off-grid-vs-hybrid/' : '/commercial-solar-punjab/', label: home ? 'On-grid, off-grid or hybrid' : 'Commercial solar in Punjab' },
    ],
  };
}
