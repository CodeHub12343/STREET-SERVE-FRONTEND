# StreetServe — Project Audit Report

> **Audit type:** Implementation gap analysis
> **Master specification:** The pasted *StreetServe Update* (7/9–7/12 James Bowser / Santiago Rueda thread + the Marketplace Fees / Consignment Terms / Rent-to-Own appendix §31–§60 + the "50 Features & Revenue Opportunities" list). This is the sole authoritative spec for this audit, per project decision.
> **Codebases audited:** `STREET-SERVE-APPLICATION` (Next.js PWA frontend) · `STREET-SERVE-APPLICATION-BACKEND` (Node/TS, MongoDB, Redis, BullMQ, Socket.IO, Stripe Connect)
> **Method:** Read-only inspection of source (no code modified). Findings are grounded in actual source files, not the pre-existing planning docs. Where a claim could not be confirmed from source in this pass it is explicitly marked **[Needs verification]**.
> **Date:** 2026-07-16

---

## 1. Executive summary

StreetServe is **substantially more built than a greenfield audit would assume.** Both repos are production-grade, modular, and internally consistent with their own pre-existing PRD (`docs/`), not stubs. The backend has ~24 domain modules (controller/service/repository/model/schema layering, immutable financial ledgers, Stripe Connect destination charges, tiered payouts, reconciliation). The frontend has ~55 routed pages across marketing, customer, vendor, seller (consignment), and admin surfaces.

The **delta introduced by this new spec** is where the gaps live. Measured against the *StreetServe Update* specifically, the picture is:

| Bucket | Verdict |
|---|---|
| **Discovery & real-time** (Live GPS, Wave Down, Lineup) | **Largely built.** Wave-Down and Lineup/Queue are fully modeled on both ends. |
| **Discount optionality** (7/9 rule change) | **Rule change not confirmed enforced.** Engine exists; "optional, not mandatory" + "discount to trend" incentive needs a product/enforcement pass. |
| **Marketplace fee structure** (§31–§34, §57–§59) | **Partial.** One uniform 10% fee exists; the spec's *multiple distinct* fee types do not. |
| **Consignment terms** (§35–§41, §54–§56) | **Partial.** A hub/checkout/settlement engine exists; the agreement-lifecycle (durations, renewal, expiry notices, price controls) does not. |
| **Rent-to-Own** (§42–§53) | **Missing.** The single largest gap. |
| **Legal agreements per transaction type** (§60) | **Partial (1 of 4).** |
| **50 revenue features / monetization tiers** | **Mostly future.** A handful exist (giveaways, gifting, sponsors, ping budget); most do not. |
| **Business integration portal** | **Intentionally deferred** by the spec itself (7/9 decision) — not a gap. |

**Bottom line:** There is no architectural crisis. The remaining work is **feature build-out concentrated in commerce (fees, consignment lifecycle, and especially Rent-to-Own) plus a monetization layer**, on top of a solid discovery/real-time core that is already close to the spec.

---

## 2. What the new spec actually asks for (extracted requirements)

The spec is a conversational thread plus a formal appendix. Distilled into auditable requirements:

**Product/business rules**
- **R1.** Discounts are **optional, not mandatory**, to join/list. Discounts become the incentive to reach the "Trending" surface. *(7/9 — James + Santiago)*
- **R2.** Onboarding is a **simple plug-and-play "Vendor Sign-Up" dashboard** (create profile → set optional discounts → toggle "Live" on the map). No integration/API portal at launch. *(7/9 decision)*
- **R3.** Mission scope is **all mobile business types**, not just food trucks (mechanics, detailers, groomers, medical, barbers, pressure washers, landscapers, roadside, delivery, boutiques…).

**Discovery & real-time**
- **R4.** Live GPS discovery / real-time map.
- **R5.** **Wave Down** button — customer actively signals need to nearby mobile businesses.
- **R6.** **Lineup** — customers join a virtual line, see position; businesses manage demand/route.

