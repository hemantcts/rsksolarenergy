import { placeholderGroups } from '../config/solar-config';

/**
 * TODO-content.md: "Nothing ships to production with an open 🔴 item on its page."
 * A production build fails while any calculator config group is still a placeholder.
 * `npm run build:draft` (ALLOW_PLACEHOLDERS=1) builds anyway, for review.
 */
export function assertLaunchReady(): void {
  if (!import.meta.env.PROD) return;
  if (process.env.ALLOW_PLACEHOLDERS === '1') return;
  const groups = placeholderGroups();
  if (groups.length) {
    throw new Error(
      `Launch guard: placeholder values in src/config/solar-config.ts (${groups.join(', ')}). ` +
        'Replace them with RSK-confirmed figures, or run `npm run build:draft` for a review build.',
    );
  }
}
