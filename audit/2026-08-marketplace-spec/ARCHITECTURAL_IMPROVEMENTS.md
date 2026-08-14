# Architectural Improvements

Structural recommendations. These are **not** specification requirements — every one is a judgement about scalability, maintainability, security, or usability, and every one carries its justification.

Ordered by expected value.

> ### Status — 2026-08-02 (roadmap Phase 4)
>
> **Nine of ten implemented: A-1, A-2, A-3, A-5, A-6, A-7, A-8, A-9, A-10.** (A-6 in Phase 1, A-3 in
> Phase 5, A-9 in Phase 7.)
>
> Still open: **A-4** only — both access gates covered by tests. The suite is green and the two gate
> tests are still not written.
>
> The two gates (A-1, A-2) turned out to be worth more than the refactors, because they found things
> nobody was looking for: 27 endpoints with no caller, 39 routes with no test, and 15
> declared-but-unwritten enum values — one of which (`Refund.status.failed`) means a failed Stripe
> refund leaves a customer looking refunded when they are not. Details in
> [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) Phase 4.
>
> **A-5's sequencing constraint was missed.** It was specified as "before §56.1 adds four split
> legs" and landed after. The extraction is a retrofit; the random-sweep reconciliation tests confirm
> no inconsistency shipped, but the ordering was the recommendation's point.

---

## What not to change

Before the recommendations, the parts of this architecture that are load-bearing and correct. Changing them would cost more than any improvement below returns.

