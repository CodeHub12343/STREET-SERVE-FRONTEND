# Production Readiness Report

Assessed against the six axes the audit brief specifies: scalability, maintainability, security,
performance, usability, architecture.

**Verdict for the specified features: not production ready — none of them exists.**

The useful question, and the one this report answers, is whether the platform *around* them is ready
to carry them, and what must change before it is.

**Overall platform readiness to host this specification: 6/10.** Money and fraud infrastructure are
strong. Realtime, compliance posture, and operational tooling for a physical-delivery product are not.

| Axis | Score | One-line assessment |
|---|---|---|
| Scalability | 6/10 | Sound patterns; the courier position stream is an unmodelled new load class |
| Maintainability | 7/10 | Consistent module conventions, strong comments; growing duplication of dispatch flows |
| Security | 6/10 | Excellent fraud toolkit; new custodial-money and physical-safety surfaces are unaddressed |
| Performance | 5/10 | Map route at 95% of its **client bundle** budget (measured); no measured budget exists for the map *query* |
| Usability | 6/10 | Strong design system and a11y baseline; the specified UX has real unresolved problems |
| Architecture | 8/10 | Clear boundaries, good ADR habit, reusable primitives for most of this work |

---

## 1. Scalability — 6/10

**Strengths.** Horizontal-ready: Socket.IO with the Redis adapter, a separate worker process, BullMQ
with `jobId` deduplication, a Redis hot mirror for live sessions with TTL expiry, and geospatial
indexes on every location query. The sweep architecture has an explicit saturation-reporting mechanism
(`reportSweepBatch`), which is more operational maturity than most codebases this age have.

**The gap that matters.** Every existing realtime path is **event-shaped and low-frequency** — a pin
moves when a vendor moves, a queue updates when someone joins. DAN-6 introduces the platform's first
**sustained** stream: a position ping every few seconds per active delivery, fanned to at least the
customer, and likely the vendor too. Twenty concurrent deliveries is a different write profile from
anything currently running, and [`SWEEP_LOAD_MODEL.md`](../../../STREET-SERVE-APPLICATION-BACKEND/SWEEP_LOAD_MODEL.md)
does not model it.

Secondary: `location_pings` is a high-write collection with a 30-day TTL. Driver traces would multiply
its volume. **Recommendation: do not persist courier positions at full fidelity.** Stream through
Redis, persist a decimated trace (or only start/end) for dispute evidence. The 30-day retention that
suits vendor history is over-retention for a courier's precise movements.

**Before DAN-6 ships:** add a courier-ping scenario to
[`loadtest-socket.mjs`](../../../STREET-SERVE-APPLICATION-BACKEND/scripts/loadtest-socket.mjs) and set an
explicit ping-rate ceiling with server-side sampling.

## 2. Maintainability — 7/10

**Strengths.** Consistent module layout (`model / schema / service / routes / controller / repository`)
across 38 modules; genuinely explanatory comments that record *why* rather than *what* — several audit
findings here were possible only because a previous engineer wrote down their reasoning; a real ADR
habit; migrations, seeds, and shadow-run scripts.

**Risks this specification adds.** Six modules' worth of new surface; a fifth and sixth copy of the
request/accept/expire pattern (D-1); and the temptation to put Pay It Forward into the already-crowded
`growth` module (D-5).

**Recommendation:** new top-level modules `delivery`, `payforward`, `boost`. Resist folding any of
them into `growth` or `ads` for expediency.

## 3. Security — 6/10

**Strengths — genuinely above average.** The ping economy's anti-abuse work is the best part of this
codebase for these features' purposes: unique partial indexes enforcing one-tip-per-recipient-ever,
device fingerprints, daily caps, qualifying-action gating, a `fraud-signals` sweep, an admin fraud
console, and verification tiers as a capability gate. Money discipline is equally good — prepaid before
serve, credit only on webhook, append-only ledger, reconciliation sweeps.

**New surfaces this specification opens, none currently addressed:**

| Surface | Risk | Mitigation |
|---|---|---|
| **Custodial third-party funds** (PIF, MB) | Money held for no identified beneficiary; misbooking is silent and compounds | A-1 account type + reconciliation coverage + dormancy policy |
| **Customer home addresses** (DAN) | Broadcast to many drivers, most of whom won't take the job | A-15: coarse before acceptance, exact after, revoked on completion |
| **Courier location history** (DAN) | Precise movement traces of workers | Decimate and short-retain; do not reuse the 30-day vendor policy |
| **Physical third-party risk** (DAN) | Injury or loss on a platform-arranged trip | Insurance + ADR-004; this is not a code control |
| **Self-granted driver role** (X-3) | Unvetted drivers | Exclude from self-grant — and first fix the inverted comment, [F-7](FEATURES_REQUIRING_FIXES.md) |
| **Generosity fraud** (PIF-10) | Colluding vendor/customer draining a pool; wash-giving for badges | Unique day-key index + tier gating; award badges on redemption, not contribution |
| **Double-charged donations** (PIF-3, MB-3) | Known idempotency body-hash defect sits on this path | Fix [F-4](FEATURES_REQUIRING_FIXES.md) before the first money-in endpoint |

**Also unresolved:** the platform has not been pen-tested (carried from the Phase 6 findings). Adding a
custodial-funds surface raises the value of doing so.

