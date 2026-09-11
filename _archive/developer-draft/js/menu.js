const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

if (menuButton && navigation) {
  const closeMenu = () => {
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
  };

  menuButton.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  // Close as soon as a nav link is tapped, so the open dropdown never
  // lingers over the hero section on mobile while the new page loads.
  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) {
      closeMenu();
    }
  });
}
