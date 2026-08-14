# Implementation Roadmap — Community Network Specification

Dependency-ordered plan across the eight phases the audit brief specifies. Estimates assume **one
full-time engineer**; parallel tracks are marked. Total: **~22–28 weeks**, of which roughly 12 are the
Delivery Assist Network alone.

**Sequencing principle:** decisions before infrastructure, infrastructure before features, and the
three features ordered by *risk-adjusted value* — Pay It Forward first (highest value, contained risk),
Boost second (smallest, self-contained), Delivery last (largest, and the only one carrying physical
risk).

```
Phase 0  Decisions ─────────┐
Phase 1  Blockers/fixes ────┼──▶ Phase 2 Foundations ──┬──▶ Phase 3 Pay It Forward
                            │                          ├──▶ Phase 4 Boost My Marketing
                            └──────────────────────────┴──▶ Phase 5 Delivery (gated on ADR-004)
                                                            │
                                          Phase 6 Perf ─────┤
                                          Phase 7 UX ───────┤
                                          Phase 8 Readiness ┘
```

---

## Phase 0 · Decisions — ✅ **COMPLETE** (2026-08-04)

Nothing else starts. These were the three questions where guessing produces work that gets thrown away
or, worse, shipped wrong. All four deliverables are written and accepted.

| # | Deliverable | Decision made |
|---|---|---|
| 0.1 | [**ADR-004 · Driver classification & liability**](ADR-004-driver-classification-and-liability.md) | Drivers are **engagements**, ADR-002 extends unchanged. Assignment, acceptance-rate pressure, and exclusivity are **prohibited** — they are what would change the answer. Platform provides no cover to drivers; drivers attest to their own, lapse suspends dispatch. Vetting at `silver` tier + background check; role never self-grantable. No cash, no age-restricted goods, staged address disclosure |
| 0.2 | [**ADR-005 · Custodial community funds**](ADR-005-custodial-community-funds.md) | A pool is a **custodial liability**, modelled on `tax_payable` — never revenue, never the vendor's, **never withdrawable**. No fee on contributions; standard marketplace fee at redemption (a fee-free path would be an arbitrage). **12-month expiry, "never" removed**; expired funds redistribute to city pools, never to vendor or platform |
| 0.3 | [**ADR-006 · Crowdfunding capture model**](ADR-006-crowdfunding-capture-model.md) | ⚠️ **Reverses the audit's A-10 recommendation.** Capture on contribution into ADR-005's custodial account; ≤60-day hard deadline; automatic full refund if missed, platform absorbs the processing cost; owner top-up before the deadline only; roll-forward opt-in at contribution time |
| 0.4 | [**Copy-rule register**](COPY_RULE_REGISTER.md) | Seven rules — two shipped, five new — with prohibited substrings, replacement vocabulary, scope, and the test each lands with |

**Why 0.3 changed:** authorise-don't-capture fails its own failure mode — a campaign can hit its goal
in *authorisations* and come up short at capture, leaving a vendor told they succeeded with an
underfunded campaign. Its "no custody" benefit had also already been paid for, since ADR-005 builds the
custodial rail for Pay It Forward regardless. Full reasoning in ADR-006.

**Remaining Phase 0 gates — these need a person, not a commit, and are carried into Phase 8:**
- [ ] 🔒 Insurance quoted and bound before the first real delivery (ADR-004)
- [ ] 🔒 Counsel review of the custodial structure + 12-month escheatment position (ADR-005, ADR-006 — one conversation)
- [ ] 🔒 Counsel review of the driver terms of engagement (ADR-004)
- [ ] Background-check vendor selected, with its adverse-action process

## Phase 1 · Critical fixes and blockers — ✅ **COMPLETE** (2026-08-04)

Existing defects that sat on the path of every subsequent phase.

| # | Task | Ref | Status |
|---|---|---|---|
| 1.1 | Correct the inverted `SELF_GRANTABLE_ROLES` doc comment | [F-7](FEATURES_REQUIRING_FIXES.md) | ✅ `constants.ts` — the comment claimed the list was a denylist; it is an allowlist |
| 1.2 | Fix the idempotency defects; replayed-request test on a money-in route | F-4 | ✅ `middleware/idempotency.ts` + `test/idempotency.test.ts` (11 tests) |
| 1.3 | Replace `DEBIT_NORMAL` with a total `Record<AccountType, 'debit'\|'credit'>` | F-2 / A-2 | ✅ `ledger.model.ts` — omitting a new type is now a compile error |
| 1.4 | Document the sweep-vs-event policy | D-2 | ✅ `BACKGROUND_JOBS.md` §2a, with the delivery-dispatch worked example |
| 1.5 | Courier-ping load scenario + realtime write-load model | D-3 | ✅ `loadtest-socket.mjs --scenario=courier` + `SWEEP_LOAD_MODEL.md` §"Realtime write load" |

