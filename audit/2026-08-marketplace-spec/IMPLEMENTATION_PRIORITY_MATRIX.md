# Implementation Priority Matrix

All outstanding work ranked by **impact ÷ effort**, with dependencies noted. Use this to sequence; use [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) to schedule.

**Impact:** Critical (blocks launch or loses money now) · High · Medium · Low
**Effort:** S ≤2 d · M 3–8 d · L 2–4 wk · XL >1 mo

---

## Quadrant 1 — Do first: high impact, low effort

The best-value work in the entire backlog. Every item is S or small-M, and several unlock revenue that is already built and paid for.

| ID | Item | Impact | Effort | Deps | Why now |
|---|---|---|---|---|---|
| F-1 | Fix `processingRetainedCents` | Critical | S | — | Blocks enabling processing fees; the disclosure is currently wrong, not merely incomplete |
| F-6a | Fix 7 stale backend tests | High | S | — | Restores the regression gate that every other item depends on |
| F-6b | Triage the `phase5` ping-tip failure | High | S | — | Only unexplained failure; may be an anti-abuse rule declining legitimate payouts |
| S-1/S-2 | Test the messaging + module gates | High | S | F-6a | Two real access controls with zero coverage |
| F-2 | Let the product owner end a consignment | High | S | — | Owners currently cannot recall their own goods on a no-limit term |
| F-5 | Charge the vendor travel fee | High | S | — | Vendors are silently unpaid for travel they configured |
| M-15 | Booking platform fee | High | S | — | Pure new revenue; fee registry makes it a config entry + one call site |
| M-8 | Wave Down convenience fee | High | S | — | Same; §32 already specifies it |
| A-1 | Reachability gate in CI | High | S | — | Prevents this audit's most common finding from recurring |
| S-57.2 | RTO rows in the fee calculator | Medium | S | — | Server math exists; pure wiring |
| P-13 | Review photos | Medium | S | — | Presigned upload path already exists |
| F-7 | Assert all six subscription plans | Low | S | — | Two revenue-bearing plans currently uncovered |
| D-10 | Node on PATH | Low | S | — | Unblocks `npm run verify` locally |

**Quadrant 1 total: roughly two to three weeks.** It clears four of five defects, restores the test gate, adds two new revenue lines, and installs the control that prevents the largest class of finding here.

---

## Quadrant 2 — Do next: high impact, high effort

| ID | Item | Impact | Effort | Deps | Note |
|---|---|---|---|---|---|
| M-1 | Attorney-reviewed agreements | **Critical** | S internal / external calendar | A-6 | **Start immediately** — the calendar time is the constraint, not the work. Do A-6 first so counsel answers the structuring question once |
| A-6 | Structure §44/§54 obligations as fields | High | M | — | Hard ordering constraint: before M-1 |
| M-2 | RTO disclosure + acceptance UI | **Critical** | L | M-1 | Unlocks the entire RTO revenue line |
| M-11/M-12 | Ad dashboard + placement renderers | High | M | — | Six working endpoints, zero UI. **No dependencies — can run fully parallel to the RTO track** |
| M-3 | RTO voluntary return (§51) | High | M | M-2 | Customer-protection half of RTO; should not launch without it |
| M-4 | RTO seller remedies (§50) | High | M | M-2 | Resolves three of five dead enum values |
| M-9 | RTO category gating (§43) | High | M | — | Compliance control; vehicles are explicitly excluded by spec |
| M-6 | Consignment termination notice (§37) | Medium | M | F-2 | Pairs with F-2 |
| M-7 | Flat promotion tiers (§32) | Medium | M | M-11 | The accessible on-ramp CPM cannot be |
| A-4 | Full gate coverage | High | M | F-6a | Beyond the two specific gates |
| A-9 | Outbound email/SMS | High | M | — | Contractual notices must not depend solely on push |

---

## Quadrant 3 — Schedule deliberately: medium impact, low-to-medium effort

