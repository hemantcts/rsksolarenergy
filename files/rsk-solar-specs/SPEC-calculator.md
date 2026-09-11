# SPEC-calculator.md — Solar Savings & Subsidy Calculator

Route: `/solar-calculator/`, plus an embedded compact version in the homepage hero.

This is the highest-value asset on the site. Build it first. Test it thoroughly.

---

## 1. What it does and why

A visitor enters their electricity bill. They get back: recommended system size, gross
cost, PM Surya Ghar subsidy, net cost, annual savings, payback period, and 25-year
savings — then a WhatsApp CTA carrying that context into a conversation with RSK.

It works as three things at once: a lead magnet, an SEO asset targeting high-intent
queries ("3kW solar system price Punjab", "PM Surya Ghar subsidy calculator"), and a
sales tool that pre-qualifies enquiries.

**Correctness is the product.** A calculator that overstates savings gets caught the
moment the customer checks their bill, and it destroys exactly the competence signal the
whole site is built on. Where a figure is uncertain, show a range and say so.

---

## 2. The Punjab problem — read this before building

**Punjab provides domestic consumers 300 free units per month** (600 per bi-monthly
cycle). Households under that threshold have an effectively zero electricity bill.

For them, rooftop solar has **no payback on bill savings at all**. A naive calculator
would show a household using 250 units/month a healthy saving and a 5-year payback.
That number would be fiction.

### Required behaviour

```
IF category = Domestic
AND eligible for the free-units scheme
AND average monthly units ≤ 300 (config: FREE_UNIT_THRESHOLD)
THEN
  → Do NOT show a payback figure.
  → Show an honest explanation: their bill is already near zero, so solar
    cannot pay back on savings alone.
  → Offer the cases where it still makes sense:
      · consumption expected to rise (new AC, EV, extension, growing family)
      · frequent outages, where backup value is the real return
      · a plan to exceed 300 units soon
  → CTA becomes "Talk to us about whether solar makes sense for you"
    rather than a savings pitch.
```

This will lose some leads. Those leads were never going to convert well, and saying so
plainly is the strongest trust signal the site has. It is also a genuine differentiator:
no competitor does this.

### Targeting consequence
The real addressable market is: domestic consumers **above** 300 units/month, plus
commercial, industrial and housing-society customers who get no free allowance and pay
Punjab's electricity duty on top. Worth reflecting in the site's content priorities.

---

## 3. Inputs

### Step 1 — consumption
Offer both, units preferred:
- **Monthly units (kWh)** — accurate. Prompt: "on your PSPCL bill, look for units
  consumed."
- **Monthly bill (₹)** — convenient, less accurate. Reverse-derive units through the
  telescopic slab structure. **Label every downstream result as an estimate.**

### Step 2 — consumer category
`Domestic | Commercial | Industrial | Housing Society | Agricultural`

Drives tariff, duty, free-units eligibility and — critically — **subsidy eligibility**.

### Step 3 — sanctioned load (kW)
Ask for it. It is on the bill.

**A PM Surya Ghar system cannot exceed the sanctioned load.** Oversized proposals
require a separate load-enhancement application first, and exceeding sanctioned load is
one of the most common causes of application rejection. If the recommended size exceeds
it, cap the system and surface a clear note that load enhancement is needed first — this
is useful, specific advice that demonstrates competence.

If the user doesn't know it, allow skipping, assume no cap, and flag the result as
requiring verification.

### Optional
- Roof area (sq ft) — rule of thumb ~100 sq ft per kW, config
- District — for the WhatsApp message context

### Not asked
Name, phone or email at any point before results. See §7.

---

## 4. Calculation

All constants live in `config/solar-config.ts`. **None are hardcoded in components.**

### 4.1 Bill → units (if bill entered)
Walk PSPCL telescopic slabs in reverse, subtracting fixed charges and electricity duty
first. Punjab uses telescopic slabs: units falling in each band are charged at that
band's rate, so cheaper units stay cheap as consumption climbs.

⚠️ **Published PSPCL slab rates disagree across secondary sources** (₹3.85–7.05,
₹3.85–8.15, ₹4.49–7.30 all appear in 2026 material). **Do not use any of these without
verification.** Someone at RSK must confirm current slabs, fixed charges, fuel
adjustment and duty against the PSERC tariff order at `pserc.gov.in` before launch, and
record the source and date in the config file.

