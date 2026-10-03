/**
 * Every solar tool on the site, the four calculators that came first and the /tools/ pages added
 * after. /tools/ lists them all; each tool page links to its related ones from here.
 */
export interface Tool {
  id: string;
  href: string;
  name: string;
  /** One line: what you put in and what you get. */
  blurb: string;
  group: 'size' | 'plan' | 'compare';
}

export const TOOLS: Tool[] = [
  { id: 'bill', href: '/solar-calculator/', name: 'Solar calculator', blurb: 'Size, subsidy, cost and payback from your PSPCL bill.', group: 'size' },
  { id: 'commercial', href: '/solar-calculator/?category=commercial', name: 'Commercial solar ROI', blurb: 'The same calculator for a shop, office, school or factory: size, saving and payback.', group: 'size' },
  { id: 'house', href: '/new-house-solar-calculator/', name: 'New house solar calculator', blurb: 'No bill yet: size from the appliances you plan to use.', group: 'size' },
  { id: 'roof', href: '/tools/solar-roof-capacity-calculator/', name: 'Roof capacity calculator', blurb: 'How many kW your roof takes, the panels, the units and the price.', group: 'size' },
  { id: 'backup', href: '/hybrid-solar-calculator/', name: 'Battery backup calculator', blurb: 'The inverter and batteries to keep chosen loads running through a power cut.', group: 'size' },
  { id: 'off-grid', href: '/off-grid-solar-calculator/', name: 'Off-grid solar calculator', blurb: 'Panels and batteries for a site with no grid connection.', group: 'size' },
  { id: 'pump', href: '/tools/solar-pump-calculator/', name: 'Solar pump and tubewell calculator', blurb: 'Panels for a pump, and the water it should give at your depth.', group: 'size' },
  { id: 'generation', href: '/tools/solar-generation-punjab/', name: 'Solar generation by location', blurb: 'Units a month from a system in your town, month by month.', group: 'plan' },
  { id: 'selector', href: '/tools/solar-system-selector/', name: 'Solar system selector', blurb: 'Five questions to on-grid, hybrid, off-grid or a solar pump.', group: 'plan' },
  { id: 'quotes', href: '/tools/solar-quote-comparison/', name: 'Solar quote comparison', blurb: 'Put up to three quotes side by side: price per kW, subsidy and what each leaves out.', group: 'compare' },
];

export const TOOL_GROUPS: Record<Tool['group'], string> = {
  size: 'Size a system',
  plan: 'Plan and choose',
  compare: 'Compare quotes',
};

export const toolsById = (ids: string[]) => ids.map((id) => TOOLS.find((t) => t.id === id)).filter((t): t is Tool => !!t);
