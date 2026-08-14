# StreetServe — Phase 1 Implementation Plan

> **Phase goal:** Critical blockers + MVP commerce foundation. Get to a state where a local vendor can sign up (optional discount), go Live, be discovered/waved/queued, and complete a **transparent, correctly-fee'd sale**. Aligns with the spec's 7/30 local-launch intent.
> **Precondition:** the `[NV]` verification pass (V0) is done first — it may reclassify items below.

---

## 0. Verification pass (V0) — ✅ COMPLETE (verified against code 2026-07-19)
Findings, each confirmed in source:

1. **Socket.IO realtime — EXISTS, multi-instance.** `server.ts` stands up `createSocketServer` with the `@socket.io/redis-adapter` (`realtime/io.ts`), so fan-out is correct across instances. All three flows are wired through `realtime/hub.ts`: map presence (`pinUpdate`/`pinRemove` from `livemap.service`), wave push (`waveAccepted`, `queue.service:170`), queue reflow (`queueUpdate`/`popupDelay`, `queue.service:248/434/448/526/579`). Namespaces `/live` (geohash cells), `/queue`, `/messages`, `/notifications` all authorize rooms on connect. → **Fully.**
2. **Live gate does NOT require a discount schedule — R1 risk avoided.** `livemap.service.startSession` gates business go-live only on `isBusinessLicensedForLiveOps` (license), sellers on ownership + `seller` role. `DiscountScheduleModel` is referenced **only** in `queue.service` for checkout discount computation (lines 381/463/492) and the set/get schedule routes — never in the go-live or publish path. → **R1 is framing/UX only, not a backend refactor.**
3. **No "Trending" surface exists** (backend grep clean). Correct per spec — Trending (R1b) is deferred to Phase 2. Nothing to remove; nothing to build in Phase 1.
4. **FeeSchedule seed is consistent.** Migration seeds `fee_schedule` v1 `consignment_fee_bps: 1000` (10%); `DEFAULT_CONSIGNMENT_FEE_BPS = 1000` is the code fallback in `payments.service.platformFeeBps()`. Seeded value == fallback. No drift. (Note: single-rate today — the typed fee registry is DEBT1 below.)
5. **Category seed covers all 5 tabs** — 19 rows across food(4)/coffee(2)/services(7)/shopping(4)/more(2), each with `requires_license`/`regulated_by`. Adequate for the Modesto pilot. **Minor:** seeded rows omit the `archetype` field; module resolution falls back to `DEFAULT_ARCHETYPE_BY_TAB` (verified in `modules.service:116`), so behavior is correct — but explicit per-category archetypes would sharpen the default module set. Non-blocking.
6. **`seller/earnings` is REAL, not a placeholder.** Served at `consignment` `/earnings` → `consignmentController.earnings` → `consignmentService.sellerEarnings` (settled-payout history + daily-gross series + pending totals). Vendor payouts (`getBusinessPayouts`) is likewise real (live Stripe status + balance + ledger). Grep for GAP/placeholder/501/not-implemented across `src` found **no navigable stub routes**. B7/U11 concern is closed at the backend.

**Exit:** ✅ V0 findings folded in below; matrix `[NV]` flags cleared in `IMPLEMENTATION_STATUS.md`. **Net effect on this plan:** §1 (R1) drops to UX/framing only (backend already discount-optional); §5 (B7) backend is already done — remaining work is any frontend stub audit. §2/§3/§4 (fee registry, itemization, marketplace-fee coverage) remain as scoped.

---

