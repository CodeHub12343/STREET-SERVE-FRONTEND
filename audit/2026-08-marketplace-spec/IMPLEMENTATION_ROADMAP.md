# Implementation Roadmap

Eight phases, ordered by dependency and priority per the audit brief. Durations assume a small team working the three parallel tracks defined in [IMPLEMENTATION_PRIORITY_MATRIX.md](IMPLEMENTATION_PRIORITY_MATRIX.md). They are relative sizings, not commitments.

**Start the legal engagement (M-1) on day one of Phase 1.** It is the longest lead time in the whole plan and it is calendar-bound, not effort-bound. Everything in the RTO track waits on it.

---

## Phase 0 · Day one — unblock the environment

*Effort: hours.*

| # | Task | Ref |
|---|---|---|
| 0.1 | Put Node on `PATH` so `npm run verify` runs; document it in the README | D-10 |
| 0.2 | Run `npm run verify` on both repos and record the baseline (including Lighthouse + bundle budgets, which this audit did not execute) | P-2 |
| 0.3 | Scope and send the legal brief for all four agreements — but see 1.9 first | M-1 |

---

## Phase 1 · Critical bugs and blockers — ✅ **COMPLETE (2026-08-01)**

*Estimated ~1–1.5 weeks. Highest value in the plan.*

| # | Task | Ref | Status |
|---|---|---|---|
| 1.1 | Thread real processing fees into `computeRefund`; fix `processingRetainedCents` in all three branches and in the disclosure string | F-1 | ✅ Done — plus two latent bugs found in the same function (see below) |
| 1.2 | Fix the 7 stale backend tests (4 module-resolver, 3 messaging) | F-6 | ✅ Done |
| 1.3 | Triage the `phase5` ping-tip `isPaid` failure | F-6 | ✅ **Triaged: it was the solvency guard, not an anti-abuse rule.** The test funded a ping budget but never settled the top-up charge, and budgets are credited only once the money exists. Stale fixture; the guard is correct |
| 1.4 | Add a positive test for the messaging transaction gate (403 for a stranger) | S-1 | ✅ Done — plus a test that the owner is never gated |
| 1.5 | Repoint the `requireModule` test at a module genuinely off by default | S-2 | ✅ Done — plus the inverse (disabling re-blocks the write) |
| 1.6 | Allow the hub/product owner to end a consignment | F-2 | ✅ Done — new `checkout:end` permission; both parties notified |
| 1.7 | Feed `travel_fee_cents` into wave-down pricing and render it pre-confirmation | F-5 | ✅ Done — snapshotted at request, charged once, disclosed on the confirm screen |
| 1.8 | Assert all six subscription plans in the render test | F-7 | ✅ Done — **and two plans were genuinely missing from the client**, exactly as predicted |
| 1.9 | **Decide which §44/§54 obligations become structured fields** and restructure before counsel sees them | A-6 | ✅ Done — `rto.terms.ts` + [LEGAL_REVIEW_BRIEF.md](LEGAL_REVIEW_BRIEF.md) |

**Exit criteria — all met:**

| Criterion | Result |
|---|---|
| Backend suite green | ✅ **368/368** across 29 files (was 343/351) |
| Frontend suite green | ✅ **183/183** across 38 files |
| Typecheck both repos | ✅ clean |
| Both access gates covered | ✅ messaging gate + module gate, in both directions |
| No known money-path defect | ✅ F-1, F-2, F-5 closed |
| Legal brief out | ✅ [LEGAL_REVIEW_BRIEF.md](LEGAL_REVIEW_BRIEF.md) ready to send |

### What the work turned up beyond the plan

Three defects were found while fixing the ones on the list. All are in the same family — code that
was correct only because the fees it depended on were switched off:

1. **Post-fulfilment refunds returned the service and processing fees** while the disclosure said
   they were non-refundable. `goods` was computed as `amount − tip`, which silently included both
   fees. Invisible today (both are $0); wrong the day either is enabled.
2. **The marketplace fee was charged on top of the service and processing fees** — a fee on a fee.
   `charge()` derived its fee base as `amount − tip − roundUp`, and the order path computed a
   *different* platform fee on the discounted subtotal. The two agreed only while the fees were zero.
3. **Removing an out-of-stock line wiped the fees off an order** that had actually been charged them:
   the re-itemisation ran with the MVP zero-rates instead of the live ones.

Two more were found in the tests themselves: the `phase5` failure was the solvency guard doing its
job (1.3), and `seller_plus` / `stock_waiver` were absent from the frontend entirely — no type, no
entitlement key, no demo row — so two revenue-bearing plans could never render.

**Known and deliberately not fixed:** backend `eslint` reports 12 pre-existing errors (9
auto-fixable) in six files this work did not touch — `no-unnecessary-type-assertion` and one
`require-await`. Frontend lint is clean. Fixing them is a tidy-up, not a Phase 1 exit criterion, and
doing it here would have spread the diff across unrelated modules.

---

## Phase 2 · Missing core functionality

*Effort: ~3–5 weeks across three parallel tracks.*

### Track B — Paid placements — ✅ **COMPLETE (2026-08-01)**

