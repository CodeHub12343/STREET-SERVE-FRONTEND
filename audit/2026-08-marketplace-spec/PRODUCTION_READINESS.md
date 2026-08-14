# Production readiness — Phase 8 result

**Completed 2026-08-04.** The verified state of the platform, and an explicit list of what is *not*
verified and why.

> ## The headline
>
> **One item blocks launch: M-1.** All four §60 agreement bodies are placeholder text pending
> attorney review. Everything technical that can be checked without a human, an attorney, or a
> production environment has been checked and passes.
>
> **Six items need a person, not a commit.** They are listed at the end with what each requires.
> None of them is hidden behind a tick.

---

## What Phase 8 verified

| # | Task | Result |
|---|---|---|
| 8.1 | Full pass of the implementation checklist | ✅ Done — and it found **six stale entries**, see below |
| 8.2 | Runbook rehearsal | ⚠️ **Automatable half done** (`test/runbookRehearsal.test.ts`); the drill itself needs a person |
| 8.3 | Alerting verified against a seeded failure | ✅ Done — and the alert *decision* was extracted so it can be run, not just read |
| 8.4 | Every §60 agreement renders its reviewed version and hash | ⚠️ **Blocked on M-1.** Machinery verified; fail-closed verified; the test announces when it unblocks |
| 8.5 | Every customer-paid fee displayed before payment | ✅ Done — with all three fee flags forced ON, which nothing else exercises |
| 8.6 | Accessibility audit | ⚠️ **Automated half done**, now covering the money paths; manual screen-reader passes still needed |
| 8.7 | Load test at projected launch volume | ⚠️ **Plan + harness done** (`LOAD_TEST_PLAN.md`); the run needs a production-like environment |
| 8.8 | Support runbooks | ✅ Done — `SUPPORT_RUNBOOKS.md` |

---

## 8.1 — what the checklist pass actually found

A checklist is only worth the last time someone read it against the code. Six entries were wrong:

**Five were done and unticked** — 7.8 route alerts, 7.9 wish lists, 7.10 loyalty, 7.11 referrals,
7.12 scheduled pickup. All built in Phase 7; the checklist was updated for the *roadmap* items and
not the corresponding feature rows.

**One was ticked in spirit and false in fact:** 8.4 *"Both access gates covered by tests — A-4"*.
The `requireModule` gate was genuinely covered. The **messaging transaction gate was not** — the
audit had said so explicitly (*"has no test asserting the 403 it introduced"*), and every existing
messaging test gave the customer standing first, so all of them would still pass if the gate were
deleted. Four tests now assert it: the stranger's 403, the transition once standing exists, that the
owner is never gated, and that an existing thread survives the job ending.

**And one requirement was simply missing:** §53 step 9 — *completion requests customer feedback*.
RTO completion now carries a feedback prompt with the transaction id it can be attached to (a review
needs a completed transaction; without the id the client must not offer the prompt rather than
offering one that fails).

---

## 8.3 — the gap under "alerting is verified"

The integrity jobs detected failures correctly. What could not be *run* was the step after: whether
a detected failure reaches a human. That decision lived inline in a BullMQ worker which needs a live
Redis to instantiate — so "does a ledger drift page anyone?" was answerable by reading and not by
testing.

It is now `src/jobs/integrityAlerts.ts`, with the rules as pure functions the worker calls. Seeded
failures — a corrupted cached balance, a transaction whose entries do not net to zero — are detected
and confirmed to page.

Two behaviours worth stating because they are deliberate and look like bugs:

- **A repaired drift still pages.** `ledger-reconciliation` runs with `repair: true`, so the cached
  balance is rewritten from the entries. It would be easy to call that handled. It is not: something
  wrote wrongly, and a silent self-heal removes the symptom while leaving the cause. The alert says
  *"the CAUSE is still unfixed"* so the responder does not close the ticket on the repair.
