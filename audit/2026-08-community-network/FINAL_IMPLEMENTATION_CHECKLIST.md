# Final Implementation Checklist

Tickable completion checklist for the community network specification. Ordered by the
[roadmap](IMPLEMENTATION_ROADMAP.md) phases. An item is done when it is **merged, tested, and
verifiable** — not when it is written.

**🔒 = hard gate.** Do not proceed past it, and do not ship the dependent feature without it.

---

## Phase 0 · Decisions — ✅ complete 2026-08-04

- [x] 🔒 [**ADR-004**](ADR-004-driver-classification-and-liability.md) written and accepted — drivers are engagements; assignment / acceptance-rate pressure / exclusivity prohibited; platform provides no driver cover; vetting + non-self-grantable role; no cash; no age-restricted goods; staged address disclosure
- [x] 🔒 [**ADR-005**](ADR-005-custodial-community-funds.md) written and accepted — pool is a custodial liability, never withdrawable; no fee on contributions, standard fee at redemption; 12-month expiry with city redistribution
- [x] 🔒 [**ADR-006**](ADR-006-crowdfunding-capture-model.md) written and accepted — capture into custody, ≤60-day deadline, automatic full refund, opt-in roll-forward. **Reverses A-10**
- [x] [**Copy-rule register**](COPY_RULE_REGISTER.md) created — 7 rules, prohibited substrings, replacement vocabulary, enforcement schedule
- [x] Decision recorded on PIF-20 priority groups — **self-attestation only**; the platform does not adjudicate membership of protected or sensitive classes (ADR-005 consequences)
- [x] Decision recorded on PIF-24 "never expires" — **option removed**; 12 months (ADR-005 §6)

**Still open — these need a person, not a commit. Carried to Phase 8:**
- [ ] 🔒 Contingent/commercial auto insurance **quoted and bound**, and who carries it recorded
- [ ] 🔒 Counsel has reviewed the custodial structure and the 12-month escheatment position (covers ADR-005 **and** ADR-006 in one conversation)
- [ ] 🔒 Counsel has reviewed the driver terms of engagement
- [ ] Background-check vendor selected, with its adverse-action process

## Phase 1 · Critical fixes — ✅ complete 2026-08-04

- [x] `SELF_GRANTABLE_ROLES` doc comment corrected ([F-7](FEATURES_REQUIRING_FIXES.md)) — it is an allowlist, and the comment said denylist
- [x] 🔒 Idempotency defects fixed (F-4) — **three**, not the one predicted: order-dependent body hash, a check-then-act race that allowed a double charge, and failure responses cached as results
- [x] Reservation is taken atomically **before** the read; `setNx`'s result is now the decision
- [x] Only 2xx cached; 4xx releases the key; 5xx/no-response hold it (unknown outcome ⇒ never retry a possible charge)
- [x] Replayed-request test proves a money-in POST charges exactly once (`test/idempotency.test.ts`, 11 tests)
- [x] All six defect tests verified to **fail against the previous implementation** — they are regression tests, not descriptions
- [x] `DEBIT_NORMAL` replaced with a total `Record<AccountType, 'debit'|'credit'>` (F-2) — omitting a new type is now a compile error
- [x] Sweep-vs-event policy documented in `BACKGROUND_JOBS.md` §2a (D-2)
- [x] Courier-ping scenario added to `loadtest-socket.mjs`; `SWEEP_LOAD_MODEL.md` gained a realtime write-load section (D-3)
- [x] 622/622 backend tests pass; typecheck and lint clean

## Phase 2 · Foundations — ✅ complete 2026-08-04

