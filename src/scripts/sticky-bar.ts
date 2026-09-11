// Hides the sticky mobile bar while a text field is focused, so it never covers the input
// (MOTION.md §3.3). External file (not an inline <script>) so it survives a strict CSP with
// no 'unsafe-inline' on script-src — see scripts/make-htaccess.mjs.
const isField = (el: EventTarget | null): el is HTMLElement =>
  el instanceof HTMLElement && el.matches('input:not([type=radio]):not([type=checkbox]), textarea');

document.addEventListener('focusin', (e) => {
  if (isField(e.target)) document.body.classList.add('is-typing');
});
document.addEventListener('focusout', (e) => {
  if (isField(e.target)) document.body.classList.remove('is-typing');
});
