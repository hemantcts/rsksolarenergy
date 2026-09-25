# CLAUDE.md — RSK Solar Energy

Project instructions for Claude Code. Read this and `DESIGN.md` before writing any
code. If a request conflicts with this file, say so rather than silently deviating.

---

## 1. What this is

A rebuild of **rsksolarenergy.com** for RSK Solar Energy — a UTL Solar distributor
based at Phase 8-B, Mohali, Punjab, serving the Tricity region (Mohali, Kharar,
Zirakpur, Derabassi, Chandigarh, Panchkula) and wider Punjab.

The business sells and installs rooftop solar: on-grid, off-grid and hybrid systems,
plus panels, inverters, batteries and charge controllers.

**The site's job is to generate qualified enquiries.** Not to sell online. Not to win
design awards. Every decision is judged against: does this make a homeowner or a
business owner in Punjab more likely to contact RSK?

### The single most important page

`/solar-calculator/` — a PM Surya Ghar subsidy and savings calculator. It is the
primary lead-generation asset, the primary SEO asset, and the primary sales tool.
Build it first, build it well, test it thoroughly. Spec in `SPEC-calculator.md`.

### The new-house calculator

`/new-house-solar-calculator/` is for people with no PSPCL bill yet (building or buying).
Appliances and usage go in; daily, monthly, peak-summer and yearly units, connected load and
three size ranges (essential, recommended, higher) come out. Every figure lives in
`src/config/appliance-config.ts` (status `assumption`); generation comes from
`SOLAR_CONFIG.generation`, so both calculators agree. Logic: `src/lib/appliance/estimate.ts`
(tested in `estimate.test.ts`); HTML: `src/lib/appliance/render.ts`, used for both the
build-time worked example and the live result. Form defaults and parser defaults must stay
identical, because share links only carry the fields a visitor changed. Results are ranges
rounded to 0.5 kW and never promise a bill, saving or payback.

`/hybrid-solar-calculator/` and `/off-grid-solar-calculator/` (one template, `[mode]-solar-calculator.astro`) size battery systems from the loads that must keep running:
inverter kVA (running watts plus the largest motor start), a UTL battery bank at the kit voltage
(lithium or tubular), panels (hybrid: refill after a cut; off-grid: a foggy winter day), roof area
and the standard-kit price. Figures in `src/config/backup-config.ts`, logic in `src/lib/backup/`.
Every calculator shows roof area at `SOLAR_CONFIG.generation.sqFtPerKw`.

### Deploying, and what runs on every push

`main` deploys itself: GitHub Actions builds, runs the tests, the SEO guard, `npm run tells` (the
AI-writing check in `scripts/check-tells.mjs`) and the page budget, uploads over SSH and pings
IndexNow. Pull requests run the same checks without deploying, which is what gates drafts from the
content pipeline. Setup and troubleshooting: `files/DEPLOY.md`.

### Content pipeline

`.github/workflows/blog-draft.yml` (Tue and Fri) drafts a post from the weekly Search Console
figures and opens a PR; merging publishes it. `scripts/lib/ai.mjs` calls Anthropic first and falls
back to OpenAI. `scripts/draft-post.mjs` hands the model the site's own figures, the allowed link
list and three chart snippets, then rejects the draft on invented figures, bare "RSK", implied
warranties, unknown links, a missing chart or a broken writing rule. The PR still has to pass the
same checks as any other.

### Site search

`/search/` and the header box share `src/lib/search/query.ts` (typo tolerance, synonyms, "3kw" =
"3 kW", grouped results). The index is `scripts/make-search-index.mjs`, which reads the pages that
were actually built after `astro build`, so **a new page is searchable as soon as it exists** and
there is no page list to maintain. Pages marked noindex are left out.

---

## 2. Non-negotiable constraints

### No e-commerce
The previous site ran WooCommerce but **never took a single online order** — it
operated as a catalogue with enquiry CTAs. Do not build cart, checkout, payment
integration, inventory management or order handling. Products are static content with
a WhatsApp enquiry CTA. If a future requirement needs commerce, that is a separate
project.

