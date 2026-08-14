# StreetServe — Implementation Priority

> Prioritized roadmap toward a **production-ready MVP**, sequenced to minimize rework and dependency conflicts. Aligns with the spec's own "win the local launch first, monetize later" strategy. R-numbers per `PROJECT_AUDIT_REPORT.md §2`.

---

## Sequencing principles
1. **Verify before building** — the discovery/real-time core is largely done; confirm it, don't rebuild it.
2. **Cheap flagship rules first** — the discount-optional decision (R1) is the spec's headline and is low-effort.
3. **Extend engines, don't duplicate** — fees, consignment lifecycle, and RTO all build on the existing `payments`/`consignment` layering.
4. **Foundational debt before dependent features** — fee-type registry (Debt #1) and generalized agreements (Debt #7) precede the fees/RTO that need them.
5. **Compliance gates RTO launch** regardless of engineering readiness.

---

## Priority tiers

### P0 — Critical blockers (finish before any MVP launch)
| ID | Item | Depends on | Cx | Doc |
|---|---|---|---|---|
| V0 | `[NV]` runtime verification pass (realtime, Live-gate, seller calc, Trending, FeeSchedule, categories) | — | S | IMPLEMENTATION_STATUS §backlog |
| R1 | Encode discounts as optional; don't gate Live/list | V0 | S | Partial §R1 |
| DEBT1 | Fee-type registry (before new fee types) | — | M | Tech Debt #1 |
| R9 | Server-authoritative full checkout itemization (subtotal/tax/delivery/service/processing/tip/total) | DEBT1 | M | Partial §R9 |
| R7 | Confirm 10% marketplace fee applies to all sale types | DEBT1 | S | Partial §R7 |
| B1 | Fix FE fee preview to read server fee (retire `*0.1`) | R9 | S | Bug B1 |
| B7/U11 | Gate/finish placeholder routes (`seller/earnings`) | — | S | Bug B7 |

### P1 — Core MVP functionality
| ID | Item | Depends on | Cx |
|---|---|---|---|
| R1b | "Trending" surface rewarding discounts | R1 | M |
| R2 | Verify + simplify Vendor Sign-Up to 3 steps | V0 | S |
| R3 | Category taxonomy covers all mobile-business types | V0 | S |
| R8/R10 | Processing-fee line + optional 3% customer service fee (flagged off) | R9, DEBT1 | M |
| R12 | Seller earnings screen + pre-publish fee calculator | R9 | M |
| R13 | Refund/fee-return policy encoded + UX | R9 | M |
| DEBT7 | Generalize agreement model (before R28) | — | S |
| R28 | 4 digital agreements + attorney review (regular/consignment/RTO/consignment-RTO) | DEBT7, legal | M |
| R14 | Consignment durations + default-30d + no-limit | — | M |
| R15 | Consignment expiry notifications (14/7/3/on-date) + actions | R14, BullMQ | L |
| R17 | Return-Pending status + return/storage/abandonment terms | R14 | M |
| R18 | Owner minimum-price + seller price-change permissions | — | M |

### P1/P2 — Rent-to-Own (audit recommends **post-local-launch**; P1 within the RTO phase)
| ID | Item | Depends on | Cx |
|---|---|---|---|
| R27 | RTO eligibility/approval gate (approved sellers/categories, no vehicles) | RBAC | M |
| R20 | RTO agreement model + disclosure | DEBT1, R28 | L |
| R21 | Installment schedule engine + progress dashboard | R20, BullMQ | L |
| R22 | Grace + reminders + missed-payment state machine | R21 | L |
| R23 | Early purchase/payoff (locked formula) | R20 | M |
| R24 | Condition documentation (delivery+return) | storage | M |
| R25 | Ownership transfer on completion | R20–R23 | M |
| R26 | Per-installment fee + setup/late fees | DEBT1, R20 | M |

### P2 — Advanced commerce
| ID | Item | Depends on | Cx |
|---|---|---|---|
| R16 | Consignment auto-renewal | R14/R15 | M |
| R19 | Consignment-RTO 3-party split + statements | RTO core | XL |
| R11 | Promoted-product pricing + placement | DEBT1, ranking | L |

### P2/P3 — Monetization & growth (highest revenue leverage; post-MVP)
Pro membership (uses `FeeSchedule.membership_overrides` hook), featured/sponsored placement productization, verified-badge subscription, AI marketing assistant, storefronts, gift cards, loyalty, subscriptions, flash sales, ads dashboard, POS, fleet GPS, financing/insurance marketplaces, business tools (CRM/expense/mileage/tax/invoice), community (events/meetups/mentorship/voting/roadside). See `MISSING_FEATURES.md §5`.

### Ongoing / cross-cutting
- Reconcile the three doc generations; make `audit/` authoritative (Debt #2).
- Retire demo/preview math as server contracts land (Debt #3).
- Security: bind every new commerce/RTO route to rate-limit tier + RBAC + idempotency (Security S1–S4).
- Performance: cache fee schedule (P1); design RTO/consignment scheduling on BullMQ delayed jobs (P5).

---

## Dependency-ordered critical path (MVP)
```
V0 verify ─▶ R1 optional discount ─▶ R1b Trending
             DEBT1 fee registry ─▶ R9 itemization ─▶ B1 fix preview ─▶ R8/R10 fee lines ─▶ R12 calculator ─▶ R13 refunds
             DEBT7 agreements ─▶ R28 four agreements
             R14 terms ─▶ R15 notices / R17 return / R18 price controls
                              └────────────▶ (RTO phase) R27 gate ─▶ R20 ─▶ R21 ─▶ R22/R23/R24/R25/R26
```

**MVP definition (this roadmap):** P0 + P1 complete, RTO deferred to its own gated phase, monetization deferred. That matches the audit objective (production-ready MVP) and the spec's local-launch-first strategy.
