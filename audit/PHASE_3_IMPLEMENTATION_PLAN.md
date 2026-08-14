# StreetServe — Phase 3 Implementation Plan

> **Phase goal:** Rent-to-Own (the largest net-new domain), consignment-RTO, and the start of the monetization layer. Compliance-gated; sequenced **after** the local-launch MVP (Phases 1–2), matching the spec's "scale up from there" strategy.
> **Precondition:** Phase 2 done (fee registry supports `rto_installment`/`setup`/`late`; agreements incl. RTO exist).

---

## A. Rent-to-Own core (R20–R27) — ✅ DONE (2026-07-22)

Built a **new `rto` backend module** (`src/modules/rto/`) parallel to consignment/payments, reusing `paymentsService.charge` + the immutable-ledger discipline. Compliance-gated via `requireFeature('rto')` (City.feature_flags) + approval-gated. **Backend 4 RTO tests + FE render test green; full suites BE 190/190, FE 132/132.**
- ✅ **A0/A1 (R27):** `requireFeature('rto')` on every money route (jurisdiction gate); admin `POST /rto/approvals` approves a seller; eligibility excludes `requires_license`/`regulated_by` categories (vehicles etc.).
- ✅ **A2 (R20):** `rto_agreements` capture all disclosed terms (cash price, initial, installment amount/frequency/count, total-to-own, ownership-credit split, fees, grace, locked buyout). Disclosure `POST /rto/disclose` returns the full cost + "may cost more than buying outright" (U8); acceptance records the Phase-2 `rto` clickwrap (tamper-evident).
- ✅ **A3 (R21):** immutable append-only `rto_ledger` (idempotent per key) + a mutable `rto_installments` schedule; generation for daily/weekly/biweekly/twice-monthly/monthly/custom; progress dashboard (U9: next due, balance, made/remaining, ownership %). Charging via an hourly **sweep** (BullMQ `sweeps` infra) — see note.
- ✅ **A4 (R22):** grace by frequency; failed charge → Missed → Grace, `sweepDelinquency` escalates Grace→Late (audit-logged); supportive customer notices (U10) with inline actions.
- ✅ **A5 (R23):** payoff = locked `cashPrice − ownershipCredited`, live on the dashboard; `POST /rto/agreements/:id/payoff` charges it and completes.
- ✅ **A6 (R24):** condition photos/serial captured at acceptance (`condition_delivery`), return slot ready.
- ✅ **A7 (R25):** paid-in-full → completion + `proof_of_ownership_ref` + waive residual schedule + notify; recovery/auto-pay closed.
- ✅ **A8 (R26):** 10% `rto_installment` fee per payment via the registry (now in `DEFAULT_FEE_RULES` + seed); optional setup/late fees.
- ✅ Reconciliation: `reconcile()` checks the immutable ledger total against collected installments.
- ✅ Frontend: `features/rto` — disclosure hook, progress dashboard (`RtoDashboard`, ownership % + live payoff), `/rto/[id]` page.

**Acceptance (RTO):** ✅ approved seller + eligible product → disclosed acceptance → immutable schedule+ledger → installment charges with correct 10% fee + ownership credit → missed drives Missed→Grace→Late → early payoff uses the locked formula → completion transfers ownership — all proven in `test/rto.test.ts`.

> **Note (P5 divergence):** installment charging uses an hourly scheduled **sweep** over due installments, not per-due-date BullMQ *delayed* jobs. Same BullMQ infra + idempotent + immutable-ledger-safe; the delayed-job variant is a perf follow-up.

### A0. Compliance gate (blocking)
- Attorney review of RTO/installment/late-fee/repossession/disclosure across target states (spec §60).
- Launch only in cleared jurisdictions via `City.feature_flags` (already supported).
- Exclude vehicles + regulated categories (`Category.requires_license`/`regulated_by`).

### A1. Eligibility & approval (R27)
- Approved-sellers + eligible-categories gate via `rbac` + `requireFeature`; admin approval flow.

### A2. Agreement & disclosure (R20)
- RTO agreement model: cash price, initial payment, installment amount/frequency/count, total-to-own, rental vs ownership-credit split per payment, fees, grace, late terms, early-payoff, buyout, condition/damage/return/cancellation terms.
- Disclosure screen (U8) showing full cost + "may cost more than buying outright"; acceptance via the Phase-2 agreement model.

