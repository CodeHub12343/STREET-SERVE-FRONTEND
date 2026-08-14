# Implementation Audit Report — Community Network Specification

**Audit date:** 2026-08-04
**Specification audited:** the three-feature community network brief — *Delivery Assist Network*, *Pay It Forward*, and *Boost My Marketing* (community-funded direct mail).
**Repositories:** `STREET-SERVE-APPLICATION` (Next.js PWA), `STREET-SERVE-APPLICATION-BACKEND` (Express/Mongo/BullMQ).
**Method:** every requirement extracted from the specification, then located (or shown absent) in code. No production code was modified.

> **Scope note.** This is a *second, separate* audit. The earlier audit in
> [`audit/2026-08-marketplace-spec/`](../2026-08-marketplace-spec/) covers the marketplace/fees/consignment/RTO
> specification and remains valid. Nothing in this directory supersedes it; where the two overlap
> (fee registry, ledger, ads) this report cites the existing findings rather than re-deriving them.

---

## 1. Headline finding

**All three specified features are absent from the product.** Not partially built, not built and
unwired — absent. There is no delivery module, no pay-it-forward module, and no crowdfunding module
in either repository.

| Feature | Backend | Frontend | Overall |
|---|---|---|---|
| Delivery Assist Network | ✗ no module | ✗ no surface | **~6%** (adjacent primitives only) |
| Pay It Forward | ✗ no module | ✗ no surface | **~9%** (adjacent primitives only) |
| Boost My Marketing | ✗ no module | ✗ no surface | **~5%** (adjacent primitives only) |

The non-zero percentages are **not partial implementations**. They are credit for infrastructure the
new features can genuinely reuse without modification — the geo-fanout sweep, the prepaid-budget
pattern, the double-entry ledger, the gig payout rail. That distinction matters for planning: the
build is large in product surface but small in *novel* infrastructure. Roughly 60% of what each
feature needs already exists as a proven pattern somewhere else in this codebase.

## 2. What the specification asks for, and what is actually there

### 2.1 Delivery Assist Network

The spec asks for real-time dispatch: a vendor taps a button, nearby drivers are alerted, the first
to accept claims the job, and the customer watches a live GPS trace until hand-off.

