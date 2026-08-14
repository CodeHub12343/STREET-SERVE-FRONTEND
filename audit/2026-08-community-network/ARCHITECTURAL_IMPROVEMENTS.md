# Architectural Improvements

Structural changes this specification **requires**, followed by changes it **does not require but
would materially improve**. Every item carries its justification, per the audit brief.

---

## Part 1 — Required by the specification

### A-1 · A custodial account type for community money — **P0, blocks PIF and MB**

**Change:** add `community_fund_payable` to `ACCOUNT_TYPES`
([`ledger.model.ts:19-32`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ledger/ledger.model.ts#L19-L32))
with entry types `community_contribution`, `community_redemption`, `community_expiry`, and
`community_refund`.

**Why:** a Pay It Forward pool is real customer money held by the platform, owed to no identified
person, redeemable later by a stranger. None of the seven existing account types describes that.
`payable` means *owed to a seller* and is consumed by payout logic — crediting pool money there would
inflate seller payouts. `cash` alone loses the obligation entirely and books held money as though it
were the platform's.

The precedent is already in the file and is well-reasoned: `tax_payable` carries the comment *"NEVER
revenue and never distributable — it is the state's money held on their behalf until it is remitted."*
Community funds need the identical discipline with a different beneficiary. Copying an existing,
tested pattern is also the cheapest correct answer.

### A-2 · Make ledger normal-balance direction explicit — **P0, small**

**Change:** replace the `DEBIT_NORMAL` exception set
([`ledger.model.ts:34-42`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ledger/ledger.model.ts#L34-L42))
with a total `Record<AccountType, 'debit' | 'credit'>`.

**Why:** today, adding an account type without touching the set silently makes it credit-normal.
That is right for `community_fund_payable` by luck. A total record makes omission a compile error. The
cost is one small refactor; the benefit is that the ledger's most subtle invariant stops depending on
a developer remembering a second file. See [FEATURES_REQUIRING_FIXES.md](FEATURES_REQUIRING_FIXES.md) F-2.

### A-3 · Delivery as a first-class order fulfilment mode — **P0, blocks all of DAN**

**Change:** extend `fulfillment_type` to `['pickup_now','pickup_scheduled','delivery']` and add a
`destination` subdocument (address lines, `[lng,lat]`, access notes, contact) to
[`orders.model.ts`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/orders/orders.model.ts).

**Why:** the alternative — holding the destination on the delivery request instead of the order — puts
the order's own fulfilment truth outside the order, so refunds, disputes, receipts, and tax all have to
join through a second collection to answer *"where did this go?"*. The order is the record of what was
sold and how it reached the buyer; delivery is a property of that, not an annexe to it.

### A-4 · Model a delivery request on Wave-Down, not on Jobs — **P1, shapes the whole feature**

**Change:** create `delivery_requests` with the shape of
[`WaveDownSchema`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/queue/queue.model.ts#L33-L71):
requester, target scope, status enum, `requested_at`/`expires_at` (server-authoritative), snapshotted
fee fields, decline reason, plus an SLA sweep entry.

**Why:** two candidate templates exist and picking the wrong one is expensive. `jobs` is a hiring flow
— apply, select, check in — measured in hours and built around a *poster choosing a person*. Wave-Down
is a dispatch — request, broadcast, accept-or-expire — measured in minutes and built around *the first
willing party*. Delivery is the second thing. Wave-Down also already solved the two problems delivery
will hit immediately: fee snapshotting against mid-flight re-pricing (the reasoning is written out at
[`queue.model.ts:50-56`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/queue/queue.model.ts#L50-L56)), and
expiry when nobody responds.

### A-5 · Drivers as `live_sessions` actors, not a parallel presence system — **P1**

**Change:** add `driver` to the `actor_type` on
[`LiveSessionModel`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/livemap/livemap.model.ts) rather than
building a `driver_sessions` collection.

**Why:** on-shift drivers inherit, at no cost, everything already built for live actors — the
`2dsphere` index, the Redis hot mirror in [`liveStore.ts`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/livemap/liveStore.ts),
TTL-based stale-pin expiry, the `stale-session` sweep, and cell-based broadcast diffing. A parallel
system would duplicate all of it and then drift.

**The one caution:** drivers must be excluded from *customer-facing* map queries by default. A driver
is not a vendor, and rendering idle drivers as discoverable pins is both a privacy problem and a
confusing map. Make the exclusion explicit at the repository layer, not in each caller.

### A-6 · Event-driven dispatch broadcast — **P1**

**Change:** emit the driver broadcast on delivery-request creation; use the scheduled sweep only for
re-broadcast and expiry.

**Why:** the existing geo fan-out runs on a 60-second poll. A minute of silence after tapping "Need
Delivery Help" reads as a broken button. The codebase already made this exact call once, for corridor
alerts, and wrote down why: fired *"on the event rather than by a sweep"* because *"the event already
knows which vendor changed"* ([`livemap.service.ts:612-616`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/livemap/livemap.service.ts#L612-L616)).
Same reasoning, same answer.

### A-7 · A `/delivery` realtime namespace with a rate-limited position channel — **P1**

**Change:** add `deliveryOffer`, `deliveryClaimed`, `deliveryPosition`, and `deliveryStatus` to the
[`realtime` hub](../../../STREET-SERVE-APPLICATION-BACKEND/src/realtime/hub.ts), scoped to
`delivery:{id}` rooms.

**Why:** the seven existing emitters are all low-frequency and event-shaped. Courier position is the
platform's first *sustained* high-write stream. Isolating it in its own namespace means it can be rate
limited, sampled, and load-shed without touching `/live`, `/queue`, or `/messages` — which matters
because the map route is already near its performance budget.

**Design constraint:** the customer must receive positions **only** between acceptance and completion,
and only for their own delivery. A driver's position outside an active delivery must never leave the
server. This is a room-membership rule, and it should be enforced server-side at join time rather than
by trusting clients to unsubscribe.

### A-8 · Delivery as an archetype-gated business module — **P2**

**Change:** register delivery in the module system rather than gating on category checks.

**Why:** the `ARCHETYPES` design ([`constants.ts:47-52`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L47-L52))
exists specifically so that supporting every business type stays a four-problem rather than an
N-problem. Delivery is meaningful for `counter_serve` and `goods_seller`, meaningless for
`appointment_service` (a mobile mechanic cannot deliver an oil change). Expressing that as an archetype
default gets the spec's "future expansion" list — florists, produce vendors, mobile retailers — with no
per-category code.

### A-9 · Crowdfunding as a sibling of placements, not a variant — **P2**

**Change:** create `boost_campaigns` alongside `placements` rather than adding a funding mode to
`PlacementSchema`.

**Why:** `placements` is a single-owner prepaid aggregate — one `owner_id`, one `budget_cents`, one
`spent_cents`. A crowdfunded campaign has many contributors, a goal rather than a budget, a deadline,
and a fulfilment pipeline that ends at a physical mailbox. Forcing both into one document produces a
schema where half the fields are null for half the rows, and an `owner_id` that means two different
things. Share the *lifecycle patterns* — the `pending_payment` gate, the status machine, the settlement
sweep — not the table.

### A-10 · Campaign contribution capture model — **SUPERSEDED by [ADR-006](ADR-006-crowdfunding-capture-model.md)**

> **This recommendation was overturned in Phase 0 and is retained for the record.** Do not build it.
> The accepted design is **capture on contribution into ADR-005's custodial account**, with a ≤60-day
> hard deadline and automatic full refund if the goal is missed.

**What A-10 originally recommended:** authorise each contribution and capture only when the goal is
reached, so the platform never holds the money — deleting the escrow question, the refund pipeline,
and the dormancy policy at a stroke.

**Why it was overturned** (full reasoning in ADR-006):

1. **It does not survive its own failure mode.** Authorisations are not money. A campaign can reach its goal in *authorisations* and come up short at capture, through expired holds and closed cards — leaving the vendor told they succeeded, with an underfunded campaign and no recourse except asking the same people twice.
2. **Its main benefit was already paid for.** The "no custody" saving assumed custodial machinery was unique to this feature. A-1 builds it for Pay It Forward regardless, so the marginal cost of reusing it here is small and one counsel review covers both.
3. **~7-day authorisation expiry would cap campaigns at a week**, which is not a realistic window for a $1,000 goal — and shortening the product to fit a payments limitation is the wrong way round.

**What survives from A-10:** the hard deadline, the refusal to hold money open-endedly, and the
insistence that the unmet-goal path be defined before anything is built. ADR-006 keeps all three.

---

## Part 2 — Recommended improvements (not required by the specification)

### A-11 · Extract a shared "dispatch" abstraction — **P2**

Wave-Down and delivery would be the platform's second and third request/broadcast/accept/expire flows
(queue holds are arguably a fourth). Each re-implements expiry sweeps, atomic claim, and fee
snapshotting. **Justification:** one tested primitive with three consumers is cheaper to keep correct
than three implementations, and the atomic-claim race is exactly the kind of bug that gets fixed in one
copy and not the others. Do this *after* delivery ships and the shape is known from two real cases —
extracting an abstraction from one example is guesswork.

### A-12 · A generic contribution primitive — **P2**

PIF contributions and MB contributions are the same object: a payer, an amount, an anonymity flag, an
optional display name, a target, and an intent id. **Justification:** the anonymity rule (PIF-7, MB-11)
is a privacy control that must hold on *every* read path; implementing it twice doubles the chance one
path leaks a name. One serialiser, one test.

### A-13 · Idempotency and receipt immutability on every generosity path — **P1**

**Justification:** a double-charged donation is worse than a double-charged purchase, because the payer
gets nothing for it and the trust damage is disproportionate to the dollar amount. All impact metrics
(PIF-11, PIF-12, PIF-21) should be computed from immutable receipt rows rather than mutable counters —
a counter that drifts turns a public "meals given" number into a credibility problem.

### A-14 · Driver safety surface — **P1, absent from the specification**

Share-my-trip, an in-app emergency contact, and incident reporting. **Justification:** the specification
describes sending people to strangers' addresses and does not mention safety once. Every comparable
platform added these after an incident rather than before. The `messaging` module and notification rails
make the first two cheap.

### A-15 · Destination privacy by lifecycle stage — **P1, absent from the specification**

Show the driver an approximate area before acceptance; the exact address only after; revoke access after
completion. **Justification:** a broadcast that includes a precise home address is sent to *every* nearby
driver, most of whom will not take the job. That is an address disclosure to strangers with no
countervailing benefit, and the coarsening costs nothing operationally.

### A-16 · Pre-commit the copy rules — **P1**

This specification introduces three claims the product must never make: **"insurance"** for anything in
delivery, **"tax-deductible"** for contributions (PIF-16), and **"employee/wage"** for drivers
(ADR-002's existing rule). **Justification:** the repo already enforces copy rules by test for
`stock_waiver` and for ADR-002. That mechanism works, it is cheap, and adding the assertions before the
copy is written is far easier than auditing marketing text later.