1. **Money is server-authoritative and single-sourced.** `computeOrderBreakdown` serves both the quote and the charge, so a customer cannot be charged a total they did not preview. Fee rates are resolved server-side from the registry and are never client-supplied.
2. **Immutability where history matters.** `settlements`, `rto_ledger`, and `rto_statements` carry `immutablePlugin`, with unique idempotency keys on ledger rows. Financial history cannot be rewritten, and a retried charge cannot double-post.
3. **Terms are snapshotted, not referenced.** A consignment checkout freezes the owner's terms, the seller's Trust band, and the fee discount at pickup ([consignment.model.ts:150](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.model.ts#L150)). Retuning the Trust table cannot silently re-price work already in flight. This is subtle, hard to retrofit, and already right.
4. **Payouts know where the money came from.** `funding_source` plus per-leg `seller_payout_status` mean "settled" can never hide the fact that no money moved — the failure mode where a platform pays out its own capital on proceeds it never collected.
5. **Fees are configuration, not code.** `FEE_TYPES` + `fee_schedule` versioning means adding the missing fee types (M-8 convenience, M-15 booking) is a config entry and one call site, not a refactor.
6. **Paid placement is a boost, never a filter,** with a hard `AD_MAX_SHARE_OF_FEED` cap. Preserve this constraint through the UI work.

---

## A-1 · Add a "reachability" gate to CI — **highest value**

**Problem.** Three complete, tested, revenue-bearing backends ship with no user-facing entry point: rent-to-own (§42–53), paid placements (RV-11/17/18), and consignment-RTO (§54–56). This was found by grepping for callers, not by any automated signal. The clearest artefact: `useRtoDisclosure` is written, exported from `features/rto/index.ts`, and consumed by zero components.

**Why it matters more than any single feature.** This is the failure mode that produced roughly 30% of this audit's findings. Fixing the three instances without fixing the cause means auditing for it again next quarter.

**Recommendation.** A CI check that parses `lib/api/endpoints.ts`, greps for each entry's usage outside `endpoints.ts` and `keys.ts`, and fails on unreferenced entries unless explicitly allowlisted with a reason. Roughly a 100-line script; the endpoints file is a single flat object, which makes this unusually cheap.

**Extend it server-side:** a route with no frontend caller and no test is dead weight that still carries attack surface and maintenance cost.

**Effort:** S. **Justification:** maintainability and, bluntly, revenue — it catches "built but unsellable" before it reaches a quarterly review.

---

## A-2 · Forbid unreachable enum values

**Problem.** `RtoAgreement.status` declares nine states; five can never be written (F-3). A model that promises a lifecycle the service does not implement misleads every future reader and produces dead branches in every consumer.

**Recommendation.** A convention, enforced by test: for every status enum on a domain model, a test asserts each value has at least one writer. Cheap to write generically against the Mongoose model registry.

**Effort:** S. **Justification:** maintainability. The schema is the primary documentation of a domain; it should not describe features that do not exist.

---

## A-3 · Move the fee-schedule cache to Redis

**Problem.** `resolveFeeRule` caches the schedule in-process with a 30-second TTL ([fees.ts:33](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/fees.ts#L33)). With N app instances, a schedule change propagates non-atomically: for up to 30 seconds, two instances price the same transaction differently.

The file already anticipates this — *"Redis-backed caching is the P1 item."* Redis is already a dependency (BullMQ, presence, rate limiting).

**Failure scenario:** ops corrects a mispriced fee. For 30 seconds, some customers get the old rate. On a low-traffic day this is invisible; at scale it is a reconciliation discrepancy with no single explanation.

**Recommendation.** Redis-backed cache with pub/sub invalidation on write. `invalidateFeeCache()` already exists as the hook.

**Effort:** S–M. **Justification:** scalability + financial correctness. The cost is small; the class of bug it removes is expensive to diagnose.

---

## A-4 · Make the test suite green and keep it green

**Problem.** 8 of 351 backend tests fail (F-6). Seven are stale assertions trailing intentional changes; one is unexplained. Both facts matter, but the second-order effect matters more: **a suite that is normally red stops being a gate.** People learn to skim "4 failed" and ship.

Two specific coverage holes the red suite is currently masking:
- The `requireModule` gate test now passes 200 where it expected 422, because the module it tests is enabled by default. The gate — real authorization enforcement — is effectively untested.
- The messaging transaction gate, added to close an "any stranger can message any business" hole, has **no test asserting the 403 it introduced.** The only tests touching it assert the old permissive behaviour.

**Recommendation.** Fix the seven stale tests, triage the eighth, then add positive coverage for both gates. Wire the suite into a pre-merge check.

**Effort:** S–M. **Justification:** every other recommendation here assumes a working regression gate.

---

## A-5 · Introduce a shared money-primitives module

**Problem.** Fee and split arithmetic lives in at least four places: `orders/pricing.ts`, `payments/fees.ts`, `rto/rto.pricing.ts`, and the consignment settlement path. Each is individually correct and integer-cents-disciplined. But rounding conventions (`Math.floor` on basis-point math) are re-implemented per module, and the number of split legs is growing — §56.1 alone adds four more.

Not urgent: no rounding inconsistency was found. But this is the code most expensive to get wrong later, and the divergence pressure is increasing.

**Recommendation.** Extract `applyBps`, `splitRemainder`, and an allocation helper that guarantees legs sum exactly to the total (the classic penny-allocation problem — the current code handles it per-site).

**Effort:** M. **Justification:** maintainability + financial correctness. Do it *before* §56.1's tax/delivery/refund legs land, not after.

---

## A-6 · Structure §44 and §54 obligations as fields, not prose

**Problem.** §44 requires an RTO listing to display maintenance responsibilities, damage responsibilities, return rights, and cancellation terms. §54 requires a consignment-RTO agreement to establish ten specific allocations. Today all of these exist only inside agreement body text — and that text is a placeholder.

Anything that lives only in prose cannot be validated, defaulted, diffed between listings, or shown in a comparison view. §44's requirement that *"the customer must see the full cost before accepting"* is enforceable for the money fields (they are typed) and unenforceable for the rest.

**Recommendation.** Promote per-listing obligations to structured fields on the agreement, keeping genuinely universal clauses in the agreement body. **Do this before the attorney engagement (M-1)** — the structured/prose boundary is exactly the question counsel is best placed to answer, and asking it once is far cheaper than restructuring after review.

**Effort:** M. **Justification:** compliance + usability. **Sequencing note:** this is the one recommendation with a hard ordering constraint.

---

## A-7 · Unify the two discount models before adding a third

**Problem.** Queue discount schedules (time-decaying, `PUT /queues/.../discount-schedule`) feed the Trending boost. Flash sales (MS-10) would introduce a second, product-scoped, window-based discount. Subscription fee discounts and Trust-band fee discounts are a third and fourth mechanism, though those reduce platform fees rather than prices.

**Recommendation.** Before building MS-10, define one price-discount abstraction with a scope (queue / product / business), a window, and a magnitude. Retrofit the queue schedule onto it.

**Effort:** M. **Justification:** maintainability. Two discount systems is a tolerable accident; three is a permanent tax on every pricing change.

---

## A-8 · Decide what a "storefront" is before building on top of it

**Problem.** Products are bound to hubs (`products.hub_id`). A non-hub vendor has a *menu*, not a catalog. MS-1 (storefronts), MS-5 (used equipment), MS-6 (wholesale), HR-9 (websites), and M-40 all sit on top of this unresolved distinction, and each will resolve it differently if built independently.

**Recommendation.** One decision — is a storefront a menu with richer presentation, or a genuine catalog with a hub-independent product model? — before any of the five.

**Effort:** S to decide, L to implement. **Justification:** architecture. Five features branching off an unmade decision is how a data model fragments.

---

## A-9 · Add an outbound communication channel (email/SMS)

**Problem.** The platform can reach users only via in-app notifications and web push. `integrations/` contains auth, Gemini, KYC, storage, Stripe, and weather — no messaging provider.

This is more than a missing marketing feature (HR-18). §38 requires consignment expiry notices, §49 requires five RTO payment-reminder stages, and §53 requires completion notifications. **A user who denies push permission — a large fraction on iOS — receives none of them.** These are contractual notices under §60's agreements.

**Recommendation.** Add one transactional provider and route the legally-significant notices through it with push as an enhancement, not the sole channel.

**Effort:** M. **Justification:** compliance and reliability, ahead of marketing.

---

## A-10 · Formalize the demo-mode boundary

**Problem.** `NEXT_PUBLIC_MAP_DEMO` swaps in a fixture dataset ([demo.ts](../../src/lib/demo.ts)), and it is genuinely useful — it makes the app walkable with no backend or Mapbox token, and two of the passing component tests depend on it. The file notes the shapes *"match the livemap/business feature types; the hooks cast to them."*

That cast is the risk. A drift between a demo fixture and the real API shape is invisible until runtime, and demo-mode tests would keep passing across a breaking API change.

**Recommendation.** Type the demo dataset *as* the feature types rather than casting to them, so a contract change breaks the build. Add one non-demo integration test per surface that has demo-mode coverage.

**Effort:** S. **Justification:** the demo path is currently load-bearing for testing; it should not be the least type-safe part of the frontend.

---

## Summary

| ID | Recommendation | Effort | Primary justification |
|---|---|---|---|
| A-1 | Reachability gate in CI | S | ✅ Done — both halves; found 27 unreachable endpoints + 39 untested routes |
| A-2 | Forbid unreachable enum values | S | ✅ Done — found 15; 2 fixed, 13 recorded |
| A-3 | Redis-backed fee cache | S–M | ✅ Done in Phase 5 — L1/L2/L3 with pub/sub invalidation |
| A-4 | Green the test suite; cover both gates | S–M | Restores the regression gate |
| A-5 | Shared money primitives | M | ✅ Done — as a retrofit; the sequencing constraint was missed |
| A-6 | Structure §44/§54 obligations as fields | M | ✅ Done in Phase 1, before the legal brief |
| A-7 | Unify discount models | M | ✅ Done — one contest, best-wins, before MS-10 |
| A-8 | Decide the storefront model | S / L | ✅ Decided (ADR-001) + contract shipped; the L half is MS-5/MS-6 work |
| A-9 | Outbound email/SMS channel | M | ✅ Done in Phase 7 — §38/§49/§53 notices, with delivery recorded and an ops queue for the undelivered |
| A-10 | Type-safe demo boundary | S | ✅ Done — casts removed, checked at the consumer boundary |