### WhatsApp is the primary conversion action
Not contact forms. Deals in this market close over WhatsApp. Every CTA leads to a
WhatsApp deep link with a pre-filled, context-aware message. Forms exist only where a
callback genuinely needs scheduling.

### Performance budget (hard limits, enforce in CI)
The target user is on a mid-range Android phone over 4G in Punjab. Test against that,
not desktop Lighthouse.

| Metric | Limit |
|---|---|
| LCP (Moto G-class, 4G) | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |
| JS shipped to `/` | < 100 KB gzipped |
| Total page weight, homepage | < 800 KB |

If a feature cannot fit the budget, the budget wins.

### Mobile-first, genuinely
Design and build at 360px first. Desktop is the adaptation. Roughly all of the target
traffic is mobile.

### Accessibility floor
Keyboard focus visible everywhere. `prefers-reduced-motion` respected. Colour contrast
meets WCAG AA. Forms labelled. This is a floor, not a feature — do not announce it.

---

## 3. Stack

- **Next.js** (App Router), static generation by default
- **TypeScript**, strict mode
- **Tailwind CSS** — tokens only, from `DESIGN.md`. No arbitrary values outside the
  token set without a comment explaining why.
- **MDX** for blog and guide content
- **Self-hosted fonts** (woff2, subset, preloaded). No Google Fonts CDN — it is a
  render-blocking third party and a GDPR question.
- **No component library.** No Bootstrap, no shadcn defaults left unstyled, no
  Material. Components are built to `DESIGN.md`.
- **GSAP** (+ `@gsap/react`) — approved, but tightly scoped. See `MOTION.md`, which is
  authoritative for all motion. Counts against the JS budget; the budget does not move.

### Deliberately excluded
jQuery, Revolution Slider, any page builder, Font Awesome, carousel libraries,
chat-widget SaaS, cookie-consent SaaS, analytics beyond one lightweight tool.

Every dependency is a performance tax and an attack surface. The previous site was
compromised. Keep the surface small.

---

## 4. Site structure

```
/                                     Home
/solar-calculator/                    ← build first
/new-house-solar-calculator/          No bill yet: appliances in, units and a size range out
/search/                              Site search (noindex)
/hybrid-solar-calculator/             Backup for power cuts: loads in, inverter, batteries, panels, roof area out
/off-grid-solar-calculator/           No grid: the same, panels sized for winter, battery for the night
/pm-surya-ghar-subsidy-punjab/        Subsidy guide (high-intent SEO)

  System size pages (money pages)
/1kw-solar-system-price-punjab/
/2kw-solar-system-price-punjab/
/3kw-solar-system-price-punjab/
/5kw-solar-system-price-punjab/
/10kw-solar-system-price-punjab/

  Explainers
/on-grid-vs-off-grid-vs-hybrid/
/hybrid-solar-systems/
/solar-panels/
/off-grid-solar-systems/

  Commercial
/commercial-solar-punjab/
/housing-society-solar/

  Location (see caution below)
/solar-panel-dealer-mohali/
/solar-panel-dealer-kharar/
/solar-panel-dealer-zirakpur/
/solar-panel-dealer-derabassi/
/utl-solar-distributor-punjab/

  Catalogue
/products/                            57 items, static, enquiry CTA
/products/[slug]/

  Trust
/installations/                       Real projects, real photos
/about/
/blog/
```

**Location pages — caution.** Do NOT generate these from a template with the town name
swapped. Google treats thin duplicated location pages as doorway pages and can penalise
the whole site. Each needs genuinely distinct content: real installs in that area with
photos, the local PSPCL sub-division and net-metering process, specific service
commitments. **If RSK cannot supply real local content for a town, do not build that
page.** Ask rather than inventing.

---

## 5. Migration from the old site

### Redirects required (301)