| # | Task | Ref | Status |
|---|---|---|---|
| 2.1 | Advertising dashboard: campaign list, create, pause, spend / impressions / clicks | M-11 | ✅ `/vendor/ads` + "Promotions" in the vendor nav |
| 2.2 | Renderers for `map_banner`, `discovery_card`, `earn_slot` — each carrying the disclosure label the backend assumes is shown, and respecting `AD_MAX_SHARE_OF_FEED` | M-12 | ✅ `AdSlot`; the label has no prop that hides it |
| 2.3 | Promote flow for a product or hub (featured placement) | RV-11 | ✅ `PromoteFlow` + a **Promote** action on every hub product row |
| 2.4 | Flat duration tiers — $5/1 d, $15/7 d, $40/30 d — translating internally to a bounded CPM budget | M-7, §32 | ✅ `AD_DURATION_TIERS`, served via `GET /placements/pricing` |
| 2.5 | Extend placement serving to search and map-list surfaces | P-18 | ✅ Nearby list, map discovery sheet, and the earn hub |

#### The gap this track actually had to close first

**Paid placements were not paid for.** `ads.service.ts` contained zero references to any payment
path, despite the module comment stating that budgets were "prepaid and spent down". Every placement
on the platform was free and the serving path delivered it happily. Building the dashboard on top of
that would have shipped a complete ad product generating **$0** — which is the exact opposite of
this track's stated justification.

Two further gaps fell out of the same review:

- **`settleImpressions` was never scheduled.** Impressions accrued in `unbilled_impressions` and
  were never billed. The counter moved; the money never did. Now on a 5-minute sweep.
- **Nothing closed a campaign when its window passed**, so a flat tier — which is a promise about
  *time* — had no mechanism to end.

Placements now follow the same solvency rule as the ping budget and the settlement rail: created
`pending_payment`, activated only when the charge settles, and never served before that. The window
starts when the money lands, so a slow checkout does not eat the day the buyer paid for, and a
checkout that is abandoned releases its scarce city slot after an hour instead of holding it forever.

**Verification:** backend **374/374** (29 files), frontend **195/195** (39 files), both typechecks
clean, frontend lint clean.

### Track A — Rent-to-Own — ✅ **BUILT (2026-08-01), gated closed pending M-1**

| # | Task | Ref | Status |
|---|---|---|---|
| 2.6 | RTO category allowlist, default-deny, excluding vehicles and regulated goods | M-9, §43 | ✅ `Category.rto_eligible` (default false) + `RTO_PROHIBITED_CATEGORY_SLUGS`, which no admin can override |
| 2.7 | Seller-side RTO listing creation | M-2 | ✅ New `rto_listings` domain + `/vendor/rto` |
| 2.8 | §44 disclosure screen | M-2 | ✅ `/rto` browse + `/rto/offers/[id]` |
| 2.9 | Acceptance screen with the §47 statement prominent | M-2, M-1 | ✅ Built; **acceptance refused until M-1 returns** — see below |
| 2.10 | Agreements list; link the existing `RtoDashboard` | M-2 | ✅ `/rto/agreements` |
| 2.11 | Admin UI for RTO seller approval and city flags | M-10 | ✅ `/admin/rto` — approvals, cities, categories, and the legal-review gate on one screen |

#### The gate, and why the code ships without the product opening

Track A was scheduled behind M-1 (attorney-reviewed agreement text), which has not returned. Rather
than leave the work unstarted, the whole stack is built and **acceptance is refused at runtime while
the agreement is unreviewed**: `AgreementDefinition.reviewed` is `false` for all four agreements, and
`rtoService.accept` checks it before anything is written or charged. Shipping the code therefore does
not ship clickwrap on placeholder terms, and does not accumulate acceptance records that would all
have to be re-collected. When counsel's text lands it arrives with `reviewed: true` in the same edit,
so the flag cannot drift from the thing it describes. `/admin/rto` states the gate plainly, so an
empty RTO marketplace reads as "waiting on legal", not as a config bug.

#### Three holes found while building it

1. **Agreement terms were customer-authored.** `POST /rto/agreements` read the cash price, markup,
   schedule and product name **from the customer's request body**. A customer could create an
   agreement for any product at any price and the seller was never consulted — the record captured
   one party's wishes and called them terms. Terms now come from the seller's listing, server-side;
   the acceptance body carries only a `listingId`.
2. **The city compliance gate was documented and never checked.** `City.feature_flags.rto` is named
   as the §60.3 gate in the RTO model's own header comment, and nothing read it. An approved seller
   could offer RTO in a jurisdiction the company had not cleared. Now enforced at publish *and*
   acceptance, via the existing default-deny `isFeatureExplicitlyEnabled`.
3. **Category eligibility was allow-by-default.** The old rule refused only licence-regulated
   categories, so a seller approved for furniture was equally approved for a motorcycle. §43 is now
   default-deny with a non-overridable prohibition list.

**Verification:** backend **383/383** (29 files), frontend **201/201** (40 files), both typechecks
clean, frontend lint clean.

### Track C — Consignment and platform — ✅ **COMPLETE (2026-08-01)**

| # | Task | Ref | Status |
|---|---|---|---|
| 2.12 | Termination notice periods (3 / 7 / 14–30 d) with a scheduled effective date, snapshotted like `return_window_days` | M-6, §37 | ✅ Derived from declared value; the sweep completes it |
| 2.13 | Consignment automatic renewal, with pre-renewal notice in the existing daily sweep and either-party opt-out | M-13, §39 | ✅ Opt-in per product, announced 3 days out, cancellable by either party |
| 2.14 | Commission change among the end-of-term options | M-14, §36 | ✅ Hub-set, forward-only |
| 2.15 | Booking platform fee — a `booking` fee type plus one settlement call site | M-15 | ✅ 10% on completion; nothing on a no-show |
| 2.16 | Wave Down convenience fee type, disclosed pre-confirmation | M-8, §32.4 | ✅ Flat fee, itemised by payee, **off at launch** |

