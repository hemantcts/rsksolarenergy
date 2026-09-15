// Main menu behaviour. External module rather than an inline <script>, so it runs under the
// strict CSP (see astro.config.mjs). Without JS the desktop dropdowns still open on hover and
// on keyboard focus, and the mobile groups are native <details>; only the Menu button needs this.

const header = document.querySelector<HTMLElement>('[data-site-header]');
const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const mobileMenu = document.querySelector<HTMLElement>('[data-mobile-menu]');
// Matches the xl breakpoint where the desktop navigation takes over.
const desktop = window.matchMedia('(min-width: 80rem)');

const menuIsOpen = () => menuToggle?.getAttribute('aria-expanded') === 'true';

/** Fit the panel to the exact space left under the sticky bar (the contact strip may still show). */
function sizeMenu() {
  if (!header || !mobileMenu) return;
  const viewport = window.visualViewport?.height ?? window.innerHeight;
  const space = Math.max(0, viewport - header.getBoundingClientRect().bottom);
  mobileMenu.style.setProperty('--menu-height', `${Math.round(space)}px`);
}

// Where the page was when the menu opened, so closing always returns the reader to the same spot.
let savedScroll = 0;

function setMenu(open: boolean) {
  if (!menuToggle || !mobileMenu) return;
  const wasOpen = menuIsOpen();
  if (open && !wasOpen) savedScroll = window.scrollY;
  menuToggle.setAttribute('aria-expanded', String(open));
  mobileMenu.hidden = !open;
  // Lock the page behind the panel so only the menu scrolls and the bar stays put.
  document.documentElement.classList.toggle('menu-open', open);
  if (open) {
    mobileMenu.scrollTop = 0;
    sizeMenu();
  } else if (wasOpen && Math.abs(window.scrollY - savedScroll) > 1) {
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
  }
}

menuToggle?.addEventListener('click', () => setMenu(!menuIsOpen()));

// Following a link (a page, WhatsApp or a phone number) closes the menu.
mobileMenu?.addEventListener('click', (e) => {
  if (e.target instanceof Element && e.target.closest('a')) setMenu(false);
});

const resize = () => {
  if (menuIsOpen()) sizeMenu();
};
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
desktop.addEventListener('change', (e) => {
  if (e.matches) setMenu(false);
});
// A page restored from the back/forward cache must not come back with the menu open.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) setMenu(false);
});

const items = [...document.querySelectorAll<HTMLElement>('[data-nav-item]')];

function setItem(item: HTMLElement, open: boolean) {
  item.classList.toggle('is-open', open);
  item.querySelector('[data-nav-trigger]')?.setAttribute('aria-expanded', String(open));
}

for (const item of items) {
  item.querySelector('[data-nav-trigger]')?.addEventListener('click', () => {
    const open = !item.classList.contains('is-open');
    items.forEach((other) => setItem(other, false));
    setItem(item, open);
  });
}

document.addEventListener('click', (e) => {
  if (!(e.target instanceof Node)) return;
  for (const item of items) if (!item.contains(e.target)) setItem(item, false);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const openItem = items.find((i) => i.classList.contains('is-open'));
  if (openItem) {
    setItem(openItem, false);
    openItem.querySelector<HTMLElement>('[data-nav-trigger]')?.focus();
  }
  if (menuIsOpen()) {
    setMenu(false);
    menuToggle?.focus({ preventScroll: true });
  }
});
