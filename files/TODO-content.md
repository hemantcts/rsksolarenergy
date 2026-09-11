# TODO-content.md — outstanding items

Keep this current. Every placeholder, unverified number and missing asset lives here.
Nothing ships to production with an open 🔴 item on its page.

---

## 🔴 Blocking launch

### Verify before the calculator can go live
- [ ] PSPCL domestic slab rates — **sources conflict** (₹3.85–7.05, ₹3.85–8.15,
      ₹4.49–7.30 all published for 2026). Confirm against `pserc.gov.in` tariff order.
- [ ] PSPCL fixed charges, fuel adjustment charge, electricity duty %
      (13% and 18% both reported — resolve)
- [ ] Current free-units scheme: 300/month confirmed? Eligibility conditions?
- [ ] Commercial and industrial tariff structure
- [ ] Net metering export credit rate in Punjab

### RSK must supply
- [ ] Real per-kW pricing: on-grid / off-grid / hybrid, by size band
- [ ] Actual generation data from commissioned installs (units/kWp/yr)
- [ ] MNRE empanelment status for PM Surya Ghar — yes or no
- [ ] Panel brands supplied + ALMM listing confirmation
- [ ] Typical install timeline; typical subsidy disbursement timeline in practice
- [ ] Do they file net metering with PSPCL on the customer's behalf?

### Security — old site
- [ ] Identify the source of the homepage spam injection (`pursesstore.com`,
      anchor "hermes outlet") before any code is reused from `wp-content`
- [ ] Confirm where the homepage `noindex, nofollow` originated
- [ ] Full malware scan + core/plugin integrity check on the old install

### Product data
- [ ] Real titles for the 6 lorem-ipsum-slugged products
      (`proin-gravida-nibh-vel-veli` and `-2` … `-6`) — one is confirmed as
      "170Ah Inverter Battery – USB 17100"; the other five need identifying
- [ ] Confirm all 57 products are current stock and correctly described

---

## 🟠 Needed before the relevant page ships

### Photography — no stock permitted
- [ ] Hero: real RSK rooftop install, Punjab, landscape
- [ ] 8–12 installation photos across Mohali / Kharar / Zirakpur / Derabassi,
      with system size and location recorded for each
- [ ] Installers at work
- [ ] Inverter and battery bank wired in situ
- [ ] Team / premises at Phase 8-B

### Installations (replacing the 6 demo "projects")
For each real install: location, system size (kW), type, install date, photos, and
ideally the customer's own words. Minimum 6, target 12.

**Delete entirely:** the two wind-energy demo entries. RSK does not do wind.

### Location pages — real content or don't build
Each town page needs genuinely distinct content, not a template with the name swapped.
Google penalises thin duplicated location pages as doorways.

| Town | Real installs to show? | Build? |
|---|---|---|
| Mohali | | |
| Kharar | | |
| Zirakpur | | |
| Derabassi | | |
| Chandigarh | | |
| Panchkula | | |

**If a town has no real content, do not build its page.**

---

## 🟡 Content to write

- [ ] Homepage copy — replace "Power up your life" / "innovative and sustainable
      solutions" register entirely. See `DESIGN.md` §7.
- [ ] `/pm-surya-ghar-subsidy-punjab/` — the flagship guide. Include why roughly 1 in 3
      applications is rejected (non-ALMM panels, un-seeded Aadhaar-bank accounts,
      system exceeding sanctioned load). This is genuinely useful and no local
      competitor covers it.
- [ ] Five system-size pages (1 / 2 / 3 / 5 / 10 kW)
- [ ] `/on-grid-vs-off-grid-vs-hybrid/`
- [ ] `/commercial-solar-punjab/`, `/housing-society-solar/`
- [ ] About — rewrite. Founded 2022; 80+ commercial/industrial and 50+ residential
      installs (**confirm these figures are current — they date from 2023**)
- [ ] Rewrite the 2 blog posts from 2023 (one has "2023" in the title)
- [ ] Real blog categories — everything currently sits in "Uncategorized"

---

## 🔵 Later

- [ ] Hindi (`/hi/`) and Punjabi (`/pa/`) versions of the subsidy pages.
      **Human translation only** — do not machine-translate and ship.
- [ ] Google Business Profile: verify NAP matches the site exactly, add UTM-tagged
      website link
- [ ] Search Console + Bing Webmaster Tools setup and sitemap submission
- [ ] Decide whether to keep the Razorpay policy footer links given there is no
      checkout

---

## Recorded assumptions

Anything below is an assumption, not a verified fact. Shown to users where it affects a
number they see.

| Assumption | Value | Status |
|---|---|---|
| Annual yield per kWp, Punjab | 1,530 units | ⚠️ published average — replace with RSK data |
| System derating factor | 0.80 | ⚠️ industry default |
| Tariff escalation | 3.0 %/yr | ⚠️ assumption — displayed to user |
| Panel degradation | 0.5 %/yr | ⚠️ assumption — displayed to user |
| Roof area per kW | ~100 sq ft | ⚠️ rule of thumb |
| PM Surya Ghar slabs | ₹30k / ₹60k / ₹78k cap | ✅ consistent across sources |
| Subsidy disbursement | 30–45 days post-inspection | ✅ consistent across sources |
