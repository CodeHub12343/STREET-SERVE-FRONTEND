# Technical Debt Register

Debt is recorded with an **interest rate** — what it costs to leave in place — because that, not the payoff cost, is what should drive sequencing.

**Interest:** High = compounds weekly (blocks work, creates new bugs) · Medium = compounds per feature touching the area · Low = fixed cost, payable any time.

> ### Update — 2026-08-02 (roadmap Phase 4)
>
> D-2 (red suite), D-3's structuring half, D-4 (unreachable enums, for RTO), D-6 (duplicated money
> math), D-9 (demo fixtures cast), and D-12 (doc sprawl) are paid off. D-1 is closed for the three
> named backends and **reopened, larger, as D-13** below — the gate that was supposed to prevent it
> found 27 more instances.
>
> Still open: D-3 (attorney text — the launch blocker), D-7 (fields
> collected and never used), D-10 (Node on PATH), D-11 (subset assertion), and
> the two new items below. **D-5 (in-process fee cache) was paid off in Phase 5; D-8 (no email/SMS)
> in Phase 7.**

---

## D-15 · The fraud queue has no resolution path — MEDIUM interest

**Debt:** `FraudFlag.status` declares `reviewed` and `dismissed`; nothing writes either. A flag can be
raised and can never be closed. `FraudFlag.type.lost` is likewise declared and never raised.

**Why it is worse than a stale enum:** the admin console **renders a dismiss control**. An operator
clicks it, nothing happens server-side, and the queue grows monotonically — so the one surface meant
to keep fraud review honest becomes the surface people learn to ignore.

**How it was found:** by widening the A-2 gate in Phase 7 to scan *any file declaring a Mongoose
schema* rather than only `*.model.ts`. `fraud.ts` lives in `src/shared/`, so the filename filter had
never looked at it. Several modules declare schemas beside their service
(`waiver.service.ts`, `weatherCache.ts`, `notices.service.ts`, `corridors.service.ts`), which is why
"does it declare a schema" is the right test and a filename never was.

**Payoff:** S — a resolve endpoint plus the two transitions. The console already has the buttons.

---

## D-13 · 27 endpoints defined with no caller — HIGH interest

**Debt:** the A-1 gate, run for the first time, found 27 entries in `lib/api/endpoints.ts` that no
component calls. D-1 named three such backends; the real number is an order of magnitude higher.
They are enumerated with reasons in `scripts/check-reachability.mjs`.

**Interest:** identical to D-1 and for the same reason — built capability earning nothing, drifting
from the UI that will eventually consume it. Several are revenue-adjacent (`checkout.commission` is
§36; `coursePurchase` is a paid product).

**Payoff:** varies per entry, S to M each. The gate now prevents the list from growing, which is the
part that matters; burning it down is ordinary feature work.

---

## D-14 · 39 routes with no test — HIGH interest

**Debt:** `test/routeCoverage.test.ts` finds 39 of ~250 mounted routes untouched by any test.

**Interest:** an untested route is unverified **authorization** on an authenticated surface, not just
unverified behaviour. The list includes `/sales/:id/refunds`, `/:id/cancel-payment`,
`/bank-account`, and `/:id/moderate-photos` — money movement, KYC, and a moderation action.

**Payoff:** M. The baseline is a number in the test file that may shrink and never grow, so this is
burnable incrementally without a coordinated push.

---

## D-1 · Three shipped backends with no frontend — HIGH interest

**Debt:** rent-to-own (§42–53), paid placements (RV-11/17/18), consignment-RTO (§54–56) — complete, tested server-side; zero user-facing entry points.

**Interest:** every sprint this persists, the backend drifts further from the UI that will eventually be written against it, and the engineers who hold the context move on. It also compounds financially: `rto_installment` (10% per payment), placement CPM, and the §32 promotion tiers are all built revenue earning nothing.

**Payoff:** L — one frontend epic for RTO, one dashboard + three renderers for placements, one creation path for consignment-RTO.

**Root cause:** no reachability gate. See [ARCHITECTURAL_IMPROVEMENTS.md](ARCHITECTURAL_IMPROVEMENTS.md) A-1 — fix the cause alongside the instances.

---

## D-2 · Red backend test suite — HIGH interest

**Debt:** 8 of 351 backend tests fail (F-6). Seven are stale assertions trailing intentional changes; one is unexplained.

**Interest:** the highest-compounding item here, because it disables the mechanism that would catch everything else. A suite that is normally red trains the team to skim the summary line. The next genuine regression arrives inside an expected failure count.

Two coverage holes it is actively masking:
- **`requireModule` is untested.** The gate test asserts 422 before enabling a module, but `booking` is now on by default for that archetype, so it gets 200. Real authorization enforcement has no live test.
- **The messaging transaction gate has no positive test.** The gate was added to close an "any stranger can message any business" hole. The only tests touching it assert the *old* permissive behaviour and now fail.

**Payoff:** S–M. Fix seven assertions, triage the eighth (`phase5` ping tip `isPaid` — no corresponding intentional change was found; do not dismiss as stale without checking).

---

## D-3 · Placeholder legal text in production code paths — HIGH interest

