# StreetServe — Technical Debt

> Maintainability/scalability debt observed against the new spec's trajectory. `[Observed]` = grounded in source; `[Verify]` = suspected. Not bugs (see `BUG_FIX_LIST.md`) — these are structural.

---

## 1. Fee model is single-purpose and will not absorb the spec's fee taxonomy — **highest debt**
**[Observed]** `FeeSchedule` has one meaningful column (`consignment_fee_bps`) and `payments.service` applies it to every charge. The spec needs distinct, independently-configurable fees: marketplace (10%), consignment (10%), RTO-per-installment (10%), customer service (3%, min/max), setup ($5–25), late, and promotion pricing ($5/$15/$40).
**Debt:** adding these ad hoc will scatter fee logic across modules and conflate revenue analytics under "consignment_fee."
**Pay down:** introduce a **fee-type registry** (typed fee kinds with rate/min/max/flat and a resolution order) extending the existing versioned-`FeeSchedule` pattern. Do this **before** R10/R11/R26.

## 2. Three parallel documentation generations, none reflecting the new spec
**[Observed]** `docs/` (FR-numbered PRD), root planning docs (`*_IMPLEMENTATION_*.md`, landing-page set), and a tracked `API_CONTRACT_RECONCILIATION.md`. The new update spec is a *third* source and isn't reflected in any of them.
**Debt:** contributors can't tell which doc is authoritative; the audit itself had to go to source.
**Pay down:** make this `audit/` set the reconciliation layer; add a one-line pointer from `docs/00-README.md` and the root README to it.

## 3. Frontend demo/preview math shadows server contracts
**[Observed]** `orders/breakdown.ts` (`*0.1`) + `lib/demo.ts` demo mode. Screens can look complete while running on client-side stand-in math.
**Debt:** "looks done" ≠ "server-backed"; hides Needs-BE work (see gap analysis §4).
**Pay down:** enumerate demo-backed surfaces; convert to server contracts and delete the preview math as endpoints land; track via `API_CONTRACT_RECONCILIATION.md`.

## 4. Routes exist for unbuilt screens
**[Observed]** `seller/earnings` renders a "depends on GAP-6" placeholder. **[Verify]** whether other GAP-tagged screens are similarly navigable.
**Debt:** navigable dead-ends erode trust and mask true completion %.
**Pay down:** gate placeholder routes behind a feature flag, or finish them; audit for other placeholders.

## 5. Terminology collisions
**[Observed]** "queue" = both the Lineup domain (`modules/queue`) and BullMQ job queues (`jobs/queues.ts`); "rental" is a consignment `listing_type` but is **not** Rent-to-Own.
**Debt:** false "already implemented" reads (as nearly happened for RTO in this audit).
**Pay down:** when the `rto` module lands, keep it clearly named/separated from `listing_type:'rental'`; consider renaming the Lineup domain concept in docs to disambiguate from BullMQ.

## 6. RTO must be built to the existing financial-correctness bar
**[Observed]** payments/settlement use immutable ledgers, idempotency keys, reconciliation. RTO introduces installment ledgers, ownership-credit accrual, and buyout math.
**Debt (preventable):** building RTO with mutable state or ad-hoc splits would regress the codebase's strongest quality.
**Pay down:** design RTO ledgers as append-only/immutable with idempotent installment charges from day one; reuse `payments.service` primitives.

## 7. Agreement acceptance is hardcoded to one type/version
**[Observed]** `SellerAgreementAcceptanceModel` keys on `(seller_id, version)` for a single bailment agreement.
**Debt:** four agreement types (R28) bolted on separately = duplication.
**Pay down:** generalize to `AgreementAcceptance{ agreement_type, version }` now; migrate the existing bailment rows.

## 8. Magic-number sprawl is well-controlled — keep it that way
**[Observed positive]** `config/constants.ts` centralizes business defaults with FR references. New spec constants (grace periods, notice cadences 14/7/3, RTO schedules, promo prices) should land **here / in DB config**, not inline.

---

## Debt register (prioritized)
| # | Debt | Impact | Effort | When |
|---|---|---|---|---|
| 1 | Fee-type registry | High | M | Before R10/R11/R26 |
| 7 | Generalize agreements | Med | S | Before R28 |
| 6 | RTO immutable-ledger design | High (preventive) | — | At RTO design |
| 3 | Retire demo math for real contracts | Med | M | As endpoints land |
| 2 | Doc reconciliation | Med | S | Now |
| 4 | Gate placeholder routes | Low | S | Now |
| 5 | Terminology disambiguation | Low | S | At RTO build |
| 8 | Keep constants centralized | Low | — | Ongoing |
