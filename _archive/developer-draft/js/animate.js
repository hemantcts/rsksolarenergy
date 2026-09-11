const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealTargets = document.querySelectorAll(
  '.solutions-trust, .solutions-intro, .solution-card, .solutions-steps-heading, .solutions-step-grid article, .solutions-cta, .featured-post, .journal-heading, .article-card, .inner-cta, .contact-details, .contact-form'
);

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealTargets.forEach((element) => element.classList.add('is-revealed'));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -32px' });

  revealTargets.forEach((element, index) => {
    element.classList.add('scroll-reveal');
    element.style.setProperty('--reveal-delay', `${Math.min((index % 3) * 80, 160)}ms`);
    revealObserver.observe(element);
  });
}

const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = contactForm.querySelector('.form-button');
    button.textContent = 'Thank you — we will contact you soon';
    button.classList.add('is-sent');
    button.disabled = true;
  });
}
