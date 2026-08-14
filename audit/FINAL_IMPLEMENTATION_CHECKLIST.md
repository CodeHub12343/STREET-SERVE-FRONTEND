# StreetServe — Final Implementation Checklist

> Single consolidated checklist for reaching production-ready MVP (and beyond) against the new update spec. Tick as delivered. R-numbers per `PROJECT_AUDIT_REPORT.md §2`; see phase plans for detail.

---

## Phase 0 — Verification (`[NV]` pass) — **do first**
- [ ] Socket.IO realtime exercised: map presence, wave push, queue reflow
- [ ] Live-status gate traced (does it require a discount? → sets R1 scope)
- [ ] Trending surface existence confirmed
- [ ] `FeeSchedule` seeded values vs `DEFAULT_CONSIGNMENT_FEE_BPS` confirmed
- [ ] Category seed coverage for all mobile-business types confirmed
- [ ] Placeholder-route audit (beyond `seller/earnings`)
- [ ] Matrix `[NV]` flags cleared / reclassified

## Phase 1 — Critical blockers + commerce foundation
- [ ] R1 — discounts optional; go-Live/list works with **no** discount
- [ ] U1/U2 — Vendor Sign-Up ≤3 steps; discount framed as optional Trending boost
- [ ] DEBT1 — fee-type registry (marketplace/consignment/rto/service/setup/late/promotion)
- [ ] R7 — 10% marketplace fee applies to all sale types
- [ ] R9 — server-authoritative full checkout itemization (subtotal/tax/delivery/service/processing/tip/total)
- [ ] B1 — FE fee preview reads server values (`*0.1` removed)
- [ ] B7/U11 — no placeholder routes navigable in prod (`seller/earnings` built or gated)
- [ ] S1 — new/changed money routes on `money`/`write` rate-limit + RBAC + idempotency
- [ ] P1 — fee-schedule lookup cached in Redis

## Phase 2 — Core MVP functionality
- [ ] R1b/U3 — Trending surface rewards discounting
- [ ] R3 — category taxonomy spans all mobile-business types
- [ ] R8 — processing-fee pass-through line
- [ ] R10 — optional 3% customer service fee (min $0.50/max $10), flagged off at launch
- [ ] R12/U5 — seller earnings screen + pre-publish fee calculator
- [ ] R13/U6 — refund/fee-return policy encoded (full/partial/completed) + UX
- [ ] DEBT7 — generalized `AgreementAcceptance{type,version,hash}`; bailment migrated
- [ ] R28 — 4 agreements (regular/consignment/RTO/consignment-RTO), attorney-reviewed, tamper-evident (S5)
- [ ] R14 — consignment durations (7…365/custom/no-limit), default 30d
- [ ] R15 — expiry notices 14/7/3/on-date + actions (Extend/Return/Reduce/Continue/End) via BullMQ (P6)
- [ ] R17 — Return-Pending status + return/storage/abandonment terms
- [ ] R18 — owner minimum price + seller price-change permissions
- [ ] S7 — all fees server-set; client fee amounts rejected
- [ ] P7 — calculator/earnings on aggregated settlements

## Phase 3 — Rent-to-Own + consignment-RTO + monetization
**Compliance (blocking)**
- [ ] A0 — attorney review of RTO/installment/late/repossession/disclosure per state
- [ ] RTO jurisdiction-gated via `City.feature_flags`; vehicles/regulated excluded
**RTO core**
- [ ] R27 — eligibility/approval gate (approved sellers/categories)
- [ ] R20/U8 — RTO agreement + full-cost disclosure screen
- [ ] R21/U9 — immutable installment ledger + schedules + progress dashboard (BullMQ delayed jobs, P5)
- [ ] R22/U10 — grace + reminders + missed-payment state machine (audit-logged, S9)
- [ ] R23 — early purchase/payoff with locked formula
- [ ] R24 — condition documentation (delivery+return) via `storage` (S6)
- [ ] R25 — ownership transfer (receipt + proof-of-ownership; recovery rights removed)
- [ ] R26 — per-installment 10% fee + optional setup/late fees
- [ ] B4 — split math reconciles to gross (no lost/created cents)
**Consignment-RTO**
- [ ] R19 — 3-party split + per-party statements
**Monetization (initial)**
- [ ] Pro membership (uses `membership_overrides`)
- [ ] Featured/sponsored placement productized
- [ ] Verified-badge subscription
- [ ] AI marketing assistant subscription

## Cross-cutting (ongoing)
- [ ] DEBT2 — `audit/` set made authoritative; pointers from `docs/00-README.md` + READMEs
- [ ] DEBT3 — demo/preview math retired as server contracts land (track in `API_CONTRACT_RECONCILIATION.md`)
- [ ] DEBT5 — terminology disambiguation (Lineup vs BullMQ queue; `'rental'` vs RTO)
- [ ] Security S2–S4/S8 — RBAC on RTO, webhook signature/replay, IDOR on financial reads, location privacy
- [ ] Performance P2–P4/P8 — paginate reconciliation, notification throttles enforced, map bundle splitting
- [ ] A11y — new commerce/RTO screens held to existing AA bar (U13)
- [ ] Bug verify items closed: B3, B5, B6, B8, B9, B10

---

## MVP gate (ship criterion)
**Production-ready MVP = Phase 0 + Phase 1 + Phase 2 complete.** RTO (Phase 3A/B) and monetization (3C) are **post-launch**, gated by compliance and revenue sequencing — consistent with the audit objective and the spec's local-launch-first strategy.

## Doc index (this audit set)
`PROJECT_AUDIT_REPORT` · `IMPLEMENTATION_STATUS` · `FEATURE_COMPLETION_MATRIX` · `MISSING_FEATURES` · `PARTIALLY_IMPLEMENTED_FEATURES` · `BUG_FIX_LIST` · `TECHNICAL_DEBT` · `SECURITY_AUDIT` · `PERFORMANCE_RECOMMENDATIONS` · `UX_IMPROVEMENTS` · `BACKEND_FRONTEND_GAP_ANALYSIS` · `IMPLEMENTATION_PRIORITY` · `PHASE_1/2/3_IMPLEMENTATION_PLAN` · `FINAL_IMPLEMENTATION_CHECKLIST`
