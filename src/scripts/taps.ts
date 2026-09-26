// Records taps on WhatsApp and call buttons, so RSK Solar Energy can see which page and which button
// people reach out from, and how they found the site. See files/DEPLOY.md, "Enquiry taps".
//
// One listener on the whole document, so every WhatsApp or call link on the site is counted,
// including ones added later, without anybody remembering to tag them. No cookies: the only thing
// kept in the browser is where this visit began, in sessionStorage, which ends with the tab.

const ENDPOINT = '/api/tap.php';
const LANDING_KEY = 'rsk-landing';
const TARGETS = 'a[href^="tel:"], a[href^="https://wa.me/"]';

interface Landing {
  page: string;
  source: string;
}

/** Where this visit started and what brought it, worked out once on the first page of the visit. */
function currentLanding(): Landing {
  try {
    const saved = sessionStorage.getItem(LANDING_KEY);
    if (saved) return JSON.parse(saved) as Landing;
  } catch {
    // Storage blocked or unparseable: fall through and work it out from this page.
  }

  // A tagged link, such as the website link on the Google Business Profile, names its own source.
  const utm = new URLSearchParams(location.search).get('utm_source');
  let source = utm ? `utm:${utm}` : 'direct';
  if (!utm && document.referrer) {
    try {
      const from = new URL(document.referrer);
      source = from.hostname === location.hostname ? 'this site' : from.hostname.replace(/^www\./, '');
    } catch {
      // An android-app:// or otherwise odd referrer that URL cannot parse: leave it as direct.
    }
  }

  const landing = { page: location.pathname, source };
  try {
    sessionStorage.setItem(LANDING_KEY, JSON.stringify(landing));
  } catch {
    // Not remembered, so a later page in this visit reports itself as the landing page. Harmless.
  }
  return landing;
}

const tidy = (text: string | null | undefined, max: number) => (text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * A readable name for the button. Shared parts of the site (the header, the sticky bar, the
 * footer) say which part they are. Anything in the page itself is named after the section it sits
 * in and what the button says, which is enough to tell "the 5 kW price table" from "the FAQ" without
 * tagging every button by hand.
 */
function buttonName(a: HTMLAnchorElement): string {
  const own = a.dataset.tap;
  const region = a.closest<HTMLElement>('[data-tap-region]')?.dataset.tapRegion;
  const text = tidy(a.getAttribute('aria-label') || a.textContent, 60) || 'Unlabelled button';
  if (own) return region ? `${region}: ${own}` : own;
  if (region) return `${region}: ${text}`;
  const heading = sectionHeading(a);
  return heading ? `${heading} › ${text}` : text;
}

/**
 * The heading a button sits under: the last one before it in its section. Not simply the section's
 * first heading, which can come after the button (a product page's enquiry buttons sit above a
 * "More batteries" list in the same sidebar) and would name the button after the wrong thing.
 * With no heading before it, the page's own H1, which on a product page is the product.
 */
function sectionHeading(a: HTMLAnchorElement): string {
  const block = a.closest('section, article, aside, header');
  if (block) {
    const before = [...block.querySelectorAll('h1, h2, h3')].filter((h) => h.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
    const nearest = before[before.length - 1];
    if (nearest) return tidy(nearest.textContent, 60);
  }
  return tidy(document.querySelector('h1')?.textContent, 60);
}

function send(body: string) {
  try {
    const queued = navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' }));
    if (!queued) void fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
  } catch {
    // Never let tracking get in the way of the call or the chat opening.
  }
}

const landing = currentLanding();

document.addEventListener(
  'click',
  (event) => {
    const a = (event.target as Element | null)?.closest?.<HTMLAnchorElement>(TARGETS);
    if (!a) return;
    const type = a.href.startsWith('tel:') ? 'call' : 'whatsapp';
    const number = type === 'call' ? a.href.slice(4) : new URL(a.href).pathname.slice(1);
    const button = buttonName(a);

    send(JSON.stringify({ type, number, page: location.pathname, button, landing: landing.page, source: landing.source }));

    // The same tap into Google Analytics, where it lines up with traffic sources and pages.
    try {
      (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.('event', type === 'call' ? 'call_tap' : 'whatsapp_tap', {
        page_path: location.pathname,
        button_name: button,
      });
    } catch {
      // Analytics not loaded yet, or blocked. The log above still has the tap.
    }
  },
  { capture: true },
);