**Marketplace, fees & payouts (§31–§34, §57–§59)**
- **R7.** Standard **10% marketplace fee** on completed sales.
- **R8.** **Payment-processing fee** charged separately at processor's current rate; never guaranteed permanent.
- **R9.** Checkout must itemize: subtotal, tax, delivery/shipping, service fee (if any), processing fee (if passed), tip, total.
- **R10.** **Optional 3% customer service fee** (min $0.50, suggested max $10) — may be off at launch.
- **R11.** **Promoted product** pricing tiers ($5/1-day, $15/7-day, $40/30-day).
- **R12.** **Seller fee calculator** shown *before publishing* (payout preview, incl. RTO installment preview).
- **R13.** Refund/fee policy: platform fee refundable on full pre-fulfillment cancel; proportional on partial; processing fees may be non-refundable; tips returned on full cancel.

**Consignment (§35–§41, §54–§56)**
- **R14.** Every consignment has a **duration**: 7/14/30/60/90/180/365 days, custom end date, or **no fixed limit**. Default **30 days**.
- **R15.** **Expiration notifications** at 14/7/3 days and on the expiry date, with actions (Extend / Return / Reduce Price / Continue / End).
- **R16.** **Automatic renewal** (opt-in) with configurable intervals; both parties notified; either can disable.
- **R17.** **Unsold → Return Pending** status with return terms (who ships/pays, window, storage fees, abandonment).
- **R18.** **Pricing controls**: owner-set **minimum authorized price**; seller may/may-not discount/bundle/accept offers.
- **R19.** **Consignment Rent-to-Own** (3-party: owner / managing business / customer) with automatic payment splitting and per-party statements.

**Rent-to-Own (§42–§53)**
- **R20.** RTO agreement: cash price, initial payment, installment amount/frequency/count, total cost, rental vs ownership-credit portion, fees, early-payoff, buyout.
- **R21.** **Payment schedules** (daily/weekly/bi-weekly/twice-monthly/monthly/custom) + live dashboard (next due, balance, ownership %).
- **R22.** **Grace periods** + reminder cadence (before/on/late) + **missed-payment state machine** (Due → Grace → Late → Arrangement → Paused → Return → …).
- **R23.** **Early purchase / early payoff** with locked formula (seller cannot change post-acceptance).
- **R24.** **Condition documentation** (photos/video/serial) at delivery and return.
- **R25.** **Ownership transfer** on completion (Paid-in-Full receipt, proof-of-ownership doc, recovery rights removed).
- **R26.** **10% platform fee on every installment**; optional setup fee ($5–$25); optional late fee.
- **R27.** RTO restricted to **approved sellers / eligible categories**; vehicles excluded from standard program.

**Legal / compliance**
- **R28.** Separate **digital agreement** for each of: regular seller participation, consignment, RTO, consignment-RTO (§60). Attorney-reviewed before launch.

**Monetization layer (the "50 features")**
- **R29.** Storefronts, pre-order/scheduled pickup, gift cards, loyalty, subscriptions, flash sales, wholesale/used-equipment marketplaces.
- **R30.** Revenue: featured placement, sponsored search/pins, Pro membership ($19.99–$99/mo), verified-badge subscription, ads dashboard, video/banner ads, AI marketing assistant, fleet GPS subscription, POS, financing/insurance referral marketplaces.
- **R31.** Business tools: employee/shift mgmt, analytics, expense/mileage trackers, tax/invoice generators, inventory, CRM.
- **R32.** Community: events calendar, festivals directory, meetups, referral rewards, charity days, mentorship, voting, roadside directory.

---

## 3. Implementation reality (grounded in source)

