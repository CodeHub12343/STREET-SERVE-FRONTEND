# Technical Debt

Debt these three features would **inherit** from the existing codebase, and debt they would **create**
if built as specified.

Debt here means: works today, will cost more later. Outright defects are in
[FEATURES_REQUIRING_FIXES.md](FEATURES_REQUIRING_FIXES.md); structural changes are in
[ARCHITECTURAL_IMPROVEMENTS.md](ARCHITECTURAL_IMPROVEMENTS.md).

---

## Part 1 — Inherited debt (exists now, this specification makes it more expensive)

### D-1 · Four near-identical request/accept/expire flows, no shared primitive — **Medium**

Wave-downs, queue holds, job applications, and Spot Me requests each independently implement: a status
enum, a server-authoritative timestamp pair, an expiry sweep registered in
[`scheduler.ts`](../../../STREET-SERVE-APPLICATION-BACKEND/src/jobs/scheduler.ts), and an accept path that must
be race-safe. Delivery requests would be the fifth, and Boost campaigns a sixth variation.

**Cost of leaving it:** the atomic-claim race and the expiry-idempotency bug both have to be got right
independently in each copy, and a fix in one does not propagate. **Interest rate rises with this
specification** — going from four to six copies is where this stops being tolerable.

**Recommendation:** extract after delivery ships (A-11), not before. Two well-understood examples beat
one guessed abstraction.

### D-2 · Sweep-based architecture is reaching its cadence limits — **Medium**

The scheduler runs ~25 repeating sweeps. This is a good design for money (settlement, reconciliation,
expiry) where a minute of latency is irrelevant. It is a poor fit for dispatch, where a minute is the
whole user experience.

**Cost of leaving it:** teams reach for the pattern they see. Someone will implement DAN-2 as a sweep
because every other fan-out is one, and the feature will feel broken for reasons nobody attributes to
architecture.

**Recommendation:** document the rule explicitly — *sweeps for money and cleanup, events for
interaction* — in [BACKGROUND_JOBS.md](../../../STREET-SERVE-APPLICATION-BACKEND/BACKGROUND_JOBS.md).
The corridor-alert comment already articulates it; it just isn't stated as policy.

### D-3 · `SWEEP_LOAD_MODEL.md` does not model realtime write load — **Medium**

The load model covers sweep batch sizes and saturation. It has no model for sustained socket write
throughput, which is what DAN-6 introduces. Combined with the Phase 5 finding that the map route runs
at 95% of its client BUNDLE budget — a different constraint entirely — this is a real blind spot: nothing measures realtime write load at all.

**Cost of leaving it:** the first busy Saturday with 40 concurrent deliveries is the load test.

**Recommendation:** extend the load model before DAN-6, not after. Include a courier-ping scenario in
[`scripts/loadtest-socket.mjs`](../../../STREET-SERVE-APPLICATION-BACKEND/scripts/loadtest-socket.mjs), which already exists.

### D-4 · Unreviewed placeholder agreements — **High, and rising**

[`agreements.registry.ts`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/agreements/agreements.registry.ts)
contains entries marked `reviewed: false` / `PLACEHOLDER — pending legal review`. The mechanism is
sound; the backlog is the debt.

**Cost of leaving it:** tolerable for RTO text that gates a niche flow. **Not tolerable** for the two
agreements this specification adds that govern money held on behalf of third parties, or for driver
terms that allocate liability in a physical-risk activity.

**Recommendation:** the new money and driver agreements must not ship as placeholders, regardless of
what happens to the existing backlog.

### D-5 · Growth module is a bag of unrelated mechanics — **Low**

`growth` contains ping budgets, gifts, giveaways, Spot Me, and block-party detection: five products
sharing a folder because each was individually too small to justify one.
[`growth.model.ts`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/growth/growth.model.ts) defines eight
collections across five domains.

**Cost of leaving it:** Pay It Forward would land here by gravity and make the file worse. PIF is a
substantial feature with custodial accounting — it deserves its own module.

**Recommendation:** new module `payforward`. Leave `growth` alone; splitting it is not urgent, and
adding to it is what makes it worse.

### D-6 · Demo-mode divergence — **Medium**

The frontend carries demo-mode client state machines (`lib/demo.ts`, `lib/demo.rto.ts`), and
[`useWave.ts`](../../src/features/wave/hooks/useWave.ts) shows real and demo paths interleaved in one
hook — including a hardcoded `etaSeconds: 180, discountPercent: 15`.

**Cost of leaving it:** each new realtime feature doubles: a real implementation and a simulated one.
A live-tracking demo simulation is meaningfully more work than a status-flip simulation, and a demo
that diverges from reality is worse than no demo.