- [x] 🔒 `community_fund_payable` in `ACCOUNT_TYPES`, credit-normal, declared explicitly
- [x] Entry types added: `community_contribution`, `community_redemption`, `community_expiry`, `community_refund`
- [x] Posting rail built (`ledger/communityFund.ts`) so no entry type ships dead — contribute / redeem / expire / refund
- [x] 🔒 **No withdrawal function exists**, and a test asserts the surface is exactly those four plus `balanceOf` (ADR-005 §3)
- [x] 🔒 Expiry credits the **city fund**, never the vendor and never the platform — tested
- [x] Redemption charges the standard marketplace fee (a fee-free path would be an arbitrage)
- [x] Reconciliation covers the new account; no drift after contribute → redeem → expire
- [x] Replayed contribution cannot double-credit (idempotent on the contribution id)
- [x] `delivery` added to `fulfillment_type`; `destination` subdocument added and validated
- [x] 🔒 Delivery is **default-deny per city** via `isFeatureExplicitlyEnabled` — an unreviewed city cannot take delivery orders (ADR-004 insurance gate)
- [x] Invariant tests: a delivery order carries a destination with coordinates; a pickup order has none; scheduled+delivery is refused
- [x] `driver` role added and **excluded from self-grant** (endpoint returns `CANNOT_SELF_GRANT_ROLE`); `DRIVER_MIN_TIER = silver`
- [x] `ALL_ROLES` derived from `ROLES` so a new role cannot be silently omitted from the permission matrix
- [x] `delivery_coordination` + `campaign_service` fee types + seed migration
- [x] Notification categories added — all three user-mutable, and provably silenceable
- [x] Three agreement types registered, all `reviewed: false`, each stating its ADR's key clauses
- [x] CI gates green (reachability, route coverage, enum writers) — **with no baseline additions**
- [x] 652/652 tests pass; typecheck and lint clean

**Carried forward as gates on later phases:**
- [ ] 🔒 Price `delivery_coordination` before DAN-8 ships (seeded at 0; needs driver payout + insurance cost)
- [ ] 🔒 Price `campaign_service` before MB-3 ships (seeded at 0; needs a contracted print vendor)
- [ ] Add `city_slug` to Business so delivery can be gated per-business rather than per-default-city (Phase 5)

## Phase 3 · Pay It Forward — ✅ complete 2026-08-04 (backend + frontend)

**Module and contributions**
- [x] New `payforward` module (not inside `growth`)
- [x] Per-business enable toggle via the module system — available to every archetype, **off by default**
- [x] `community_funds` + `community_contributions` collections
- [x] 🔒 Pool credited **only** in the webhook handler, keyed on a unique intent id
- [x] 🔒 Test: pool balance cannot rise without a `succeeded` contribution row (F-3)
- [x] A redelivered webhook cannot double-credit
- [x] A failed charge is recorded as `failed`, not left pending forever
- [x] Contribution bounded ($1–$500) so one stray keystroke is not a custodial problem
- [x] Contribution UI — presets, custom amount, anonymity **default on** (`ContributeSheet`)
- [x] Optional public recognition, opt-**in**, enforced at serialisation not in the UI
- [x] Naming yourself without giving a name is refused

**Redemption**
- [x] Settings: max per redemption, per customer/day, percentage cap, expiry
- [x] 🔒 Caps enforced server-side; the balance guard and the daily index are both atomic
- [x] Redemption applied **after** discounts, not before
- [x] Partial application implemented as `min(balance, cap, total)`
- [x] Tip and round-up are never covered
- [x] 🔒 Unique index `{business_id, user_id, day_key}` on live redemptions
- [x] Verification-tier gating (`bronze`) on redemption
- [x] 🔒 Concurrency test: five simultaneous orders against a $25 pool cannot overdraw it, and spend exactly what was there
- [x] Two-phase reserve → apply, with release on a declined card
- [x] A fully covered order takes **no card at all** and records no transaction
- [x] Opt-in only: an order that does not ask for help does not get any
- [x] A refused redemption still completes the order and **reports the reason**

**Visibility and lifecycle**
- [x] Business impact dashboard, computed from immutable receipts (never counters)
- [x] People helped is a count, never a list — who accepted help is not publishable
- [x] Notifications for gift-available and gift-used (`generosity`, mutable)
- [x] Expiry sweep implemented per ADR-005; 30-day vendor notice; **expired money goes to the city fund, never the vendor**
- [x] `expiryDays: 0` ("never") is refused
- [x] 🔒 Copy-rule test: no "tax-deductible" claim on any Pay It Forward surface
- [x] The agreement says plainly that a contribution is **not** tax-deductible (the one permitted use of the phrase)
- [x] Ledger reconciles across a full contribute → redeem → expire cycle
- [x] Cached fund balance provably equals the ledger balance
- [x] Pay It Forward suite passes 27/27; typecheck and lint clean
- [x] **679/679 backend tests pass across 53 files** (verified on a clean re-run, exit 0). An earlier run showed 670/1/8; both non-passes were environmental — a MongoMemoryServer start timeout under load, and one RTO assertion that passes 36/36 in isolation

