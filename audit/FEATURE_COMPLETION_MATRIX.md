# StreetServe — Feature Completion Matrix

> **Source of truth:** the pasted *StreetServe Update* spec only (see `PROJECT_AUDIT_REPORT.md §2` for the extracted R1–R32 requirements).
> **Grounding:** statuses derive from read-only source inspection. `[NV]` = needs runtime/source verification in a later pass.
> Every spec feature appears **exactly once**. Completion % is an engineering estimate of *spec coverage*, not code quality.

### Legend
- **Status:** `Fully` · `Partial` · `Missing` · `Refactor` · `Bugfix` · `UX` · `Needs-BE` · `Needs-FE`
- **FE / BE:** ✅ done · 🟡 partial · ⛔ absent · ➖ n/a
- **Complexity:** S (≤2d) · M (3–8d) · L (2–4wk) · XL (>4wk)
- **Priority:** P0 (MVP blocker) · P1 (MVP) · P2 (post-MVP) · P3 (future)

---

## A. Product rules & onboarding

| # | Feature | Status | % | FE | BE | Deps | Missing work | Priority | Cx | Next step |
|---|---|---|---|----|----|------|--------------|----------|----|-----------|
| R1 | Discounts optional (not mandatory) | Partial | 55 | 🟡 | 🟡 | discount engine | Confirm/encode optionality; don't gate Live/list on a discount schedule | P0 | S | Trace Live-status gate + product sign-off |
| R1b | "Discount → Trending" incentive | Missing | 10 | ⛔ | ⛔ | R1, ranking | Define + build a Trending surface that rewards discounting | P1 | M | Spec the ranking signal |
| R2 | Simple Vendor Sign-Up dashboard (profile → optional discount → go Live) | Partial | 70 | 🟡 | ✅ | vendors module | Verify the end-to-end "plug-and-play" flow matches spec simplicity | P0 | S | Walk `/vendor/register` → Live [NV] |
| R3 | All mobile-business types (not just food) | Partial | 60 | 🟡 | 🟡 | categories | Confirm category taxonomy covers mechanics/detailers/groomers/medical/etc. | P1 | S | Audit `catalog` categories + `CATEGORY_TABS` |
| R2b | Business integration/API portal | Deferred | — | ➖ | ➖ | — | Intentionally out of launch scope per 7/9 decision | P3 | XL | Revisit at enterprise phase |

## B. Discovery & real-time

| # | Feature | Status | % | FE | BE | Deps | Missing work | Priority | Cx | Next step |
|---|---|---|---|----|----|------|--------------|----------|----|-----------|
| R4 | Live GPS discovery / real-time map | Fully | 90 | ✅ | ✅ | Socket.IO, Redis | Runtime realtime validation | P0 | — | Exercise live session flow [NV] |
| R5 | Wave Down button | Fully | 90 | ✅ | ✅ | livemap, notifications | Confirm SLA/expiry + vendor accept UX end-to-end | P0 | S | E2E wave flow [NV] |
| R6 | Lineup (virtual queue + position) | Fully | 90 | ✅ | ✅ | discount engine | Confirm hold-expiry + reflow UX | P0 | S | E2E queue flow [NV] |

## C. Marketplace, fees & payouts