**Debt:** all four agreement bodies are placeholders ([agreements.registry.ts:26](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/agreements/agreements.registry.ts#L26)), self-labelled *"pending legal review, spec §60."*

**Interest:** compounds through **acceptance records**. Every clickwrap acceptance stores the version and content hash of what was agreed. Acceptances accumulating against placeholder text create a population of users who agreed to nothing enforceable, and re-consent is far more expensive than consent.

**Payoff:** S to integrate (bump `version`, replace `body` — prior acceptances keep their exact hash, which the framework handles correctly). The cost is external and calendar-bound.

**Sequencing:** do A-6 (structure §44/§54 obligations as fields) *before* the engagement. The structured-vs-prose boundary is the question counsel is best placed to answer, and asking it once beats restructuring after review.

---

## D-4 · Enum values with no writers — MEDIUM interest

**Debt:** five of nine `RtoAgreement.status` values are unreachable (F-3). `LISTING_TYPES` has the same shape — four declared, only `consignment` honoured by settlement, with a flagging migration ([consignment.model.ts:78](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.model.ts#L78)) marking rows the settlement code cannot handle.

The listing-type case is handled well — the gating is deliberate, documented, and defended at both `addProduct` and `checkout`. The RTO case is not: nothing prevents or explains the gap.

**Interest:** per-feature. Every consumer of these enums grows dead branches, and every reader of the schema over-estimates what exists.

**Payoff:** M (implement the transitions) or S (narrow the enums). Implement — §50/§51 require them.

---

## D-5 · In-process fee cache — MEDIUM interest

**Debt:** 30-second in-memory TTL ([fees.ts:33](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/fees.ts#L33)); already flagged in-source as the P1 follow-up.

**Interest:** proportional to instance count. Single-instance today, harmless. It becomes a live pricing-inconsistency window the moment the service scales horizontally — and horizontal scaling is precisely when nobody wants to be debugging fee drift.

**Payoff:** S–M. Redis is already a dependency; `invalidateFeeCache()` is the hook.

---

## D-6 · Money arithmetic duplicated across four modules — MEDIUM interest

**Debt:** basis-point math and split allocation re-implemented in `orders/pricing.ts`, `payments/fees.ts`, `rto/rto.pricing.ts`, and the consignment settlement path. All integer-cents, all individually correct; no inconsistency found.

**Interest:** rises sharply with §56.1, which adds four more split legs (tax, delivery, refund, remaining balance). Penny-allocation — guaranteeing legs sum exactly to the total — is currently solved per site.

**Payoff:** M. **Do it before §56.1**, not after.

---

## D-7 · Fields collected and never used — MEDIUM interest

**Debt:** `travel_fee_cents` is an editable business setting that no money path reads (F-5). `condition_return` is a schema field with no writer (F-4).

**Interest:** worse than a missing field, because it presents as working. A vendor sets a travel fee, sees it persist, and is never paid it. Nothing in the UI signals otherwise.

**Payoff:** S each.

---

## D-8 · No outbound email/SMS channel — MEDIUM interest

**Debt:** `integrations/` has auth, Gemini, KYC, storage, Stripe, weather — no messaging provider. Reach is in-app + web push only.

**Interest:** this is a *compliance* debt before it is a marketing gap. §38 consignment expiry notices, §49's five RTO reminder stages, and §53 completion notifications are contractual notices under §60 agreements. A user who denies push receives none of them, and denial rates on iOS are high.

**Payoff:** M.

---

## D-9 · Demo-mode fixtures cast rather than typed — LOW interest

**Debt:** `lib/demo.ts` shapes *"match the livemap/business feature types; the hooks cast to them."* Two passing component tests run in demo mode.

**Interest:** low but real — a contract change breaks nothing at build time and demo-mode tests keep passing across it.

**Payoff:** S. Type the fixtures as the feature types instead of casting.

---

## D-10 · Node not on PATH in this environment — LOW interest

**Debt:** every npm script fails with `'"node"' is not recognized` unless `C:\Program Files\nodejs` is prepended. `npm run verify` does not run out of the box on this machine. Multiple Node versions are installed under `nvm` (10, 16, 18, 20) with `node -v` resolving to 20.15.1 only once PATH is fixed.

**Interest:** low and constant, but it taxes every CI-equivalent local run and will confuse any new contributor.

**Payoff:** S. Environment fix, not a code change. **Note:** this is the reason two audit test runs initially reported failure with no output.

---

## D-11 · Test asserting a subset of a growing set — LOW interest

**Debt:** `subscriptions-render.test.tsx` asserts "the four subscription plans" against six defined (F-7). It passes, so it looks like coverage.

**Interest:** low, but note that the two unasserted plans (`seller_plus`, `stock_waiver`) are the two `user`-scoped ones — the ones most likely to be dropped by a scope-filter bug, which is exactly what this test would fail to catch.

**Payoff:** S. Derive the expectation from the plan definitions.

---

## D-12 · Documentation sprawl — LOW interest

**Debt:** 40 markdown files at the frontend root, 22 at the backend root, 14 in `docs/`, 16 in `audit/` — plus this audit's 11. Several are superseded (three separate roadmaps; two overlapping checklists; an earlier audit using five of the same filenames as this one, which is why this audit was written to a subdirectory).

**Interest:** low, but it degrades the value of every document here. A reader who cannot tell which roadmap is current trusts none of them.

**Payoff:** S. An index at each root marking each document current / superseded / historical.

---

## Summary

| ID | Debt | Interest | Payoff | Sequencing note |
|---|---|---|---|---|
| D-1 | Three backends with no frontend | High | L | Fix A-1 alongside |
| D-2 | Red backend suite | High | S–M | Blocks confidence in everything else |
| D-3 | Placeholder legal text | High | S + external | Do A-6 first |
| D-4 | Unreachable enum values | Medium | M | Implement, don't narrow |
| D-5 | In-process fee cache | Medium | S–M | Before horizontal scaling |
| D-6 | Duplicated money math | Medium | M | **Before §56.1** |
| D-7 | Fields collected, never used | Medium | S | |
| D-8 | No email/SMS channel | Medium | M | Compliance before marketing |
| D-9 | Demo fixtures cast, not typed | Low | S | |
| D-10 | Node not on PATH | Low | S | Environment, not code |
| D-11 | Subset assertion in plans test | Low | S | |
| D-12 | Documentation sprawl | Low | S | |