### 4.2 Sizing
```
annual_consumption = monthly_units × 12
required_kwp       = annual_consumption / ANNUAL_YIELD_PER_KWP
required_kwp       = min(required_kwp, sanctioned_load_kw)
recommended_kwp    = round to nearest available size [1, 2, 3, 5, 10]
```

`ANNUAL_YIELD_PER_KWP` — Punjab typically sees roughly 4.0–4.5 kWh per kWp per day,
giving about 1,450–1,650 units per kWp per year. Config default 1,530. **RSK should
confirm against their own commissioned-system data** — they have real generation figures
from 80+ commercial and 50+ residential installs, which is better evidence than any
published average and worth using.

Apply a derating factor for real-world losses (soiling, temperature, inverter
efficiency, wiring). Config, default 0.80.

### 4.3 Cost
Per-kW pricing by size band, by system type (on-grid / off-grid / hybrid), from config.
**RSK must supply real numbers.** Do not invent them — use a clearly marked placeholder
and list it in `TODO-content.md`.

Show a range rather than a single figure. Actual cost varies with roof type, mounting
structure, cable runs and panel selection.

### 4.4 Subsidy — PM Surya Ghar Muft Bijli Yojana

```
Residential, grid-connected only:
  1 kW        → ₹30,000
  2 kW        → ₹60,000
  3 kW+       → ₹78,000  (hard cap, regardless of system size)
```

**Eligibility gates — apply all of these:**

| Gate | Rule |
|---|---|
| Category | Residential only. Commercial, industrial and agricultural get ₹0. |
| System type | Grid-connected only. Off-grid and hybrid generally do not qualify. |
| Panels | Must be ALMM-listed. Non-ALMM panels fail inspection and forfeit the subsidy. |
| Load | System size must not exceed sanctioned load. |
| Ownership | Applicant must own the roof. |

If a gate fails, show ₹0 subsidy **with the reason stated**. "Off-grid systems are not
eligible for PM Surya Ghar — here's why you might still want one" is more useful and
more credible than silently omitting the subsidy.

**Payment mechanism — state this clearly.** The subsidy is not an upfront discount. It
is credited by direct bank transfer roughly 30–45 days after DISCOM inspection and
redemption. The customer pays the gross amount first. Being upfront about this prevents
the most common and most damaging customer surprise in this business.

### 4.5 Savings and payback
```
annual_generation  = recommended_kwp × ANNUAL_YIELD_PER_KWP × DERATING
annual_savings     = value of offset units at the user's marginal slab rate
                     + export credit for surplus (net metering), if applicable
net_cost           = gross_cost − subsidy
simple_payback_yrs = net_cost / annual_savings
```

- Value units at the **marginal** (top) slab rate the household actually pays, not an
  average. Solar displaces the most expensive units first.
- Apply the free-units gate from §2 **before** any of this.
- Net metering export credit differs from the consumption tariff. Config, and verify.
- 25-year projection: apply a tariff escalation assumption (config, default 3%/yr) and
  a panel degradation assumption (config, default 0.5%/yr). **Label both as
  assumptions and show them.** Hiding assumptions inside a big number is what
  untrustworthy calculators do.

---

## 5. Output

Left-aligned. Mono tabular figures for all values. No animated counters.

```
RECOMMENDED SYSTEM

  3 kW on-grid                             ← Display
  Covers about 92% of your annual use      ← Sans, slate

  ─────────────────────────────────────    ← --rule
  System cost           ₹1,85,000 – 1,98,000
  PM Surya Ghar subsidy        − ₹78,000
  ─────────────────────────────────────
  Your net cost         ₹1,07,000 – 1,20,000    ← readout, emphasised

  Annual generation            4,590 units
  Annual saving                   ₹32,400
  Payback                     3.5 – 3.9 years
  25-year saving                 ₹11.4 lakh

  ─────────────────────────────────────
  Subsidy is paid to your bank account 30–45 days
  after DISCOM inspection — not deducted upfront.

  Estimate based on: 1,530 units/kWp/year, 3%/yr tariff
  rise, 0.5%/yr panel degradation. Your actual figures
  depend on roof orientation, shading and usage pattern.

  [ Send this to RSK on WhatsApp ]         ← ink on --signal
```

### Required alongside every result
- The assumptions, visibly, not hidden behind a tooltip
- A note that the estimate needs a site survey to firm up
- If sanctioned load capped the system, say so and explain load enhancement
- If any subsidy gate failed, say which and why

---

## 6. SEO