### 3.1 Discovery & real-time — **strong**
- **Wave Down** — `backend/src/modules/queue/queue.model.ts › WaveDownModel` fully models status (`pending/accepted/declined/expired/cancelled`), server-authoritative `requested_at`, `expires_at`, `eta_seconds`, decline reasons; SLA constants (`WAVE_DOWN_SLA_DEFAULT_SEC=300`, min/max) in `config/constants.ts`. Frontend: `src/features/wave/*`, routes `/business/[id]/wave`, `/wave/[id]`, vendor `/vendor/wave-downs`. **→ Largely built (R5).**
- **Lineup / Queue** — `QueueModel` + `QueueEntryModel` with authoritative `joined_at` ordering, `discount_percent_locked` snapshot at join (reflow-safe), `hold_expires_at` (`QUEUE_HOLD_DEFAULT_SEC=900`), `PopUpEventModel`. Frontend `src/features/queue/*`, `/queue/[ownerId]`, `/vendor/queue`. **→ Largely built (R6).**
- **Live map / GPS** — dedicated `livemap` module (controller/service/repository/model + `liveStore.ts`) with geohash bucketing (`GEOHASH_PRECISION`, `LIVE_SESSION_TTL_SEC`, snapshot cadence). Frontend `features/livemap`, `/map`, `/map/list`. **→ Largely built (R4).** *(Runtime realtime behavior [Needs verification] — not exercised in this pass.)*

### 3.2 Discounts — **engine present; the rule change is the open item**
- `DiscountScheduleModel` (per-owner `tiers[{position, discount_percent}]`, `cap_percent`). `QueueDiscountCard.tsx` renders the FOMO tier ladder ("You'd be #4 · locks in 15% off").
- **The 7/9 change (R1) is not confirmed enforced.** `cap_percent` is `required`, `tiers` default `[]`. Whether a vendor **must** configure a discount to go Live / be eligible for "Trending" is a **business-rule** decision not visibly encoded. There is also **no "Trending" surface** found that rewards discounting. **→ Partially implemented; needs a product + enforcement pass.**

