# DESIGN.md — RSK Solar Energy

The visual system. This file is authoritative. If an implementation decision is not
covered here, ask rather than defaulting.

---

## 1. The brief in one line

**An instrument, not a brochure.**

The buyer is making a ₹1.5–2 lakh decision with government paperwork attached, in a
market where roughly one in three subsidy applications gets rejected. They are not
shopping for a lifestyle. They are scanning for evidence that this company is
technically competent and will not mess up their DISCOM application.

So the design target is **competence**, not luxury and not "eco-friendly". Dense
technical detail presented with absolute clarity. Real photographs of real rooftops.
Real numbers. Restrained colour. Precise typography. The feeling should be closer to a
well-made piece of test equipment than to a glossy agency site.

This is also the honest expression of RSK's genuine strength: the existing UTL 170Ah
battery page, with its full spec table, model number and warranty figures, is already
more credible than most competitors' entire websites. Build outward from that.

---

## 2. Where the visual language comes from

Ground every choice in the subject matter, not in web-design convention.

- **The monocrystalline panel itself** — deep blue-black, a precise fine grid of cells
  and busbars, uniform and repeating. This is the structural motif.
- **Spec sheets and datasheets** — tabular data as a designed object, not an
  afterthought. Rows, rules, aligned figures, units.
- **Meter readings and instrument panels** — numeric readouts given weight and space.
- **Punjab rooftops** — concrete, harsh overhead sun, aluminium mounting rails, hard
  shadows. This is what the photography should actually look like.

What it does NOT come from: leaves, globes, green gradients, wind turbines (RSK does
not do wind — the old site had two wind projects, they were demo content), smiling
families, blue-sky-and-panel stock imagery.

---

## 3. Colour

Six values. That is the whole palette.

```css
--ink:    #0D1B2A;  /* Deep panel blue-black. Text, headings, dark surfaces. */
--slate:  #3E5563;  /* Secondary text, captions, inactive states.            */
--paper:  #F3F5F6;  /* Cool page ground. Section alternation.                */
--white:  #FFFFFF;  /* Cards, tables, elevated surfaces.                     */
--rule:   #C9D3D8;  /* Hairlines, table rules, grid lines, borders.          */
--signal: #F5B700;  /* Generated energy. Primary CTA. Used sparingly.        */
```

### Rules

**`--signal` is a fill, never text.** Ink on signal (`#0D1B2A` on `#F5B700`) is high
contrast and reads as instrument-panel / warning-label, which is the right vernacular.
Signal as text colour fails contrast and looks cheap.

**Signal appears at most twice per viewport.** Primary CTA, and the one number that
matters most in that section. That is it. The moment it decorates, it stops signalling.

**The page ground is cool, not warm.** `--paper` at `#F3F5F6` is deliberate. Do not
drift it toward cream (`#F4F1EA` and neighbours) — that warm-cream ground paired with a
serif display and a clay accent is currently the single most recognisable
AI-generated-design signature, and it is also wrong for this subject.

**No gradients.** Not on buttons, not on backgrounds, not as decoration. Flat fills
only. Solar sites reach for orange-to-yellow gradients by reflex; that reflex is the
thing to avoid.

**No green.** The eco-green palette is the category default and it signals "generic
renewables brochure" — exactly the read to escape.

### Dark surfaces
Use `--ink` as a full-bleed section ground for moments that want weight: the
installations gallery, a key statistic, the footer. White and `--rule` text on ink.
Signal on ink is permitted and strong — use it for one figure.

---

## 4. Typography

**One superfamily: IBM Plex.** Self-hosted, subset, woff2, preloaded. Chosen for
engineering provenance, genuine tabular figures, and a Devanagari sibling for the
planned Hindi pages.

| Role | Face | Notes |
|---|---|---|
| Display / headlines | IBM Plex Sans Condensed, 600 | Width contrast is the distinctive move |
| Body / UI | IBM Plex Sans, 400 / 500 | |
| Numeric readouts | IBM Plex Mono, 500 | **Values only**, never labels |

