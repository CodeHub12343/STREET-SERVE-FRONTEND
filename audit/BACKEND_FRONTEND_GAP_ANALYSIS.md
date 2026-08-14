# StreetServe — Backend ↔ Frontend Gap Analysis

> **Purpose:** For each spec capability, show which side (backend / frontend) exists, and classify the gap as **Needs-BE** (frontend waiting on backend), **Needs-FE** (backend waiting on frontend), **Both** (neither meaningfully built), or **Aligned** (both present).
> **Grounding:** read-only source inspection. `[NV]` = needs verification next pass.
> **Companion to** `FEATURE_COMPLETION_MATRIX.md` (uses the same R-numbers).

---

## 1. How to read this

The classic gap question is *"where does one side outrun the other?"* For StreetServe the answer is unusual: the **backend generally leads the frontend** on commerce primitives (a full payments/settlement engine exists), while **both sides are aligned and strong on discovery/real-time**, and **both are absent on Rent-to-Own and most monetization**. So the dominant gap types are **Aligned-and-done**, **Both-missing**, and a cluster of **Needs-FE** where backend capability is under-consumed.

---

## 2. Aligned & largely built (low residual risk)

| # | Capability | Backend | Frontend | Residual gap |
|---|---|---|---|---|
| R4 | Live GPS map | `modules/livemap/*` (+ `liveStore`, geohash, TTLs) | `features/livemap`, `/map`, `/map/list` | Runtime realtime validation [NV] |
| R5 | Wave Down | `WaveDownModel` + queue service/controller/routes | `features/wave`, `/business/[id]/wave`, `/wave/[id]`, `/vendor/wave-downs` | E2E accept/expire UX [NV] |
| R6 | Lineup / Queue | `QueueModel`/`QueueEntryModel`, discount lock, holds | `features/queue`, `/queue/[ownerId]`, `/vendor/queue` | Reflow/hold-expiry UX [NV] |
| R7 | 10% marketplace fee | `payments.service.charge()` destination charge w/ `applicationFeeCents` | `orders/breakdown.ts` shows fee | Confirm fee applies uniformly to all order types (not only consignment path) |
| — | Payouts/settlement | Stripe Connect onboarding, tiered payout, `payoutTransfer`, `reconcile`, immutable `Settlement` | `/vendor/payouts`, `/seller/earnings`, `/hub/settlements` | Confirm FE surfaces all settlement states [NV] |

**Action:** these need **verification, not construction.** One realtime + one commerce E2E pass closes most of the residual.

---

## 3. Needs-FE (backend capability under-consumed by frontend)

| # | Capability | Backend evidence | Frontend gap |
|---|---|---|---|
| R13 | Refunds / partial refunds | `payments.service.refund()` + `refundAmount()` | No confirmed customer/vendor refund-initiation + fee-return UX |
| R17 | Consignment returns/condition | `InventoryReturn` (condition assessment), `overdue` sweep index | Return-Pending status + return-terms UX absent |
| R31c | Inventory management | consignment `Product`/`InventoryCheckout` with atomic stock | Richer inventory-management FE incomplete |
| R31b | Analytics | `dashboard.service`, `bizMetrics`, AI engine | `/vendor/analytics` present but partial vs spec business-tools scope |
| R28 | Agreement acceptance | `SellerAgreementAcceptanceModel` (versioned clickwrap) | Only bailment agreement surfaced; needs generalized agreement UX |

**Action:** build **thin frontend consumers** over existing backend contracts. Low-to-medium effort, high leverage.

---

## 4. Needs-BE (frontend ahead of / waiting on backend)

| # | Capability | Frontend evidence | Backend gap |
|---|---|---|---|
| R1 | Discount optionality | `QueueDiscountCard` renders tiers; discount is a first-class FE concept | Confirm BE does **not** gate Live/listing on a discount schedule; encode optionality rule |
| R9 | Checkout itemization | `orders/breakdown.ts` previews lines (marked demo/preview) | Server must return authoritative tax/delivery/service/processing lines |
| R12 | Seller fee calculator | seller flows exist (`/seller/*`) | Pre-publish payout-preview endpoint (incl. RTO) [NV] |

**Note:** several FE previews (`breakdown.ts` hardcodes `*0.1`; `lib/demo.ts` demo mode) are explicitly *not* server-backed. These are **latent Needs-BE** items — they look done in the UI but rely on demo math.

---

## 5. Both missing (net-new on both ends)

| # | Capability | Notes |
|---|---|---|
| R1b | "Trending" incentive surface | No ranking surface rewarding discounts, either side |
| R10 | Customer 3% service fee | Fee type unmodeled |
| R11 | Promoted-product pricing | Promotion product + billing + placement |
| R14–R18 | Consignment agreement lifecycle | Durations, renewal, expiry-notices, price controls, return-pending terms |
| R19 | Consignment-RTO 3-party split | Depends on RTO core |
| R20–R27 | **Rent-to-Own (entire domain)** | Agreement, schedules, dashboard, grace/missed-payment machine, buyout, condition docs, ownership transfer, per-installment fee, approval gate |
| R28 (3 of 4) | Regular-sale / RTO / consignment-RTO agreements | Only bailment exists |
| R29–R32 | Most monetization/business-tool/community features | Long greenfield tail |

**Action:** these are **build-from-spec**. RTO (R20–R27) is the marquee effort and should be scoped as its own module mirroring the existing `payments`/`consignment` layering and financial-correctness discipline (immutable ledgers, idempotency).

---

## 6. Structural recommendations for closing gaps

1. **Introduce an `rto` backend module** (`rto.model/service/repository/controller/routes/schema`) parallel to `consignment`, reusing `payments.service` for per-installment destination charges and the immutable-settlement pattern for the ownership-credit ledger.
2. **Generalize the agreement model** (`SellerAgreementAcceptance` → `AgreementAcceptance` with an `agreement_type`) to cover all 4 required agreements (R28) in one place.
3. **Promote checkout math server-side**: make the server the single source for the full itemization (R9) and retire the FE `*0.1` preview once real endpoints land — track via the existing `API_CONTRACT_RECONCILIATION.md`.
4. **Add a fee-type registry** (marketplace / consignment / RTO-installment / customer-service / setup / late / promotion) so new fee types (R10, R11, R26) are config, not scattered constants — extend the `FeeSchedule`/constants pattern already in place.
5. **Encode the discount-optional rule (R1)** where the Live-status gate lives, and add a Trending signal that reads the discount schedule as an input rather than a requirement.

---

## 7. Gap summary

| Gap type | Count (spec items) | Effort character |
|---|---|---|
| Aligned & done | 5 | Verify only |
| Needs-FE | 5 | Thin consumers |
| Needs-BE | 3 | Server contracts |
| Both missing | ~20 (incl. RTO domain) | Build from spec |

The **critical path to MVP** runs through the *Both-missing* commerce cluster (R14–R18, R20–R27) plus the two cheap-but-flagship rule/checkout items (R1, R9). Discovery/real-time is a **verify-and-ship**, not a build.

*Next: `MISSING_FEATURES.md` and `PARTIALLY_IMPLEMENTED_FEATURES.md` expand these lists; `IMPLEMENTATION_PRIORITY.md` sequences them.*