## 1. Discount-optional rule (R1) + framing (U1/U2) — ✅ DONE (2026-07-19)
- ✅ Go-Live/listing do **not** require a `DiscountScheduleModel` — verified in V0; `livemap.service.startSession` gates on license only, never a discount. `SetupChecklist` lists license as the sole hard blocker; `LiveStatusControl` disables "Go live" only on `!canGoLive`.
- ✅ Backend invariant **locked with a regression test** — `test/phase2.test.ts › "lets a vendor with NO discount schedule go live and transact (R1)"`: a no-discount business goes live (201), a customer joins at 0% and checks out at full price. (15/15 green.)
- ✅ Framing added (U1/U2) — `QueueManagement.tsx` now tags the line-up discount **Optional** and shows a visibility/Trending nudge: an empty-state prompt ("optional… you're live and selling without one… add any time") and, once tiers are saved, a positive "boosting your visibility" reinforcement. Copy is honest about Trending being the payoff without gating on it.
**Acceptance:** ✅ a vendor with zero discounts can go Live and transact (test-proven); ✅ a vendor who adds discounts sees the Trending nudge (`hasActiveDiscount` branch). **Cx S — closed.**

## 2. Fee-type registry (DEBT1) — ✅ DONE (2026-07-19)
- ✅ Typed registry: `FEE_TYPES` + `FeeRule` (`rate_bps`/`flat_cents`/`min_cents`/`max_cents`) in `constants.ts`; `fee_schedule.fees` is now a versioned `Map<FeeType, FeeRule>` (`catalog.model.ts`). `consignment_fee_bps` kept for back-compat.
- ✅ Single server-side resolver `payments/fees.ts` (`resolveFee`/`computeFee`) replaces **both** duplicated `platformFeeBps()` helpers (payments + consignment). Resolution: DB registry → legacy `consignment_fee_bps` (marketplace/consignment) → code default → 0. Short-TTL in-process cache + `invalidateFeeCache()` (Redis cache = P1 follow-up).
- ✅ `payments.service.charge()` takes an optional `feeType` (default `marketplace`) and resolves from the registry; `consignment.settle()` uses `resolveFee('consignment', gross)`. Transaction now records `fee_type` (R7 auditability).
- ✅ Back-compat proven: marketplace/consignment still 10% with no schedule (all 153 tests green, incl. phase1 fee split = 90 and phase4 consignment fee = 500).
- ✅ Seed migration `20260719000001-seed-fee-registry.js` backfills the full registry (marketplace/consignment 10%, customer_service 3%, rest present at 0 for ops to price).
**Acceptance:** ✅ `charge()` resolves fees from the registry by fee-type; ✅ adding/pricing a fee type is config, not code (proven in `test/fees.test.ts`). **Cx M — closed.**

## 3. Server-authoritative checkout itemization (R9) + preview fix (B1) — ✅ DONE (2026-07-19)
> **Decision:** Transparency-first MVP — every mandated line exists server-side; tax/delivery/service/processing default to $0 (config-driven), the 10% platform fee stays vendor-paid + informational. Customer charge math unchanged.
- ✅ Pure `orders/pricing.ts` `computeOrderBreakdown` returns all mandated lines (subtotal, discount, tax, delivery, service, processing, tip, round-up, total + informational platformFee). Shared by quote + place.
- ✅ New `POST /orders/quote` (server-authoritative preview, no side effects) and refactored `place()` both run the **same** `priceOrder` path — so preview == charge by construction. Discount is derived server-side from the customer's locked queue position (`queueService.lockedDiscountFor`), fixing B1 (place() previously ignored the discount it displayed).
- ✅ Order persists the full itemization (`discount_percent`/`tax_cents`/`delivery_cents`/`service_fee_cents`/`processing_fee_cents`); `view()` returns a `breakdown`, so receipts/history are server-authoritative too.
- ✅ Frontend: `orders/breakdown.ts` — **hardcoded `*0.1` deleted**; `mapServerBreakdown` adopts server values verbatim; `computeBreakdown` is demo-only and uses a named `PLATFORM_FEE_BPS`. `useOrderQuote` fetches the preview (instant client estimate → replaced by server); `OrderReview` renders every applicable line; create/receipt adopt the charged `breakdown`.
- ✅ Wave-Down/queue checkout: travel/convenience modeled as the `deliveryCents` line ($0 in transparency-first), surfaced by the same breakdown.
**Acceptance:** ✅ customer sees all mandated lines pre-pay (fee lines auto-surface when priced); ✅ preview == charge (shared server path); ✅ parity test — backend `phase3` "quote total == place total == charge" (+ discount parity), frontend `mapServerBreakdown`/`breakdown` tests. Full suites green (BE 153+, FE 112). **Cx M — closed.**

