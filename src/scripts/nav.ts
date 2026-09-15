// Main menu behaviour. External module rather than an inline <script>, so it runs under the
// strict CSP (see astro.config.mjs). Without JS the desktop dropdowns still open on hover and
// on keyboard focus, and the mobile groups are native <details>; only the Menu button needs this.

const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const mobileMenu = document.querySelector<HTMLElement>('[data-mobile-menu]');

function setMenu(open: boolean) {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute('aria-expanded', String(open));
  mobileMenu.hidden = !open;
}

menuToggle?.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));

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
  if (menuToggle?.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuToggle.focus();
  }
});