**Exit criteria — all met:** a customer can complete an RTO agreement end to end (Track A, gated on
M-1); a business can buy and see a promotion (Track B); §36/§37/§39 satisfied; two new revenue lines
wired.

#### Decisions worth recording

- **Ending a consignment now gives NOTICE rather than ending it.** §37's periods only mean something
  if the agreement stays live through them, so `endConsignment` schedules an effective date and the
  daily sweep completes it. The button label changed from "End" to "Give notice" for the same
  reason: "End" tells a seller their goods are due back today when they have days. A second notice
  on the same consignment is refused — one agreement cannot have two end dates.
- **The notice period scales with what is being recalled.** 3 days under $100, 7 under $500, 14
  above, snapshotted at checkout like every other term. Recalling a crate of candles and recalling a
  commercial oven are not the same ask.
- **Renewal is opt-in, announced, and cancellable after the announcement.** That last part is the
  §39 requirement that distinguishes a notice from a formality, so either party can switch it off
  right up until it fires — and giving termination notice cancels a pending renewal, because
  renewing a term you are ending is nonsense.
- **Commission changes are forward-only.** A consignment with units already sold is refused:
  re-splitting completed sales would rewrite money both sides have already counted.
- **The Wave Down convenience fee is OFF at launch**, behind `WAVE_CONVENIENCE_FEE_ENABLED`, like
  the §33 service fee and the §31 processing fee. §32.4 says the platform *may* charge it and the
  spec explicitly suggests charging only the seller's 10% at first "to keep checkout simple". Wiring
  it on by default would have quietly added a line to every wave-down at checkout.
- **The convenience fee rides the `serviceFeeCents` channel**, so it is excluded from the vendor's
  marketplace-fee base — the platform must not charge its 10% on top of its own fee. The vendor's
  travel fee is their revenue and stays in the base. The two are itemised separately on the confirm
  screen because "$5.99 of fees" tells a customer nothing about who they are paying.

**Verification:** backend **392/392** (29 files), frontend **201/201** (40 files), both typechecks
clean, frontend lint clean.

---

## Phase 3 · Incomplete features — ✅ **COMPLETE (2026-08-02)**

*Estimated ~3–4 weeks.*

| # | Task | Ref | Status |
|---|---|---|---|
| 3.1 | RTO voluntary return (§51) | M-3 | ✅ `rto.returnPolicy.ts` — one pure function drives both the preview and the settlement |
| 3.2 | RTO seller remedies (§50) | M-4, F-3 | ✅ All seven; **every declared status is now reachable** |
| 3.3 | RTO return condition report | M-5, F-4 | ✅ Written on the return transition |
| 3.4 | Complete the delivery condition report | P-26, §52 | ✅ Video, damage, accessories, value + **dual acknowledgment** |
| 3.5 | All five §49 reminder stages | P-25 | ✅ Daily sweep; each stage fires once per due date and re-arms when it moves |
| 3.6 | RTO rows in the fee calculator | S-57.2, §57 | ✅ All seven rows, from the same quote the customer is charged |
| 3.7 | Consignment-RTO creation path | P-5, §54 | ✅ Declared on the **listing**, not at acceptance |
| 3.8 | Tax / delivery / refund / balance split legs | M-45, §56.1 | ✅ Each its own statement line |
| 3.9 | Review photos with moderation | P-13 | ✅ Photos hide at 2 reports; the rating and words never do |
| 3.10 | Live-session ETA | P-11 | ✅ Straight-line estimate, `driving` only |
| 3.11 | Verified badge | P-19 | ✅ It rendered **nowhere** — now on the pin, the list, and the profile |
| 3.12 | Custom consignment end date | P-10, §35.2 | ✅ `endDate` alongside the preset terms |

**Exit criteria — met:** §42–§56 satisfied; **no unreachable enum values remain** (F-3 and F-4 closed).

#### Decisions worth recording

- **A part-payment against arrears buys no ownership credit.** Catching up on rent already owed is
  not equity in the goods, and crediting it would quietly tell a struggling customer they own more
  of the item than they do. Asserted directly in the tests.
- **Every §50 remedy is the seller's to grant.** A customer who could pause their own agreement or
  move their own due date would not be receiving forbearance — they would have an option to stop
  paying.
- **A pause is time-boxed.** An open-ended one is a cancellation nobody wrote down.
- **The return outcome is computed, never passed in.** §51 forbids implying that past payments
  create ownership unless the agreement grants credit, so the refund comes from the agreement's own
  snapshotted terms rather than from whoever is processing the return. The disclosure states the
  negative case in the negative: *"your payments are NOT refunded"*.
- **Nothing is charged while goods are on their way back.** `return_pending` was missing from the
  charge sweep's skip list — a customer who had agreed to hand the item over would still have been
  billed for it while it sat in the van.
- **§52 asks for two signatures, so the model stores two timestamps.** A report one side signed is
  that side's account of the condition; signed by both, it is an agreed fact. `agreed` is derived,
  never set.
- **Video uploads are enabled per purpose, not globally.** §52 needs a walk-round video; a review
  photo or a profile picture has no business being a 400 MB upload.
- **Moderation hides photos, never the review.** A business that could bury a 4-star review by
  reporting the picture attached to it would have been handed a takedown button.