**Three defects were found in 1.2, not the one the audit predicted.** The audit named a body-hash
defect; the body hash was indeed order-dependent (`JSON.stringify` preserves insertion order, so the
same request with its keys in a different order was rejected as a mismatch), but two worse ones sat
next to it:

- **A check-then-act race.** The middleware did `get`, decided, then called `setNx` and **discarded
  its result**. Two concurrent retries both read an empty key, both concluded they were first, and
  both ran the handler — a double charge, on the middleware whose entire job is preventing one. The
  reservation is now taken first and its atomic answer is the decision.
- **Failures cached as results.** Every response was stored for replay, so a transient 500 was pinned
  for the full 24h TTL and served back to the client as a successful idempotent hit. Now only 2xx is
  cached; 4xx releases the key so a corrected retry is not locked out; 5xx and no-response hold the
  reservation deliberately, because the outcome is unknown and a delay is a better failure than a
  duplicate charge.

**Exit criteria — met.** 622/622 backend tests pass, typecheck and lint clean. All six defect tests
were verified to **fail against the previous implementation** and pass against the fix, so they are
regression tests rather than descriptions of current behaviour.

> Worth recording: the first version of the race test passed against the broken code. Two supertest
> requests do not interleave — the first finishes its middleware before the second arrives on the
> socket. It only reproduces when the middleware is driven directly. A concurrency test that has
> never been seen to fail is not evidence of anything.

## Phase 2 · Shared foundations — ✅ **COMPLETE** (2026-08-04)

Infrastructure more than one feature needs. Built once.

| # | Task | Ref | Status |
|---|---|---|---|
| 2.1 | `community_fund_payable` + four entry types + posting rail | A-1 / X-2 | ✅ `ledger.model.ts` + new `ledger/communityFund.ts`; reconciles with no drift across a full cycle |
| 2.2 | `delivery` fulfilment mode + `destination` + validation | A-3 / DAN-10 | ✅ `orders.model/schema/service/repository`; **default-deny** per city |
| 2.3 | `driver` role, not self-grantable, tier-gated | X-3 | ✅ `constants.ts` (+ `DRIVER_MIN_TIER = silver`); `ALL_ROLES` now derived from `ROLES` |
| 2.4 | `delivery_coordination` + `campaign_service` fee types + migration | X-1 | ✅ Both seeded at **zero** — deliberately unpriced |
| 2.5 | Three notification categories, all mutable | X-6 | ✅ `constants.ts`; the user schema now derives its shape from the category list |
| 2.6 | Three agreement types registered | X-5 | ✅ `agreements.registry.ts`, all `reviewed: false` |

**Exit criteria — met.** 652/652 tests pass (30 new in `test/communityNetworkFoundations.test.ts`),
typecheck and lint clean. An order carries a delivery destination end-to-end; the ledger reconciles
with no drift after contribute → redeem → expire; all three CI gates green with no baseline additions.

### Two decisions worth recording

**Nothing was added as a dead enum value.** The reachability gate is a ratchet whose baseline "can
only shrink", and adding `delivery` or the community entry types to it would have been exactly the
drift it exists to catch. So 2.1 shipped the *posting rail* (`communityFund.ts`) alongside the account
type rather than the enum alone — which is also what Phase 3 needs on day one. The gate passed with no
baseline edit.

**Both new fee types are seeded at zero, and that is deliberate.** `delivery_coordination` cannot be
priced until the driver payout and insurance cost are known (Phase 5 inputs); `campaign_service`
depends on a print vendor nobody has contracted (MB-8). A plausible-looking number would have entered
the registry as though somebody had chosen it. Zero is inert because nothing charges either fee yet —
**pricing them is a gate on DAN-8 and MB-3**, now recorded in the checklist.

### Two latent defects found while building

Neither was in the audit; both were found by adding a value to a list and watching what did not follow.

