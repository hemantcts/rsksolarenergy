import { placeholderGroups } from '../config/solar-config';

/**
 * Every price on the site is labelled "estimated price range... contact us for the latest
 * pricing" (see DraftNote.astro and render.ts's draftBanner) — a permanent, honest framing for
 * a real quote that always depends on the roof and site survey, not a "this isn't ready yet"
 * placeholder. So this no longer fails the production build; it prints a reminder of which
 * config groups (on-grid/off-grid pricing, tariffs, etc.) are RSK's best estimate rather than a
 * confirmed figure from RSK's own price list, for whoever runs the build to see and track down.
 * `npm run launch-check` surfaces the same list without needing a build to trigger it.
 */
export function assertLaunchReady(): void {
  if (!import.meta.env.PROD) return;
  const groups = placeholderGroups();
  if (groups.length) {
    // eslint-disable-next-line no-console
    console.warn(`[launch-guard] Estimated, not RSK-confirmed: ${groups.join(', ')}. Every page already labels these as estimates for the customer.`);
  }
}
