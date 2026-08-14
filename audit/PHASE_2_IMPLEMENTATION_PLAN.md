# StreetServe — Phase 2 Implementation Plan

> **Phase goal:** Complete the MVP commerce experience — Trending incentive, full fee taxonomy, seller calculator, refund policy, the four legal agreements, and the **consignment agreement lifecycle**. This is the bulk of "core MVP functionality."
> **Precondition:** Phase 1 done (fee registry, itemization, optional discounts).

---

## 1. Trending surface (R1b) + onboarding polish (U3) — ✅ DONE (2026-07-19)
- ✅ Ranking signal defined in `constants.TRENDING_WEIGHTS`, mirroring the `AI_WEIGHTS` pattern (normalized 0–1 signals × weights + per-result explainable `factors`): **discount 0.35** (the boost), demand 0.30 (live line length), recency 0.20 (last-ping half-life), proximity 0.15 (20km falloff). Discount carries the largest single weight, so discounting is measurably rewarded — but it is a **boost, not a gate**: a vendor with no schedule still ranks on the other three.
- ✅ `livemapService.trending()` scores live businesses server-side; batched signal reads (`queueService.trendingSignals` → `schedulesForOwners` + `activeCountsForOwners`) keep it O(1) queries per page. Public `GET /map/trending?lat&lng&limit` (optionalAuth, `read` limit); location optional (proximity just scores 0).
- ✅ Discovery surfaces it: `TrendingRow` — a horizontal rail above the nearby list where the **discount badge is the loudest element on each card** ("Up to 20% off"), plus live line count and status. Self-hiding when nothing trends; each card carries the server's `reasonSummary` as its accessible label, so the ranking is explainable, not a black box.
- ✅ This makes the Phase-1 §1 vendor copy ("boosts your Trending visibility") literally true.
**Acceptance:** ✅ measurable placement — backend test: two vendors live at identical coords/time, the one with a 20% schedule outranks the other **and both are listed** (boost-not-gate); ✅ customers see it — frontend demo-render test asserts the Trending rail + discount badge. **Cx M — closed.**

## 2. Full fee taxonomy (R8, R10) — ✅ DONE (2026-07-19)
> **Decision (extends §3 transparency-first):** both new customer-facing fees ship **OFF at launch** via config flags — launch charges stay exactly as chosen in Phase-1 §3. The plumbing, bounds, and itemization are fully built and toggle-tested.
- ✅ `processing` added to `FEE_TYPES` + registry (Stripe US pass-through 2.9% + 30¢); `customer_service` now carries bounds **min $0.50 / max $10** (both in `DEFAULT_FEE_RULES` code defaults *and* the seed migration).
- ✅ Two env flags `CUSTOMER_SERVICE_FEE_ENABLED` / `PROCESSING_FEE_ENABLED` (default **false**), surfaced through `feeService.resolveOrderFeeRates()` with a `setOrderFeeFlags()` hook for ops/tests. Flag off ⇒ that fee's rate is 0 ⇒ no line.
- ✅ All fees resolved **server-side** from the registry in the shared `priceOrder` path; the 3% service line is clamped to [min,max] in `computeOrderBreakdown`; processing is itemized on the running total. Preview == charge holds with fees on.
- ✅ **S7:** the order/quote bodies are `.strict()` and accept only items/tip/roundUp — any client-supplied fee field is rejected (400). Test proves it.
- ✅ Frontend needs no change — `OrderReview` already renders the service/processing/tax lines from server values (built in §3); flipping a flag makes them appear automatically.
**Acceptance:** ✅ toggling the service-fee flag adds a correctly-bounded line (tests: 3% mid-range, $0.50 floor on small, $10 cap on large); ✅ processing fee itemized; ✅ fees server-set, client amounts rejected. **Cx M — closed.**

