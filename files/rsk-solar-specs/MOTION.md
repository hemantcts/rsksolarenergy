# MOTION.md — RSK Solar Energy

Supersedes `CLAUDE.md` §8 and the motion note in `DESIGN.md`. Update `CLAUDE.md` §3 —
GSAP is now an approved dependency under the constraints below.

---

## 1. Principle

Motion shows what changed in response to something the person did. It is not
decoration, and it is not how this site signals quality.

The site's differentiator is that a homeowner types their bill into the hero and
immediately sees their net cost after subsidy. No competitor in Tricity does this.
Motion is the finish on that, never a substitute for it.

**Scroll-reveal is the current template default.** Fade-and-slide-up on every section is
what every generated page and every purchased theme ships with in 2026. Adding it does
not make the site distinctive — it makes it indistinguishable. The build was already
rejected once for reading as generic; do not reintroduce the problem through motion.

---

## 2. Library

**GSAP.** 100% free including all former Club plugins (ScrollTrigger, SplitText,
MorphSVG, ScrollSmoother) since Webflow made the toolset free in 2025. Commercial use
included. Free to use, not open source — cannot be forked or decompiled.

```bash
npm i gsap @gsap/react
```

Lock the version. Do not float it.

### Import discipline
```ts
// Correct — per-plugin, from dist
import { gsap } from 'gsap/dist/gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

// Wrong — pulls far more than needed
import gsap from 'gsap';
```

Load dynamically, after first paint, never render-blocking. Only on routes that use it.

### Budget
GSAP core + ScrollTrigger ≈ 30–35 KB gzipped, roughly a third of the 100 KB homepage JS
budget. The budget in `CLAUDE.md` does not move to accommodate motion. If a sequence
pushes past it, the sequence goes.

---

## 3. Where motion is permitted

Three places. Nowhere else without discussion.

### 3.1 The calculator result — the one that matters
When the user submits, the result panel resolving and the figures counting up is the
emotional peak of the site: the moment they learn solar is affordable. This is motion
answering a user action and showing what changed, which is the legitimate case. Give it
real craft.

```ts
// Tween a value object, render with tabular-nums so nothing reflows
const obj = { v: 0 };
gsap.to(obj, {
  v: netCost,
  duration: 0.9,
  ease: 'power2.out',
  onUpdate: () => setDisplay(Math.round(obj.v)),
});
```

Rules: under 1s total. Figures use `font-variant-numeric: tabular-nums` so digits don't
jitter. Final value is in the DOM immediately for screen readers and for anyone with
reduced motion. Never animate the currency symbol or the label.

### 3.2 One homepage load moment
A single orchestrated sequence, **under 600ms total**, resolving the hero *after* paint.

Type and `--rule` hairlines settling into place — not sliding in from offscreen.
Restrained, quick, once.

**Hard constraint: nothing above the fold animates before LCP.** The calculator is the
hero and therefore likely the LCP element. Animating it in delays LCP directly and
breaks the performance budget. Hero content renders immediately; the sequence refines
what is already painted.

### 3.3 Micro-interactions
Subsidy FAQ accordions, sticky bar show/hide, form validation states, input focus.
Short (150–250ms), functional, they show state change.

### 3.4 Optional — installations gallery
If one scroll-driven moment is wanted for character, spend it here. A subtle scrub as
real rooftop photos move through reinforces the credibility story rather than
decorating. **At most one on the site.** Must stay smooth on a mid-range Android.

---

## 4. Do not build

- Scroll-reveal / fade-up entrances on sections — the template tell
- ScrollSmoother or any scroll hijacking. On a site where people are scanning for a
  price, fighting native scroll is hostile.
- Parallax
- Pinned sections, horizontal scroll, scrollytelling
- Hover transforms on every card
- Magnetic cursors, cursor followers, text scramble, marquees
- WebGL, Three.js, 3D
- Anything above the fold that delays LCP

---

## 5. Technical rules

**Animate `transform` and `opacity` only.** Never `top`, `left`, `width`, `height`,
`margin` — those trigger layout and are where low-end Android jank comes from.

**React integration** — use `useGSAP()` for automatic cleanup:
```ts
import { useGSAP } from '@gsap/react';

useGSAP(() => {
  gsap.from('.hero-line', { opacity: 0, y: 12, stagger: 0.06, duration: 0.4 });
}, { scope: container });
```

**Responsive and accessible gating:**
```ts
const mm = gsap.matchMedia();

mm.add({
  isDesktop: '(min-width: 768px)',
  reduced:   '(prefers-reduced-motion: reduce)',
}, (ctx) => {
  const { isDesktop, reduced } = ctx.conditions;
  if (reduced || !isDesktop) return;   // mobile and reduced-motion get no decorative motion
  // desktop-only sequences here
});
```

Mobile gets micro-interactions and the calculator result only. It is the majority of
traffic and the weakest hardware.

**Reduced motion:** final states render immediately. Never a degraded version — the
correct end state, instantly.

**Cleanup:** every ScrollTrigger killed on unmount. Orphaned triggers leak and degrade
scroll performance across route changes.

---

## 6. Pre-ship check

- [ ] Homepage JS still under 100 KB gzipped with GSAP included
- [ ] LCP still under 2.5s on a mid-range Android over 4G
- [ ] INP still under 200ms while scrolling on that same device
- [ ] Nothing above the fold animates before LCP
- [ ] `prefers-reduced-motion: reduce` renders all final states immediately
- [ ] No section fades or slides in on scroll
- [ ] Every animated property is `transform` or `opacity`
- [ ] All ScrollTriggers cleaned up on unmount
- [ ] Calculator result readable and correct with JavaScript disabled mid-tween

If any check fails, the motion is removed, not the budget raised.
