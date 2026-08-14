# StreetServe — Implementation Status

> Snapshot of build state per domain, against the new update spec (R1–R32 — see `PROJECT_AUDIT_REPORT.md §2`). `[NV]` = needs verification.
> Status vocabulary follows the audit classification rules: Fully / Partial / Missing / Refactor / Bugfix / UX / Needs-BE / Needs-FE.

## Domain status board

| Domain | Backend module(s) | Frontend surface(s) | Status | MVP-critical? |
|---|---|---|---|---|
| Identity / auth / roles | `identity`, `middleware/auth`, `rbac` | `(auth)/*`, onboarding | Fully | Yes |
| Verification / trust tiers | `identity/verification`, `trust` | `profile/verification`, `VerificationCenter` | Fully | Yes |
| Live map / GPS | `livemap` (+`liveStore`) | `map`, `map/list`, `features/livemap` | Fully (V0 ✓ realtime multi-instance) | Yes |
| Wave Down | `queue › WaveDownModel` | `wave/*`, `vendor/wave-downs` | Fully (V0 ✓ wave push) | Yes |
| Lineup / Queue | `queue › QueueModel` | `queue/[ownerId]`, `vendor/queue` | Fully (V0 ✓ reflow) | Yes |
| Discount engine | `queue › DiscountScheduleModel` | `QueueDiscountCard`, `QueueManagement` | Fully (R1 optionality + framing ✓) | Yes |
| Vendor onboarding | `vendors` | `vendor/register`, `hub/register` | Partial (spec-simplicity check) | Yes |
| Orders / checkout | `orders`, `catalog` | `order/*`, `business/[id]/order` | Fully (R9 itemization + B1 preview==charge ✓) | Yes |
| Payments / payouts | `payments` (+Stripe) | `order/[id]/pay`, `vendor/payouts`, `seller/earnings` | Fully (DEBT1 registry ✓, R7 marketplace coverage ✓, R9 itemization ✓) | Yes |
| Consignment | `consignment` | `seller/*`, `features/consignment` | Partial (lifecycle R14–R18) | Yes (MVP subset) |
| Rent-to-Own | — | — | **Missing** | Deferred post-MVP |
| Legal agreements | `consignment › SellerAgreementAcceptance` | clickwrap | Partial (1 of 4) | Partial |
| Scheduling / bookings | `scheduling` | `vendor/bookings`, `business/[id]/book`, `booking/[id]` | Fully | Yes |
| Messaging | `messaging` | `messages/*`, `vendor/messages` | Fully | Yes |
| Reviews | `reviews` | `business/[id]/reviews` | Fully | Yes |
| Notifications | `notifications` | `notifications` | Fully | Yes |
| Disputes | `disputes` | `disputes/new`, `admin/disputes` | Fully | Yes |
| Growth (gifts/giveaways/spot-me/block-party/ping) | `growth` | `features/growth`, `block-party`, `business/[id]/gift|spot-me` | Fully | Partial |
| Sponsors | `sponsors` | `admin/sponsors` | Partial | No (P2) |
| AI (coaching/recs) | `ai` | `hub/ai`, `seller/ai`, `vendor` | Partial | No (P2) |
| Jobs | `jobs` | `seller/jobs` | Fully | No |
| Shelter | `shelter` | `admin/shelters` | Fully | No |
| Admin | `admin`, `platform` | `(admin)/*` | Partial | Yes (ops) |
| Dashboard / analytics | `dashboard`, `observability` | `vendor/analytics`, `hub` | Partial | Partial |
| Monetization tiers (Pro/featured/ads/POS…) | — | — | Mostly Missing | Post-MVP |

## MVP-critical status rollup

- **Fully / ship-and-verify:** identity, verification, live map, wave, lineup, scheduling, messaging, reviews, notifications, disputes. → **verification pass**, not build.
- **Partial / must-finish for MVP:** discount optionality (R1), checkout itemization (R9), payment fee taxonomy (R7/R8/R10), consignment lifecycle subset (R14/R15/R17/R18), agreements (R28), admin ops.
- **Deferred post-MVP:** Rent-to-Own (R20–R27), consignment-RTO (R19), monetization layer (R29–R32 mostly).

## Verification backlog — ✅ CLEARED (V0 pass, 2026-07-19; see `PHASE_1_IMPLEMENTATION_PLAN.md §0`)
1. ✅ Socket.IO realtime — multi-instance via Redis adapter; map presence + wave push + queue reflow all wired (`realtime/hub.ts`).
2. ✅ `seller/earnings` — real endpoint (`consignment` `/earnings` → `sellerEarnings`): settled payouts + daily-gross + pending totals. Not a stub. (Pre-publish fee/payout calculator R12 remains a separate FE surface, not a backend gap.)
3. ✅ Live gate — requires **license** for businesses, ownership for sellers; **no discount schedule required.** R1 = UX/framing only.
4. ✅ No "Trending" surface existed at V0 — correct; **R1b has since been BUILT (Phase 2 §1, 2026-07-19)**: `GET /map/trending` + `TrendingRow`, discount-weighted ranking.
5. ✅ `FeeSchedule` v1 seed `consignment_fee_bps: 1000` == `DEFAULT_CONSIGNMENT_FEE_BPS` fallback. No drift.
6. ✅ Category taxonomy — 19 rows across all 5 tabs, license flags set. Minor: seeded rows omit `archetype` (resolver falls back to `DEFAULT_ARCHETYPE_BY_TAB`); non-blocking.