**Frontend** (`src/features/payforward/`, 17 tests · 240/240 frontend tests pass)
- [x] `PayItForwardCard` on the business profile, module-gated, renders nothing without a fund
- [x] Written for two readers — the balance for a giver, "if money is tight today… no questions, and nobody is told" for someone short
- [x] Test-forbidden on that card: "in need", "less fortunate"
- [x] `ContributeSheet` — anonymous by default, naming opt-in, CR-6 disclosure shown **before** payment
- [x] Test: no name is sent unless the giver opted in (the field is absent, not `false`)
- [x] `PayItForwardOffer` at checkout — plain unchecked checkbox, placed **after** the total
- [x] 🔒 Test: no celebration, no qualification, no charity words ("free", "donated", "in need", "are you sure", 🎉) 
- [x] Test: states who is told — nobody
- [x] `daily_limit` translated to plain language; the raw enum can never reach a screen
- [x] Nothing shown at all when the pot is simply empty
- [x] `CommunityImpactPanel` at `/vendor/pay-it-forward` — tells the vendor the money "isn't your money and can't be paid out"
- [x] Test: people helped is a count with no way to see who; "Never" is not an expiry option

**Not done — carried forward:**
- [ ] 🔒 Redemption screen usability-tested with someone who would actually use it (Phase 7.1). Everything above is reasoned design, not evidence — and this is the one screen where being wrong means the feature is admired and unused

## Phase 4 · Boost My Marketing — ✅ complete 2026-08-04 (backend + frontend)

**Campaign**
- [x] `boost_campaigns` as a sibling of `placements`, not a variant
- [x] `raised` derived from contribution rows — test corrupts the cache and proves the API ignores it
- [x] 🔒 Hard deadline, always set, ≤60 days — no open-ended campaigns
- [x] One open campaign per business
- [x] Only the business owner can create, schedule, or cancel

**Money in**
- [x] 🔒 Captured on contribution into a **campaign-scoped** escrow (`campaign:<id>`), kept apart from the business's Pay It Forward pool — tested
- [x] 🔒 Credited only in the webhook; a pending contribution does not move `raised`
- [x] No platform fee taken from a contribution — tested
- [x] Failed charges recorded as `failed`, not left pending
- [x] Anonymous by default; naming without a name is refused
- [x] Contributions refused once the campaign has closed

**The likely outcome — a missed goal**
- [x] 🔒 Deadline sweep expires the campaign and refunds every contributor **automatically**
- [x] 🔒 Refunds are **in full** — the platform absorbs the processor's cost; test asserts the exact amounts
- [x] 🔒 The campaign's ledger balance is **zero** afterwards
- [x] A campaign that quietly hit its goal before the sweep funds instead of expiring
- [x] Cancelling refunds everyone, regardless of their roll-forward choice
- [x] Owner top-up covers exactly the shortfall, and is refused after the deadline

**Roll-forward (ADR-006 §5)**
- [x] Opt-in; defaults to refund — tested
- [x] Adopted by the business's next campaign and counts toward it from day one
- [x] 🔒 **Time-boxed**: refunded after 60 days if no next campaign arrives
- [x] `transferBetweenFunds` rejects a cross-business move
- [x] Phase 2's "no withdrawal exists" assertion updated, not deleted

**Mailing**
- [x] Mail-date confirmation, funded campaigns only
- [x] Status pipeline preparing → printing → mailed, ops-driven until a vendor webhook exists
- [x] 🔒 **No `delivered` status** — the platform does not report what it cannot observe (D-12)
- [x] A vendor cannot move their own mailing status (admin-only)
- [x] Estimate returns `postcards: null` while no rate is configured, labelled `isEstimate`
- [x] Goal-reached notifications to the owner **and** every backer; "mailed" notifies backers
- [x] Typecheck, lint, and both CI gates clean with no baseline change
- [x] **705/705 backend tests pass across 54 files** (verified on a completed run, exit 0)

