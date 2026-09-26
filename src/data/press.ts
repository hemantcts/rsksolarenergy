/**
 * Third-party coverage of RSK Solar Energy.
 *
 * Balle Balle Films and Records, a Punjabi media page, interviewed RSK Solar Energy about its
 * products (confirmed by RSK Solar Energy, 26 September 2026). These are links out to their posts,
 * not embeds: embedding Facebook video loads their SDK on every page view, which the performance
 * budget in CLAUDE.md rules out, and a link needs nobody's permission because the posts are public.
 *
 * The titles are the interviewer's own, in Punjabi and English. Where Facebook would not serve the
 * Punjabi title without a login, the entry says what the interview covers and nothing more. Nothing
 * here claims what was said in them.
 */
export interface PressItem {
  /** The share link as supplied. These redirect to the post and keep working. */
  href: string;
  label: string;
  /** Set where the interviewer's own title is readable, so we are not paraphrasing them. */
  theirTitle?: boolean;
}

export const PRESS_OUTLET = {
  name: 'Balle Balle Films and Records',
  page: 'https://www.facebook.com/balleballefilmsandrecords/',
  videos: 'https://www.facebook.com/balleballefilmsandrecords/videos/',
};

export const PRESS: PressItem[] = [
  { href: 'https://www.facebook.com/share/v/1UFPBy7fwJ/', label: 'Lithium inverter battery', theirTitle: true },
  { href: 'https://www.facebook.com/share/v/14s8qQK8ZCN/', label: 'Solar power system', theirTitle: true },
  { href: 'https://www.facebook.com/share/v/1DieFHCiRp/', label: 'Lithium-ion hybrid inverter battery', theirTitle: true },
  { href: 'https://www.facebook.com/share/r/1Dd4Tdwhg5/', label: 'Hybrid solar system', theirTitle: true },
  { href: 'https://www.facebook.com/share/1BwxW4YKZ2/', label: 'Hybrid solar inverter', theirTitle: true },
  { href: 'https://www.facebook.com/share/v/1BtAnjruhS/', label: 'Lithium-ion batteries', theirTitle: true },
  { href: 'https://www.facebook.com/share/r/14optScYsyT/', label: 'Electric scooters', theirTitle: true },
  { href: 'https://www.facebook.com/share/v/18YyY3UoBQ/', label: 'Interview in Punjabi' },
  { href: 'https://www.facebook.com/share/v/1EtXkDTjLd/', label: 'Interview in Punjabi' },
  { href: 'https://www.facebook.com/share/v/1LqbFJK2gP/', label: 'Interview in Punjabi' },
  { href: 'https://www.facebook.com/share/v/1Brrqo1rZE/', label: 'Interview in Punjabi' },
  { href: 'https://www.facebook.com/share/r/1i4ojt4xZA/', label: 'Interview in Punjabi' },
  { href: 'https://www.facebook.com/share/v/19kY9kf2VV/', label: 'Interview in Punjabi' },
  { href: 'https://www.facebook.com/share/r/1ADEZj54vP/', label: 'Interview in Punjabi' },
  { href: 'https://www.facebook.com/share/v/1GZAsuQ6Kt/', label: 'Interview in Punjabi' },
];