| Old | New |
|---|---|
| `/product/proin-gravida-nibh-vel-veli/` | `/products/utl-170ah-inverter-battery-usb-17100/` |
| `/product/proin-gravida-nibh-vel-veli-2/` … `-6/` | real product slugs — **get the real titles first** |
| `/service/hydropower-plants/` | `/hybrid-solar-systems/` |
| `/service/battery-material/` | `/solar-panels/` |
| `/service/solar-panel-service/` | `/off-grid-solar-systems/` |
| `/services/` | `/` |
| `/contact/` | not redirected: a real contact page exists since September 2026 (NAP, hours, directions) |
| `/thank-you/` | handled in-app |
| `/product/[slug]/` | `/products/[slug]/` (all 57) |

Six products carry lorem-ipsum slugs from an unmodified demo import. The **content is
real and good** (the 170Ah battery page has a full spec table, warranty, model number).
Migrate the content, fix the slug, redirect.

### Content to rewrite, not migrate
- 6 "projects" — demo content, includes two wind-energy entries. RSK does not do wind.
  Replace with real installations.
- 3 "services" — slugs describe the wrong business entirely.
- 2 blog posts from 2023 — one references "2023" in the title.

### Known issues on the old site (do not carry forward)
- Homepage carried `noindex, nofollow` — inner pages did not. Verify the new site has
  no stray noindex anywhere before launch.
- Homepage had an injected spam link (`pursesstore.com`, anchor "hermes outlet").
  **The old install is compromised.** Build clean; do not copy theme or plugin code
  from `wp-content` without inspecting it.
- All blog posts sat in "Uncategorized".
- Product CTAs (`Enquire Now`) pointed at `#` — dead links.

---

## 6. SEO requirements

These are build requirements, not a later pass. **No page ships without them.**

Every route must export:
- Unique `<title>` and meta description
- Canonical URL
- Open Graph + Twitter card
- Appropriate JSON-LD (below)

### Schema (JSON-LD)

| Type | Where |
|---|---|
| `LocalBusiness` | Site-wide. Full NAP, hours, geo, `sameAs`. No `aggregateRating` or `Review`: the ratings come from Google Maps, and Google’s review-snippet policy does not allow marking up ratings collected elsewhere |
| `Product` | Every catalogue item |
| `FAQPage` | Subsidy pages, system-size pages |
| `Service` | Each system-size and service page |
| `BreadcrumbList` | Everywhere |

NAP must match Google Business Profile **exactly**:
```
RSK Solar Energy
E 203, Phase 8B, Industrial Area, Sector 74, Sahibzada Ajit Singh Nagar, Punjab 140307
+91 90419 96918 / +91 94170 30347
rsksolarenergy@gmail.com
```

### Also required
- XML sitemap, submitted to Google Search Console and Bing Webmaster Tools
- `robots.txt` — permissive, no stray disallows
- Semantic heading hierarchy, one `h1` per page
- Descriptive alt text on every image (real descriptions, not keyword stuffing)
- All images WebP/AVIF, hero preloaded, everything below fold lazy

### Enforced on every build
`scripts/seo-guard.mjs` runs at the end of `npm run build` and **fails the build** if any page
breaks these rules, so they cannot quietly regress:
- Title present, unique, 65 characters or fewer (UTL catalogue product names: 80); description
  present, unique, 160 or fewer
- Brand name kept out of titles except the homepage, About, Contact, Reviews, Careers, Why choose
  RSK and legal/payment pages (Highprime playbook)
- Exactly one H1, no skipped heading levels
- Self-referencing canonical; og:title, og:description, og:image, og:url and twitter:card
- Valid JSON-LD; identical LocalBusiness on every page; BreadcrumbList everywhere but the
  homepage; no AggregateRating or Review; Service + FAQPage on size and city pages, Article on
  blog posts, Product on product pages
- FAQPage question count equals the FAQs visible on the page
- Every image has alt, width and height; every internal link resolves and ends in a slash
- Only the official phone numbers (read from /contact/)
- No RSK-side warranty or guarantee wording; no em dashes in site copy (catalogue text exempt)
- The business is always "RSK Solar Energy" in visible copy, titles and descriptions, never bare
  "RSK" (use "we"/"our" where the full name reads badly)
