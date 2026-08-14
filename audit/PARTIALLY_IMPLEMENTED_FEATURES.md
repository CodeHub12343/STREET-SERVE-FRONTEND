# StreetServe — Partially Implemented Features

> Features that **exist but fall short** of the new update spec. Each lists what's built, what's missing, and the residual work. R-numbers per `PROJECT_AUDIT_REPORT.md §2`.

---

## R1 — Discount optionality & the "discount-to-trend" incentive
**Built:** `DiscountScheduleModel` (per-owner tiers + `cap_percent`), snapshot-at-join (`discount_percent_locked`), FOMO `QueueDiscountCard`.
**Short of spec:** (a) optionality not confirmed — `cap_percent` is `required`; must ensure a business can go Live / list with **no** discount; (b) no "Trending" surface that rewards discounting.
**Residual:** trace the Live-status gate; make discount schedule optional; build a Trending ranking that *reads* the discount as a boost signal, not a gate. **Cx S–M, P0/P1.**

## R2 — Vendor Sign-Up dashboard
**Built:** `vendors` module + `vendor/register`, `hub/register`.
**Short of spec:** "plug-and-play" simplicity (profile → optional discount → toggle Live) not verified end-to-end.
**Residual:** walk the flow; strip any friction beyond the spec's 3 steps. **Cx S, P0. [NV]**

## R7/R8 — Marketplace fee + processing fee
**Built:** single 10% platform fee via Stripe destination charge (`applicationFeeCents`), versioned `FeeSchedule.consignment_fee_bps`, tips/round-up pass-through, refunds, tiered payouts, reconciliation.
**Short of spec:** fee is modeled as one "consignment_fee_bps" for all paths; processing fee not itemized as a distinct pass-through line.
**Residual:** confirm the 10% applies to *all* sale types (regular/wave/consignment); add a processing-fee line to the itemization. **Cx M, P0/P1.**

## R9 — Checkout itemization
**Built:** `orders/breakdown.ts` previews subtotal / discount / tip / 10% platform fee (explicitly demo/preview; hardcodes `*0.1`).
**Short of spec:** no tax, delivery/shipping, service-fee, or processing-fee lines; math is client-side preview, not server-authoritative for those lines.
**Residual:** server returns full authoritative itemization; FE renders all lines; retire the hardcoded preview. **Cx M, P0.**

## R12 — Seller fee calculator
**Built:** backend fee mechanics exist; **frontend `seller/earnings` is a placeholder stub** ("depends on GAP-6").
**Short of spec:** no pre-publish payout preview (regular or RTO).
**Residual:** build the earnings screen + a pre-publish calculator using existing fee data. **Cx M, P1.**

## R13 — Refund / fee policy
**Built:** `payments.service.refund()` + `refundAmount()` (partial), audit trail, events.
**Short of spec:** fee-return-on-full-cancel, proportional-fee-on-partial, tip-return rules not encoded; no customer/vendor refund-initiation UX confirmed.
**Residual:** encode fee-adjustment rules; add refund UX. **Cx M, P1.**

## R14–R18 — Consignment lifecycle
**Built:** `Hub`/`Product`/`InventoryCheckout`/`InventorySale`/`InventoryReturn`/immutable `Settlement`; `return_window_hours`, `expected_return_at`, `overdue` sweep index, condition assessment.
**Short of spec:** no term model (durations/default-30d/no-limit), no expiry-notice cadence, no auto-renewal, no Return-Pending status, no owner min-price/price controls.
**Residual:** extend checkout schema with term + status; add scheduled notices; add price-control fields. **Cx M–L, P1–P2.**

## R3 — All mobile-business types
**Built:** `Category` model with `top_level_tab` (food/coffee/services/shopping/more), `requires_license`, `regulated_by`; taxonomy is seed data.
**Short of spec:** confirm seeded categories actually span mechanics/detailers/groomers/medical/barbers/pressure-washers/landscapers/roadside/delivery/boutiques.
**Residual:** audit + extend the category seed. **Cx S, P1. [NV]**

## R28 — Digital agreements
**Built:** `SellerAgreementAcceptanceModel` (versioned clickwrap bailment, `SELLER_AGREEMENT_VERSION`).
**Short of spec:** 1 of 4 agreements; no regular-sale / RTO / consignment-RTO agreements; no attorney-review gate.
**Residual:** generalize to `AgreementAcceptance{agreement_type}`; add 3 agreement bodies; compliance review. **Cx M, P1.**

## Monetization partials (revenue hooks that exist but aren't productized)
| Feature | Built | Short of spec |
|---|---|---|
| Featured/sponsored (R30b) | `sponsors` module, `vendor/ping-budget` | Not a paid placement/ranking product |
| Verified badge (R30c) | verification tiers (`trust`, tier ladder) | Not a paid subscription badge |
| AI marketing assistant (R30e) | `ai` coaching/recs (`hub/ai`, `seller/ai`) | Not a subscription-gated product |
| Analytics (R31b) | `dashboard`, `bizMetrics`, `vendor/analytics` | Not the full business-tools suite |
| Inventory (R31c) | consignment `Product`/checkout atomic stock | No standalone inventory-management UX |
| Storefronts (R29a) | business profiles (`BusinessProfileSheet`) | Not a productized storefront |
| Pre-order/pickup (R29b) | `scheduling` bookings | Not order-ahead for goods |
| Gift cards (R29c) | `growth` gifting (`business/[id]/gift`) | Gifting ≠ stored-value gift cards |
| Membership fee overrides | `FeeSchedule.membership_overrides` (Mixed) | Pro-tier plumbing exists but no plans/billing |

---

## Priority reading
The **P0/P1 partials** (R1, R2, R7/R8, R9, R12, R13, R14–R18, R3, R28) are the MVP finishing work. The monetization partials are **post-MVP** — but note several have real backend hooks (`membership_overrides`, `sponsors`, tier ladder) that lower their future cost.
