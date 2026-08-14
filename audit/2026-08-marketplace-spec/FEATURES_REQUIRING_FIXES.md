# Features Requiring Fixes

Things that **exist and behave incorrectly**. Distinct from Missing (never built) and Partial (built, incomplete). Each entry gives the defect, how it was verified, the failure scenario, and the fix.

> **Status: all seven fixed — F-1/F-2/F-5/F-6/F-7 in Phase 1, F-3/F-4 in Phase 3.** Backend 405/405, frontend 201/201, both
> typechecks clean. Fixing F-1 surfaced three further defects in the same family (code that was
> correct only because the fees it depended on were switched off); those are recorded as F-1a/b/c and
> are also fixed. See [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) Phases 1–3.

---

## F-1 · Refund disclosure reports `processingRetainedCents: 0` unconditionally — HIGH

**Spec:** §58 — *"Payment-processing fees may be nonrefundable depending on the processor."* The refund disclosure must be honest about what the customer does not get back.

**Where:** [refundPolicy.ts:60](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/refundPolicy.ts#L60), [:79](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/refundPolicy.ts#L79), [:94](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/refundPolicy.ts#L94)

**Defect:** `processingRetainedCents` is hardcoded `0` in all three refund branches. The file's own header states the field exists *"surfaced as `processingRetainedCents` so the disclosure can be honest"* — so the field is documented as load-bearing and returns a value that is wrong whenever a processing fee was actually charged.

**Failure scenario:** ops enables `PROCESSING_FEE_ENABLED` (the flag exists and is designed to be flipped without a redeploy, [fees.ts:92](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/fees.ts#L92)). A customer pays $100 + $3.20 processing. They cancel pre-fulfilment. `computeRefund` returns `refundedCents: 10320`, `processingRetainedCents: 0`, and a disclosure reading *"Full refund of $103.20 … you're charged nothing."* Stripe does not return its fee. The customer is told they were charged nothing and is out $3.20, in a flow whose entire design goal is fee transparency.

**Why it is worse than a missing field:** a caller reading `processingRetainedCents === 0` reasonably concludes no processing fee was retained. Absent data prompts a question; wrong data does not.

**Fix:** thread the transaction's actual processing fee into `RefundableTxn` and compute retention per branch — retained in full for post-fulfilment, retained (processors do not refund their fee) for pre-fulfilment cancels, pro-rata for partials — then include it in the disclosure string. **Effort:** S. **Blocking:** must land before any customer-facing processing fee is enabled.

---

## F-2 · Only the seller can end a consignment; the product owner cannot — HIGH

**Spec:** §37 — *"either party should be able to terminate the agreement by providing advance notice."*

**Where:** [consignment.service.ts:1674](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.service.ts#L1674)

**Defect:** `endConsignment` rejects any caller who is not `checkout.seller_id` with `NOT_OWNER`. The route requires `checkout:manage_own`. The hub / product owner — the party whose goods these are — has **no path to terminate at all**. Separately, termination is immediate: there is no advance-notice window (that half is tracked as M-6, an omission rather than a defect).

**Failure scenario:** a hub owner discovers a seller is mishandling their stock, or needs the goods back for a confirmed sale elsewhere. They can send an expiry notice at the next scheduled threshold, reduce the price, or wait for the term to run. They cannot recall their own property. On a **no-limit** consignment — a first-class option under §35 and §37 — there is no term to wait for, so the owner's goods are held indefinitely with no exit.

**Fix:** permit the hub owner as an actor in `endConsignment`, gated on `hub:manage` plus hub ownership of the product (the same pattern `approveCheckout` already uses). Combine with M-6 so both parties terminate on the agreed notice period rather than instantly. **Effort:** S for the actor fix, M with the notice period.

---

## F-3 · Five RTO statuses are declared and unreachable — HIGH

**Spec:** §50 — an eleven-state missed-payment lifecycle.

**Where:** [rto.model.ts:66](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/rto/rto.model.ts#L66)

**Defect:** the status enum declares `active`, `grace`, `late`, `arrangement`, `paused`, `return_pending`, `completed`, `cancelled`, `disputed`. Grep across `modules/rto` finds writers for only `active`, `grace`, `late`, and `completed`. `arrangement`, `paused`, `return_pending`, `cancelled`, and `disputed` can never be written.

**Failure scenario (product):** an agreement escalates Grace → Late and then stops. There is no next state. A customer who calls to arrange a catch-up payment cannot be put into `arrangement`; a seller willing to pause cannot pause; a customer wanting to return cannot enter `return_pending`. §50 closes with *"Street Serves should encourage communication before cancellation"* — the implementation offers delinquency and nothing else.

**Failure scenario (engineering):** any consumer written against the enum — a dashboard filter, an analytics roll-up, a status badge — will contain permanently dead branches, and any reviewer reading the model will reasonably believe the lifecycle exists.

**Fix:** implement the transitions (M-4, M-3), or narrow the enum to what is reachable and reintroduce values with their transitions. Implementing is the right call: these are §50 and §51 requirements, not speculative states. **Effort:** M.

---

## F-4 · `condition_return` is declared and never written — HIGH

**Spec:** §52 — *"When the product is returned, the parties should complete another condition report. This protects both the seller and customer."*

**Where:** declared [rto.model.ts:57](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/rto/rto.model.ts#L57); the only writer of either report is `condition_delivery` at [rto.service.ts:152](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/rto/rto.service.ts#L152).

**Defect:** a schema field with no writer. Verified by grep — `condition_return` appears exactly once in the codebase, in its own declaration.

**Failure scenario:** an item comes back damaged. The delivery report shows photos and a serial number; the return has nothing. Every dispute resolves on assertion, against a delivery baseline only one party captured. §52 exists precisely to prevent this, and names both parties.

**Fix:** capture the return report on the return transition. Blocked by F-3 / M-3 — there is no return transition to hang it on yet. **Effort:** S once the return flow exists.

---

## F-5 · Vendor travel fee is collected as configuration and never charged — MEDIUM

**Spec:** §32 — a Waved Down order may carry *"a travel or delivery fee set by the vendor,"* disclosed before the customer confirms.

**Where:** [vendors.model.ts:34](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/vendors/vendors.model.ts#L34), surfaced through `vendors.service.ts:103` and settable at `:179`.

**Defect:** `travel_fee_cents` is a first-class, editable business setting. Grep across `modules/orders` and `modules/queue` — every path that computes money for an order or a wave-down — returns **zero references**. `OrderBreakdown.deliveryCents` exists but is fed from `OrderFeeRates.deliveryCents`, which is hardcoded `0` at [fees.ts:118](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/fees.ts#L118).

**Failure scenario:** a mobile mechanic sets a $15 travel fee in settings, sees it saved, and accepts a wave-down 12 miles away. They are paid for the job and nothing for the trip. They will not discover this from the UI — the setting persists and reads back correctly. Silent revenue loss for the vendor, with the platform's settings screen implying otherwise.

**Fix:** feed `travel_fee_cents` into `deliveryCents` on the wave-down pricing path and render it in the pre-confirmation breakdown as §32 requires. **Effort:** S. **Related:** M-8 (the customer convenience fee, which has no field at all).

---

## F-6 · Eight failing backend tests — MEDIUM

**Verified:** `npx vitest run` in the backend repo, run twice with identical results. **4 files failed, 25 passed. 8 tests failed, 343 passed (351).** Backend `tsc --noEmit` is clean. Frontend is fully green (38 files, 182 tests) with a clean typecheck.

Three clusters:

### Cluster 1 — module resolver defaults changed; tests were not updated (4 failures)

- `modules.test.ts` › *on_demand_service gets services/wave_down; booking is available but off* — expects `booking` off, receives it on
- `modules.test.ts` › *an on-demand trade that takes neither has no commerce mode* — expects `null`, receives `'booking'`
- `modules.test.ts` › *enabling a module via PUT immediately unblocks its write* — expects `422` before enabling, receives `200`
- `phase2.test.ts` › *serves each pin its resolved modules* — same array mismatch

**Assessment:** the production change is deliberate and documented. [modules.service.ts:31](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/vendors/modules.service.ts#L31) records that `on_demand_service` previously defaulted to `wave_down` and now leads with `booking`. The tests still assert the old default, and the third failure follows from it — `booking` is now enabled by default, so the write is legitimately not blocked, which is why `requireModule` returns 200.

**Verdict: stale tests, not a gate failure.** The gate itself is sound ([requireModule.ts](../../../STREET-SERVE-APPLICATION-BACKEND/src/middleware/requireModule.ts)). **Fix:** update the four assertions to the new archetype defaults, and choose a module that is genuinely off by default for the gate test — otherwise the gate has no coverage at all, which is the real cost here.

### Cluster 2 — messaging tests predate the transaction gate (3 failures)

All three `phase3.test.ts` › *scoped messaging* tests fail with `expected 403 to be 201` on `POST /message-threads`.

**Assessment:** `startThread` gained a deliberate gate ([messaging.service.ts:108](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/messaging/messaging.service.ts#L108)): a customer may only open a thread with a business they have a live booking or order with. The comment records why — *"there was no check at all, so every business was reachable by anyone."* That is a genuine abuse fix. The tests open a thread with no prior transaction and now correctly receive 403.

**Verdict: stale tests trailing a correct security fix.** **Fix:** seed a booking or order in the test setup, and add a case asserting the 403 for a stranger — the new behaviour currently has no positive coverage.

### Cluster 3 — ping tip qualification (1 failure)

`phase5.test.ts` › *pays a tip to a genuine new recipient and rejects every farming vector* — `expected false to be true` on `isPaid` for the happy path.

**Assessment: root cause not determined.** Unlike clusters 1 and 2, no corresponding intentional change was identified. The anti-farming logic is rejecting a recipient the test constructs as genuine. This is either an over-tight qualification rule that will also reject real users, or a stale fixture. **This one needs triage before dismissal** — an anti-abuse rule that silently declines legitimate payouts is a real product defect.

**Overall:** seven of eight failures are stale tests trailing intentional product changes; the eighth is unexplained. The systemic issue is that **the suite is red, so it no longer functions as a regression gate.** A red suite trains everyone to ignore it, and the next genuine regression lands unnoticed.

---

## F-7 · Stale assertion in the subscriptions render test — LOW

**Where:** [subscriptions-render.test.tsx](../../src/features/subscriptions/subscriptions-render.test.tsx)

**Defect:** the test asserts *"lists the four subscription plans with prices and a subscribe CTA"*. `SUBSCRIPTION_PLAN_DEFS` defines **six** — `pro`, `featured`, `verified_badge`, `ai_assistant`, `seller_plus`, `stock_waiver` ([constants.ts:523](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L523)). The test passes, which means it is asserting against a subset and would not catch a plan disappearing from the screen.

**Failure scenario:** `seller_plus` or `stock_waiver` stops rendering — through a filter bug, a scope mismatch (both are `user`-scoped while the other four are `business`-scoped), or a plan-fetch regression. The test stays green. Revenue-bearing UI loses two products silently.

**Fix:** assert all six, or derive the expected set from the plan definitions. **Effort:** S.

---

## Defects found while fixing F-1

All three share F-1's root cause — arithmetic that treated `amount_cents` as if it were the goods
value. Each is invisible today because the customer-facing fees are off, and each becomes a real
money defect the day either is enabled. All fixed.

### F-1a · Post-fulfilment refunds returned the service and processing fees — HIGH

`goods` was `amount − tip`. Since `amount` is the full charged total, that included the customer
service fee and the processing fee — so a post-fulfilment refund handed both back while its own
disclosure said they were non-refundable. With a $9.00 order + $1.00 tip + 27¢ service + 30¢
processing, the customer received 957¢ where the policy says 900¢.

**Fixed:** `goods = amount − tip − serviceFee − processingFee`, with both components now recorded on
the transaction (`service_fee_cents`, `processing_fee_cents`) so the refund policy can see them.

### F-1b · The marketplace fee was charged on the platform's own fees — HIGH

`charge()` derived its fee base as `amount − tip − roundUp`, which includes the service and
processing fees — levying the 10% marketplace fee on top of a platform fee and a processor
pass-through. Worse, the order path *separately* computed `platformFeeCents` on the discounted
subtotal, so the fee displayed to the customer and the fee actually charged were two different
numbers that agreed only while every other fee was zero.

**Fixed:** the fee base now excludes both.

### F-1c · Removing an out-of-stock line wiped the fees off the order — MEDIUM

`removeLineItem` re-itemised the order with `computeOrderBreakdown` and no `rates` argument, falling
back to `MVP_ORDER_FEE_RATES` (all zeros). An order that had genuinely been charged a service and
processing fee came back re-priced as though it never was.

**Fixed:** the live rates are resolved and passed.

### Partial-refund fee proration — corrected alongside

The marketplace fee returned on a partial refund was pro-rated against the gross total rather than
the goods base it was charged on, under-returning the vendor's fee on every partial refund
(90¢ × 300/1000 = 27¢ where the correct answer is 90¢ × 300/900 = 30¢). Now pro-rated against goods,
and the refund is capped at the goods portion so a partial can never claw back a tip.

---

## Summary

| ID | Defect | Severity | Status |
|---|---|---|---|
| F-1 | Refund disclosure reports 0 retained processing | High | ✅ Fixed — split into `processingRetainedCents` (what the processor keeps) and `processingBorneByCustomerCents` (what the customer is actually out), because conflating the two is what made the single field misleading |
| F-1a | Post-fulfilment refund returned service + processing fees | High | ✅ Fixed |
| F-1b | Marketplace fee charged on top of platform/processor fees | High | ✅ Fixed |
| F-1c | Line removal wiped fees off a charged order | Medium | ✅ Fixed |
| F-2 | Product owner cannot end a consignment | High | ✅ Fixed — new `checkout:end` permission (seller **or** hub owner); both parties notified whoever ends it |
| F-3 | Five RTO statuses unreachable | High | ✅ Fixed — §50's seven remedies and §51's return make every declared status reachable |
| F-4 | `condition_return` never written | High | ✅ Fixed — written on the return transition, with §52's dual acknowledgment |
| F-5 | Travel fee configured, never charged | Medium | ✅ Fixed — snapshotted at request time, charged once at checkout, disclosed on the confirm screen |
| F-6 | 8 failing backend tests | Medium | ✅ Fixed — **368/368**, and both previously-uncovered gates now tested |
| F-7 | Subscriptions test asserts 4 of 6 plans | Low | ✅ Fixed — and the two missing plans were genuinely absent from the client, not just the test |

**All seven defects are now closed**, plus the three (F-1a/b/c) found while fixing them. F-3 and F-4
were resolved by building the §50 remedies and §51 return they depended on, rather than by narrowing
the enum — which would have removed the record of two specification requirements instead of meeting
them.