### 3.3 Fees & payouts — **one fee, not the spec's fee taxonomy**
- `payments.service.ts › charge()` does a Stripe **destination charge** with a single `applicationFeeCents` from `platformFeeBps()` (`FeeSchedule.consignment_fee_bps` ?? `DEFAULT_CONSIGNMENT_FEE_BPS = 1000` = 10%). Fee applies to goods only; **tips + round-up pass through 100%** (matches R9's spirit). Refund, partial refund, tiered payout (`PAYOUT_DELAY_DAYS_BY_TIER`), `payoutTransfer` splits, and `reconcile()` all exist and are solid.
- Frontend `features/orders/breakdown.ts` previews subtotal/discount/tip/**10% platform fee** — but hardcodes `* 0.1` and is explicitly "preview/demo; server authoritative."
- **Gaps vs spec:** no distinct **customer 3% service fee** (R10), no **RTO per-installment fee** (R26), no **setup/late fees**, no **promoted-product pricing** (R11), no **Wave-Down convenience/travel fee**, no delivery/shipping or tax line as first-class fee components in the itemization (R9), no pre-publish **seller fee calculator** confirmed (R12) *[Needs verification of `seller/earnings`]*. **→ Partial.**

### 3.4 Consignment — **custody engine, not agreement lifecycle**
- Rich model: `Hub`, `Product` (`consignment_split_percent`, `return_window_hours`, `listing_type: consignment|wholesale|rental|donation`, `quantity_available`), `InventoryCheckout` (atomic `quantity_sold`, `expected_return_at`, status `active|settled|overdue|disputed`), `InventorySale`, `InventoryReturn` (condition assessment), immutable `Settlement` (gross/platform_fee/hub_share/seller_net). Frontend `features/consignment/*` + `/seller/*` (inventory, checkout sale/return/settlement, product reserve).
- **Gaps vs spec:** no **duration options / default-30-day / no-limit** term model (R14) — only `return_window_hours`; no **expiry notification cadence** 14/7/3/on-date with action choices (R15); no **auto-renewal** (R16); no **Return-Pending** status or abandonment/storage-fee terms (R17); no **owner minimum-price / pricing controls** (R18); no **3-party consignment-RTO split** (R19). **→ Partial.**

### 3.5 Rent-to-Own — **missing**
- Only signal is `listing_type` enum value `'rental'`. No installment schedule, ownership-credit ledger, buyout/early-payoff formula, grace period, missed-payment state machine, condition reports, or ownership-transfer flow. No RTO routes/pages found. **→ Missing (R20–R27).** This is the largest single build.

### 3.6 Legal agreements — **1 of 4**
- `SellerAgreementAcceptanceModel` (clickwrap bailment, `SELLER_AGREEMENT_VERSION='v1-2026-07'`). Missing the regular-sale, RTO, and consignment-RTO agreements (R28). **→ Partial.**

### 3.7 Monetization "50 features" — **mostly future, some present**
- **Present-ish:** giveaways/gifts/spot-me/block-party/ping (`modules/growth/*` + `features/growth`), sponsors (`modules/sponsors`), vendor ping-budget page (sponsored-visibility adjacent), AI coaching/recommendations (`modules/ai`), reviews, favorites, messaging, scheduling/bookings, jobs, shelter.
- **Missing:** storefronts as a product, pre-order/scheduled pickup, gift cards, loyalty, subscriptions, flash sales, wholesale/used-equipment marketplaces, featured/sponsored-pin monetization, Pro membership tiers, verified-badge subscription, ads dashboard, video/banner ads, POS, fleet GPS subscription, financing/insurance/fuel/wholesale-club marketplaces, employee/shift mgmt, expense/mileage/tax/invoice tools, CRM, events/festivals/meetups/mentorship/voting/roadside directories. **→ Mostly Missing (R29–R32).**

---

## 4. Cross-cutting observations

- **Documentation vs implementation drift:** the repos carry two doc generations — the original `docs/` PRD (FR-numbered) and root planning docs — plus a tracked **contract drift** file (`API_CONTRACT_RECONCILIATION.md`) and **demo mode** (`src/lib/demo.ts`). This new spec is a *third* input and is **not yet reflected** in either doc set. Recommend these audit docs become the reconciliation layer.
- **Financial correctness discipline is high** (immutable settlements/transactions, idempotency keys, reconciliation, tiered payouts). New commerce features (RTO especially) must be built to the *same* bar — installment ledgers must be immutable and idempotent.
- **Terminology collision risk:** "queue" means both the Lineup domain and BullMQ job queues; "rental" exists as a consignment listing type but is **not** RTO. Spec-to-code mapping must be explicit to avoid false "already done" conclusions.
- **Compliance is a gating dependency, not a feature.** RTO + installment payments touch state lending/consumer-disclosure law (spec §60 flags attorney review). This blocks *launch* of RTO regardless of engineering completeness.

---

## 5. Recommended priority (headline — full roadmap in the phase docs)

1. **P0 — Confirm & encode the discount-optional rule (R1/R2)** and the "Trending" incentive. Cheap, and it's the spec's flagship product decision.
2. **P0 — Checkout fee itemization (R9) + optional customer service fee flag (R10) + seller fee calculator (R12).** Directly monetization-enabling, builds on the existing fee engine.
3. **P1 — Consignment agreement lifecycle (R14–R18).** Extends an engine that already exists.
4. **P1 — Rent-to-Own core (R20–R26)** behind an approval gate (R27) + the RTO legal agreement (R28). Largest build; compliance-gated.
5. **P2 — Consignment-RTO 3-party split (R19).**
6. **P2 — Monetization layer** (Pro membership, featured/sponsored, ads) — highest revenue leverage per Santiago's plan, but post-MVP.
7. **Ongoing — reconcile all three doc generations; verify realtime + seller calculator at runtime.**

---

## 6. Confidence & follow-ups

- **High confidence:** module/route inventory, payments fee mechanics, consignment data model, Wave/Queue models, RTO absence.
- **[Needs verification] (next pass):** runtime realtime (Socket.IO) behavior; whether `seller/earnings` already renders a fee/payout calculator; exact enforcement path that gates "Live" status; whether any "Trending" surface exists; catalog `FeeSchedule` seeded values.

*See `FEATURE_COMPLETION_MATRIX.md` for the per-feature inventory and `BACKEND_FRONTEND_GAP_ANALYSIS.md` for the FE/BE split.*