### The mono rule
Mono is reserved for actual instrument data — kW ratings, rupee figures, unit counts,
payback years, model numbers, spec-table values. It is *not* for small caption labels
or eyebrows; using mono as generic label styling is a recognisable template tell. Here
it is justified only because the content genuinely is meter data.

### Scale

```
Display   clamp(2.75rem, 7vw, 5.25rem)   Condensed 600, tracking -0.02em, lh 0.95
H1        clamp(2.25rem, 5vw, 3.5rem)    Condensed 600, tracking -0.015em, lh 1.05
H2        clamp(1.75rem, 3.5vw, 2.5rem)  Condensed 600, lh 1.1
H3        1.25rem                         Sans 600, lh 1.3
Body      1.0625rem                       Sans 400, lh 1.6
Small     0.875rem                        Sans 400, lh 1.5
Readout   clamp(2rem, 5vw, 3.25rem)       Mono 500, tabular-nums
```

Body line length under 72 characters. Tighten tracking as size increases; never track
out body text.

### Typographic anti-patterns — do not do these
- ALL-CAPS tracked-out eyebrow labels above headings
- Accenting one word in a headline in a different colour or italic
- Meta strings joined with middle dots (`A · B · C`)
- `WORD — fragment` label constructions with a spaced em dash
- A `→` appended to link or button text
- `01 / 02 / 03` numbered markers, **unless the content is genuinely a sequence**
  (the subsidy application process is a sequence and may be numbered; a list of
  product benefits is not)

---

## 5. Layout

### Alignment
**Left-aligned throughout.** Headings, body, section intros, cards, everything. Centred
composition is the single strongest template tell and it is what the current site does.
The only permitted exception is a standalone numeric readout inside its own container.

### Grid
12 columns, 72px max gutter, 1280px max content width — but **content should routinely
break the container**. Full-bleed photography, full-bleed ink sections, tables that
extend past the text column. A layout where every element sits obediently inside one
1200px box reads as a template.

### Asymmetry
Default to asymmetric splits: 7/5, 8/4, 5/7. Avoid 6/6 and avoid three equal columns.

### Vertical rhythm — vary it deliberately
Do not set every section to the same padding. Density is information:

```
Tight     48px    Spec tables, data-dense blocks — these want compression
Standard  96px    Most sections
Open      160px   Section transitions, the one or two moments that breathe
```

### The panel-grid motif
A hairline `--rule` grid, echoing a solar array's cell pattern, may be used as a
structural device on ink sections and behind the installations gallery. **Structural,
not decorative** — it should align to actual content boundaries. Use it in at most two
places site-wide.

### Surfaces
```
--radius: 2px;   /* Effectively square. Technical, not friendly. */
```
**No drop shadows anywhere.** Separation comes from `--rule` hairlines and from
background changes between `--white`, `--paper` and `--ink`. The 8px-radius-plus-soft-grey-shadow
card is Bootstrap-era default styling and it is the thing that makes a build read as
templated.