**Frontend** (`src/features/boost/`, 17 tests · 257/257 frontend tests pass across 46 files)
- [x] `BoostCampaignCard` — progress bar, remaining, days left; renders nothing without a live campaign
- [x] 🔒 Refund promise stated **on the card**, not only in the sheet
- [x] Test: no urgency theatre ("hurry", "last chance", "act now", "ending soon", "!!")
- [x] 🔒 `ContributeToCampaignSheet` discloses the unmet-goal outcome **above the pay button**
- [x] 🔒 Deadline shown as a date, not "soon"
- [x] 🔒 Refund is **preselected**; roll-forward is a deliberate choice
- [x] 🔒 Roll-forward states its own 60-day time-box
- [x] Test: the contributor's choice is actually sent with the contribution
- [x] Anonymous by default — the field is absent, so the server's default applies
- [x] Says plainly: not charitable, not an investment, not tax-deductible, no fee on the contribution
- [x] Estimate renders nothing while no mailing rate is configured; labelled an estimate once it is
- [x] `BoostManagerPanel` at `/vendor/boost` — create, top up, schedule, cancel
- [x] 🔒 Tells the vendor the money "isn't yours until the campaign funds"; no withdraw control exists
- [x] No "no deadline" option in the create form
- [x] Cancel warns it refunds everyone, including roll-forward backers
- [x] Typecheck and lint clean

**Not done — carried forward:**
- [ ] 🔒 **Contract a print/mail vendor (MB-8)** — sets the postcard rate, the `campaign_service` fee, and whether a webhook can replace the ops-driven "mailed" transition. External and slow; every seam exists
- [ ] 🔒 Counsel review of the custodial structure (shared with ADR-005) before any real contribution

## Phase 5 · Delivery Assist Network — ✅ backend complete 2026-08-04 · **NOT SHIPPABLE**

**🔒 Gate: ADR-004 merged ✅, but insurance is NOT bound. Phase 2's default-deny per city is what
keeps this unreachable — a test asserts a delivery order is refused while the flag is off.**

**Drivers**
- [x] `driver_profiles` — vehicle, licence expiry, insurance expiry, background-check status
- [x] Vetting flow; ops decision endpoint records the check outcome and approves or refuses
- [x] Stripe Connect onboarding, and 🔒 **a payout account is an eligibility requirement** — never offer work somebody cannot be paid for
- [x] 🔒 Sweep suspends any driver whose licence or cover has lapsed
- [x] Re-attesting lifts a DATE suspension only; an ops suspension is not self-clearable
- [x] Eligibility reports every failing reason at once, not just the first
- [x] 🔒 `driver` role cannot be self-granted (verified in Phase 2)
- [x] 🔒 **No acceptance rate, decline counter, or score exists** — a test reads the profile's field names and fails on `accept`/`decline`/`score`/`rating`

**Dispatch**
- [x] Driver on-shift presence as `live_sessions` actors
- [x] 🔒 Drivers excluded from customer-facing map queries **at the repository layer**; `includeDrivers` exists only for dispatch — tested both ways
- [x] A non-driver cannot broadcast as one
- [x] `delivery_requests` on the Wave-Down shape, server-authoritative timestamps, prices snapshotted
- [x] Event-driven broadcast; the sweep handles only expiry and re-broadcast
- [x] 🔒 **Atomic first-to-accept; the losing-racer test was written first** and asserts the loser gets a clean "already taken"
- [x] A suspended driver cannot accept; one driver cannot hold two live deliveries
- [x] 🔒 Destination coarse (~800m) before acceptance, exact after, **gone once finished** — tested at each stage

**Money**
- [x] Vendor names the payout; driver sees it before accepting; snapshotted and immutable
- [x] Coordination fee resolved from the registry (still 0 — pricing is a gate)
- [x] Driver paid via the existing gig rail; an unsent payout is logged loudly, never silent
- [x] 🔒 **No customer charge before acceptance** — tested
- [x] A driver who could not complete is still paid

**Failure paths**
- [x] Expiry, re-broadcast with a widening radius, driver cancel, vendor cancel, undeliverable
- [x] 🔒 **Nobody-accepts**: gives up after 4 rounds, tells the vendor, and has charged nobody
- [x] Cancelling refunds whatever was taken at acceptance