**Recommendation:** decide per feature whether demo mode is in scope *before* building, and keep the
simulation behind one boundary rather than interleaved with production logic.

### D-7 · CI gate baselines as batch updates — **Low**

Three gates run against recorded baselines. The failure mode is a large batched baseline update that
is indistinguishable from disabling the gate. Six new modules' worth of routes, enums, and roles makes
that batch tempting.

**Recommendation:** update baselines in the PR that trips them, and treat a baseline-only PR as a
review flag.

---

## Part 2 — Debt this specification would create if built literally

### D-8 · "Expiration: Never" on community funds — ✅ **RESOLVED** (ADR-005 §6)

The spec offers 30 days / 60 days / **Never** for Pay It Forward balances. "Never" creates a permanent,
unbounded liability on real customer money, and several US states treat long-dormant prepaid balances
as unclaimed property with escheatment obligations.

**Resolution:** "Never" is removed. 12 months from each contribution, expired FIFO, with notice to the
vendor at 30 days remaining. Expired funds redistribute to other pools in the same city — never to the
vendor, who would otherwise profit from suppressing redemption, and never to the platform. The
escheatment position still needs counsel sign-off, which is a launch gate rather than a design gap.

### D-9 · Twelve counters presented as facts — **Medium**

The spec's dashboards specify Meals Given, Money Shared, People Helped, Today's Gifts, This Month, All
Time, plus a platform-wide live counter and a public impact page. Implemented as incremented counters,
these will drift — refunds, reversals, fraud clawbacks, and test data all break them — and a public
"$4,873,993 shared" that is wrong is a credibility problem, not a rounding problem.

**Recommendation:** derive every impact metric from immutable receipt rows; cache aggregates in Redis
with a TTL. Never increment a displayed total.

### D-10 · Eight fraud controls specified as a list — **Medium**

PIF-10 lists phone verification, email verification, GPS verification, device fingerprinting, manual
approval, AI fraud detection, permanent receipts, and a per-day cap. Building all eight at once
produces controls nobody has calibrated and a false-positive rate nobody has measured — which for a
generosity feature means denying a genuinely needy person a free meal.

**Recommendation:** ship the unique index (`{business_id, user_id, day_key}`) plus verification-tier
gating first — those two carry most of the value. Add signals only in response to observed abuse. "AI
fraud detection" in particular should not be built before there is data to train or tune it on; the
existing `fraud-signals` sweep is the right place for it later.

### D-11 · Priority groups as verified identity — ✅ **RESOLVED** (ADR-005)

PIF-20's veterans / first responders / teachers / unhoused categories, if verified, require the platform
to collect and retain evidence of membership of sensitive categories, and to adjudicate claims.

**Resolution:** self-attestation only. No document verification is built for this. The discrimination,
privacy, and retention exposure is out of proportion to the feature's value, and getting it wrong harms
the exact users it means to help.

### D-12 · A "Delivered" status the platform cannot observe — **Low**

MB-9 promises Preparing → Printing → Mailed → **Delivered**. Many print-and-mail vendors report *mailed*
only.

**Recommendation:** confirm vendor capability before designing the status UI; ship the statuses the
vendor actually reports.

---

## Debt register

| ID | Debt | Sev | Trigger | Action |
|---|---|---|---|---|
| D-1 | No shared dispatch primitive | Med | 5th and 6th copies | Extract after delivery ships |
| D-2 | Sweep cadence unfit for dispatch | Med | DAN-2 | Write the policy down |
| D-3 | No realtime load model | Med | DAN-6 | Extend load model + socket loadtest first |
| D-4 | Unreviewed agreements | High | PIF, MB, DAN | New money/driver terms must not be placeholders — ADR-004/005/006 all name this as a launch gate |
| D-5 | `growth` is a grab bag | Low | PIF | New `payforward` module |
| D-6 | Demo-mode divergence | Med | DAN-6 | Decide scope before building |
| D-7 | Batched CI baselines | Low | all | Per-PR updates |
| D-8 | ✅ "Never" expiry | — | PIF-24 | **Resolved:** removed; 12 months → city pools (ADR-005 §6) |
| D-9 | Drifting impact counters | Med | PIF-11/12/21 | Derive from receipts |
| D-10 | Eight uncalibrated fraud controls | Med | PIF-10 | Ship two, add on evidence |
| D-11 | ✅ Verified priority groups | — | PIF-20 | **Resolved:** self-attestation only (ADR-005) |
| D-12 | Unobservable "Delivered" | Low | MB-9 | Confirm vendor first |
