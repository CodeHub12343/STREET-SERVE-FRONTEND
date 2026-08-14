# Features Requiring Fixes

Things that exist and contain defects, incorrect behaviour, or inconsistencies **that this
specification exposes or would worsen**.

An important qualification, stated plainly: the three specified features do not exist, so they cannot
themselves be broken. This document therefore covers defects in *existing* code that the new work
would collide with. It does not restate the general defect inventory from the previous audit
([`FEATURES_REQUIRING_FIXES.md`](../2026-08-marketplace-spec/FEATURES_REQUIRING_FIXES.md)) — only the
items on the path of this specification.

Severity: **S1** must be fixed before the dependent feature ships · **S2** should be fixed during ·
**S3** cleanup.

---

## F-1 · `delivery_cents` is a total line with no producer — **S2**

**Where:** [`orders.model.ts:47`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/orders/orders.model.ts#L47)

The order carries a `delivery_cents` field that nothing ever writes, alongside a comment stating it is
$0 in the pickup MVP. This is defensible scaffolding today. It becomes a defect the moment DAN-10
lands, because there will then be *two* plausible places to express a delivery charge — this field and
whatever the delivery module snapshots — and they can disagree.

**Fix:** when DAN-10 lands, make `delivery_cents` the single authoritative line, populated only from
the snapshotted quote on the delivery request. Add an invariant test that an order with
`fulfillment_type: 'delivery'` has non-null delivery totals and a destination, and that a pickup order
has neither.

## F-2 · `DEBIT_NORMAL` must be updated with any new account type — ✅ **FIXED 2026-08-04**

**Where:** [`ledger.model.ts:34-42`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ledger/ledger.model.ts#L34-L42)

`signedDelta` derives balance direction from membership of a hardcoded `DEBIT_NORMAL` set. A new
account type added to `ACCOUNT_TYPES` without a matching decision about that set **silently defaults to
credit-normal**. For `community_fund_payable` credit-normal happens to be correct — but it is correct
by accident, not by construction, and the next account type may not be so lucky.

This is not currently broken. It is a trap with no guard rail, and this specification is the first
thing in a while to add account types.

**Fixed.** `NORMAL_BALANCE` is now a total `Record<AccountType, 'debit' | 'credit'>` with a one-line
rationale per account. Adding an `AccountType` without deciding its normal side no longer compiles,
which is the protection `community_fund_payable` (Phase 2.1) needs and previously would have got only
by luck. `normalBalanceOf()` is exported so tooling and tests can assert against it.

## F-3 · Balance credited without money collected — the pattern that must not recur — **S1 (prevention)**

**Where (fixed precedent):** [`growth.model.ts:22-44`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/growth/growth.model.ts#L22-L44)

The `PingBudgetTopup` model exists because of a real, previously-shipped defect, documented in its own
comment: *"The budget was previously topped up by simply incrementing a counter — no money was ever
collected, so every tip paid out of it would have spent platform capital."*

PIF-2/PIF-3 and MB-2/MB-3 both introduce a user-visible balance that rises when someone contributes.
That is the identical shape. Without the same intent-then-webhook discipline, the identical defect
recurs — this time with community money, which is worse.

**Fix (preventive):** contributions create a payment intent; the pool is credited **only** in the
webhook handler, keyed on the intent id with a unique index for idempotency. Copy `PingBudgetTopup`
field for field. Write the test that asserts a pool balance never rises without a `succeeded`
contribution row.

## F-4 · Idempotency defects on every money-in path — ✅ **FIXED 2026-08-04**

Recorded in the Phase 6 security work: the idempotency implementation has a body-hash defect. Every
new money-in path this specification adds — PIF contributions, MB contributions, delivery fee capture
— rides that middleware. A duplicate-submit bug on a *donation* endpoint is a double-charged act of
generosity, which is both a refund and a trust problem.

**Fixed, and the audit under-called it.** The predicted body-hash defect was real — `JSON.stringify`
preserves insertion order, so the same request with its keys in a different order was rejected as a
mismatch — but two worse defects sat beside it in the same 80 lines:

1. **A check-then-act race.** `get` → decide → `setNx` **with its result discarded**. Two concurrent
   retries both read an empty key, both concluded they were first, and both ran the handler. That is
   a double charge produced by the middleware that exists to prevent double charges. The reservation
   is now taken first and its atomic answer is the decision.
2. **Failures cached as results.** Every response was stored, so a transient 500 was pinned for the
   24h TTL and replayed as a successful idempotent hit. Now: 2xx cached; 4xx releases the key so a
   corrected retry is not locked out; 5xx or no response holds the reservation, because the outcome
   is unknown and a delay is a better failure than a duplicate charge.

`test/idempotency.test.ts` covers all three plus replay, conflict, and a real money-in route. Each of
the six defect tests was verified to fail against the previous implementation.

## F-5 · Proximity fan-out cadence is wrong for dispatch — **S2**

**Where:** [`livemap.service.ts:578-607`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/livemap/livemap.service.ts#L578-L607)

The existing geo fan-out runs as a **60-second polling sweep** (`proximity-alert-eval`,
[`scheduler.ts:61-63`](../../../STREET-SERVE-APPLICATION-BACKEND/src/jobs/scheduler.ts#L61-L63)). It is the
right query and the right throttle, but reusing its *cadence* for DAN-2 would mean up to a minute
before any driver hears about a delivery — long enough that the vendor gives up, which defeats the
feature.

**Fix:** make delivery broadcast event-driven (emit on request creation) with the sweep used only for
re-broadcast and expiry, mirroring how `onBusinessBecameActive` fires corridor alerts on the event
*"rather than by a sweep"* — the reasoning is already written down at
[`livemap.service.ts:612-616`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/livemap/livemap.service.ts#L612-L616).

## F-6 · Wave tracker's "tracking" is an ETA, and the UI may imply more — **S3**

**Where:** [`useWave.ts`](../../src/features/wave/hooks/useWave.ts), `WaveActive.tsx`

The customer sees `etaSeconds` and a status. There is no position stream. If DAN-6 ships real courier
tracking, the two experiences will differ sharply while looking similar, and the wave experience will
read as broken by comparison.

**Fix:** either extend live position to Wave-Down once the `/delivery` channel exists (cheap, once the
infrastructure is there), or keep the wave UI honestly ETA-shaped. Do not leave them looking alike and
behaving differently.

## F-7 · `SELF_GRANTABLE_ROLES` has an inverted doc comment — ✅ **FIXED 2026-08-04**

**Where:** [`constants.ts:20-21`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L20-L21)

```ts
/** Roles a user may never self-grant via /auth/roles. */
export const SELF_GRANTABLE_ROLES: Role[] = ['seller', 'vendor', 'hub'];
```

The comment says these are the roles a user may **never** self-grant. **The comment is wrong.**
Verified against the handler: `addRoleSelf` throws `CANNOT_SELF_GRANT_ROLE` when the requested role is
**not** in the list ([`identity.service.ts:131-136`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/identity/identity.service.ts#L131-L136)),
and the doc block directly above it states the correct rule. So the constant is an **allowlist**, the
name is right, and only the one-line comment is inverted.

Harmless today because no one is reading it in isolation. Not harmless when X-3 adds `driver`: a
developer following that comment would add `driver` to the list believing they were *forbidding*
self-grant, and would in fact be **allowing any user to self-grant the driver role without vetting** —
the highest-consequence single-line mistake available in this specification.

**Fixed.** The comment now states that this is an allowlist, names the error thrown for anything
absent from it, and warns explicitly that no role carrying vetting — a background check, a licence, an
insurance attestation — may be added. That is the exact mistake X-3 was set up to make.

## F-8 · Agreements in the registry are unreviewed, and this spec adds three more — **S2**

**Where:** [`agreements.registry.ts`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/agreements/agreements.registry.ts)

Existing entries carry `reviewed: false` with `PLACEHOLDER — pending legal review`. The registry
mechanism is sound; the backlog is the problem. This specification adds three more agreements needing
counsel (driver terms, contribution terms, community-fund terms), and two of them govern money held on
behalf of third parties — a higher bar than the existing placeholders.

**Fix:** do not let unreviewed placeholder text govern custodial funds. Get the two money agreements
reviewed before the features accept a single real contribution, even if the RTO backlog stays as it is.

## F-9 · CI gate baselines will trip on every new module — **S3**

Three CI gates (reachability, route coverage, enum writers) run against recorded baselines. Each new
module, route, role, fee type, and account type this specification adds will fail them until baselines
are updated.

**Fix:** update baselines in the same PR as the change that trips them, never as a batch at the end. A
batched baseline update is indistinguishable from a gate being switched off.

---

## Summary

| ID | Severity | Blocks | One-line fix |
|---|---|---|---|
| F-1 | S2 | DAN-10 | Make `delivery_cents` authoritative + invariant test |
| F-2 | ✅ fixed | X-2 / PIF-23 | Total `Record<AccountType, …>`; omission is now a compile error |
| F-3 | S1 prevention | PIF-3, MB-3 | Copy the `PingBudgetTopup` intent→webhook discipline |
| F-4 | ✅ fixed | all money-in | Three defects fixed: race, body-hash order, cached failures |
| F-5 | S2 | DAN-2 | Event-driven broadcast, sweep only for re-broadcast/expiry |
| F-6 | S3 | DAN-6 | Align wave tracking with delivery tracking, or keep it honest |
| F-7 | ✅ fixed | X-3 | Comment corrected; now warns against adding vetted roles |
| F-8 | S2 | PIF, MB | Counsel review for the two custodial agreements |
| F-9 | S3 | all | Per-PR baseline updates |