**Tracking**
- [x] `/delivery` namespace with offer/claimed/position/status emitters
- [x] 🔒 Position accepted **only** between acceptance and completion — tested before and after
- [x] Server-side rate ceiling; a second ping inside the window is dropped
- [x] Decimated persistence (1 in 5)

**Safety and proof**
- [x] Proof of delivery by six-digit code; 🔒 **never shown to the driver**; wrong code refused
- [x] Incident reporting by any party; a stranger is refused
- [x] Share token for the customer only
- [x] Emergency contact captured at application

**Copy rules**
- [x] 🔒 CR-3: no "covered", "insured", "policy", "premium" in driver-facing copy
- [x] 🔒 CR-4: no "employee", "employer", "wage", "salary", "hire"
- [x] 🔒 CR-5: no "guaranteed"
- [x] 747/747 backend tests pass across 55 files; typecheck, lint and all CI gates clean

**Frontend** (`src/features/delivery/` + `/drive`, 14 tests · complete 2026-08-07)
- [x] `DriverOnboarding` — vehicle, licence/insurance dates, emergency contact
- [x] Eligibility blockers rendered as plain sentences; test fails if a raw enum reaches the screen
- [x] `DriverOffers` — payout and a drop-off **area** only (A-15)
- [x] 🔒 **No decline control anywhere**; "Not this one" hides the card and sends nothing
- [x] 🔒 No acceptance rate, completion rate, streak, score or rating on any screen
- [x] `ActiveDelivery` — exact address after acceptance, silent best-effort position reporting, "can't deliver" as a first-class button
- [x] `DeliveryTracking` — hand-off code shown to the customer only; "nobody accepted" leads with *you haven't been charged*
- [x] `RequestDriverButton` in the vendor queue — the vendor names the payout, and is told drivers see it first
- [x] `GET /deliveries/mine` added so a driver whose phone died can get back to their job
- [x] 🔒 CR-3 asserted on rendered copy: never "you are covered"; asks about *their* policy
- [x] 🔒 CR-4/CR-5 asserted on rendered copy (affirmative framing only — "not an employee" is required, not forbidden)
- [x] 277/277 frontend tests across 48 files; lint and typecheck clean; bundle budget 246.4 KB / 260 KB

**Not done — none of it is code:**
- [ ] 🔒 **Insurance quoted and bound.** Nothing ships without it
- [ ] 🔒 Background-check vendor contracted, with its adverse-action process
- [ ] 🔒 Counsel review of the driver terms of engagement
- [ ] 🔒 A delivery completed end-to-end in staging with real GPS
- [ ] 🔒 Courier-ping load test within the map route's remaining budget
- [ ] Price `delivery_coordination`
- [ ] Add `city_slug` to Business for per-business gating

## Phase 6 · Performance — ✅ complete 2026-08-04

- [x] 🔒 **Map-route bundle budget restored.** It was FAILING at 260.4 KB / 260 KB when measured — this roadmap's own Phase 3/4 work tripped it
- [x] `ContributeSheet` and `ContributeToCampaignSheet` lazy-loaded (tap-to-open forms)
- [x] `PayItForwardCard` and `BoostCampaignCard` lazy-loaded from the profile sheet
- [x] 🔒 `BusinessProfileSheet` lazy-loaded from `MapHome` — the map's largest dependency, and none of it is on the first screen
- [x] Map route **260.4 KB → 238.2 KB**; no longer the heaviest route; 9.2 KB lighter than the original baseline
- [x] Worst-case headroom improved 12.6 KB → 20.3 KB
- [x] Courier ping ceiling + decimated persistence (shipped in Phase 5e, tested)
- [x] Impact aggregates cached (`shared/cachedAggregate.ts`), still derived from immutable rows
- [x] Cache invalidated on every contribution and redemption — a user never waits out a TTL to see their own money
- [x] Test: the cached answer always equals the freshly computed one
- [x] `PERFORMANCE_BASELINE.md` re-baselined with measured numbers
- [x] **Audit correction:** every document that described the map budget as a *query* constraint now says *bundle*
- [x] 257/257 frontend tests pass; typecheck and lint clean in both repos

