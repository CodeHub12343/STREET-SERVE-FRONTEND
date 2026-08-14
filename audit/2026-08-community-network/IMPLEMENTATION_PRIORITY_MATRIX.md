# Implementation Priority Matrix

Ranking of all work identified by this audit. Priority is derived, not asserted: **value × confidence ÷
(effort × risk)**, with hard blockers promoted regardless of score.

**Effort:** S ≤2 d · M 3–8 d · L 2–4 wk · XL >1 mo (one engineer)
**Risk:** likelihood × consequence of getting it wrong — includes legal, financial, and safety, not just technical

---

## Tier 0 — Blockers (nothing downstream is safe until these land)

> **Ranks 1–3 are ✅ complete as of 2026-08-04** — [ADR-004](ADR-004-driver-classification-and-liability.md), [ADR-005](ADR-005-custodial-community-funds.md), [ADR-006](ADR-006-crowdfunding-capture-model.md), plus the [copy-rule register](COPY_RULE_REGISTER.md). What remains of them are the people-gates listed beneath the table.

| Rank | Item | ID | Effort | Risk | Why it is first |
|---|---|---|---|---|---|
| 1 | ✅ ADR-004 · driver classification, liability, insurance | DAN-16 | M (no code) | **Critical** | Physical third-party risk the platform has never carried. **Decided:** engagements; assignment / acceptance-rate pressure / exclusivity prohibited; no platform cover for drivers |
| 2 | ✅ ADR-005 · custodial community funds | PIF-23/24 | M (no code) | **Critical** | **Decided:** custodial liability on the `tax_payable` model; never withdrawable; 12-month expiry to city pools |
| 3 | ✅ ADR-006 · crowdfunding capture model | MB-10/13 | S (no code) | High | **Decided, reversing A-10:** capture into custody, ≤60-day deadline, automatic full refund. Authorise-don't-capture fails its own failure mode |
| 4 | Fix idempotency body-hash defect | F-4 | S | High | Sits directly on every new money-in path. A double-charged donation is a trust failure |
| 5 | Correct `SELF_GRANTABLE_ROLES` comment | F-7 | XS | High | One line. Prevents "any user can self-grant `driver`" |

**The people-gates that survive those three ADRs, and are now the real Tier 0:**

| Rank | Item | Effort | Risk | Why |
|---|---|---|---|---|
| 1a | Insurance quoted **and bound** | external | **Critical** | ADR-004 states the requirement; it does not procure the cover. No delivery ships without it — start now, it is the long pole |
| 2a | Counsel review: custodial structure + 12-month escheatment | external | **Critical** | Covers ADR-005 **and** ADR-006 in one conversation. Gates both PIF and MB launch |
| 3a | Counsel review: driver terms of engagement | external | High | Must not ship as a `reviewed: false` placeholder |
| 3b | Background-check vendor + adverse-action process | M | High | Gates DAN-3 |

*Items 4–5 below are code and can start immediately.*

## Tier 1 — Shared foundations

| Rank | Item | ID | Effort | Risk | Unblocks |
|---|---|---|---|---|---|
| 6 | `community_fund_payable` account + entry types | A-1 / X-2 | M | High | All of PIF |
| 7 | Explicit per-type normal balance | A-2 / F-2 | S | Med | Ledger correctness, permanently |
| 8 | `delivery` fulfilment mode + destination on orders | A-3 / DAN-10 | M | Med | All of DAN. Independently shippable |
| 9 | `driver` role, not self-grantable | X-3 | S | High | DAN-3 |
| 10 | New fee types (`delivery_coordination`, campaign) | X-1 | S | Low | DAN-8, MB |
| 11 | New notification categories | X-6 | S | Low | PIF-15, DAN, MB-5 |

## Tier 2 — Pay It Forward core (highest value per unit of risk)

| Rank | Item | ID | Effort | Risk | Notes |
|---|---|---|---|---|---|
| 12 | Module scaffold + business enable toggle | PIF-1 | S | Low | New `payforward` module, not inside `growth` |
| 13 | Money pool + contribution (intent → webhook → credit) | PIF-2/3 | M | High | Copy `PingBudgetTopup` exactly |
| 14 | Business settings and caps | PIF-9 | M | Med | Enforced server-side, same transaction as deduction |
| 15 | Redemption at checkout | PIF-4 | M | High | Apply **after** discounts |
| 16 | Fraud floor: day-key unique index + tier gating | PIF-10a | S | High | Two controls, not eight |
| 17 | Anonymity + optional recognition | PIF-7/8 | S | Med | Default anonymous; enforce at serialisation |
| 18 | Notifications | PIF-15 | S | Low | Mutable category |
| 19 | Business impact dashboard | PIF-11 | M | Low | Derive from receipts, never counters |
| 20 | Expiry sweep + dormancy policy | PIF-24 | S | Med | ADR-005 §6: 12 months, redistribute to city pools. Unblocked |