- **The consignment arrangement moved to the listing.** §54's ten allocations are a deal between the
  owner and the managing business that the customer *joins* — requiring them in the acceptance body
  meant no UI could ever create one, which is why P-5 had sat unbuilt.
- **The ETA is deliberately crude.** Straight-line distance at an urban average, shown only while a
  vendor is `driving`. A precise-looking number derived from a guess invites a complaint when the
  truck is five minutes late.

**Verification:** backend **405/405** (29 files), frontend **201/201** (40 files), both typechecks
clean, frontend lint clean.

---

## Phase 4 · Architecture improvements — ✅ COMPLETE (2026-08-02)

*Effort estimated at ~2–3 weeks.*

| # | Task | Ref | Status |
|---|---|---|---|
| 4.1 | Reachability gate in CI | A-1 | ✅ Both halves: `scripts/check-reachability.mjs` (client) wired into `npm run verify`, `test/routeCoverage.test.ts` (server) |
| 4.2 | Extract shared money primitives incl. exact penny allocation | A-5 | ✅ `shared/money.ts` + every fee/split call site retrofitted |
| 4.3 | Test forbidding unreachable enum values | A-2 | ✅ `test/enumReachability.test.ts`; surfaced 13 real gaps and closed two |
| 4.4 | Decide the storefront model: menu or catalog | A-8 | ✅ [ADR-001](ADR-001-storefront-model.md) + the `SellableItem` contract |
| 4.5 | Unify the discount model | A-7 | ✅ `orders/discounts.ts`; queue schedule retrofitted, flash sales pre-shaped |
| 4.6 | Type the demo dataset as the feature types instead of casting | A-10 | ✅ Casts removed; the check lives at the consumer boundary |
| 4.7 | Index of current / superseded / historical docs at each repo root | D-12 | ✅ `DOCS_INDEX.md` in both repos |

**Sequencing note, honestly:** 4.2 was specified as *"must precede 3.8"* and did not — the §56.1
split legs landed in Phase 3 first. The extraction was therefore a retrofit rather than a
foundation. No rounding inconsistency had actually shipped (the random-sweep reconciliation tests
confirm it), but the ordering was the recommendation's whole point and it was missed.

### What the gates found

Building the gates mattered more than the refactors, because each one turned up things no one had
looked for:

- **A-1, client:** 27 endpoints defined with no caller. The audit found three unreachable backends
  by hand; the same pattern is an order of magnitude broader. Also caught 5 call sites that
  hardcoded API paths, defeating the endpoints registry — all fixed.
- **A-1, server:** 39 of ~250 routes have no test at all, including `/sales/:id/refunds`,
  `/:id/cancel-payment`, `/bank-account`, and `/:id/moderate-photos` — money and authorization
  surfaces whose behaviour nothing verifies.
- **A-2:** 15 declared-but-unwritten enum values. Two were fixed outright; 13 are recorded with what
  each would take. The most serious is `Refund.status.failed` — **a failed Stripe refund leaves the
  row `pending`, so the customer appears refunded when they are not.**

Each gate carries a baseline that may shrink and never grow. That is what stops an allowlist from
becoming an off switch.

### Decisions worth recording

- **Rate math rounds down, toward the payer; split legs reconcile exactly.** Both conventions now
  live in one file instead of being re-decided per module. `assertReconciles` throws rather than
  logs — a settlement that does not reconcile must not be written.
- **`allocate` uses largest-remainder, not "the last leg absorbs it."** Dumping the remainder on a
  fixed leg is right only when that leg is a designated residual claimant (the consignment owner
  under B4). A three-way even split of 100¢ should be 34/33/33, not 33/33/34 because of parameter
  order.
- **Price discounts do not stack — the best single one wins,** with a hard 90% ceiling. Two 40%-off
  rules that compose reach 64%, and nobody authored that number.
- **Fee discounts are not price discounts.** Trust-band and Seller Plus reduce the *platform's fee*
  and come out of the platform's cut; queue and flash-sale discounts reduce what the *customer pays*.
  The new module governs only the second kind, and says so, because mixing them either short-pays a
  seller or gives away platform revenue and both look like "the discount worked".
- **A storefront is a presentation layer, not a data model** (ADR-001). Menu items and consignment
  products differ in ownership and settlement, not presentation; merging them would put fifteen
  consignment-only fields on every taco.
- **The disclosed RTO late fee is now actually assessed** — found via A-2, since the ledger declared
  a `late_fee` entry type nothing ever wrote. Recorded as owed, never auto-charged (§50 asks for
  communication before escalation), and never ownership credit.
- **The demo-fixture type check lives at the consumer,** because `lib/` may not import `features/`.
  Structural typing makes that constraint free.

**Verification:** backend **443/443** (34 files), frontend **204/204** (41 files), both typechecks
clean, **both repos lint clean**, reachability gate green.

---

## Phase 5 · Performance optimization — ✅ COMPLETE (2026-08-02), with one part blocked

*Effort estimated at ~1 week.*

| # | Task | Ref | Status |
|---|---|---|---|
| 5.1 | Move the fee cache to Redis with pub/sub invalidation | A-3, SC-1 | ✅ `payments/feeCache.ts` — L1 memory / L2 Redis / L3 Mongo, invalidation by pub/sub, wired in server **and** worker |
| 5.2 | Establish the Lighthouse + bundle-budget baseline in CI, not just locally | P-2 | ✅ Both run in CI; baseline measured and recorded in `PERFORMANCE_BASELINE.md` |
| 5.3 | Load-model the sweep cadences against projected volume | SC | ✅ `SWEEP_LOAD_MODEL.md` + saturation instrumentation on every sweep |
| 5.4 | Review index coverage against real query patterns once production traffic exists | SC | ⚠️ **Static half done** (`INDEX_COVERAGE_REVIEW.md`, 3 missing indexes fixed). The traffic-dependent half is blocked — see below. |