- Server-render default state so the page is fully indexable with content
- `FAQPage` schema on the questions below the calculator
- URL params for shareable/linkable states: `?units=450&category=domestic`
- Long-form supporting content beneath the tool — how the subsidy works, why
  applications get rejected, what documents are needed, how net metering works in
  Punjab. **The content is what ranks**; the tool is what converts.
- Internal links to each system-size page and to `/pm-surya-ghar-subsidy-punjab/`

---

## 7. Lead capture — do not gate

**Show the full result to everyone.** No email wall, no "enter your phone to see your
savings".

Gating suppresses shares and links, which are the things that make this page rank, and
it is exactly the friction that makes a visitor suspect the number is a sales device
rather than an answer.

Convert instead with a **WhatsApp deep link carrying the full context**:

```
https://wa.me/919417030347?text=<encoded>

Hi RSK, I used the calculator on your site.
Monthly bill: ₹4,200 (about 450 units)
Recommended: 3kW on-grid
Estimated net cost after subsidy: ₹1,07,000 – 1,20,000
Location: Mohali
I'd like to discuss this.
```

RSK receives a pre-qualified enquiry with sizing already done. That is worth more than a
gated email address.

Offer a secondary, genuinely optional "email me this estimate" for people who want a
record.

---

## 8. Testing

Unit tests required. The slab boundaries and eligibility gates are exactly the logic
that breaks silently.

**Boundary cases:**
- 299 / 300 / 301 units — the free-units threshold
- 1 / 2 / 3 / 4 / 10 kW — subsidy slab boundaries, and the 3kW cap holding above 3kW
- Recommended size exactly equal to, and one step above, sanctioned load
- Each PSPCL slab boundary
- Commercial and industrial → subsidy must be ₹0
- Off-grid and hybrid → subsidy must be ₹0
- Zero, negative, absurdly large and non-numeric inputs
- Bill-derived vs unit-derived paths producing consistent results

**Assertion that must always hold:** a domestic user at or under the free-units
threshold never sees a payback figure.

---

## 9. Config file

`config/solar-config.ts` — every value below needs verification before launch. Record
source and date against each.

```ts
export const SOLAR_CONFIG = {
  // ⚠️ VERIFY against pserc.gov.in tariff order. Sources conflict.
  pspcl: {
    domesticSlabs: [/* { upTo, ratePerUnit } */],   // TODO: verify
    fixedChargeMonthly: null,                        // TODO: verify
    electricityDutyPercent: null,                    // TODO: verify (13% and 18% both reported)
    fuelAdjustmentPerUnit: null,                     // TODO: verify — revised monthly
    freeUnitsPerMonth: 300,                          // TODO: confirm current eligibility rules
    sourceUrl: '',
    verifiedOn: '',
  },

  generation: {
    annualYieldPerKwp: 1530,   // units/kWp/yr — TODO: replace with RSK's own install data
    deratingFactor: 0.80,
    sqFtPerKw: 100,
  },

  // ⚠️ RSK must supply real pricing. Do not ship placeholders.
  pricing: {
    onGrid:  { /* per-kW by size band */ },   // TODO
    offGrid: { /* per-kW by size band */ },   // TODO
    hybrid:  { /* per-kW by size band */ },   // TODO
  },

  subsidy: {
    // PM Surya Ghar Muft Bijli Yojana
    slabs: [
      { kw: 1, amount: 30000 },
      { kw: 2, amount: 60000 },
      { kw: 3, amount: 78000 },   // cap — applies to 3kW and above
    ],
    residentialOnly: true,
    gridConnectedOnly: true,
    requiresAlmmPanels: true,
    disbursementDays: [30, 45],   // after DISCOM inspection
    verifiedOn: '',
  },

  projection: {
    tariffEscalationPercent: 3.0,    // assumption — must be shown to user
    panelDegradationPercent: 0.5,    // assumption — must be shown to user
    horizonYears: 25,
  },

  contact: {
    whatsappNumber: '919417030347',
    altPhone: '919041996918',
  },
} as const;
```

---

## 10. Open questions for RSK

Ask before building past the shell — do not guess these.

1. Real per-kW pricing for on-grid, off-grid and hybrid, by size band
2. Actual generation data from commissioned systems — better than any published average
3. Is RSK MNRE-empanelled for PM Surya Ghar? (Determines whether "we file it for you"
   can be claimed; it is a significant differentiator if true)
4. Which panel brands they supply, and confirmation those models are ALMM-listed
5. Typical install timeline, and typical subsidy-disbursement timeline in practice
6. Do they handle the net-metering application with PSPCL on the customer's behalf?
7. Commercial and industrial pricing structure — likely quite different
