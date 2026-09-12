# TODO-content.md — outstanding items

Keep this current. Every unverified number, missing fact and unfinished page lives here.

Rewritten 2026-09-12 — the site has shipped (see `README.md`/the developer guide for how
it's built and deployed). Everything below is genuinely still open, not launch-blocking
history. Cross-reference `TODO:` comments in the source (`src/config/business.ts`,
`src/config/solar-config.ts`) — those are the same list, closer to the code.

---

## 🔴 Numbers to verify against a primary source

These currently ship as honest estimates (the calculator and every price page carry an
"estimated, not a final quotation" note — see the footer and Terms & Conditions), which is
why they don't block the site being live. They should still be tightened up:

- PSPCL domestic tariff slabs, fixed charges, fuel adjustment charge and electricity duty %
  — confirm against the current PSERC tariff order at `pserc.gov.in` and record the order
  date next to `SOLAR_CONFIG.pspcl` in `src/config/solar-config.ts`.
- Net metering export credit rate (₹/unit) — currently a conservative placeholder (0).
- Whether PSPCL applies the 300 free units to *net* units after solar (assumed yes — worth
  confirming against a real post-solar bill).
- Annual generation yield per kWp — currently a published Punjab average; replace with
  RSK's own commissioned-system data once enough installs have a year of readings.

## 🟠 Business facts still missing

Each of these is a `TODO` comment in `src/config/business.ts` — fill in the value there and
the site picks it up automatically (these fields are `null` and hidden until supplied, not
guessed):

- Address PIN code (as shown on the Google Business Profile)
- Map coordinates (`geo`) — from the Google Business Profile pin
- Opening hours
- Justdial profile URL (so the rating badge can link out directly, like the Google one does)
- YouTube channel URL (`BUSINESS.social.youtube`) — once supplied, add real video links to
  `src/data/videos.ts` and they appear on the homepage automatically, no code changes needed

## 🟡 Content still to add

- **Awards & Recognition** (`/awards-and-recognition/`) — page exists but is a placeholder
  (marked `noindex` on purpose) until RSK supplies real award names, the issuing body, the
  year, and event photos. Do not publish claims without those specifics.
- **Installation photography** — `/installations/` currently states real install *counts*
  (confirmed by RSK) but has no photos. Add real site photos as they become available;
  never use stock photography (see `DESIGN.md` / `CLAUDE.md` §7 — a stock rooftop photo
  actively costs credibility here).
- **Remaining product catalogue completeness** — the solar-panels category was fully
  rechecked against UTL's live site (2026-09-12) and is current. Inverters/PCU, batteries,
  EV chargers, charge controllers and solar systems have NOT had the same full recheck yet
  and are known to be behind UTL's real catalogue (see the count comparison from
  2026-09-12: ~68 inverters live vs ~37 catalogued, ~52 EV chargers live vs 2 catalogued,
  ~24 batteries live vs 5 catalogued, ~30 systems live vs 9 catalogued). Same method as the
  panels recheck: crawl every UTL category page (with pagination — the sitemap alone is not
  reliable) for the real URL list, scrape real specs, filter out combo/kit duplicates, pull
  real images, then add.
- 14-brand "Also stocked at RSK" list — Khaitan, Orient, Sujata, Bajaj, Falcon, Duke,
  Luminous, Polycab, Fujiyama have real logos; a couple of smaller motor brands were removed
  at RSK's request rather than shown without a confirmed logo. Add more as RSK confirms them.

## 🔵 Later

- Hindi (`/hi/`) and Punjabi (`/pa/`) translations of the subsidy and calculator pages.
  Human translation only — the routing already supports these locales
  (`astro.config.mjs` → `i18n.locales`); do not machine-translate and ship.
- Google Search Console + Bing Webmaster Tools: submit `sitemap-index.xml`, verify NAP
  matches the Google Business Profile exactly (see `src/config/business.ts`).
- Google Analytics (`G-VJHJ211TLW`) is live — check the Realtime report after deploying to
  confirm it's actually firing before relying on it.

## Recorded assumptions

Anything below is a stated assumption, not a verified fact — each is shown to users with
wording that makes clear it's an estimate (never presented as confirmed).

| Assumption | Value | Status |
|---|---|---|
| Annual yield per kWp, Punjab | 1,530 units | ⚠️ published average — replace with RSK data |
| System derating factor | 0.80 | ⚠️ industry default |
| Tariff escalation | 3.0 %/yr | ⚠️ assumption — displayed to user |
| Panel degradation | 0.5 %/yr | ⚠️ assumption — displayed to user |
| Roof area per kW | ~100 sq ft | ⚠️ rule of thumb |
| Net metering export credit | ₹0/unit | ⚠️ conservative placeholder pending PSERC confirmation |
| PM Surya Ghar slabs | ₹30k / ₹60k / ₹78k cap | ✅ confirmed, consistent across sources |
| Subsidy disbursement | 30–45 days post-inspection | ✅ confirmed, consistent across sources |
| Hybrid systems ARE subsidy-eligible (grid-tied, net-metered); off-grid is NOT | — | ✅ confirmed by RSK |
| System size floors: on-grid from 3 kW; hybrid and off-grid from 1 kW | — | ✅ confirmed by RSK |
