/**
 * Videos to feature on the site. Add an entry here with a real, published video URL and it
 * shows up automatically — no other code changes needed. We link out to the real platform
 * rather than embedding a player: no iframe/embed script to load (keeps the JS budget and CSP
 * as tight as CLAUDE.md §3/§9 require), and it always plays through the creator's own app.
 */
export interface VideoLink {
  title: string;
  url: string;
  platform: 'youtube' | 'facebook' | 'instagram';
}

export const VIDEOS: VideoLink[] = [];

/** For a YouTube watch/share URL, the real thumbnail YouTube itself serves — no API key needed. */
export function youtubeThumbnail(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
  return match ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg` : null;
}