| ID | Item | Impact | Effort | Deps |
|---|---|---|---|---|
| M-5 | RTO return condition report (§52) | Medium | S | M-3 |
| M-10 | Admin UI for RTO approvals | Medium | S | M-2 |
| M-13 | Consignment auto-renewal (§39) | Medium | M | — |
| M-14 | Commission change at term end (§36) | Low | S | — |
| M-16 | Wish lists | Medium | S | — |
| M-24 | Mileage tracker | Medium | M | — |
| P-11 | Live-session ETA | Medium | S | — |
| P-19 | Verify/render the paid badge | Medium | S | — |
| P-10 | Custom consignment end date (§35.2) | Low | S | — |
| A-3 | Redis fee cache | Medium | S–M | — |
| A-10 | Type-safe demo boundary | Low | S | — |
| M-45 | Tax/delivery/refund split legs (§56.1) | Medium | M | A-5 |
| A-5 | Shared money primitives | Medium | M | — |

**M-24 (mileage) deserves a specific note:** live GPS position history already exists, which is the hard and expensive part. Deriving mileage and adding a confirmation UI is the best effort-to-value ratio among the missing business tools.

---

## Quadrant 4 — Defer: lower impact or very high effort

| ID | Item | Impact | Effort | Note |
|---|---|---|---|---|
| M-17 | Loyalty rewards | Medium | M | Stamps, not points |
| M-20 | Referral rewards | Medium | M | Copy the gift-code flow |
| P-14 | Scheduled pickup for goods | Medium | M | Reuse `scheduling` availability |
| P-15 | Flash sales | Medium | M | **Do A-7 first** — unify discount models |
| A-8 | Decide the storefront model | High | S decide / L build | Blocks MS-1/5/6, HR-9, M-40 |
| M-18/M-19 | Customer subscriptions + rewards | Medium | L | Deps P-14, M-17 |
| M-21..M-26 | Employee, shifts, expenses, invoices, CRM | Medium | L each | **Decide staff-vs-gig first** — `jobs` may already cover the need |
| M-27 | SMS/email *marketing* | Medium | L | A-9 delivers the channel first |
| M-28 | POS | Medium | XL | |
| M-29/M-30 | Insurance + financing *referrals* | Medium | M | Prefer over the marketplaces |
| M-32..M-43 | Remaining P3 items | Low | M–L | See MISSING_FEATURES.md |

---

## Explicit recommendations against

| Item | Recommendation |
|---|---|
| **RV-19 · Video ads before profiles** | **Decline.** An interstitial before a profile is the most reliable way to make discovery feel hostile, in a product whose core value is fast local discovery. If pursued anyway, cap at one per session and never before a Wave Down |
| **CM-49 · Insurance marketplace** | **Do not build in-house.** Requires licensed broker status. The codebase already carries a deliberate prohibition on insurance vocabulary ([constants.ts:618](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L618)) — any partnership copy must not erode it. Build M-29 (referrals) instead |
| **CM-50 · Loan marketplace** | **Legal review before any product work.** The `debt` and `spot_me` modules are already lending-adjacent enough to warrant review on their own merits. Build M-30 (referrals) instead |
| **HR-11 · Processing revenue share** | **Raise as a decision, not a task.** Marking up a fee disclosed to customers as a processor pass-through sits uneasily with §31's transparency framing, which is otherwise honoured throughout |

---

## Sequencing constraints

Four hard orderings — violating any of these means redoing work:

1. **A-6 before M-1.** Decide which §44/§54 obligations are structured fields versus agreement prose *before* engaging counsel. Asking once is far cheaper than restructuring after review.
2. **M-1 before M-2 ships.** The acceptance screen must render real agreement text.
3. **A-5 before M-45.** Extract shared money primitives before §56.1 adds four more split legs.
4. **A-7 before P-15.** Unify the discount model before adding a third variant.

And two soft ones:

5. **F-6a before A-4.** Green the suite before extending it.
6. **A-8 before MS-1/5/6, HR-9, M-40.** One storefront decision, or five divergent ones.

---

## Parallelization

Three tracks can run concurrently after Quadrant 1:

- **Track A — RTO** (M-1 legal → A-6 → M-2 → M-3/M-4/M-5/M-9/M-10). Longest path; start the legal engagement on day one since it is calendar-bound.
- **Track B — Placements** (M-11 → M-12 → M-7 → P-18). Fully independent of Track A. Fastest revenue.
- **Track C — Consignment + platform** (F-2 → M-6, M-13, M-14, A-3, A-9).