- **`notification_prefs` hand-listed its three keys** in the user schema, so Mongoose strict mode
  **silently dropped** writes to any new category. A user toggling "generosity" would have got a 200,
  an optimistic UI update, and no write — the *exact* defect the route's own comment records as the
  reason it was built ("six switches that read a 404 and wrote to nothing while appearing to work").
  The schema now derives its shape from `MUTABLE_NOTIFICATION_CATEGORIES`.
- **Three permission actions spelled out all eight roles by hand** instead of using `ALL_ROLES`, so a
  new `driver` could not read its own profile or manage its own notifications. `ALL_ROLES` is now
  `[...ROLES]`, and the 17 hand-written copies were replaced with it.

## Phase 3 · Pay It Forward — ✅ **COMPLETE** (2026-08-04)

Shipped **money pools only**. Product pools, priority groups, and corporate sponsorship remain out.

**3a · Pool and contribution** ✅
- New `payforward` module (`model / schema / service / controller / routes`) — *not* inside `growth` (D-5)
- Per-business enable toggle via the module system: `pay_it_forward` added to `MODULES`, available to every archetype, **off by default** (PIF-1)
- `community_funds` + `community_contributions`, modelled field-for-field on `PingBudgetTopup`: intent → webhook → credit, unique index on the intent id (PIF-2/3, F-3)
- Anonymity default-on, enforced at **serialisation** so no read path can forget it; optional recognition requires a name (PIF-7/8)
- Failed charges are recorded as `failed` rather than left `pending` forever — the gap `PingBudgetTopup.status.failed` is still on the known-unwritten list for

**3b · Redemption** ✅
- Vendor settings: per-redemption, per-day, percentage, expiry (PIF-9)
- Applied in the order pricing pipeline **after** discounts (PIF-4); the fund covers what the customer would actually have paid, never the vendor's own promotion
- Partial application falls out of `min(...)` — PIF-6 needed no code of its own
- **Two-phase**: reserve → charge → apply, with release on a declined card. Spending the pool first would leave the vendor short on every decline
- Fraud floor: unique partial index on `{business_id, user_id, day_key}` + `bronze` tier gate (PIF-10a). Two controls, not eight (D-10)
- Tip and round-up are never covered — the community bought the meal, the customer's gesture stays theirs

**3c · Visibility** ✅
- Impact figures aggregated from immutable rows, never counters (PIF-11, D-9); people helped is a **count, never a list**
- `generosity` notifications on gift-received and gift-available (PIF-15)

**3d · Lifecycle** ✅
- Daily expiry sweep + 30-day vendor notice; expired money goes to the **city fund, never the vendor** (PIF-24)
- Copy-rule test: no "tax-deductible" claim on any Pay It Forward surface (A-16)

**Exit criteria — met.** A pool provably cannot rise without a settled payment; five concurrent
orders against a $25 pool cannot drive it negative and spend exactly what was there; the ledger
reconciles across contribute → redeem → expire; 27 new tests, **679/679 backend tests pass across 53
files**, typecheck and lint clean.

> **On that number.** An earlier full-suite run reported 670 passed / 1 failed / 8 skipped, and it
> was tempting to write it off. Both non-passes turned out to be environmental: `wishlists` was
> skipped because MongoMemoryServer could not start within 10s while the machine was loaded, and a
> single RTO assertion failed there but passes 36/36 when that file runs alone. A clean re-run
> confirms 679/679 with exit code 0. **Worth remembering for this machine:** a full-suite failure is
> not evidence until the suspect file has been re-run in isolation — and equally, "probably
> flakiness" is not evidence until it has been.

### One decision changed during the build

**The daily limit no longer blocks the order.** The plan implied refusing a second same-day
redemption. Refusing to sell someone lunch because a gift was unavailable is a strange way to run a
generosity feature — but silently charging a customer who *asked* for help is worse. The order now
completes at full price and the response says why (`payItForward: { appliedCents: 0, reason:
'daily_limit' }`), so the receipt can explain itself.

### A pre-existing defect this surfaced

`transactions` had **sparse** unique indexes on `payment_intent_ref` and `idempotency_key`, both of
which default to `null`. A sparse unique index still indexes an explicit null, so two transactions
without a payment intent yet collided on a duplicate key. Sequentially it never fired; it appears the
moment concurrent orders at one business are ordinary, which is exactly what this feature makes
routine. `UserSchema` already carried the same correction for email/phone with a comment explaining
it. Fixed to partial indexes, with migration `20260804000002`.

### Frontend ✅ (2026-08-04)

New `src/features/payforward/` — 17 tests, **240/240 frontend tests pass**, typecheck and lint clean.