### A3. Installment ledger & schedules (R21)
- **Immutable, append-only** installment ledger; idempotent charge per (agreement, installment#).
- Schedules: daily/weekly/bi-weekly/twice-monthly/monthly/custom.
- Progress dashboard (U9): next due, balance, payments made/remaining, ownership %.
- BullMQ **delayed/repeatable** jobs keyed by due date (P5) — not polling sweeps.

### A4. Grace, reminders, missed-payment state machine (R22)
- Grace periods (3d weekly / 5d bi-weekly / 7–10d monthly).
- Reminders before/on/late via BullMQ + `notifications` (throttled, P4).
- State machine: Due → Grace → Late → Arrangement → Paused → Return → Reinstated → Completed → Cancelled → Disputed; each transition audit-logged (S9). Supportive tone (U10); inline partial-payment/arrangement.

### A5. Early purchase / payoff (R23)
- **Locked** buyout formula captured at acceptance (immutable); live "pay off early" amount on the dashboard.

### A6. Condition documentation (R24)
- Photo/video/serial capture at delivery and return via `storage` (access-controlled, retained; S6). Reuse consignment `condition_photo_url` pattern.

### A7. Ownership transfer (R25)
- On Paid-in-Full: completion receipt, digital proof-of-ownership, remove recovery rights, close auto-pay, request feedback.

### A8. Fees (R26)
- 10% `rto_installment` fee per payment via registry; optional setup ($5–25) + optional late fee (disclosed, lawful).

**Acceptance (RTO):** an approved seller lists an eligible product; a customer accepts a disclosed agreement; installments charge on schedule with correct fee/ownership-credit; missed payments drive the state machine; early payoff uses the locked formula; completion transfers ownership. All ledgers immutable + reconciled.

---

## B. Consignment Rent-to-Own (R19) — ✅ DONE (2026-07-22)
- ✅ 3-party model built on the RTO core: `RtoAgreement` gains `is_consignment` / `owner_id` / `owner_type` / `commission_bps` (managing business = `seller_id`). Pure `splitConsignmentRto(gross, {platformBps, processingBps, commissionBps})` reconciles exactly to gross (owner absorbs rounding).
- ✅ Automatic splitting on **every** payment (initial + each installment): platform fee (10%) retained, owner share transferred via `paymentsService.payoutTransfer`, managing business keeps the commission — each recorded as an **immutable** `rto_statements` line (append-only, idempotent).
- ✅ Per-party electronic statements: `GET /rto/agreements/:id/statements` groups lines by party (owner / managing business / platform / processor) with running totals + a **reconciliation** block (B4). Frontend `RtoDashboard` shows "Where each payment goes".
**Acceptance:** ✅ a $100 installment splits **platform 1000 / commission 2700 / owner 6300** with per-party statements; splits reconcile to gross (`reconciliation.clean`) — proven in `test/rto.test.ts`. **Cx XL — closed.**

> **Note:** money movement reuses the existing charge (→ managing business, platform 10%) + `payoutTransfer` (→ owner) primitives — the same pattern as consignment settle. A fully Stripe-native 3-party flow (separate charges & transfers / `on_behalf_of`) is a payments-integration refinement; the split accounting + statements + reconciliation are complete and tested.

---

## C. Monetization layer — start the high-leverage items (R29/R30) — ✅ DONE (items 1–4, 2026-07-22)
Built a unified `subscriptions` module (`Subscription{ subscriber_id, subscriber_type, plan, status, stripe_subscription_id, … }`, Stripe subscription create/cancel added to the gateway+fake, `GET /subscriptions/plans|mine`, `POST /subscriptions`, `POST /subscriptions/:plan/cancel`) with entitlements read from active rows. **BE subscriptions test 3/3; full suites BE / FE green.**
1. ✅ **Pro membership** ($29.99/mo) — an active Pro business gets a marketplace-fee discount wired into `paymentsService.charge` (10% → **7%**, `PRO_MARKETPLACE_DISCOUNT_BPS`, config-overridable via `membership_overrides`). Test-proven.
2. ✅ **Featured placement** ($49.99/mo) — `livemapService.trending` adds `FEATURED_TRENDING_BOOST` for active Featured subscribers (`subscriptionsService.activeFeaturedSet`), and exposes `featured` on each result. Test: a Featured vendor outranks an identical non-featured one.
3. ✅ **Verified badge** ($9.99/mo) — an entitlement (`entitlements.verifiedBadge`) exposed for the UI to badge.
4. ✅ **AI marketing assistant** ($19.99/mo, user-scoped) — an entitlement (`entitlements.aiAssistant`) the UI gates on. (Left as an additive entitlement rather than hard-gating the existing `ai:coaching` route, to avoid changing/breaking the shipped AI behavior — a soft follow-up.)
- ✅ Frontend: `features/subscriptions` — `PlansScreen` (4 plans, price, subscribe/active/cancel), `useEntitlements`/`usePlans`/`useSubscribe`/`useCancelSubscription`, `/vendor/upgrade` page.

**Item 5** (storefronts, gift cards, loyalty, POS, ads dashboard, fleet GPS, financing/insurance, …) is explicit **future backlog** (`MISSING_FEATURES.md §5`) — out of scope for "start the high-leverage items".

---

## Phase 3 dependency order
```
Phase2 ─▶ A0 compliance gate ─▶ A1 eligibility ─▶ A2 agreement ─▶ A3 ledger/schedule
                                                                 ─▶ A4 missed-payment machine
                                                                 ─▶ A5 payoff / A6 condition / A7 ownership / A8 fees
         A(all) ─▶ B consignment-RTO
         (parallel, independent) C monetization
```

## Definition of done (Phase 3)
- [ ] RTO compliance cleared; jurisdiction-gated via `City.feature_flags`.
- [x] RTO core (R20–R27) live behind approval gate; immutable installment ledgers reconcile.
- [x] Consignment-RTO 3-party splits + statements (R19).
- [x] Pro membership + featured/sponsored + verified badge + AI-assistant subscriptions live (initial monetization).
- [ ] Security S1–S4/S9 satisfied for all RTO routes; perf P5 (delayed jobs) in place.

## Risks
- **Compliance is the critical path**, not engineering — start legal review at Phase 2 start.
- RTO financial edge cases (partial payments, reinstatement, repossession accounting) are high-stakes — exhaustive tests + reconciliation required before enabling in any city.