## 4. Confirm marketplace fee coverage (R7) — ✅ DONE (2026-07-19)
- ✅ All four `paymentsService.charge()` call sites resolve the **`marketplace`** fee-type (10%) and persist `fee_type` on the transaction: regular orders (`orders.place`), wave/queue sales (`queue.checkout`), gifts (`gifts.create`), and direct transactions (`payments.controller`). None pass a custom type, so `charge()`'s `marketplace` default governs — coverage is by construction, not per-caller wiring.
- ✅ Consignment settlements apply the **`consignment`** fee-type (10%) via `resolveFee('consignment', gross)` — the only non-marketplace path.
- ✅ Locked with tests: `phase2` (wave/queue sale → `fee_type='marketplace'`, fee = 95 on 950 goods), `phase3` (regular order → `marketplace`, fee = 60 on 600), `fees.test` (direct charge → `marketplace`), `phase4` (consignment settle → 10%). Proves the 10% applies beyond the consignment path.
**Acceptance:** ✅ every completed sale records the correct fee-type + amount. **Cx S — closed.**

## 5. Placeholder routes (B7/U11) — ✅ DONE (2026-07-19)
- ✅ Audit: swept the whole app for `SurfacePlaceholder`/"depends on GAP"/"coming soon"/stub markers. **`seller/earnings` was the only navigable stub** (it rendered `SurfacePlaceholder` "depends on GAP-6"), and it's linked from `SettlementView` ("View earnings"). `(auth)/AuthPlaceholder` is the legitimate Clerk-not-configured fallback, not a GAP stub.
- ✅ Built the real screen: `features/consignment/SellerEarnings.tsx` — settled-net + pending + lifetime-gross tiles, a recent daily-gross bar series, and settled payout history, all from the real `GET /checkouts/earnings` (`useSellerEarnings`). Loading/empty/error states included; demo mode synthesizes the feed (`demoSellerEarnings`).
- ✅ `SurfacePlaceholder` is now unreferenced by any route (kept as a dev-only scaffold, non-navigable).
**Acceptance:** ✅ no navigable route renders a "depends on GAP" stub — proven by `consignment-render` test (real earnings screen renders, placeholder copy absent). Full FE suite 113/113. **Cx S — closed.**

---

## Phase 1 dependency order
```
V0 ─▶ R1 ─▶ (Phase 2: R1b Trending)
      DEBT1 ─▶ R9 + B1 ─▶ R7
      (parallel) B7/U11
```

## Definition of done (Phase 1)
- [x] V0 verification complete; matrix updated.
- [x] Vendor can sign up + go Live with **no** discount (R1).
- [x] Fee-type registry live; 10% applies correctly per sale type (DEBT1, R7).
- [x] Full server-authoritative checkout itemization; FE preview matches charge (R9, B1).
- [x] No placeholder routes navigable in prod (B7).
- [~] Security: money routes bound to `money`/`write` rate-limit + RBAC + idempotency (S1) — existing charge/order/checkout paths already are; the new `/orders/quote` is read-only (RBAC + `read` limit, no idempotency needed as it has no side effects).
- [ ] Perf: fee-schedule lookup cached in Redis (P1) — currently a short-TTL in-process cache in `payments/fees.ts`; Redis-backed caching is the remaining follow-up.

## Risks
- V0 may reveal the Live-gate **does** require a discount → R1 becomes a small refactor (still S).
- Fee registry refactor touches the money hot-path → land behind tests; reconciliation (`reconcile()`) must stay green.