- **`PayItForwardCard`** on the business profile, gated on the `pay_it_forward` module. Renders nothing when there is no fund. Written for *two* readers: the balance for someone with money to spare, and "if money is tight today, you can use it at checkout — no questions, and nobody is told" for someone who is short. Deliberately avoids "in need" / "less fortunate", which sort customers into deserving and undeserving before they have ordered anything.
- **`ContributeSheet`** — presets + custom amount, **anonymous by default** with naming as an opt-in, and the CR-6 disclosure stated *before* payment rather than discovered in April.
- **`PayItForwardOffer`** — the checkout prompt. See below.
- **`CommunityImpactPanel`** at `/vendor/pay-it-forward` — impact figures, caps, expiry (no "never"), and a plain statement that the balance "isn't your money and can't be paid out", because withdrawing it is the first thing a vendor will try.

### The redemption prompt, specifically

The audit called this the hardest screen in the specification. What it does *not* do is the design:

- **No celebration.** No confetti, no hearts, no "🎉 Someone bought your lunch!" — a person short of money this week does not want their phone to throw a party about it. A test asserts the emoji and the words are absent.
- **No qualification.** It never asks whether you need it; there is no "are you sure?". Asking someone to justify taking help is how you ensure nobody does.
- **No charity words.** Not *free*, not *donated*, not *in need* — all test-forbidden.
- **It states who is told: nobody.** That is the actual question in the reader's head, and leaving them to guess is what stops them tapping.
- **A plain, unchecked checkbox**, placed *after* the total so the real price is seen first, styled to read like an ordinary summary row to anyone glancing over a shoulder.
- `daily_limit` is translated into "The fund has already covered an order for you here today" — the raw enum must never reach a screen, and the wording avoids implying fault.

### Still outstanding

- [ ] 🔒 The redemption screen must still be **usability-tested with someone who would actually use it** (Phase 7.1). Everything above is reasoned design, not evidence — and this is the one screen where being wrong means the feature is admired and unused.

## Phase 4 · Boost My Marketing — ✅ **COMPLETE** (2026-08-04)

New `src/modules/boost/` + `test/boost.test.ts` (26 tests). **705/705 backend tests pass across 54
files** (verified, exit 0); typecheck, lint and both CI gates clean — the new routes are covered, so
**no route-coverage baseline change**.

| # | Task | Status |
|---|---|---|
| 4.1 | Print/mail vendor + real rates | ⛔ **External, not done.** No vendor is contracted, so `BOOST_POSTCARD_UNIT_COST_CENTS` is 0 and the estimate endpoint **declines to guess** rather than returning a fabricated number |
| 4.2 | `boost_campaigns` as a sibling of `placements` | ✅ Own collection; `raised` summed from rows, with a test that corrupts the cache and proves the API ignores it |
| 4.3 | Capture into custody · deadline sweep · auto-refund · owner top-up · opt-in roll-forward | ✅ All five |
| 4.4 | Postcard estimate, labelled an estimate | ✅ `isEstimate: true`, `postcards: null` until a rate exists |
| 4.5 | Goal-reached notifications + mail-date confirmation | ✅ Owner **and** every backer are told |
| 4.6 | Mailing execution + status tracking | ◐ Status machine + ops-driven transitions built; **execution needs 4.1** |
| 4.7 | Opt-in contributor recognition | ✅ Shares Pay It Forward's serialisation-time anonymity |

**Exit criteria — met.** An unmet campaign expires and refunds every contributor **in full**
automatically; the campaign's ledger balance is **zero** afterwards; `raised` is derived from rows;
the contributor's refund-or-roll-forward choice is recorded at contribution time and defaults to
refund.

### Campaign money is kept in its own account

`community_fund_payable` is now scoped: a business's Pay It Forward pool is `businessId`, a campaign's
escrow is `campaign:<id>`. That is not tidiness — sharing one account would mean refunding a failed
campaign could reach into money customers gave to feed people, and a redemption at the counter could
spend money earmarked for a mailing. A test asserts the two balances move independently.

The rail gained one method, `transferBetweenFunds`, for roll-forward. It **rejects a cross-business
move**, and the Phase 2 "no withdrawal exists" test was updated rather than deleted — it still proves
there is no way out to anybody who did not earn it.

### Two things the plan did not specify, and needed deciding