| # | Feature | Status | % | FE | BE | Deps | Missing work | Priority | Cx | Next step |
|---|---|---|---|----|----|------|--------------|----------|----|-----------|
| R7 | 10% marketplace fee on sales | Fully | 85 | 🟡 | ✅ | Stripe Connect | Fee engine exists (`applicationFeeCents`); confirm applies to *all* sale types not just consignment | P0 | S | Verify fee source per order type |
| R8 | Processing fee charged separately | Partial | 40 | ⛔ | 🟡 | Stripe | Not itemized as its own line; Stripe automatic-tax on but processing pass-through absent | P1 | M | Model processing-fee line |
| R9 | Full checkout itemization (subtotal/tax/delivery/service/processing/tip/total) | Partial | 45 | 🟡 | 🟡 | R8, R10 | Add tax, delivery/shipping, service, processing as first-class lines | P0 | M | Extend `breakdown.ts` + server total |
| R10 | Optional 3% customer service fee (min $0.50 / max $10) | Missing | 0 | ⛔ | ⛔ | R9 | Config-flag fee type; off at launch but modeled | P1 | M | Add fee-type config |
| R11 | Promoted-product pricing ($5/$15/$40) | Missing | 5 | ⛔ | ⛔ | payments, ranking | Promotion product + billing + placement | P2 | L | Spec promotion model |
| R12 | Seller fee calculator (pre-publish) | Missing | 10 | ⛔ | 🟡 | R7 | `seller/earnings` is a **placeholder stub** ("depends on GAP-6"); build pre-publish payout preview incl. RTO | P1 | M | Build earnings + calculator screen |
| R13 | Refund/fee policy (proportional, tips returned) | Partial | 55 | ⛔ | 🟡 | payments | `refund`/`refundAmount` exist; encode fee-return + tip-return rules | P1 | M | Add fee-adjustment on refund |

## D. Consignment

| # | Feature | Status | % | FE | BE | Deps | Missing work | Priority | Cx | Next step |
|---|---|---|---|----|----|------|--------------|----------|----|-----------|
| R14 | Consignment durations + default 30d + no-limit | Partial | 30 | ⛔ | 🟡 | consignment | Add term model (7…365/custom/no-limit); only `return_window_hours` today | P1 | M | Extend checkout schema |
| R15 | Expiry notifications 14/7/3/on-date + actions | Missing | 5 | ⛔ | ⛔ | R14, BullMQ, notifications | Scheduled notices + Extend/Return/Reduce/Continue/End actions | P1 | L | Add scheduler jobs |
| R16 | Auto-renewal (opt-in, configurable) | Missing | 0 | ⛔ | ⛔ | R14, R15 | Renewal model + pre-renewal notice + opt-out | P2 | M | — |
| R17 | Unsold → Return-Pending + return terms | Partial | 25 | 🟡 | 🟡 | R14 | Add Return-Pending status, storage-fee/abandonment terms | P1 | M | Extend status enum + terms |
| R18 | Pricing controls (owner min price, discount/bundle perms) | Missing | 5 | ⛔ | ⛔ | consignment | Min-authorized-price + seller price-change permissions | P1 | M | Add price-control fields |
| R19 | Consignment Rent-to-Own (3-party split + statements) | Missing | 0 | ⛔ | ⛔ | R14, RTO, payments | 3-party split ledger + per-party statements | P2 | XL | After RTO core |

## E. Rent-to-Own

| # | Feature | Status | % | FE | BE | Deps | Missing work | Priority | Cx | Next step |
|---|---|---|---|----|----|------|--------------|----------|----|-----------|
| R20 | RTO agreement terms (cash price, ownership credit, buyout) | Missing | 0 | ⛔ | ⛔ | payments, legal | Agreement model + disclosure surface | P1 | L | New `rto` module |
| R21 | RTO payment schedules + live dashboard (ownership %) | Missing | 0 | ⛔ | ⛔ | R20, BullMQ | Installment ledger + schedule engine + dashboard | P1 | L | — |
| R22 | Grace periods + reminders + missed-payment state machine | Missing | 0 | ⛔ | ⛔ | R20, R21, notifications | Full status machine (Due→Grace→Late→…→Cancelled) | P1 | L | — |
| R23 | Early purchase / payoff (locked formula) | Missing | 0 | ⛔ | ⛔ | R20 | Immutable buyout formula + live payoff amount | P1 | M | — |
| R24 | Condition documentation (delivery + return) | Missing | 0 | ⛔ | ⛔ | storage | Photo/video/serial capture both ends | P1 | M | Reuse consignment condition-photo pattern |
| R25 | Ownership transfer on completion | Missing | 0 | ⛔ | ⛔ | R20–R23 | Paid-in-Full receipt + proof-of-ownership doc | P1 | M | — |
| R26 | 10% fee/installment + setup/late fees | Missing | 0 | ⛔ | ⛔ | R20, payments | Per-installment application fee + optional setup/late | P1 | M | Extend fee engine |
| R27 | RTO approval gate (approved sellers/categories, no vehicles) | Missing | 0 | ⛔ | ⛔ | R20, admin | Eligibility gate + admin approval | P1 | M | Reuse `requireFeature`/RBAC |

