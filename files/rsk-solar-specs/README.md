# RSK Solar Energy — rebuild

Specification set for the rebuild of **rsksolarenergy.com**. Drop all of these in the
repo root. `CLAUDE.md` is picked up automatically by Claude Code; the rest are
referenced from it.

---

## Files

| File | What it is | Authoritative for |
|---|---|---|
| `CLAUDE.md` | Project brief and build rules | Stack, structure, redirects, SEO, performance, security |
| `DESIGN.md` | Visual system | Colour, type, layout, components, voice, photography |
| `MOTION.md` | GSAP policy | All animation. Supersedes `CLAUDE.md` §8 |
| `SPEC-calculator.md` | Calculator specification | Subsidy logic, sizing, tariff handling, tests |
| `TODO-content.md` | Outstanding items | Everything RSK still owes. Keep it current. |

**Reading order for a fresh session:** `CLAUDE.md` → `DESIGN.md` → `MOTION.md`, then
`SPEC-calculator.md` when working on the calculator.

---

## Context in one paragraph

RSK Solar Energy is a UTL Solar distributor in Phase 8-B, Mohali, serving Tricity and
Punjab. The current WordPress site is compromised (injected spam link on the homepage),
carries a homepage `noindex`, runs a WooCommerce shop that has **never taken an order**,
and has content largely untouched since 2023. The rebuild drops commerce entirely,
converts through WhatsApp, and is built around a PM Surya Ghar subsidy calculator as the
primary lead-generation and SEO asset.

The buyer is a homeowner or business owner making a ₹1.5–2 lakh decision with government
paperwork attached, on a mid-range Android over 4G. They are scanning for **competence**,
not aesthetics. Design and copy target that.

---

## Build order

1. **Calculator** (`/solar-calculator/`) — highest value, independent of everything else
2. Homepage with the calculator in the hero
3. `/pm-surya-ghar-subsidy-punjab/` — the flagship SEO page
4. Five system-size pages (1 / 2 / 3 / 5 / 10 kW)
5. Product catalogue (57 items, static, WhatsApp CTA)
6. Installations, About, Blog
7. Location pages — **only** where real local content exists

---

## Before writing code

Three things are unresolved and block parts of the build. They are tracked in
`TODO-content.md`.

1. **PSPCL tariff rates are unverified.** Published 2026 figures conflict across sources
   (₹3.85–7.05, ₹3.85–8.15, ₹4.49–7.30). Must be confirmed against the PSERC tariff
   order at `pserc.gov.in`. The calculator cannot ship without this.
2. **RSK pricing has not been supplied.** Per-kW figures for on-grid, off-grid and
   hybrid. Placeholders only until provided.
3. **The old install is compromised.** Do not reuse code from `wp-content` without
   inspecting it. Content can be migrated; code cannot be trusted.

---

## The Punjab constraint — do not miss this

Punjab gives domestic consumers **300 free units per month**. Households below that
threshold have a near-zero bill and rooftop solar has **no payback on bill savings at
all**.

The calculator must detect this and say so honestly rather than showing fabricated
savings. Full logic in `SPEC-calculator.md` §2. Telling a customer solar isn't right for
them is the strongest trust signal the site has, and it costs a lead that was never
going to convert.

The real market is domestic consumers above 300 units/month, plus commercial,
industrial and housing-society customers.

---

## Kickoff prompt

```
Read CLAUDE.md, DESIGN.md, MOTION.md and SPEC-calculator.md.

Then scaffold the Next.js project per CLAUDE.md §3 and build the solar
calculator at /solar-calculator/ following SPEC-calculator.md.

Start with:
  1. config/solar-config.ts with every unverified value clearly marked TODO
  2. Pure calculation functions, fully unit tested — including every
     boundary case in SPEC-calculator.md §8
  3. UI, styled strictly to DESIGN.md

Do not invent tariff rates or pricing. Use marked placeholders and list
them in TODO-content.md.

Flag anything in these specs that is unclear, contradictory, or that you
think is wrong.
```

That last line matters. These specs were written without access to the codebase or the
business's real numbers. Parts of them will be wrong.