**Roll-forward is time-boxed.** ADR-006 §5 allowed a contributor to say "put it toward the next
campaign", but a next campaign might never be created — which would recreate the indefinite hold the
deadline exists to prevent. Rolled money now waits 60 days for a new campaign and is refunded if none
arrives.

**Cancelling refunds everyone regardless of their roll-forward choice.** A cancellation is not the
campaign failing to reach its goal; it is the thing they funded ceasing to exist, so there is nothing
to roll into.

### Frontend ✅ (2026-08-04)

New `src/features/boost/` — 17 tests, **257/257 frontend tests pass across 46 files**, typecheck and
lint clean.

- **`BoostCampaignCard`** on the business profile — progress bar, remaining, days left, and the
  refund promise **on the card** rather than one screen deeper. A test forbids urgency theatre
  ("hurry", "last chance", "act now", "!!"): a contributor deciding under manufactured pressure is
  one who asks for their money back.
- **`ContributeToCampaignSheet`** — see below.
- **`BoostManagerPanel`** at `/vendor/boost` — create, watch, cover the shortfall, schedule the
  mailing, cancel. Tells the vendor plainly the money "isn't yours until the campaign funds", and
  there is no withdraw control anywhere.

### The contribution screen, specifically

ADR-006's exit criterion is that the unmet-goal outcome is disclosed **before** payment, and that is
what shapes the layout. Above the pay button, always:

1. **the deadline as a date**, not "soon";
2. **"you get your money back in full and automatically"** — not "we may be able to refund";
3. **the contributor's own choice**, with *refund preselected*. Rolling money into a campaign
   somebody did not choose to fund is deciding what to do with their money for them;
4. **the roll-forward option states its own 60-day time-box**, so it is visibly not an open-ended
   hold.

It also says what this is *not* — not charitable, not an investment, not tax-deductible — before
payment rather than in a support ticket in April. All four points are test-asserted.

### Still outstanding

- [ ] 🔒 **Contract a print/mail vendor (MB-8)** — external and slow. It sets the postcard rate, the `campaign_service` fee, and whether a "mailed" webhook can replace the ops-driven transition. Every seam for it exists; nothing about it can be resolved in code. Until then the estimate line renders **nothing** rather than a guess.
- [ ] 🔒 Counsel review of the custodial structure (shared with ADR-005) before any real contribution.

## Phase 5 · Delivery Assist Network — ✅ **BACKEND COMPLETE** (2026-08-04) · **NOT SHIPPABLE**

New `src/modules/delivery/` + `test/delivery.test.ts` (32 tests). **737/737 backend tests pass across
55 files** (verified, exit 0); typecheck, lint and all CI gates clean, with **no route-coverage
baseline change**.

> **This is built, not shipped.** ADR-004 requires insurance to be **bound**, and a background-check
> vendor to be contracted — neither is something code can do. Phase 2's default-deny per city is what
> stands between this module and a real delivery: a test asserts an order with a destination is
> refused while the city flag is off. **Building the feature does not ship it.**

| # | Task | Status |
|---|---|---|
| 5a | `driver_profiles`, vetting, Connect onboarding, lapse sweep | ✅ |
| 5b | Driver presence via `live_sessions`, `delivery_requests`, event-driven broadcast, atomic first-to-accept, staged address | ✅ |
| 5c | Snapshotted quote, coordination fee, payout via the gig rail | ✅ |
| 5d | Expiry, re-broadcast, driver cancel, undeliverable, **nobody accepts** | ✅ |
| 5e | `/delivery` namespace, position with a rate ceiling, decimated persistence | ✅ |
| 5f | Proof of delivery by code, safety surface (share token, emergency contact, incident reporting) | ✅ |

### What the tests actually pin

Almost all of them pin a **prohibition** rather than a happy path, because this is the only feature on
the platform carrying third-party physical risk:

- **The losing racer loses cleanly.** Two drivers accepting simultaneously: one wins, one gets "someone else has already taken this one", and the row has exactly one `driver_id`. Written first, as the roadmap said.
- **Nobody is charged before acceptance**, and after four unanswered rounds the request expires having charged nobody.
- **No acceptance rate exists.** A test reads the driver profile's field names and fails if any contains `accept`, `decline`, `score`, or `rating` — because the surest way to reintroduce a prohibited mechanic is to start collecting the number that would drive it.
- **A driver is never told they are covered** (CR-3) and never called an employee (CR-4); both asserted against real response bodies.
- **Addresses are staged**: a coarse ~800m area before acceptance, the exact address plus access notes after, and nothing once the delivery is finished.
- **Drivers never appear on the customer map** — excluded at the repository, with `includeDrivers` existing only for dispatch.
- **The hand-off code is never shown to the driver.** A code the driver can read is not proof they met anybody.

