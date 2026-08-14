# Partially Implemented Features

Implemented but incomplete, or missing important functionality.

The audit brief warns against ignoring partial implementation. It equally warns against assuming
completeness. Applying both strictly to this specification: **only two requirements are genuinely
partial.** Everything else is either absent, or is *adjacent infrastructure* that a reasonable
observer could mistake for partial delivery. Both categories are documented below, because the second
is where a planning error would actually happen.

---

## 1. Genuinely partial

### DAN-10 · Delivery as an order fulfilment mode — **BE ◐ / FE ✗ / 15%**

**What exists.** The order total carries a `delivery_cents` line
([`orders.model.ts:47`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/orders/orders.model.ts#L47)), and the
itemised-total structure that would render it is complete and tested.

**What does not.** `fulfillment_type` is `['pickup_now','pickup_scheduled']`
([`orders.model.ts:23-26`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/orders/orders.model.ts#L23-L26)),
there is no destination address on the order, and the comment above the totals block states the
intent plainly: *"tax/delivery/service/processing are $0 in the pickup MVP."*

**Why it is partial and not missing:** the money shape is real and correct — a delivery charge has a
defined home in the order total and in the ledger's sale decomposition. What is missing is the
*fulfilment concept*. This is honest scaffolding, not dead code, and it was left deliberately.

**Completion:** add `delivery` to the enum; add a destination subdocument (address, coords, notes,
contact); validate it when the mode is delivery; populate `delivery_cents` from a snapshotted quote.

### PIF-5 · Product pool — **BE ◐ / FE ✗ / 25%**

**What exists.** `GiveawaySchema`
([`growth.model.ts:99-113`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/growth/growth.model.ts#L99-L113))
plus `GiveawayClaimSchema` model almost exactly what the spec's product pool describes: a named
product, a daily quantity cap, a claimed-today counter, a scheduled reset, an active flag, and a
`{giveaway_id, user_id, day_key}` unique index enforcing one claim per user per day. There is a
working vendor surface at [`vendor/giveaways`](../../src/app/(dashboard)/vendor/giveaways/) and a
`giveaway-reset` scheduled job.

**What does not.** **The funding direction is inverted.** A giveaway is the vendor donating their own
stock. The spec's product pool is a *customer* buying an item that waits for a stranger. There is no
funder on the row, no money movement, no per-unit provenance, and no link to a contribution.

**Why it is partial:** roughly a quarter of the eventual implementation — the claim model, the cap
enforcement, the reset sweep, and the anti-abuse index — is already written and proven in production
code. Extending it is materially cheaper than building a parallel concept, and building a parallel
concept would leave two near-identical claim models to keep in sync.

**Completion:** add a funding source (`vendor` | `community`), a per-unit funder reference, and a
money leg that credits the community fund at purchase and debits it at claim. Recommend deferring to
Phase 2 regardless — money pools deliver the same user value with far less inventory coupling.

---

## 2. Adjacent infrastructure — **do not mistake these for partial delivery**

Each of these will look like a head start in a planning meeting. Each has a specific reason it does
not satisfy the requirement.

| Existing | Looks like | Actually is | Reusable? |
|---|---|---|---|
| `JOB_TYPES` includes `'delivery'` ([`constants.ts:1052-1059`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L1052-L1059)) | DAN-1 dispatch | A **gig posting**: post → apply → poster selects → tap check-in. Hours, not seconds. No radius broadcast, no first-to-accept, no tracking | Payout rail: yes. Dispatch: no |
| Wave-Down ([`queue.model.ts:33-71`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/queue/queue.model.ts#L33-L71)) | DAN-1/7 | A **two-party** dispatch: the vendor comes to the customer. Delivery is three-party. But the lifecycle, the expiry, the SLA sweep, and the snapshotted travel + convenience fee are exactly right | **Yes — the single best template in the repo** |
| Proximity alert sweep ([`livemap.service.ts:578-607`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/livemap/livemap.service.ts#L578-L607)) | DAN-2 broadcast | A **1-minute polling sweep** notifying followers when a followed vendor is nearby. Delivery broadcast must be event-driven and sub-second | Query shape + `setNx` throttle: yes. Cadence: no |
| Wave tracker ([`useWave.ts`](../../src/features/wave/hooks/useWave.ts)) | DAN-6 live GPS | An **ETA integer** (`etaSeconds`) with a status, not a moving pin | Screen skeleton: yes. Tracking: no |
| Gifts ([`growth.model.ts:78-97`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/growth/growth.model.ts#L78-L97)) | PIF-3/4 | A **directed** gift: a named recipient hash and a unique redemption code. Pay It Forward is definitionally undirected — different fraud surface, different accounting | Expiry sweep + redemption-code plumbing: yes |
| Spot Me ([`growth.model.ts:135-155`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/growth/growth.model.ts#L135-L155)) | PIF generosity | A **loan** with `repay_by` and a `defaulted` state | Request/accept UI patterns only |
| Ping budget + top-up ([`growth.model.ts:11-44`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/growth/growth.model.ts#L11-L44)) | PIF-2 pool | A **vendor-funded** prepaid balance for share tips. Not community money, not custodial to third parties | **Yes — the top-up model is the exact pattern PIF-3 must copy.** It exists because crediting a balance without collecting money spent platform capital. Same trap awaits a naive PIF contribution |
| Sponsors ([`sponsors.model.ts`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/sponsors/sponsors.model.ts)) | PIF-19 corporate sponsorship | **Launch/landing-page sponsors**: a logo, a UTM code, signup attribution. Shares a word, nothing else | Name only |
| Placements / ads ([`ads.model.ts`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ads/ads.model.ts)) | MB-1 campaigns | A **self-funded prepaid** campaign — one advertiser, own budget. MB is many contributors, one shared goal | Campaign lifecycle, `pending_payment` gate, spend-down, settlement sweep: yes. Funding model: no |
| `tax_payable` ledger account ([`ledger.model.ts:24-31`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ledger/ledger.model.ts#L24-L31)) | PIF-23 custody | Sales tax held for the state. **Not** a community fund — but its documented discipline (*never revenue, never distributable*) is precisely the model to copy | **Yes — as precedent** |
| Loyalty stamps ([`loyalty.service.ts:20-44`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/loyalty/loyalty.service.ts#L20-L44)) | PIF-17 badges | Per-vendor stamp cards. Its rejection of points — *an exchange rate is a liability the vendor carries* — is the most relevant prior reasoning in the repo for a money pool | Reasoning: yes. Code: no |
| Fraud toolkit (`pings`, `giveaway_claims`, `fraud-signals`, admin fraud console) | PIF-10 | Built for the ping economy | **Yes — nearly wholesale.** The unique partial index, device fingerprint, and daily-cap patterns transfer directly |

---

## 3. Planning implication

The three features are ~7% delivered but perhaps ~40% *de-risked*, because the hard patterns — money
collected before it is spent, atomic claim under contention, geo fan-out with throttling, immutable
double-entry accounting, gig payouts, fraud caps enforced by unique index — all exist in working form
somewhere in this codebase.

The corollary matters more: **the remaining risk is concentrated in the parts with no precedent here**
— custodial third-party funds, third-party physical liability, and crowdfunding escrow. Those are
also the three items that are decisions rather than code. Schedule them first.