- Sitemap lists exactly the indexable pages; noindex only on /404.html and
  /awards-and-recognition/; robots.txt, image sitemap, llms.txt and ErrorDocument 404 present

If a rule fails, fix the page. Change the rule only when the policy changes, and update this list.

### Language
Plan for Hindi and Punjabi versions of the subsidy pages. A large share of the target
audience searches in those languages and competitors do not serve them. Build routing
to accommodate `/hi/` and `/pa/` from the start even if content comes later. Do not
machine-translate and ship — get human translation.

---

## 7. Content rules

**Always "RSK Solar Energy".** Never shorten the name to "RSK" in site copy, WhatsApp messages or schema text
(RSK Solar Energy’s instruction, 16 September 2026). URLs and the email address are unaffected.

**Write like a person.** No "X, not Y" formulas, bold labels on list items, one-line closers or stock
phrases ("genuinely", "seamless", "the honest answer"). State the fact plainly and vary sentence length.

**No RSK warranties or guarantees.** RSK gives none of its own. The only warranties mentioned
anywhere are the manufacturer’s published product warranties (UTL’s, model by model). Never
suggest an installation, workmanship or system warranty from RSK (RSK’s instruction, 15 September 2026).

**Never invent:** prices, subsidy amounts, tariff rates, generation figures,
certifications, project details, customer names, statistics. If a number is needed and
not supplied, use a clearly-marked placeholder and list it in `TODO-content.md`.

**Never use stock photography.** Real photos of real RSK installations in Punjab are
both more distinctive and function as trust proof. A stock image of a smiling family on
a roof actively costs credibility with a buyer who is evaluating competence. If real
photos are not available for a section, flag it rather than filling with stock.

**Copy.** The old homepage opened "Welcome to RSK Solar Energy! We are dedicated to
providing innovative and sustainable solutions..." — this could belong to any company in
any industry. Write specifics: system sizes, prices, timelines, model numbers, the
subsidy process, named towns. Specificity is the credibility.

**Brand comparisons** (/utl-solar-vs-other-brands/ and the /utl-vs-*/ pages). Compare only on
figures a brand publishes itself, name the model, link the source and date the check. Say where
the other brand is ahead as plainly as where UTL is; no "best" or "better than all" claims
(ASCI requires comparative claims to be substantiated). RSK also stocks Luminous, so that page
says so. Re-check the figures when updating `updated:`.

**Why choose RSK** (/why-choose-rsk-solar-energy/) is a buyer’s checklist that names no
competitor. Every answer links to its proof and reads from `BUSINESS`, so it never drifts.

See `DESIGN.md` §7 for voice.

---

## 8. Motion

**See `MOTION.md` — it is authoritative and supersedes anything here.**

Summary: GSAP is approved and tightly scoped. Motion is permitted in three places (the
calculator result transition, one sub-600ms homepage load moment, micro-interactions)
and nowhere else. No scroll-reveal, no parallax, no scroll hijacking. Nothing above the
fold animates before LCP. `prefers-reduced-motion: reduce` renders final states
immediately.

---

## 9. Security

The previous install was compromised. Do not repeat the conditions.

- No user-generated content, no comments, no file upload
- Static generation means minimal attack surface — keep it that way
- Any form endpoint: rate-limited, validated server-side, no HTML in output
- Environment secrets never in the repo
- Dependency audit in CI; fail the build on high-severity advisories
- CSP header, HSTS, `X-Content-Type-Options`, `Referrer-Policy`

---

## 10. Working agreement

- **Ask rather than invent.** Missing business facts get a question, not a guess.
- **Flag budget violations** the moment a change pushes past a performance limit.
- **Small commits**, one concern each.
- Keep `TODO-content.md` current — every placeholder, every unverified number, every
  piece of content RSK still owes.
- When something in this file turns out to be wrong or outdated, say so.