### Three decisions the plan did not specify

**The vendor names the driver's payout.** A platform-set rate a driver only discovers after accepting
is the kind of control ADR-004 prohibits. The vendor knows what the trip is worth to them; the driver
decides whether it is worth taking; the price is snapshotted and cannot move afterwards.

**A payout account is an eligibility requirement.** `payoutTransfer` returns null when there is no
payouts-enabled account, so without this a driver could complete a delivery and simply never be paid,
silently, with the delivery marked delivered. Never offer somebody work they cannot be paid for.

**A driver who could not complete is still paid.** They travelled and did what was asked; the outcome
was not theirs. `undeliverable` is a real outcome, not a failure of the driver.

### Still outstanding — none of it is code

- [ ] 🔒 **Insurance quoted and bound.** ADR-004 states the requirement; it cannot procure the cover.
- [ ] 🔒 **Background-check vendor contracted**, with its adverse-action process. `background_check_status` is set by an ops decision endpoint until one exists.
- [ ] 🔒 Counsel review of the driver terms of engagement (registered, `reviewed: false`).
- [ ] 🔒 A delivery completed end-to-end in staging with real GPS.
- [ ] 🔒 Courier-ping load test within the map route's remaining budget (the harness exists from Phase 1.5).
- [ ] Price `delivery_coordination` before any real delivery — still 0.
- [ ] Add `city_slug` to Business so delivery gates per-business rather than per-default-city.
- [x] ~~**Frontend** — driver onboarding, the offer card, the customer tracking view, and the vendor's "Need Delivery Help" button are **not built**.~~ Built 2026-08-07, see 5g.

### 5g · Frontend — ✅ **COMPLETE** (2026-08-07)

`src/features/delivery/` + `src/app/(customer)/drive/page.tsx`, with `delivery-render.test.tsx`
(14 tests). **277/277 frontend tests pass across 48 files**; lint clean, `tsc --noEmit` clean, and
the bundle budget passes at **246.4 KB against 260 KB** on the heaviest route. On the backend,
**747/747 pass across 55 files** (verified, exit 0) with the new route absorbed by the existing
route-coverage baseline.

| Surface | Component |
|---|---|
| Driver onboarding + eligibility | `DriverOnboarding` |
| The offer list | `DriverOffers` |
| The live job | `ActiveDelivery` |
| Customer tracking | `DeliveryTracking` (lazy, inside `OrderTracking`) |
| Vendor request | `RequestDriverButton` (inside `OrderQueue`, gated on `preparing`) |

**The tests are weighted toward prohibitions, like the backend's.** There is no decline control and
no rate, score or streak on any screen; "Not this one" hides the card and **sends nothing**, because
a decline endpoint is one product meeting away from a decline counter. Insurance copy is phrased
solely as the driver's own obligation (CR-3) — a test asserts the screen never says "you are
covered" and does ask about *their* policy. The drop-off shows an **area** until acceptance (A-15),
and the hand-off code appears on the customer's screen alone.

Two things the backend plan did not cover surfaced here:

**`GET /deliveries/mine` had to be added.** A driver who closed the app — or whose phone died, which
is the whole reason the ops "stuck delivery" runbook exists — had no route back to the job they had
already accepted.

**A raw eligibility enum must never reach a screen.** `awaiting_approval` and `payout_account` are
translated into plain sentences, asserted by a test that fails if either enum string renders.

> One test failure was mine, not the copy's: a substring rule banning `employee` failed against the
> required CR-4 sentence "not an employee". The rule now targets affirmative framing only.

## Phase 6 · Performance — ✅ **COMPLETE** (2026-08-04)

### 6.1 · The gate fired, and it was right to

**A correction to this audit first.** Phases 1–5 of these documents described the map route as being
"at ~95% of its performance budget" and warned that PIF-13/14's map facets would "add load to that
exact path". That conflated two different things: the measured 95% is a **client JS bundle** figure
(247.4 KB of 260 KB), and there is no measured budget for the map *query* at all. Every affected
document has been corrected.