- **The page names the worst discrepancy.** "12 accounts drifted" and "12 accounts drifted, one by
  $40,000" are very different pages to receive at 3am.

---

## 8.5 — why this needed its own test

Every customer-facing fee is **off at launch** (`CUSTOMER_SERVICE_FEE_ENABLED`,
`PROCESSING_FEE_ENABLED`, `WAVE_CONVENIENCE_FEE_ENABLED`), per §33's keep-checkout-simple posture.
So the entire existing suite exercises the zero case and the disclosure requirement was never
tested — the exact shape of the F-1 family of defects this audit already found once: *money
arithmetic that was correct only because the fees it depended on were switched off.*

`test/feeDisclosure.test.ts` turns every fee on and asserts §31's three properties: itemized (each
fee its own field, never "$5.99 of fees"), the preview equals the charge, and the lines sum to the
total. Plus the floor/cap on the customer-service fee, and that the platform fee is *reported* but
never added to what the customer pays.

---

## Still open — and what each needs

These are not tasks anyone can close by writing code.

| # | What | What it needs |
|---|---|---|
| **M-1** | Attorney-reviewed text for the four §60 agreements | **An attorney.** `LEGAL_REVIEW_BRIEF.md` is ready to send. RTO acceptance is gated closed at runtime until it returns, so the code ships without the exposure — it just cannot open to customers. |
| **1.8** | Legal review of `debt`, `spot_me`, and shelter grants | The same attorney engagement. These are lending-adjacent and were flagged as needing a view. |
| **8.2** | Runbook *drill* | A person following `RUNBOOKS.md` during a simulated incident. The automated check only proves every metric, script, and endpoint it names still exists — that a step will not dead-end. Whether the steps are the *right* ones is what a drill finds. |
| **8.6** | Manual screen-reader passes on the money paths | A person with VoiceOver/NVDA walking checkout, the RTO disclosure, and the refund preview. axe in jsdom cannot compute layout (so colour contrast is skipped) and cannot judge reading *order* — whether "total" is announced after the lines that produce it, or a disclosure is reachable before the pay button rather than after it. |
| **8.7** | The load run | A production-like environment: Mongo Atlas with the production indexes, real Redis, more than one app instance. `LOAD_TEST_PLAN.md` states the projected volume (~55 rps peak; test at 4×) and the mix. Running it on a laptop against an in-memory Mongo would produce numbers that mislead, and a green result from that setup is worse than none. |
| **9.17** | Third-party penetration test | An external tester. `test/moneyPathAttacks.test.ts` is 19 executable attacks modelling an authenticated insider — the application-layer half. It is not a pen test and is not described as one. |

### Two known defects, recorded rather than fixed

Both were found by the gates rather than reported, and both are real:

- **D-14 — 39 routes have no test.** Including `/sales/:id/refunds`, `/:id/cancel-payment`,
  `/bank-account`, `/:id/moderate-photos`: money movement, KYC, and a moderation action. The
  baseline is a number in `test/routeCoverage.test.ts` that may shrink and never grow.
- **D-15 — the fraud queue has no resolution path.** `FraudFlag.status.reviewed` and `.dismissed`
  are declared and never written, **while the admin console renders a dismiss control**. An operator
  clicks it, nothing happens, and the queue grows forever.

---

## Verified state

| | |
|---|---|
| Backend tests | **611/611** across 50 files |
| Frontend tests | **223/223** across 44 files |
| Typecheck | Clean, both repos |
| Lint | Clean, both repos |
| Reachability gate | Green — every endpoint has a caller |
| Enum gate | Green — every declared value has a writer or a recorded reason |
| Route coverage gate | Green against its baseline |
| CVE gate | Green — production dependencies, with expiring reviewed exceptions |
| Bundle budgets | Pass — but the map route is at **95% of budget** |
| Lighthouse accessibility | ✅ ≥0.95 on every audited route |
| Lighthouse performance | ⚠️ 0.45–0.51 (warning, not a gate) |