### The card problem
The current site uses a row of three icon + heading + paragraph cards ("Renewable
Energy Solution / Big Savings / Ideal for Commercial Use"). Do not rebuild this pattern.
Chopping all content into identical rounded cards flattens hierarchy — everything ends
up looking equally important, which means nothing does.

Where genuinely parallel items exist, use a **ruled list or a table**, not cards.
Cards are permitted only for items that are genuinely browsable objects: products,
installations.

---

## 6. Components

### The hero
**The calculator is the hero.** Not a headline over a photograph with the calculator
linked below — the working input, above the fold, on the homepage.

This follows from the brief: the most characteristic thing in this business's world is
the moment a homeowner finds out what solar actually costs them after subsidy. Leading
with it is both the strongest design choice and the strongest commercial one. It is
also what no competitor in Tricity is doing.

```
┌─────────────────────────────────────────────────────┐
│  What will solar cost you                           │  Display, ink on paper
│  after the subsidy?                                 │  left-aligned, no centre
│                                                     │
│  Your monthly electricity bill                      │  Sans 500
│  ┌──────────────────┐  ┌──────────────────────┐     │
│  │ ₹ 4,200          │  │  Calculate           │     │  ink on --signal
│  └──────────────────┘  └──────────────────────┘     │
│                                                     │
│  ───────────────────────────────────────────────    │  --rule hairline
│  UTL Solar distributor · Mohali · 5.0 ★ 33 reviews  │  Small, slate
└─────────────────────────────────────────────────────┘
    full-bleed photograph of a real RSK rooftop install
```

### Buttons
```
Primary    ink text on --signal, 2px radius, no shadow, no gradient, no arrow
Secondary  ink text, 1px --rule border, transparent fill
Tertiary   ink text, 1px underline
```
Label the action precisely. "Calculate my savings", not "Submit". "Ask about a 3kW
system on WhatsApp", not "Contact us". The button says what happens.

### Spec tables — a first-class component
Tables are a primary design element here, not a fallback. Mono tabular figures,
right-aligned values, `--rule` hairlines between rows, no zebra striping, generous row
height. The existing UTL battery spec table is the model.

### Sticky mobile bar
Fixed bottom, ink ground: `WhatsApp | Call | Calculate`. Present on every page. This
replaces the contact page.

### Header
Logo, phone number, one signal-filled CTA. Google rating badge (5.0, 33 reviews) at
small size. Nothing else.

---

## 7. Voice

Plain, specific, technical. Write like a competent engineer explaining something to a
customer who is smart but not an expert.

**Specificity is the credibility.** Name the system size, the model number, the rupee
figure, the town, the number of days. Vague enthusiasm reads as a company with nothing
concrete to say.

Say the difficult thing plainly. When a household under 300 units/month would not
benefit from solar, tell them. Telling someone the truth against your own short-term
interest is the most powerful trust signal available, and it costs a lead that was
never going to convert well anyway.

| Don't | Do |
|---|---|
| "Power up your life with RSK Solar Energy" | "3kW rooftop solar in Mohali. ₹78,000 subsidy. We handle the paperwork." |
| "Innovative and sustainable solutions" | "ALMM-listed panels. MNRE-empanelled. Net metering filed for you." |
| "Contact us today!" | "Send us your last electricity bill on WhatsApp" |
| "Affordable pricing" | The actual price |

Sentence case everywhere. Active voice. No exclamation marks. Errors explain what went
wrong and how to fix it.

---

## 8. Photography

Real RSK installations only. No stock.

Shoot or source: rooftops in Mohali, Kharar, Zirakpur with panels mounted; installers
working; inverters and battery banks wired in situ; the meter; the team. Harsh Punjab
midday light with hard shadows is *correct* — do not filter toward soft golden-hour
warmth.

Where a real photograph does not exist for a section, use a spec table, a numeric
readout, or a full-bleed ink block. **Never fill the gap with stock.** Flag it in
`TODO-content.md` instead.

Every image: WebP/AVIF, explicit dimensions, descriptive alt text naming the location
and system size where known ("8kW rooftop array, residential install, Sector 91 Mohali").

---

## 9. The pre-ship check

Before any page is considered done, verify none of the following is true. Each one is a
reason the current build was rejected as "generic" and "templated".

- [ ] Anything is centre-aligned that is not a standalone readout
- [ ] A row of three identical icon-heading-paragraph cards exists
- [ ] Any element has a drop shadow
- [ ] Any gradient appears anywhere
- [ ] Border radius exceeds 2px
- [ ] Stock photography is used
- [ ] Every section has identical vertical padding
- [ ] `--signal` appears more than twice in one viewport
- [ ] An ALL-CAPS tracked eyebrow label sits above a heading
- [ ] A button or link ends in `→`
- [ ] Mono is used for a label rather than a numeric value
- [ ] Copy contains a sentence that could belong to any company in any industry
- [ ] Everything sits inside one container with nothing breaking the grid
- [ ] A section animates in on scroll
- [ ] Fonts load from a CDN rather than self-hosted
- [ ] The page exceeds its performance budget on a mid-range Android over 4G

**Then remove one thing.** The last decorative element added is almost always the one
that should not have been.