Once measured rather than assumed, the real finding was worse than the framing: **the budget was
already failing.** Adding the Pay It Forward and Boost cards to the business profile sheet — which
the map renders — took `/(customer)/map` to **260.4 KB against 260 KB**. The 2026-08-02 baseline
predicted this precisely: *"the next person to add a dependency to the map surface will trip this
gate."* That person was this roadmap.

Three lazy-load boundaries, each where the first screen genuinely does not need the code:

| Deferred | Why it is safe |
|---|---|
| `ContributeSheet` / `ContributeToCampaignSheet` | Forms that render only after a deliberate tap |
| `PayItForwardCard` / `BoostCampaignCard` | Render only for a business with a fund, or a live campaign |
| **`BusinessProfileSheet`, from `MapHome`** | Opens only when a customer taps a pin |

**Result: 260.4 KB → 238.2 KB.** The map is no longer the heaviest route, is **9.2 KB lighter than
the original baseline**, and worst-case headroom improved from 12.6 KB to 20.3 KB.

The third boundary is the lasting one: the profile sheet is the map's largest dependency and none of
it is on the first screen. That was the baseline's own recommendation, unactioned until the gate
forced it.

### 6.2 · Courier ping ceiling — ✅ (shipped in Phase 5e)

Server-side interval ceiling per delivery, 1-in-5 decimated persistence, and position accepted only
between acceptance and completion. Tested.

### 6.3 · Cached impact aggregates (D-9) — ✅

`shared/cachedAggregate.ts`, used by the Pay It Forward impact endpoint. That endpoint is **public**
and ran two unbounded `$group` aggregations over every contribution and redemption a business has
ever had — a full scan per viewer, on a page whose entire purpose is to be shown to many people.

Deliberately *not* the fee cache's two-level pub/sub machinery: a stale fee charges somebody the
wrong amount, a stale "meals given" figure is invisible. What it keeps from D-9 is the important
part — the number is still derived from immutable rows, never a counter, and the cache is dropped on
every contribution and redemption so a user never waits out a TTL to see their own money land. A test
asserts the cached answer always equals the freshly computed one.

### 6.4 · Re-baselined — ✅

`PERFORMANCE_BASELINE.md` carries the measured post-change numbers and the reasoning.

### What is still not measured

- [ ] 🔒 **Courier-ping load test.** The harness exists (`loadtest-socket.mjs --scenario=courier`, Phase 1.5) and has never been run against a real `/delivery` namespace, because that needs a deployed environment. This remains the single biggest unmeasured thing about delivery.
- [ ] There is still **no budget for backend query latency** anywhere. Bundle size is gated in CI; query cost is not measured at all, which is why the original mischaracterisation was easy to make.

## Phase 7 · UX — ✅ **CODE COMPLETE** (2026-08-08) · one human gate open

| # | Task | Status |
|---|---|---|
| 7.1 | Design the redemption moment; usability-test it | ◐ Designed and built (Phase 3). **The test is a human gate** — [`USABILITY_TEST_PROTOCOL.md`](USABILITY_TEST_PROTOCOL.md) now exists so it can actually be run |
| 7.2 | Map badge legibility | N/A — PIF-13/14 map badges are Tier 5 breadth and were never built, so there is nothing to check yet |
| 7.3 | Notification budget | ✅ **and it found a defect** — see below |
| 7.4 | Privacy defaults | ✅ Anonymous by default, enforced at serialisation; recipients never nameable; tested in Phases 3–5 |
| 7.5 | Vendor fallback when no driver accepts | ✅ Backend (`no_driver_accepted` + vendor notification, nobody charged). Frontend not built |
| 7.6 | a11y for every new surface | ✅ `src/test/a11y-community.test.tsx`, 6 tests |

### 7.3 found the third instance of the same defect

The notification **preferences were stored, read back, and enforced nowhere.** A user who muted
"generosity" received every generosity notification anyway. `notify()` consulted nothing.

That is the third time this codebase has shipped a switch that looks like it works and does nothing —
after the `notification_prefs` schema silently dropping writes (Phase 2) and the route comment
recording six switches that "read a 404 and wrote to nothing while appearing to work". **A preference
nothing enforces is worse than no preference, because the user believes the problem is solved.**

Both the mute check and a new hourly ceiling now gate the **live interruption only** — the inbox row
is always written, because muting means "stop interrupting me", not "hide this from me". Unmutable
categories bypass both, since "safety-critical alerts can't be turned off" has to be true of the
dispatcher for that sentence to mean anything. Four tests.

### 7.6 · accessibility