**Not measured — carried forward:**
- [ ] 🔒 Courier-ping load test against a real `/delivery` namespace (harness exists; needs a deployed environment)
- [ ] No budget exists for backend query latency anywhere — bundle size is gated in CI, query cost is not measured at all

## Phase 7 · UX — ✅ code complete 2026-08-08

- [x] 🔒 Redemption moment designed and built (Phase 3)
- [ ] 🔒 **Usability-tested with someone who would actually use it** — protocol now exists ([`USABILITY_TEST_PROTOCOL.md`](USABILITY_TEST_PROTOCOL.md)); the session itself is a human gate
- [x] Map badge legibility — N/A, PIF-13/14 badges are Tier 5 and unbuilt
- [x] 🔒 **Notification preferences are now actually enforced** — they were stored, read back, and honoured nowhere
- [x] Muting suppresses the live interruption only; the inbox row is always written
- [x] Hourly ceiling per mutable category, so a noisy inbox never becomes "disable everything"
- [x] 🔒 Unmutable categories bypass both mute and ceiling — tested at 20 in a row
- [x] Anonymous by default, enforced at serialisation; recipients never nameable
- [x] Vendor fallback when no driver accepts (backend): `no_driver_accepted`, vendor told, nobody charged
- [x] a11y coverage for every new surface — `src/test/a11y-community.test.tsx`, 6 audits
- [x] Checkout checkbox resolves by accessible name; progress bar exposes `aria-valuenow`; the refund choice is a real radio group

## Phase 8 · Production readiness — ◐ tooling done, the rest needs people

- [ ] 🔒 Counsel sign-off on driver, contribution, and community-fund agreements
- [ ] 🔒 Pen test against the custodial-funds surface
- [x] Runbooks — `RUNBOOKS.md`: fund/ledger drift, disputed redemption, campaign stop, stuck delivery, no drivers accepting
- [x] Admin tooling — `admin/community.ops.ts`: fund reconcile, delivery resolve, campaign cancel, redemption inspect
- [x] 🔒 **No ops action can move money to a person** — reconcile sets the cache to the ledger and cannot invent a number; tested
- [x] Every ops action is audited and requires a reason — tested
- [x] Ops tooling refused for a plain customer — tested
- [x] Delivery resolve still pays the driver on `delivered`
- [x] Campaign cancel routes through the vendor's own refund path
- [x] Redemption inspect cannot list who else was helped
- [ ] Fraud monitoring calibration — the controls exist and are tested; **calibration needs real data**
- [x] All CI gates green with no baseline additions across Phases 1–7
- [ ] 🔒 Staged rollout: one city, vendor-recruited drivers, capped pool sizes (mechanism exists)
- [x] **747/747 backend tests · 277/277 frontend tests**; typecheck, lint and bundle budgets clean in both repos

---

## The eight questions to answer before writing any code

1. ~~Is a dispatched driver an engagement or something else — and who insures the trip?~~ → **[ADR-004](ADR-004-driver-classification-and-liability.md).** Engagement. Nobody's cover extends to the driver but the driver's own
2. ~~Whose money is a Pay It Forward balance, and what happens if nobody ever redeems it?~~ → **[ADR-005](ADR-005-custodial-community-funds.md).** Custodial liability; expires at 12 months to city pools
3. ~~Are campaign contributions captured up front, or only authorised until the goal is met?~~ → **[ADR-006](ADR-006-crowdfunding-capture-model.md).** Captured, with a deadline and automatic refund
4. What happens when **no driver accepts** — the most likely delivery outcome on day one? *(Phase 5d)*
5. Does the map route have the headroom for generosity badges and driver presence? *(Phase 6.1)*
6. Will the print/mail vendor actually report delivery, or only mailing? *(Phase 4.1)*
7. How does someone accept a free meal in a queue without being seen to? *(Phase 7.1 — the hardest screen in this specification)*
8. Which of the eight specified fraud controls are needed on day one, and which are theatre? *(ADR-005 §5 answers the floor: two, not eight. Calibrate the rest against real data)*

Questions 1–3 are closed. Answers 4–7 must be written down before the phase that depends on them
begins — they are product decisions, not discoveries to be made mid-build.