### 5.4 is partly blocked, and honestly so

The task says *"once production traffic exists."* It does not. There is no slow-query log and no
`$indexStats`, so **unused** indexes — half of what coverage means, and every one of the 107 declared
is paid for on every write — cannot be identified without guessing. That half is deferred, not
skipped, with the specific procedure written down (`INDEX_COVERAGE_REVIEW.md` §"What still needs real
traffic").

The static half was done and found three collections queried with no usable index, now fixed in
schema **and** in a migration — schema declarations alone build nothing, because `autoIndex` is off
in production:

- **`verification_records.provider_reference`** — a KYC webhook knows only the provider's reference,
  so this ran as a collection scan on *every callback*. Partial index, since most rows never get one.
- **`hubs.owner_user_id`** — "my hubs", the first query every hub-owner screen makes, scanned every
  hub on the platform.
- **`jobs_postings.poster_user_id`** — public browse was indexed; the poster's own dashboard was not.

Most of the 32 candidates the scan produced were false positives, and the reasons are recorded so the
next person does not redo the triage: `unique: true` already builds an index, several schemas live in
service files, and index prefixes are order-sensitive.

### What 5.3 found

The sweeps all shared a magic `500` batch limit, and **hitting it was indistinguishable from not
hitting it** — a tick processing 500 of 4,000 due items returned `500`, logged success, and deferred
the rest forever if arrivals outpaced drain. That is now one shared constant plus
`sweep_batch_saturated_total`, so backlog growth is alertable instead of invisible.

Three findings worth acting on before launch volume:

1. **`proximity-alert-eval` is the real constraint** and it saturates on *latency*, not batch size:
   three queries per active session, one of them a `$near`, every 60 seconds. At 500 sessions and
   20 ms per query a tick eats half its window. Worse, `activeSessions(500)` silently truncates —
   with 800 active vendors the same 300 never generate alerts, every tick, forever. That is a
   correctness bug wearing a performance bug's clothes.
2. **`consignment-expiry-notices` has the tightest capacity on the platform** — 500/day against
   clustered expiries, on a §38 notice that is worthless if it arrives late.
3. **`rto-installments` needs a faster cadence, not a bigger batch**, before ~2,000 agreements:
   installments cluster on the 1st and 15th, and 500/hour means the last customer on a heavy day is
   charged 16 hours late.

### Decisions worth recording

- **The fee cache does not read Redis on every resolve.** `resolveFeeRule` is on the money hot path;
  swapping a memory lookup for a round trip would tax every payment to fix a problem that is about
  *invalidation*, not storage. L1 stays in-process and pub/sub clears it.
- **Invalidation deletes L2 before publishing.** The reverse order lets an instance clear L1 on the
  message, re-read the not-yet-deleted shared copy, and re-cache the stale schedule for a full TTL —
  turning a 30-second inconsistency window into a 5-minute one.
- **The TTL stays as a backstop.** Pub/sub is fast, not guaranteed; a subscriber reconnecting during
  a publish misses it, and a fee cache must not depend on a delivery promise Redis does not make.
- **Lighthouse's PWA assertions were dead.** `categories:pwa`, `installable-manifest`,
  `service-worker`, and `themed-omnibox` were all removed in Lighthouse 12, so three *error-level*
  gates had quietly stopped testing anything. Removed; `scripts/check-pwa.mjs` covers the artifacts
  directly and now runs in CI.
- **Performance stays a warning, accessibility an error.** A hard performance gate on a noisy shared
  runner trains people to ignore failures, which costs more than the gate is worth.

### Measured baseline (previously never actually run — the P-2 finding)

| Metric | Measured | Budget |
|---|---|---|
| Shared first-load JS | 87.5 KB | 130 KB |
| Heaviest route (`/(customer)/map`) | **247.4 KB** | 260 KB |
| Lighthouse accessibility | ✅ ≥0.95 on all 3 audited routes | 0.95 (error) |
| Lighthouse performance | ⚠️ 0.45 / ≥0.80 / 0.51 | 0.80 (warn) |
| Lighthouse best practices | ⚠️ 0.70–0.74 | 0.90 (warn) |

**The map route has 5% headroom** — one more non-lazy dependency trips it. "Budgets pass" is a
weaker statement right now than it looks. Full context and caveats in `PERFORMANCE_BASELINE.md`.

**Verification:** backend **451/451** (35 files), frontend **204/204** (41 files), both typechecks
clean, both repos lint clean, reachability gate green.

---

## Phase 6 · Security improvements — ✅ COMPLETE (2026-08-02), with 6.3 scoped honestly

*Effort estimated at ~1–2 weeks.* The two highest-value security items (gate coverage) already landed in Phase 1.

| # | Task | Status |
|---|---|---|
| 6.1 | Dependency CVE scanning in CI | ✅ `scripts/check-vulnerabilities.mjs` in both repos, wired into both CI workflows |
| 6.2 | Secret-management review | ✅ `SECRET_MANAGEMENT_REVIEW.md` — 2 findings fixed, 5 platform questions left open by name |
| 6.3 | Penetration test of the money paths | ⚠️ **Not a third-party pen test.** 19 adversarial tests over orders / refunds / settlements / RTO — the application-layer half, run on every commit |
| 6.4 | Audit-log retention and access review | ✅ Retention implemented (it was documented and absent); audit-log reads are now themselves audited and filterable |
| 6.5 | Phase out `allow_static_qr` for grandfathered hubs | ✅ A dated sunset, not a flag — plus usage telemetry so the switch-off is evidence-based |

### 6.3 is deliberately labelled

The task said "penetration test". What exists is **19 executable attacks**, not an engagement: no
external tester, no production environment, no network or infrastructure surface. Calling it a pen
test would be the more damaging kind of false assurance, because that label stops people looking.

What it does cover is the realistic threat model for a marketplace — an **authenticated insider**, a
seller or hub owner or customer with valid credentials, probing the edges of their role: cross-tenant
IDOR, privilege escalation, client-supplied amounts, idempotency abuse, boundary amounts, and
double-spend. A real pen test is still outstanding and is on the production-readiness list.

### What the attacks found

**One real defect, in the highest-consequence class.** `/sales/payment-intent` and
`/sales/:id/refund` did their own key-based idempotency and **never compared the request body**. So
replaying a key with a *different* quantity returned `201` with the **original** intent: the seller
believes they started a $30 sale, the customer is charged $10, and nothing anywhere looks wrong.
That is worse than a plain double charge, because a double charge is visible. Both routes now use
the shared `idempotency` middleware, which hashes the body and answers 409 on a mismatch.

**A broader version of the same gap is recorded, not silently fixed:** 19 money routes do not use
the shared middleware. Most require no idempotency key today, so mounting it would be a breaking
API change — that is a decision, not a cleanup, and it is written down rather than done quietly.

Everything else held: cross-tenant reads and writes, role escalation, injected prices and fees,
negative tips and refunds, oversell, and a genuine concurrent double-spend race all failed as
intended.

### What 6.1 found

The frontend shipped **Next.js 14.2.15 with a critical advisory list** including CVE-2025-29927,
the middleware authorization bypass — in an app whose `middleware.ts` does session gating. Moved to
**14.2.35**, the last 14.x, which clears the critical. The remaining nine advisories need Next 15/16
and are recorded as **reviewed exceptions with expiry dates**, each with why it does or does not
reach this app (no Server Actions, no custom server, no rewrites, no i18n, App Router only).

The old gate was `npm audit --audit-level=high` over the whole tree, which fails on Storybook and
vitest advisories that never reach a user. A gate people learn to skip is not a gate, so the new one
audits the **production tree only** — computed from `npm ls --omit=dev`, because `npm audit
--omit=dev` still reports devDependencies — and every exception carries an expiry that fails the
build when it lapses.

Backend production dependencies are now **clean** (0 advisories).

### Decisions worth recording

- **The static QR phase-out is a date, in three layers**, each able only to shorten the window: the
  flag, a per-hub deadline, and a platform-wide `STATIC_QR_SUNSET_AT` no hub can outlive. **A
  grandfathered hub with no recorded deadline inherits the sunset rather than defaulting open** —
  an exception whose end date nobody wrote down is exactly the one that would otherwise live
  forever.
- **Every static-QR use is audited**, so "which hubs still depend on the poster" is a query rather
  than a guess, and `--revoke-unused` closes the ones nobody is using at no cost.
- **The retention purge cannot reach audit logs, ledgers, or settlements.** A job that can delete
  the record of a dispute is not a cleanup job. Audit retention is stated as `indefinite` in code so
  the policy is visible in review rather than inferred from the absence of a purge.
- **Only *read* notifications age out.** An unread notification is unseen communication, and several
  are §38/§49 contractual notices.
- **Reading the audit log is itself audited, with the scope recorded** — "who read the audit log" is
  much less useful than "who read which part of it". Filters were added at the same time: without
  them, "read only what you need" is unfollowable, because the only query available was
  "everything".
- **Log redaction was written in camelCase against a snake_case database.** `*.secret` does not
  match `checkout_qr_secret`, so logging a hub document would have printed the QR signing key — the
  entire proof of physical presence in the custody model — in clear text.

**Verification:** backend **491/491** (39 files), frontend **204/204** (41 files), both typechecks
clean, both repos lint clean, reachability and CVE gates green.

---

## Phase 7 · UX enhancements — ✅ COMPLETE (2026-08-03)

*Effort estimated at ~4–6 weeks.*

| # | Task | Ref | Status |
|---|---|---|---|
| 7.1 | Outbound email/SMS channel; route §38/§49/§53 notices through it | A-9, D-8 | ✅ `integrations/messaging` + `notices.service.ts`, with an immutable delivery record and an admin queue for notices that reached nobody |
| 7.2 | Wish lists with back-in-stock notification | M-16 | ✅ Covers menu items and consignment stock; alert fires on the false→true edge, once |
| 7.3 | Loyalty rewards (stamps) | M-17 | ✅ Stamps, not points; one per completed order |
| 7.4 | Referral rewards, modelled on the gift-code flow | M-20 | ✅ Converts on the referred user's first completed order, capped, two-sided |
| 7.5 | Scheduled pickup for goods orders | P-14 | ✅ Opt-in per vendor, slot-based; a scheduled order does NOT require the truck to be Parked |
| 7.6 | Flash sales (after 4.5) | P-15 | ✅ Built on A-7's contest — best-wins, never stacked |
| 7.7 | Mileage tracker derived from existing GPS tracks | M-24 | ✅ With the estimate caveat and the 30-day retention limit stated in the payload |
| 7.8 | Route/corridor alerts | P-12 | ✅ Point-to-polyline distance, throttled per (corridor, business), event-driven |
| 7.9 | Festivals directory view over `events` | P-21 | ✅ A view, not a second collection |
| 7.10 | Business back office: expenses, invoices | M-23, M-25, M-21 | ✅ Crew + expenses + invoices, on [ADR-002](ADR-002-staff-vs-gig.md) |

### The decision 7.10 was blocked on

**[ADR-002](ADR-002-staff-vs-gig.md): the platform models engagements, not employment.** There is no
employee entity and there will not be one.

The audit flagged the ambiguity rather than guessing — *"`jobs` is a gig marketplace, not staffing.
Confirm which one the business actually needs before building"* — and the answer is that M-21 is
asking for a saved list, not an HR system. The reason it matters is not tidiness:

- **Employment is a legal status, and modelling it invites claiming it.** Storing a wage, a
  schedule, and a job title asserts an employment relationship, and in most US states the
  consequences follow the substance rather than the label — withholding, workers' compensation,
  the ABC test. StreetServe's users are sole traders on the edge of the formal economy; an employer
  UI without any of the compliance machinery being an employer requires puts *them* on the wrong
  side of a payroll audit, not the platform.
- **The money rails cannot support it honestly.** Stripe Connect transfers to individuals are a
  contractor rail. There is no path from here to a W-2 that does not start with a payroll provider.

So M-21 became **crew management** (a mutual, non-binding saved list), M-22 became offering a dated
job to the crew first, and a copy rule — nothing may say *employee*, *staff*, *hire*, *wage*, or
*payroll* — is enforced by test, in the same way the `stock_waiver` prohibition is.

### What the widened A-2 gate found

Phase 7 also closed a **blind spot in the Phase 4 enum gate**: it scanned only `*.model.ts`, and
several modules declare their schema beside their service (`waiver.service.ts`, `weatherCache.ts`,
`corridors.service.ts`, and Phase 7's own `notices.service.ts`). The filter is now *"does this file
declare a Mongoose schema"*, which is what the test was always trying to ask.

It immediately caught three of Phase 7's own notice types with no writer — **§37 termination and §51
return are now wired as contractual notices**, and `rto_late` was removed because the late stage
already ships inside `rto_payment_reminder`; declaring a second type for it would have meant either
double-notifying or lying. And it found a pre-existing one worth its own debt entry:

> **D-15 — the fraud queue has no resolution path.** `FraudFlag.status.reviewed` and `.dismissed`
> are declared and never written, **while the admin console renders a dismiss control**. An operator
> clicks it, nothing happens, and the queue grows forever — so the one surface meant to keep fraud
> review honest is the surface people learn to ignore.

### Decisions worth recording

- **A notice is not a notification.** §38, §49, and §53 are obligations a signed agreement creates,
  so they go out on every channel at once and the attempt is recorded immutably. **In-app alone is
  explicitly NOT counted as delivered** — a user who declined the push prompt and has no email has
  not been reached, and recording that as success makes the record useless in exactly the case it
  exists for. `undeliverable` (no contact details) is recorded distinctly from `failed` (provider
  refused), because one is a data problem and the other an integration problem.
- **The default messaging provider logs and reports success.** Reporting failure in dev would make
  every notice path look broken locally and train people to ignore delivery failures. What keeps it
  honest is that the provider *name* is on every record: a production log full of `log` entries
  reads as "nothing is configured", not as delivery.
- **A scheduled pickup does not require the vendor to be Parked.** A now-order does — you cannot
  collect from a moving truck. But the vendor is on the road at 10am *in order to* be at the pitch
  at noon, and requiring them to already be parked would make ordering ahead useless to exactly the
  vendors it is for. Their opt-in and notice period replace the check: a promise they made rather
  than a state we inferred.
- **Flash sales do not stack with queue discounts.** 20% + 30% compounds to 44%, and nobody authored
  that number. The quote now returns *why* the price is what it is, plus what else was in the
  running, so a customer who came for a sale and got a bigger queue discount can see nothing was
  taken away.
- **Loyalty is stamps, not points.** Points need an exchange rate, and an exchange rate is a
  liability the vendor carries on a balance sheet they do not keep. One stamp per completed ORDER —
  not per item (ten coffees on one receipt is one visit) and not on payment (a stamp a cancellation
  could not reverse is a free-reward machine).
- **A referral converts on a completed order, not a signup.** Signing up is free, so rewarding it
  rewards account creation. Requiring a real order means farming the programme costs the farmer real
  money — the only anti-abuse measure that scales without a fraud team. Capped, two-sided, one per
  account.
- **Mileage carries its caveat in the payload.** Straight-line distance between GPS points
  under-counts a road route, and someone may put the figure on a tax return. Implausible jumps are
  discarded rather than counted — inflating a tax figure is the wrong direction to be wrong in —
  and a request beyond the 30-day retention window says so instead of returning a quietly short
  total.
- **The back office computes no profit.** Revenue here is only what moved through the platform; a
  vendor's cash sales are not. A platform-computed profit would be wrong in the direction that
  matters and would look authoritative while being so.

**Verification:** backend **574/574** (46 files), frontend **216/216** (43 files), both typechecks
clean, both repos lint clean, reachability gate green (238 endpoints, all with callers).

---

## Phase 8 · Production readiness — ✅ COMPLETE (2026-08-04)

*Effort estimated at ~1–2 weeks.* Full result: **[PRODUCTION_READINESS.md](PRODUCTION_READINESS.md)**.

| # | Task | Status |
|---|---|---|
| 8.1 | Full pass of [FINAL_IMPLEMENTATION_CHECKLIST.md](FINAL_IMPLEMENTATION_CHECKLIST.md) | ✅ Done — found **six stale entries** and one missing requirement |
| 8.2 | Runbook rehearsal | ⚠️ Automatable half done (`runbookRehearsal.test.ts`); the **drill** needs a person |
| 8.3 | Alerting verified against a seeded failure | ✅ Done — the alert *decision* extracted so it runs, not just reads |
| 8.4 | Every §60 agreement renders its reviewed version + hash | ⚠️ **Blocked on M-1**; machinery + fail-closed verified, and the test announces when it unblocks |
| 8.5 | Every customer-paid fee displayed before payment | ✅ Done — with all three fee flags forced ON |
| 8.6 | Accessibility audit | ⚠️ Automated half done, now covering the **money paths**; manual screen-reader passes still needed |
| 8.7 | Load test at projected launch volume | ⚠️ Volume model + scenario harness done (`LOAD_TEST_PLAN.md`); the **run** needs a production-like environment |
| 8.8 | Support runbooks | ✅ Done — `SUPPORT_RUNBOOKS.md` |

### What the checklist pass found

A checklist is worth only the last time someone read it against the code. **Six entries were wrong:**

- **Five were done and unticked** — route alerts, wish lists, loyalty, referrals, scheduled pickup.
  All shipped in Phase 7; the *roadmap* rows were updated and the *feature* rows were not.
- **One was ticked in spirit and false in fact.** Item 8.4 claimed both access gates were covered by
  tests. `requireModule` genuinely was. **The messaging transaction gate was not** — the audit had
  said so in as many words, and every existing messaging test gave the customer standing first, so
  all of them would still have passed if the gate were deleted. Four tests now assert it.
- **And §53 step 9 was simply missing:** completion never requested customer feedback. RTO
  completion now carries the prompt with the transaction id a review attaches to.

### Decisions worth recording

- **A repaired ledger drift still pages.** `ledger-reconciliation` runs with `repair: true`, so the
  cached balance is rewritten from the entries. Treating that as handled would remove the symptom
  and leave the cause: something wrote wrongly. The alert says *"the CAUSE is still unfixed"* so
  nobody closes the ticket on the repair. It also names the **worst** discrepancy — "12 accounts
  drifted" and "12 accounts drifted, one by $40,000" are very different pages at 3am.
- **The alerting decision was extracted from the worker.** It lived inline in a BullMQ handler that
  needs a live Redis to instantiate, so *"does a drift wake anyone up?"* was answerable by reading
  and not by running. A production-readiness item that says *confirm the jobs alert on a seeded
  failure* cannot be satisfied by code you can only inspect.
- **8.4's test announces its own unblocking.** When counsel's text lands and all four agreements are
  marked reviewed, the assertion fails on purpose and says what to do next. A blocked item that
  tells you it is no longer blocked beats a note in a document nobody re-reads.
- **8.5 needed its own test because every customer fee is off at launch.** The whole existing suite
  exercises the zero case — the same shape as the F-1 family of defects this audit already found
  once: *money arithmetic correct only because the fees it depended on were switched off.*
- **[ADR-003](ADR-003-revenue-decisions.md) declines all four open revenue ideas**: video ads before
  profiles, an insurance marketplace, a loan marketplace, and a processing-fee markup. Referrals and
  processor *rebates* are accepted. The shared rule: **the platform may charge for things it does;
  it may not charge by misdescribing them.** The loan marketplace is the one to re-read — it is
  dangerous precisely because the plumbing (`debt`, `spot_me`, RTO) nearly exists, and checklist 1.8
  has not yet had counsel look at the lending-adjacent modules that already ship.

### Six things still need a person, not a commit

**M-1** (attorney text — the launch blocker), **1.8** (legal review of the lending-adjacent
modules), **8.2** (the drill), **8.6** (manual screen-reader passes), **8.7** (the load run against
a production-like environment), and **9.17** (third-party penetration test). Each is listed in
[PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) with what it requires. None is hidden behind a
tick.

**Verification:** backend **611/611** (50 files), frontend **223/223** (44 files), both typechecks
clean, both repos lint clean, reachability gate green.

---

## Critical path

```
Phase 0 ─┬─► 1.9 structure obligations ─► M-1 LEGAL (calendar-bound) ─────────────┐
         │                                                                        ▼
         ├─► Phase 1 defects + green suite ─────────────────────────────► Track A: RTO UI
         │                                                                (2.6–2.11)
         │                                                                        │
         ├─► Track B: Placements (2.1–2.5) ── independent, ship first ──┐         ▼
         │                                                              │  Phase 3 RTO
         └─► Track C: Consignment + fees (2.12–2.16) ───────────────────┤  completion
                                                                        │  (3.1–3.8)
                                              4.2 money primitives ─────┘         │
                                                                                  ▼
                                                              Phases 4–7 ─► Phase 8
```

**The long pole is legal.** Every RTO item downstream of M-1 is idle until counsel returns. Start it first, and use that window for Track B, which has no legal dependency and delivers revenue soonest.

---

## If you only do one phase

Phase 1. It is roughly a week and a half, and it clears four of five money-path defects, restores a regression gate the whole team is currently working without, and closes two untested access controls. Everything after it is safer and faster for having been done.