Six axe audits over the new surfaces. All passed first time, which is the useful result: the
components were built accessibly rather than retrofitted. The assertions that matter are structural
rather than axe's defaults — the checkout checkbox resolves by accessible name, the campaign progress
bar exposes `aria-valuenow`, and the refund-or-roll-forward choice is a real radio group, because a
choice a screen-reader user cannot operate is not a choice they were offered.

## Phase 8 · Production readiness — ◐ **TOOLING DONE**, the rest needs people

| # | Task | Status |
|---|---|---|
| 8.1 | Counsel sign-off | ⛔ Human gate |
| 8.2 | Pen test | ⛔ Human gate |
| 8.3 | Runbooks | ✅ `RUNBOOKS.md` — five new entries |
| 8.4 | Admin tooling | ✅ `admin/community.ops.ts` + four routes |
| 8.5 | Fraud monitoring on redemption | ◐ The controls exist and are tested (day-key index, tier gate); **calibration needs real data** and cannot be done before launch |
| 8.6 | CI baselines green | ✅ All gates pass with no baseline additions across Phases 1–7 |
| 8.7 | Staged rollout | ⛔ Human gate — the mechanism exists (per-city flags, default-deny) |

### 8.4 · the rule the ops tooling is built on

**Every action is audited, and none of them can move money to a person.** Ops tooling that can pay
somebody is ops tooling that can be socially engineered into paying somebody.

- **Fund reconcile** sets the cached balance to the *ledger*, which is authoritative. There is deliberately no "set balance to X" — an ops action that can raise a custodial balance is one that can create money. The worst a compromised admin account achieves here is telling the truth.
- **Delivery resolve** offers exactly two outcomes, both already-existing transitions. A state machine an operator can jump around in is not a state machine. On `delivered` the driver is **still paid** — withholding pay over a process failure teaches drivers not to report problems.
- **Campaign cancel** routes through the *same* `refundAll` the vendor's own cancel uses. A second way for money to move is always the one that turns out to be wrong.
- **Redemption inspect** is read-only and deliberately cannot answer "who else has been helped".

### What still needs a person, not a commit

These are the whole remainder of the programme. Listed together because they are the honest answer to
"is this ready?", and none of them is unblocked by more code:

- [ ] 🔒 **Insurance quoted and bound** (ADR-004) — blocks all of delivery
- [ ] 🔒 **Counsel review** of the custodial structure + the 12-month escheatment position (ADR-005/006, one conversation) — blocks Pay It Forward and Boost
- [ ] 🔒 **Counsel review** of the driver terms of engagement
- [ ] 🔒 **Background-check vendor** contracted, with its adverse-action process
- [ ] 🔒 **Print/mail vendor** contracted (MB-8) — sets the postcard rate and the campaign service fee
- [ ] 🔒 **Redemption-screen usability test** — protocol ready, see [`USABILITY_TEST_PROTOCOL.md`](USABILITY_TEST_PROTOCOL.md)
- [ ] 🔒 **Pen test** against the new custodial-funds surface
- [ ] 🔒 **A delivery completed end-to-end in staging with real GPS**
- [ ] 🔒 **Courier-ping load test** against a real `/delivery` namespace (harness exists)
- [ ] Price `delivery_coordination` and `campaign_service` — both still 0
- [ ] Staged rollout: one city, vendor-recruited drivers, capped pool sizes

---

## Milestones

| Milestone | Phases | Cumulative |
|---|---|---|
| **M-A** Decisions made, blockers fixed | 0–1 | Week 1 |
| **M-B** Foundations in place | 2 | Week 3 |
| **M-C** Pay It Forward live (money pools) | 3 | Week 8 |
| **M-D** Boost My Marketing live | 4 | Week 11 *(week 8 if parallel)* |
| **M-E** Delivery live in one pilot city | 5 | Week 23 |
| **M-F** Production ready across all three | 6–8 | Week 26 |

## If the timeline has to compress

Cut in this order, and say so explicitly rather than quietly descoping:

1. **Delivery (Phase 5) entirely.** It is 12 of 26 weeks and carries all the physical risk. Pay It Forward and Boost deliver most of the community-network story without it.
2. **PIF Tier 5 breadth** — product pools, badges, public impact page, global counter.
3. **Boost (Phase 4)** — smallest revenue impact of the three.

**Do not cut:** Phase 0 decisions, Phase 1 fixes, Phase 2 foundations, or the Phase 8 legal sign-off.
Those are the items whose absence causes harm rather than delay.
