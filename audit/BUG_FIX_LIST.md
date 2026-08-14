# StreetServe — Bug & Correctness Fix List

> Correctness issues and correctness **risks** found against the new spec. This audit was read-only; items marked **[Observed]** are grounded in source, **[Verify]** are risks to confirm at runtime/in a deeper read. Severity: 🔴 high (money/data) · 🟠 med · 🟡 low.
> No code was modified.

---

## Financial-path correctness

**B1 · 🟠 [Observed] — Frontend fee preview hardcodes 10%, can diverge from the versioned server fee.**
`src/features/orders/breakdown.ts` computes `platformFeeCents = Math.round(discounted * 0.1)`, while the server derives the fee from the versioned `FeeSchedule.consignment_fee_bps` (`payments.service.platformFeeBps()`). If an admin changes the fee schedule, the customer-facing preview silently disagrees with the charge.
**Fix:** fetch the effective fee (or the full server-computed breakdown) rather than hardcoding; treat `breakdown.ts` as display-only of server values. *(Currently mitigated only by the "server is authoritative" comment + demo mode.)*

**B2 · 🟠 [Observed] — Fee terminology overloads "consignment" for the platform-wide fee.**
`FeeSchedule.consignment_fee_bps` and `DEFAULT_CONSIGNMENT_FEE_BPS` are used as the fee for **all** charges in `payments.service.charge()`, not just consignment. This is a latent correctness/analytics hazard once the spec's *distinct* fee types (marketplace vs consignment vs RTO vs service) land — they'll be conflated under one field.
**Fix:** rename/extend to a fee-type registry before adding new fee types (R10/R11/R26).

**B3 · 🟡 [Verify] — Customer-visible platform fee labeling.**
`breakdown.ts` exposes `platformFeeCents` as "the fee the vendor pays… customer isn't charged it." Spec R9 wants the customer itemization to show the fees *they* pay (service/processing/tax/tip). Ensure the vendor-side fee isn't mistakenly presented as a customer charge in any surface.

**B4 · 🟡 [Verify] — Rounding accumulation across split parties.**
`payments.service.charge()` uses `Math.floor` for `platformFee`; consignment `Settlement` splits gross → platform/hub/seller. Verify the sum of floored splits always reconciles to gross (no lost/created cents) — especially once 3-party consignment-RTO splits (R19) are added.

## Discount / queue logic

**B5 · 🟠 [Verify] — Discount optionality may be blocked by required `cap_percent`.**
`DiscountScheduleModel.cap_percent` is `required`. If go-Live or listing requires a discount schedule, the 7/9 "discounts optional" rule (R1) is violated. Confirm a business can operate with **no** discount schedule.

**B6 · 🟡 [Verify] — Queue hold-expiry reflow vs locked discount.**
`QueueEntry.discount_percent_locked` is snapshotted at join and `hold_expires_at` governs geofence-leave holds. Verify that when an entry expires/leaves, downstream positions' *locked* discounts are not retroactively changed (the model intends they shouldn't — confirm the service honors it).

## Placeholder / incomplete screens shipped as routes

**B7 · 🟠 [Observed] — `seller/earnings` is a live route rendering a placeholder.**
`src/app/(seller)/seller/earnings/page.tsx` renders a "Built in Milestone 6 (depends on GAP-6)" stub. A navigable route to an unbuilt screen is a UX/correctness gap for sellers expecting earnings + the R12 calculator.
**Fix:** build the screen or gate the route until ready.

## Realtime / consistency (to exercise)

**B8 · 🟡 [Verify] — Live-session staleness vs map presence.**
`LIVE_SESSION_TTL_SEC=60` marks sessions stale with no ping; `LOCATION_SNAPSHOT_INTERVAL_SEC=10`. Verify the map removes stale vendors promptly and that a driving→parked→away transition propagates over Socket.IO without ghosting.

**B9 · 🟡 [Verify] — Wave-down expiry race.**
`WaveDown.expires_at` + status transitions. Verify a wave can't be accepted after expiry (server-authoritative check), and that the expiry sweep and an in-flight accept don't double-resolve.

## Idempotency / webhooks (to confirm intact)

**B10 · 🟡 [Verify] — Stripe webhook idempotency & ordering.**
`completeByPaymentIntent` is designed idempotent (returns early if already completed). Confirm `webhooks/stripe.webhook.ts` verifies signatures and tolerates out-of-order/duplicate events for both charge and `account.updated` paths.

---

## Triage summary
| Sev | Items |
|---|---|
| 🔴 High | none confirmed this pass |
| 🟠 Med | B1, B2, B5, B7 |
| 🟡 Low / Verify | B3, B4, B6, B8, B9, B10 |

**Note:** the absence of confirmed 🔴 issues reflects the codebase's strong financial-correctness discipline (immutable ledgers, idempotency, reconciliation) — not a shallow audit. The **[Verify]** items should be closed in the `[NV]` runtime pass before MVP sign-off.