## 4. Performance — 5/10

The lowest score, and the reason is specific rather than general. The Phase 5 baseline recorded the
**map route running at 95% of its CLIENT BUNDLE budget** — 247.4 KB of 260 KB, with 12.6 KB spare.

**A correction to this audit's own earlier framing:** that number is bundle size, not query latency.
There is no measured budget for the map *query*, so claims about features "adding load to that exact
path" conflated two different things. What the 12.6 KB actually constrains is anything imported into
the map route's component tree:

- **PIF-13/14** add a discovery facet and pin badges to map queries.
- **DAN-2/6** add driver presence and position streaming to the same live infrastructure.

There is no headroom to spend, so this is not a "optimise later" situation. **Recommendation:** before
either lands, either reclaim map-route headroom or move the new facets off the hot path — e.g. serve
Pay It Forward availability as a separately cached overlay rather than a join in the pin query. The
existing Redis fee cache is the precedent for the pattern.

Positives: the fee cache exists, sweeps report saturation, and there are load-test scripts for both HTTP
and sockets to extend.

## 5. Usability — 6/10

**Strengths.** A real design system, a component library, a documented a11y baseline with `vitest-axe`
and Playwright coverage, and a brand palette deepened to AA. New surfaces inherit a good starting point.

**Unresolved UX problems in the specification itself** — these are product design gaps, not
implementation gaps, and they should be resolved before build:

1. **The redemption moment is the hardest screen in this specification.** "Would you like to use the Pay It Forward balance?" is asked at checkout, potentially in a queue, in front of other people. Accepting help publicly is the barrier the whole feature must clear. It needs deliberate, quiet design — and it is the difference between a feature people use and a feature people admire but avoid.
2. **Three map badge colours** (🟢 free coffee / 🟡 free meal / 🔵 balance available) on top of existing category pins and paid-placement disclosure risks an illegible map. Check against the [MAP_REDESIGN_SPECIFICATION](../../MAP_REDESIGN_SPECIFICATION.md) work rather than adding colours ad hoc.
3. **Notification volume.** "Someone just left you a free coffee", "Five meals are available nearby", plus delivery offers to drivers and status updates to customers. Every new category must be individually mutable, or the inbox becomes noise and users disable the lot.
4. **Public recognition defaults.** PIF-8's "This meal was provided by James" must be opt-in. Naming a giver by default is a privacy incident; naming a *recipient* would be far worse and should be impossible by construction.
5. **Nobody accepts the delivery.** The spec has no design for its most common failure. The vendor needs a clear, fast fallback, and the customer must not be charged.

## 6. Architecture — 8/10

The strongest axis. Clear module boundaries, a fee registry designed so pricing is configuration rather
than code, an append-only ledger with reconciliation, an archetype/module system that keeps
"support every business type" tractable, and an ADR habit that has already prevented one serious
modelling mistake (ADR-002).

Most of this specification maps onto existing patterns: Wave-Down for dispatch, ping top-ups for
contributions, giveaway claims for redemption caps, placements for campaign lifecycle, jobs for payouts.

**The two genuinely new things** are custodial community money and live courier tracking. Both are
identified above with recommended designs.

---

## Go / no-go gates

**Before any code:**
- [x] ✅ [ADR-004](ADR-004-driver-classification-and-liability.md) driver classification — engagements; three dispatch mechanics prohibited; no platform cover for drivers
- [x] ✅ [ADR-005](ADR-005-custodial-community-funds.md) custodial community funds — never revenue, never withdrawable, 12-month expiry
- [x] ✅ [ADR-006](ADR-006-crowdfunding-capture-model.md) crowdfunding capture — capture into custody with a deadline and automatic refund (**reverses A-10**)
- [x] ✅ [Copy-rule register](COPY_RULE_REGISTER.md) — 7 rules with enforcement schedule
- [ ] 🔒 **Insurance quoted and bound** (ADR-004 states the requirement; it does not procure the cover)
- [ ] 🔒 **Counsel review** of the custodial structure and driver terms — one conversation covers ADR-005 and ADR-006

**Before Pay It Forward ships:**
- [ ] `community_fund_payable` account type live, reconciliation covering it, shadow-run clean
- [ ] Idempotency defect (F-4) fixed and tested on the contribution route
- [ ] Pool balance provably cannot rise without a succeeded contribution (F-3)
- [ ] Redemption caps enforced server-side in the same transaction as the deduction
- [ ] Copy rule: no "tax-deductible" claim, test-enforced
- [ ] Expiry policy defined and not "never" (D-8)

**Before Delivery ships:**
- [ ] Insurance in force
- [ ] `driver` role not self-grantable; F-7 comment corrected
- [ ] Courier ping load-tested; rate ceiling enforced server-side
- [ ] Address privacy by lifecycle stage (A-15)
- [ ] Driver safety surface: share-trip, emergency contact, incident report (A-14)
- [ ] No-driver-accepted path designed, and no customer charge before acceptance
- [ ] Copy rule: no "employee/wage" (ADR-002), no "insurance" claim

**Before Boost My Marketing ships:**
- [ ] Print/mail vendor contracted; real rates in config
- [ ] Unmet-goal behaviour implemented and disclosed at contribution time
- [ ] Only vendor-observable statuses shown (D-12)