## 3. Seller fee calculator (R12) + earnings (U5) — ✅ DONE (2026-07-19)
- ✅ Pre-publish calculator: `GET /checkouts/fee-preview?unitPriceCents&splitPercent&quantity` → `consignmentService.feePreview`. Enter a price/split → platform fee (consignment 10%), seller **net payout** (the headline), hub share, and the customer-facing side (subtotal + est. service/processing/tax + customer total). Every number resolved **server-side** from the **same** registry + settlement math the real payout uses (`resolveFee('consignment')` + `resolveOrderFeeRates()` + `computeOrderBreakdown`), so the preview matches the eventual settlement. RTO installment slots returned as an (empty) array — populated in Phase 3.
- ✅ Earnings (U5) already reads **aggregated settlements** (P7): `sellerEarnings` aggregates `Settlement` + `InventorySale` via Mongo aggregation — no raw transaction scan. (Shipped Phase-1 §5.)
- ✅ Frontend: `FeeCalculator` (price + split inputs → live breakdown, seller net as the big number, customer-pays block, RTO "coming in Phase 3" row) surfaced on the **Seller Earnings** screen — including the empty state, where a brand-new seller can model a payout before their first sale. `useFeePreview` hook + demo fixture.
**Acceptance:** ✅ seller sees an accurate net-payout preview before publishing — backend test verifies the split math ($100 gross, 70% → $63 net / $27 hub / $10 platform); frontend test drives the input and asserts the $31.50 net. **Cx M — closed.**

## 4. Refund/fee policy (R13, U6) — ✅ DONE (2026-07-19)
- ✅ Policy encoded in one pure function `payments/refundPolicy.ts` `computeRefund(txn, {fulfilled, partialCents?})` → the exact amounts + Stripe flags + a plain-language disclosure:
  - **Full pre-fulfillment cancel** → goods + tip back, marketplace fee returned (`reverseTransfer`+`refundApplicationFee` true).
  - **Partial** → that portion refunded, marketplace fee reduced proportionally, tip untouched.
  - **Post-fulfillment (completed service)** → only goods returned; service fee + tip **non-refundable** (`refundApplicationFee` false).
  - **Processing** fees surfaced as `processingRetainedCents` (per-processor, not returned).
- ✅ `paymentsService.refund` / `refundAmount` apply the policy — driving the real Stripe `reverse_transfer` / `refund_application_fee` flags (added to the gateway + fake) — and **audit-log** the disclosed breakdown (`refunded_cents`, `marketplace_fee_returned_cents`, `disclosure`). `orders.cancel` passes `fulfilled:false`; the completed-service case is enforced by cancel being pre-fulfillment-only.
- ✅ Disclosure UX (U6): `GET /orders/:id/refund-preview` (read-only) + a **two-step cancel** in `OrderTracking` — the first tap reveals "Full refund of $X (incl. tip); you're charged nothing" before the customer commits; the confirm button states the refund amount.
**Acceptance:** ✅ each path returns the correct amounts and is audit-logged — `refundPolicy` unit test (all 3 scenarios) + `phase3` integration (cancel discloses then refunds $12 incl. tip with the fee returned, Stripe flags asserted) + frontend disclosure test. **Cx M — closed.**

## 5. Agreements (DEBT7 → R28) — ✅ DONE (2026-07-19)
> **Decision:** the regular-sale agreement is a **vendor** one-time Terms of Sale, gated at go-live (seller-side, like the other three). RTO/consignment-RTO bodies are added but their flows are post-MVP (no gate yet).
- ✅ New `modules/agreements`: `AgreementAcceptance{ user_id, agreement_type, version, content_hash, accepted_at }` — **immutable** (append-only plugin), unique per (user, type, version), server-timestamped. Generalizes the bailment-only model.
- ✅ Registry (`agreements.registry.ts`) with **all four** versioned bodies (bailment, regular_sale, rto, consignment_rto) — content is the source of truth, hash derived (sha256). Bodies are clearly marked **placeholders pending attorney review (spec §60)**; final reviewed text drops in by bumping version.
- ✅ `agreementsService`: `get` (clickwrap display), `accept` (**tamper-evident** — rejects a client whose attested version/hash is stale, S5), `hasAccepted`, `assertAccepted`. `GET /agreements/:type` + `POST /agreements/:type/accept`. Legacy `POST /seller-agreement/accept` still works (delegates to `bailment`).
- ✅ Migration `20260719000002` moves existing `seller_agreement_acceptances` → `agreement_acceptances` (type `bailment`, `legacy:pre-hash` marker).
- ✅ Gates wired: **consignment checkout → bailment** (via the framework); **go-live (business) → regular_sale** (after the license check, so a regulated vendor still sees LICENSE_REQUIRED first). RTO gates ready (`assertAccepted`) for when those flows land.
- ✅ Frontend: `useAgreement`/`useAcceptAgreement`; `LiveStatusControl` shows a **Terms-of-Sale clickwrap** on `AGREEMENT_REQUIRED` (renders the current body, "Accept & go live" attests version+hash then retries).
**Acceptance:** ✅ each (live) transaction type requires its accepted agreement — go-live gate + consignment gate tested (block→accept→allow); ✅ tamper-evident — `agreements.test` rejects a stale-hash acceptance; acceptances are immutable + version/hash captured. **Cx M — closed** (real attorney-reviewed text is the external follow-up).