## F. Legal / compliance

| # | Feature | Status | % | FE | BE | Deps | Missing work | Priority | Cx | Next step |
|---|---|---|---|----|----|------|--------------|----------|----|-----------|
| R28 | 4 separate digital agreements (regular/consignment/RTO/consignment-RTO) | Partial | 25 | 🟡 | 🟡 | legal review | Have bailment clickwrap only; add 3 more + attorney review | P1 | M | Generalize acceptance model |

## G. Monetization "50 features" (representative — full list in MISSING_FEATURES.md)

| # | Feature | Status | % | FE | BE | Priority | Cx |
|---|---|---|---|----|----|----------|----|
| R30a | Pro membership tiers ($19.99–$99/mo) | Missing | 0 | ⛔ | ⛔ | P2 | L |
| R30b | Featured placement / sponsored pins / sponsored search | Partial | 15 | 🟡 | 🟡 | P2 | L |
| R30c | Verified-badge subscription | Partial | 20 | 🟡 | 🟡 | P2 | M |
| R30d | Ads dashboard / banner / video ads | Missing | 0 | ⛔ | ⛔ | P3 | L |
| R30e | AI marketing assistant (subscription) | Partial | 30 | 🟡 | 🟡 | P2 | M |
| R30f | POS system | Missing | 0 | ⛔ | ⛔ | P3 | XL |
| R30g | Fleet GPS subscription | Missing | 0 | ⛔ | ⛔ | P3 | L |
| R30h | Financing / insurance / fuel / wholesale-club marketplaces | Missing | 0 | ⛔ | ⛔ | P3 | XL |
| R29a | Storefronts (as a product) | Partial | 35 | 🟡 | 🟡 | P2 | L |
| R29b | Pre-order / scheduled pickup | Partial | 40 | 🟡 | 🟡 | P2 | M |
| R29c | Gift cards | Partial | 25 | 🟡 | 🟡 | P2 | M |
| R29d | Loyalty rewards | Missing | 5 | ⛔ | ⛔ | P2 | M |
| R29e | Customer subscriptions | Missing | 0 | ⛔ | ⛔ | P3 | L |
| R29f | Flash sales / countdown | Missing | 5 | ⛔ | ⛔ | P2 | M |
| R29g | Wholesale / used-equipment marketplaces | Missing | 0 | ⛔ | ⛔ | P3 | L |
| R31a | Business tools (employee/shift/expense/mileage/tax/invoice/CRM) | Missing | 5 | ⛔ | ⛔ | P3 | XL |
| R31b | Analytics dashboard | Partial | 40 | 🟡 | 🟡 | P2 | M |
| R31c | Inventory management | Partial | 50 | 🟡 | ✅ | P2 | M |
| R32a | Community (events/festivals/meetups/mentorship/voting/roadside) | Partial | 15 | 🟡 | 🟡 | P3 | L |
| R32b | Referral rewards | Partial | 30 | 🟡 | 🟡 | P2 | M |
| R32c | Charity / fundraising days | Partial | 25 | 🟡 | 🟡 | P3 | M |

---

## Rollup

| Category | Fully | Partial | Missing/Deferred |
|---|---|---|---|
| Product rules & onboarding (A) | 0 | 3 | 2 |
| Discovery & real-time (B) | 3 | 0 | 0 |
| Marketplace/fees (C) | 1 | 4 | 2 |
| Consignment (D) | 0 | 3 | 3 |
| Rent-to-Own (E) | 0 | 0 | 8 |
| Legal (F) | 0 | 1 | 0 |
| Monetization (G, representative) | 0 | 12 | 9 |

**Reading:** the **core discovery/real-time slice is effectively done**; **commerce is half-built**; **Rent-to-Own is entirely open**; **monetization is a long, mostly-greenfield tail**. MVP effort concentrates in categories C, D, E and rule R1.

*Complexity/% figures are planning estimates pending the `[NV]` runtime verification pass.*
