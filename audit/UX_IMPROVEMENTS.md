# StreetServe — UX Improvements

> UX gaps/opportunities measured against the new spec's intent (simple plug-and-play onboarding, transparent fees, clear consignment/RTO terms). `[Observed]` grounded in source; `[Verify]` to confirm in the runtime pass.

---

## Onboarding & discounts (spec's flagship simplicity)

**U1 — Keep Vendor Sign-Up to the spec's 3 steps.** (R2)
Spec: "create profile → set **optional** discounts → toggle Live." Verify `vendor/register` doesn't force discount setup or extra steps. Make the discount step **skippable with a clear "add later"** and a nudge explaining it boosts Trending. **[Verify]**

**U2 — Make discount optionality legible.** (R1)
Wherever a vendor configures discounts, copy should say discounts are optional and frame them as the path to Trending/visibility — not a requirement. `QueueDiscountCard` is customer-facing FOMO; add the vendor-facing "why discount?" framing.

**U3 — Build a "Trending" surface customers can feel.** (R1b)
The discount incentive only works if there's a visible payoff. Design a Trending row/section on the map/discovery that visibly rewards discounting vendors.

## Fee & checkout transparency (spec §31–§34 is explicit about disclosure)

**U4 — Full, itemized, pre-confirmation checkout.** (R9)
Spec requires showing subtotal, tax, delivery/shipping, service fee, processing fee, tip, total **before** confirm. Current preview shows subtotal/discount/tip/platform-fee only. Add every line; never surprise the customer post-tap. Especially for **Wave-Down**, show travel/convenience fees before confirm (spec is emphatic).

**U5 — Seller fee calculator before publishing.** (R12)
`seller/earnings` is currently a placeholder. Sellers need a live "you'll receive $X after fees" preview while setting price — including RTO installment math. This is both UX and trust.

**U6 — Refund clarity.** (R13)
When cancelling/refunding, show what's returned (fee? tip? proportional?) per the policy. Avoid ambiguity about non-refundable processing fees.

## Consignment & RTO terms (comprehension is the UX)

**U7 — Consignment term selection + countdown.** (R14/R15)
Let owners pick duration (default 30d, no-limit option) in plain language; show a live countdown and the expiry-action choices (Extend/Return/Reduce/Continue/End) surfaced *as notifications*, not buried.

**U8 — RTO disclosure screen.** (R20)
The single most important RTO UX: one screen showing cash price vs total-to-own, per-payment split (rental vs ownership credit), schedule, early-payoff, and "this may cost more than buying outright." Spec mandates the customer sees full cost before accepting.

**U9 — RTO progress dashboard.** (R21)
Ownership %, next due, balance, payments made/remaining — a motivating, glanceable progress view. Treat like a goal tracker.

**U10 — Missed-payment tone.** (R22)
Reminders and grace-period messaging should be supportive ("let's set up a catch-up plan"), matching the spec's "encourage communication before cancellation." Offer partial payment / arrangement inline.

## Cross-cutting

**U11 — No navigable dead-ends.** Gate placeholder routes (e.g. `seller/earnings`) or finish them; a link to a stub reads as broken. **[Observed]**

**U12 — Consistent money formatting.** Integer-cents discipline is good server-side; ensure all surfaces format consistently (currency, rounding, tip display) — reuse `lib/money`.

**U13 — Accessibility continuity.** The codebase already invests in a11y (vitest-axe, brand-palette AA work per project history). Hold new commerce/RTO screens (dense tables, countdowns, progress meters) to the same AA bar — especially color-encoded discount tiers and status chips.

---

## Priority
| # | Improvement | Tie to spec | Priority |
|---|---|---|---|
| U4 | Full checkout itemization | R9 (mandated) | P0 |
| U1/U2 | Optional-discount onboarding + framing | R1/R2 | P0/P1 |
| U3 | Trending surface | R1b | P1 |
| U5 | Seller fee calculator | R12 | P1 |
| U7 | Consignment term UX | R14/R15 | P1 |
| U8/U9/U10 | RTO disclosure/progress/missed-payment | R20–R22 | P1 (RTO phase) |
| U6/U11/U12/U13 | Refund clarity, no dead-ends, money fmt, a11y | — | P1/ongoing |