## 6. Consignment agreement lifecycle (R14, R15, R17, R18) — ✅ DONE (2026-07-19)
- ✅ **R14 Durations:** `term_days` (7/14/30/60/90/180/365 or `no_limit`), default 30, authored on the Product and **snapshotted onto `InventoryCheckout`**; `expires_at` derived (null for no-limit). New statuses `return_pending` + `ended`.
- ✅ **R15 Expiry notices:** `sweepExpiryNotices()` (wired into the `sweeps` worker + a daily scheduler entry) sends **14/7/3-day + on-date** notices, idempotent via `notices_sent`; each notice carries the `actions: [extend, reduce_price, return, continue, end]`. Action endpoints: `POST /checkouts/:id/extend|reduce-price|end` (+ existing `/return`).
- ✅ **R17 Return-Pending:** on expiry with unsold units → `return_pending` (**never auto-kept**), carrying the return terms (responsibility / window / storage fee / abandonment). `returnAndSettle` accepts `return_pending`; abandonment past the cutoff raises a review flag (never an auto-keep).
- ✅ **R18 Pricing controls:** owner `minimum_authorized_price_cents` + `seller_permissions` snapshotted onto the checkout; `logSale` **blocks a below-floor sale** and `reduce-price` is floored — both bypassable only with `may_sell_below_min` (else owner approval).
- ✅ Frontend: `MyInventory` shows the **term countdown** + min price, a **Return-Pending** banner with terms, and the **Extend / Reduce-price / End** actions (`useCheckoutLifecycle`); checkout view returns all lifecycle fields.
**Acceptance:** ✅ owner sets a 30-day term + min price → checkout snapshots them with a derived expiry; ✅ seller gets 14/7/3 notices (sweep) with working actions; ✅ unsold → Return-Pending with correct terms — all proven in `phase4` (5 new tests) + a frontend render test. **Cx L — closed.**

---

## Phase 2 dependency order
```
Phase1 ─▶ R1b Trending
          R8/R10 fees ─▶ R12 calculator ─▶ R13 refunds
          DEBT7 ─▶ R28 agreements
          R14 terms ─▶ R15 notices
                    ─▶ R17 return
                    ─▶ R18 price controls
```

## Definition of done (Phase 2)
- [x] Trending live and reads discounts as a boost, not a gate.
- [x] Full fee taxonomy resolvable server-side; customer service fee flag works.
- [x] Seller calculator + earnings screen shipped (retires the Phase-1 placeholder).
- [x] Refund policy encoded across full/partial/completed paths.
- [x] Four agreements live, tamper-evident (framework + gates done; attorney-reviewed final text is the external follow-up).
- [x] Consignment lifecycle: durations, expiry notices+actions, Return-Pending, price controls.
- [~] Perf: expiry via scheduled sweep (P6 — daily `sweeps` job, the BullMQ infra; not per-checkout delayed jobs); calculator on aggregates (P7 ✓).
- [ ] Security: fees server-set (S7); agreement integrity (S5).

## Risks
- Legal review (R28) has external lead time — start it early, in parallel with Phase 1.
- Consignment lifecycle touches settlement math — keep immutable `Settlement` invariants; add tests for term/renewal edge cases.