## Tier 3 — Boost My Marketing (small, self-contained, real revenue)

| Rank | Item | ID | Effort | Risk | Notes |
|---|---|---|---|---|---|
| 21 | Contract a print/mail vendor | MB-8 | M | Med | External dependency; start early, it gates MB-4's numbers |
| 22 | `boost_campaigns` + goal/raised/remaining | MB-1/2 | M | Med | Sibling of `placements`, not a variant |
| 23 | Contributions (capture into custody, deadline, auto-refund) | MB-3/10/12 | M | Med | Reuses PIF's custodial rail — **no new account type**, and the risk drops once ADR-006 defines the unmet path |
| 24 | Postcard estimate from configured rates | MB-4 | S | Low | Label as estimate |
| 25 | Goal-reached notifications + date confirmation | MB-5/6 | S | Low | |
| 26 | Mailing execution + status tracking | MB-7/9 | M | Med | Saturation mail; only vendor-observable statuses |
| 27 | Contributor recognition | MB-11 | S | Low | Shares PIF-7's anonymity model |

## Tier 4 — Delivery Assist Network (largest, riskiest, last)

| Rank | Item | ID | Effort | Risk | Notes |
|---|---|---|---|---|---|
| 28 | Driver profiles, vetting, Connect onboarding | DAN-3 | L | High | ADR-004 ✅; still gated on **insurance bound** + background-check vendor |
| 29 | Driver on-shift presence via `live_sessions` | DAN-2a / A-5 | M | Med | Exclude from customer map by default |
| 30 | Delivery request + lifecycle (Wave-Down shaped) | DAN-1/7 / A-4 | L | Med | |
| 31 | Event-driven broadcast + atomic first-to-accept | DAN-2/4 / A-6 | M | Med | Write the losing-racer test first |
| 32 | Address privacy by lifecycle stage | A-15 | S | High | Coarse before acceptance, exact after |
| 33 | Failure paths incl. nobody-accepts | DAN-13 | M | High | No charge before acceptance |
| 34 | Fee at completion + payout via gig rail | DAN-8/9/11 | M | Med | Flat fee, snapshotted quote |
| 35 | Driver safety surface | A-14 | M | High | Absent from the spec; required for launch |
| 36 | `/delivery` namespace + live tracking | DAN-6 / A-7 | L | High | Load-model first (D-3) |
| 37 | Driver offer/earnings surfaces | DAN-5/15 | M | Low | Reuse the earn hub |
| 38 | Proof of delivery | DAN-12 | S | Low | Code before photo |
| 39 | Archetype gating for other verticals | DAN-14 / A-8 | S | Low | Unlocks the spec's expansion list cheaply |

## Tier 5 — Breadth (after each core ships and is observed)

PIF-5 product pools · PIF-6 partial payment · PIF-13/14 discovery + map icons (**check the map perf
budget first**) · PIF-16 contribution records (**never "tax-deductible"**) · PIF-17 badges (award on
redemption, not contribution) · PIF-22 discounted rates (resolve discount stacking) · PIF-12/21 global
counter + public impact page · PIF-18 sharing.

## Tier 6 — Recommended, not specified

A-11 shared dispatch primitive (after delivery ships) · A-12 generic contribution primitive · A-13
receipt-derived metrics · A-16 pre-committed copy rules · D-3 realtime load model.

## Tier 7 — Recommend declining or deferring

| Item | Why |
|---|---|
| **PIF-20 verified priority groups** | ✅ **Decided** by ADR-005: **self-attestation only**. The platform does not adjudicate membership of protected or sensitive classes — the exposure is out of proportion to the value, and getting it wrong harms the users it means to help |
| **PIF-24 "Never" expiry option** | ✅ **Removed** by ADR-005 §6. 12 months, with notice at 30 days remaining |
| **PIF-19 corporate sponsorship** | Multi-business pooled custody multiplies the hardest problem in the spec. Defer until single-business pools have run for a quarter |
| **MB-9 "Delivered" status** | Only if the vendor genuinely reports it |
| **PIF-10 "AI fraud detection"** | Nothing to train or tune on yet. Revisit once redemption data exists |

---

## Value / effort quadrants

**High value, low effort — do first:** F-7 comment fix · X-1 fee types · X-6 notification categories · PIF-1 toggle · PIF-16 fraud floor · MB-4 estimate · DAN-14 archetype gating.

**High value, high effort — plan properly:** PIF-2/3/4 pool + redemption · MB-1/2/3 campaigns · DAN-1/7 request lifecycle · DAN-6 tracking.

**Low value, low effort — fill:** PIF-18 sharing · PIF-12 counter · DAN-12 proof of delivery.

**Low value, high effort — decline or defer:** PIF-20 priority groups · PIF-19 corporate sponsorship · PIF-5 product pools before money pools have shipped.