**Verified absent:**
- No `delivery` module in [`src/modules/`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/) — the 38 modules present contain no dispatch entity.
- **Orders cannot be delivered at all.** [`orders.model.ts:23-26`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/orders/orders.model.ts#L23-L26) enumerates `fulfillment_type` as exactly `['pickup_now', 'pickup_scheduled']`. There is no delivery address field anywhere on the order.
- `delivery_cents` exists on the order total at [`orders.model.ts:47`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/orders/orders.model.ts#L47) but is a **structural placeholder**: the adjacent comment states plainly that `tax/delivery/service/processing are $0 in the pickup MVP`.
- **No driver role.** `ROLES` at [`constants.ts:7-16`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L7-L16) is `customer, seller, vendor, hub, shelter_admin, sponsor, admin, ops_finance`.
- **No delivery fee type.** `FEE_TYPES` ([`constants.ts:200-213`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L200-L213)) has twelve entries; none is a delivery coordination fee.
- **No realtime channel.** The emit surface in [`realtime/hub.ts:28-53`](../../../STREET-SERVE-APPLICATION-BACKEND/src/realtime/hub.ts#L28-L53) is exactly seven methods (`pinUpdate`, `pinRemove`, `queueUpdate`, `popupDelay`, `waveAccepted`, `notify`, `messageNew`, `messageRead`). Nothing carries a courier position.

**What genuinely exists and is reusable:**
- `JOB_TYPES` already includes `'delivery'` ([`constants.ts:1052-1059`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L1052-L1059)). A vendor can post a delivery *gig* today — but through the generic jobs board: post → applicants apply → poster selects → tap check-in. That is a hiring flow measured in hours, not a dispatch flow measured in seconds. It does not satisfy the requirement, and the gap between them is the whole feature.
- **Wave-Down is the closest working analogue and it is close.** [`WaveDownSchema`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/queue/queue.model.ts#L33-L71) already models a dispatch request with a lifecycle (`pending/accepted/declined/expired/cancelled`), an expiry, an ETA, a **snapshotted travel fee**, and a **customer-paid convenience fee** for the dispatch itself. There is an SLA sweep (`wave-down-sla`) and a socket event (`waveAccepted`). The delivery request is Wave-Down with a third party in the middle.
- The **geo-radius fan-out with per-pair throttling** at [`livemap.service.ts:578-607`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/livemap/livemap.service.ts#L578-L607) is exactly the broadcast primitive DAN-2 needs — a `$near` query against live positions plus a Redis `setNx` throttle key.
- The **same-day gig payout rail** (`POST /jobs/:id/check-out` → Stripe Connect transfer) is the driver payout rail, already built and already reconciled.

### 2.2 Pay It Forward

The spec asks for pooled community generosity: money pools, product pools, partial payments,
anonymity, recognition, dashboards, a live global counter, map badges, giver badges, corporate
sponsorship, and priority groups.

**Verified absent:** grep for `payItForward|payForward|donation|donate` across the backend returns
hits in exactly three files, all of them **consignment** code using the word incidentally. There is
no pool, no balance, no redemption, no impact page.

**What exists and is adjacent but is not this feature:**

| Existing thing | Why it isn't Pay It Forward |
|---|---|
| **Gifts** ([`growth.model.ts:78-97`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/growth/growth.model.ts#L78-L97)) | A gift is **directed**: it names a `recipient_contact_hash` and issues a unique `redemption_code`. Pay It Forward is explicitly *undirected* — it goes to whoever comes next. Different fraud surface, different accounting, different UX. |
| **Giveaways** ([`growth.model.ts:99-113`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/growth/growth.model.ts#L99-L113)) | Structurally the closest match to the spec's *product pool*: a product name, a daily cap, a claimed counter, one claim per user per day. But it is **vendor-funded** — the vendor gives away their own stock. Pay It Forward is **customer-funded**. The money direction is inverted, which is the entire accounting problem. |
| **Spot Me** ([`growth.model.ts:135-155`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/growth/growth.model.ts#L135-L155)) | A *loan* with a `repay_by` date and a `defaulted` state. Pay It Forward is a gift with no repayment. |
| **Sponsors** ([`sponsors.model.ts`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/sponsors/sponsors.model.ts)) | Launch/landing-page sponsors: a logo, a UTM code, and signup attribution. The spec's "corporate sponsor buys 500 coffees" is a completely different entity that happens to share a word. |
| **Loyalty** ([`loyalty.service.ts:20-44`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/loyalty/loyalty.service.ts#L20-L44)) | Stamps, deliberately not points — the module's own comment explains that an exchange rate is a liability a vendor should not be made to carry. **That reasoning applies directly to a Pay It Forward money pool and is the single most important thing this audit found.** See §3.1. |

### 2.3 Boost My Marketing

The spec asks for community-crowdfunded direct mail: a goal, contributions from customers and other
vendors, a live postcard estimate, then print → mail → delivered tracking.

**Verified absent:** no `crowdfund|postcard|directMail` anywhere. No print/mail vendor in
[`THIRD_PARTY_INTEGRATIONS.md`](../../../STREET-SERVE-APPLICATION-BACKEND/THIRD_PARTY_INTEGRATIONS.md).

**What exists:** the `ads` module ([`ads.model.ts`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ads/ads.model.ts)) is a complete, well-reasoned **self-funded prepaid campaign system** — budget, spend-down, CPM, geo/category targeting, a `pending_payment → active` gate that refuses to serve unpaid placements, and an `ad-settlement` sweep. Every part of that is reusable **except the funding model**, which is the requirement. One advertiser paying their own budget is not many contributors funding a shared goal.

Note also that the ads campaign UI was flagged as missing in the previous audit (RV-17) and has since
been built (`vendor/ads/`, `PromoteFlow.tsx`, `AdsDashboard.tsx`), so the campaign-management surface
this feature would extend does now exist.

---

## 3. The three findings that should change the plan

> **All three are now decided** (Phase 0, 2026-08-04): [ADR-004](ADR-004-driver-classification-and-liability.md),
> [ADR-005](ADR-005-custodial-community-funds.md), [ADR-006](ADR-006-crowdfunding-capture-model.md), plus the
> [copy-rule register](COPY_RULE_REGISTER.md). The findings below are retained as the reasoning that led to
> them; each section ends with the decision it produced.

### 3.1 A money pool is a liability, and this codebase already knows that

The loyalty module rejected points *specifically because* an exchange rate creates a liability the
vendor carries. A Pay It Forward money pool is that liability made literal: real customer money,
held by the platform, owed to nobody in particular, redeemable later by a stranger.

The ledger has the right precedent and the wrong vocabulary. `ACCOUNT_TYPES`
([`ledger.model.ts:19-32`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ledger/ledger.model.ts#L19-L32)) is
`cash, payable, receivable, fee_revenue, reserve, write_off, tax_payable` — and `tax_payable` carries
the comment *"NEVER revenue and never distributable — it is the state's money held on their behalf
until it is remitted."* A community fund is the same shape: held, not earned, not the platform's,
not the vendor's until redeemed. It needs its own account type with that same discipline, and
crediting it to `payable` (which means "owed to a seller") would be an accounting error that
compounds silently.

**This is a prerequisite, not a refinement.** Build the account type before the feature.

**→ Decided ([ADR-005](ADR-005-custodial-community-funds.md)):** `community_fund_payable`, credit-normal, modelled on `tax_payable`. Never revenue, never the vendor's, and **never withdrawable** — pool money can only ever discharge an order at that business, which is what keeps the feature from being a money-movement service. No fee on contributions; the standard marketplace fee applies at redemption, because a fee-free settlement path would be an arbitrage against ordinary sales.

### 3.2 Drivers are the hardest thing this platform has been asked to model

[ADR-002](../2026-08-marketplace-spec/ADR-002-staff-vs-gig.md) decided that the platform models
**engagements, not employment**, for three stated reasons — the strongest being that storing a wage
and a schedule asserts an employment relationship the platform cannot support honestly. It created
an enforced copy rule: nothing may say *employee*, *staff*, *hire*, *wage*, or *salary*.

A dispatched delivery driver sits right on that line. The lever is control: a driver who accepts a
discrete offer at a price shown up front is an engagement; a driver assigned work, penalised for
declining, or rated toward deactivation starts to look like something else. Several things the spec
implies — acceptance-rate pressure, radius assignment — push in the wrong direction.

Separately, and more urgently: **delivery drivers create third-party physical risk that nothing else
on this platform does.** A vendor walking to a customer (Wave-Down) is one thing. A driver in a car,
carrying someone else's goods, on a trip the platform arranged, is another. Commercial auto and
contingent liability coverage is a real-world prerequisite with a real-world cost, and it is not a
line of code.

**→ Decided ([ADR-004](ADR-004-driver-classification-and-liability.md)):** drivers are engagements and ADR-002 extends unchanged — but three dispatch mechanics are now **prohibited**, because they are what would change the answer: **assignment**, **acceptance-rate pressure**, and **exclusivity**. First-to-accept broadcast was chosen precisely because it is compatible with all three prohibitions. The platform provides no cover to drivers and may never say it does; insurance must still be quoted and bound, which remains a launch gate.

### 3.3 Crowdfunding has an unresolved product question the spec itself flags

The brief raises it: *"what happens if the goal isn't reached for a long time."* That is not an edge
case, it is the main path — most crowdfunding campaigns miss their goal. Until it is decided, the
money model is undefined, and the wrong answer is a regulatory problem: holding contributors' funds
indefinitely against an undelivered service is the shape of an escrow arrangement, and in some US
states of money transmission.

This audit originally recommended **authorise-don't-capture** — hold nothing, release on failure.

**→ Decided ([ADR-006](ADR-006-crowdfunding-capture-model.md)), and it reverses that recommendation.** Writing out the mechanics defeated it on two counts. First, it does not survive its own failure mode: authorisations are not money, so a campaign can reach its goal *in authorisations* and come up short at capture through expired holds and closed cards — leaving a vendor told they succeeded with an underfunded campaign. Second, its "no custody" benefit had already been paid for, because ADR-005 builds the custodial rail for Pay It Forward regardless. The accepted model is **capture on contribution into that same custodial account**, with a ≤60-day hard deadline, automatic full refund if the goal is missed (the platform absorbing the refund processing cost), owner top-up permitted before the deadline only, and roll-forward strictly opt-in at contribution time.

---

## 4. Production readiness of the specified features

**Not production ready. None of it exists.** The relevant readiness question is whether the platform
*around* these features can carry them, and there the answer is mostly yes:

- **Money rails:** strong. Double-entry ledger, reconciliation sweeps, prepaid-before-serve discipline, idempotency, Stripe Connect payouts. The main gap is the missing custodial account type (§3.1).
- **Realtime:** adequate but thin. Socket.IO + Redis adapter, room fan-out, a test sink. A courier position stream is a genuinely new load profile — high-frequency writes per active delivery — and [`SWEEP_LOAD_MODEL.md`](../../../STREET-SERVE-APPLICATION-BACKEND/SWEEP_LOAD_MODEL.md) does not model it. Separately, the map route sits at 95% of its **client bundle** budget (247.4 KB of 260 KB, measured) — a different constraint from realtime write load, and one the delivery UI will press on rather than the courier stream.
- **Fraud:** the ping economy's defences (unique-recipient partial indexes, device fingerprints, daily caps, qualifying actions) are exactly the toolkit Pay It Forward redemption needs, and they are proven here.
- **Compliance:** the weakest axis for all three features — driver liability, custodial funds, crowdfunding escrow, and mail-list/CAN-SPAM-adjacent obligations for direct mail. All are decisions, not code.

## 5. Recommended sequence

1. ~~**Decisions first**~~ ✅ **complete** — ADR-004, ADR-005, ADR-006, and the copy-rule register. The people-gates they leave behind (insurance bound, counsel review, background-check vendor) are slow and should start immediately.
2. **Ledger prerequisite:** `community_fund_payable` account type + entry types, with reconciliation coverage.
3. **Pay It Forward** — highest value per unit of risk. Money pool → redemption → caps/fraud → dashboard. Reuses giveaways, gifts, and the ping fraud toolkit. Ship money-only; defer product pools.
4. **Boost My Marketing** — self-contained, extends the existing ads campaign surface, and shares Pay It Forward's custodial rail rather than needing its own.
5. **Delivery Assist Network** — last, and largest. Blocked on insurance, needs a new role, new order fulfilment mode, new realtime channel, new fee type, and a new safety surface. Consider piloting in one city with vendor-recruited drivers before opening it.

Full ordering, with dependencies and estimates, is in [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md).

## 6. Could not be confirmed

Stated explicitly, per the audit brief:

- Whether commercial/contingent auto insurance has been priced or discussed. No document in either repo mentions it.
- Whether a print-and-mail vendor (Lob, Click2Mail, PsPrint) has been evaluated or contracted.
- Whether the "$50 ≈ 250 postcards" rate in the spec reflects a real quote or an illustration.
- Whether legal counsel has reviewed custodial community funds. `agreements.registry.ts` shows RTO text still marked `reviewed: false` pending attorney review, so the legal queue has a backlog these features would join.
- Whether the platform intends to hold driver background-check obligations itself or delegate to a vendor (Checkr et al.).

---

## Document index

| Document | Contents |
|---|---|
| [FEATURE_COMPLETION_MATRIX.md](FEATURE_COMPLETION_MATRIX.md) | Every requirement with all twelve tracking fields |
| [MISSING_FEATURES.md](MISSING_FEATURES.md) | Specified but not implemented |
| [PARTIALLY_IMPLEMENTED_FEATURES.md](PARTIALLY_IMPLEMENTED_FEATURES.md) | Implemented but incomplete |
| [FEATURES_REQUIRING_FIXES.md](FEATURES_REQUIRING_FIXES.md) | Existing defects and incorrect behaviour these features expose |
| [ARCHITECTURAL_IMPROVEMENTS.md](ARCHITECTURAL_IMPROVEMENTS.md) | Structural changes required and recommended |
| [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) | Debt these features would inherit or create |
| [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md) | Scalability, security, performance, usability, architecture |
| [IMPLEMENTATION_PRIORITY_MATRIX.md](IMPLEMENTATION_PRIORITY_MATRIX.md) | Value/effort/risk ranking |
| [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) | Dependency-ordered phased plan |
| [FINAL_IMPLEMENTATION_CHECKLIST.md](FINAL_IMPLEMENTATION_CHECKLIST.md) | Tickable completion checklist |

**Phase 0 decision records** (written 2026-08-04, adopting this audit's recommendations except where noted):

| Document | Decides |
|---|---|
| [ADR-004](ADR-004-driver-classification-and-liability.md) | Drivers are engagements; three dispatch mechanics prohibited; no platform cover for drivers; vetting, cash, restricted goods, address staging |
| [ADR-005](ADR-005-custodial-community-funds.md) | A pool is a custodial liability — never revenue, never withdrawable; fee model; 12-month expiry to city pools |
| [ADR-006](ADR-006-crowdfunding-capture-model.md) | Capture into custody with a deadline and automatic refund — **reverses A-10** |
| [COPY_RULE_REGISTER.md](COPY_RULE_REGISTER.md) | The seven claims the product may never make, and how each is enforced |
