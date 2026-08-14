# Implementation Roadmap

**Sequenced delivery plan. Each phase ships independently and leaves the system better than it found it.**

---

## Phase order and rationale

```
 P0 ─── STOP THE BLEEDING ──────────────── days      ← do this first, regardless of everything else
        │
 P1 ─── LEDGER FOUNDATION ─────────────── 2–3 weeks  ← everything else depends on it
        │
        ├── P2 ── DIGITAL RAIL ─────────── 3–4 weeks ← the revenue engine
        │           │
        └── P3 ── CASH RAIL / DEBT ─────── 2–3 weeks ← makes cash honest
                    │
              P4 ── REFUNDS & DISPUTES ─── 2 weeks
                    │
              P5 ── TAX & COMPLIANCE ───── 2–3 weeks ← legally required once P2 ships
                    │
              P6 ── HARDENING ──────────── 1–2 weeks
```

**Total: ~3–4 months** for one experienced full-stack engineer.

---

## Phase 0 — Stop the bleeding (2–3 days) 🔴 URGENT

**Problem:** every settlement transfers real platform money for sales that collected nothing.

**Do:**
1. **Disable the unfunded seller + hub transfers** in `settle()`. Keep calculating and recording the
   split — just stop moving money that was never collected.
2. Mark such settlements `funding_source: 'legacy_unfunded'`.
3. Change the seller/hub UI wording from "paid" to **"owed — pending payment rail"**.
4. Mark the existing live settlement as legacy; do **not** backfill it.

**Exit criteria:** no Stripe transfer executes without collected funds behind it. Financial loss
stops today.

**Why first:** this is days of work and prevents unbounded loss. Everything else can then proceed
without a deadline hanging over it.

---

## Phase 1 — Ledger foundation (2–3 weeks)

**Build:** `modules/ledger/` — accounts, immutable balanced entries, posting API, reconciliation job.

**Do:**
1. `ledger_accounts` + `ledger_entries` collections and indexes
2. `ledgerService.post()` — rejects any entry set that doesn't sum to zero
3. Open zero-balance accounts for all existing users and businesses
4. Nightly reconciliation job + drift alerting
5. Admin ledger explorer + reconciliation dashboard
6. **All seven invariant tests** from `DATABASE_CHANGES.md`
7. **Shadow-run:** replay existing settlements through the ledger and confirm they balance

**Exit criteria:** every existing settlement can be expressed as balanced entries; reconciliation
reports zero drift; invariant tests pass.

**Do not skip the shadow-run.** It is how you find out the ledger model is wrong *before* real money
depends on it.

---

## Phase 2 — Digital rail (3–4 weeks)

**Build:** customer payment, three-way split, receipts.

**Do:**
1. `modules/salepayments/` — intent creation, public pay page, confirmation
2. `chargeToPlatform()` — PaymentIntent **without** `transfer_data` (separate charges pattern)
3. `splitTransfer()` — seller + hub transfers in one `transfer_group`
4. Webhook handlers: `payment_intent.succeeded` / `.payment_failed`
5. Reserve units at intent creation; expire and release unpaid intents
6. Seller "Collect payment" screen with QR/link
7. Public payment page + receipt (no auth, wallet-first)
8. Rewrite `settle()` to distribute **collected** funds
9. Per-leg payout status + the `payout.retry` job
10. Fee types `consignment_digital` (8%) / `consignment_cash` (10%)
11. **Fix the webhook secret** — real `whsec_` in every environment

**Exit criteria:** a customer pays by card; money lands on the platform balance; splits reach seller
and hub; the ledger balances; the customer has a receipt. **The platform earns its first real fee.**

**Milestone: StreetServe becomes a real marketplace.**

---

## Phase 3 — Cash rail and debt (2–3 weeks)

**Build:** honest cash handling.

**Do:**
1. `modules/debt/` — creation, repayment, netting, credit checks
2. `logSale` requires `paymentRail`; cash creates a debt + ledger entries
3. Trust-tier credit limits: inventory ceiling, cash-debt ceiling, payout hold
4. **Enforce the payout holds** currently only claimed in the UI
5. Net debt from digital payouts at settlement
6. Block checkout over the credit limit (extends the approval gate)
7. Seller balance/debt screens with humane copy
8. Debt reminder + escalation jobs
9. **Fix `TRUST_DEFAULT_SCORE`** — new sellers start low and earn upward

**Exit criteria:** a cash sale creates a visible debt; the next digital payout nets it automatically;
credit limits block over-exposure.

---

## Phase 4 — Refunds and disputes (2 weeks)

**Do:**
1. `refunds` collection + reversal entries (never mutate originals)
2. `refundWithReversal()` — `reverse_transfer` + `refund_application_fee`
3. Proportional partial refunds across all three parties
4. Post-settlement refunds → `refund_clawback` debt when funds are spent
5. `charge.dispute.created` **freezes the seller's pending payouts**
6. Block settlement while a dispute is open
7. Customer refund request from the receipt; hub refunds screen
8. Loss/damage liability charged as debt, with trust penalty proportional to value

**Exit criteria:** a customer can get a refund before and after settlement, with the ledger balanced
in both cases; disputes hold money instead of letting it escape.

---

## Phase 5 — Tax and compliance (2–3 weeks)

Legally required once Phase 2 ships — **do not defer this past launch.**

**Do:**
1. Enable Stripe Tax; calculate and collect sales tax on digital sales
2. Marketplace-facilitator remittance reporting per jurisdiction
3. W-9 collection at Connect onboarding; 1099-K thresholds via Stripe
4. Scale KYC requirements to the value a seller holds
5. Seller and hub tax statements
6. Legal review of money-transmission posture

**Exit criteria:** tax is calculated, collected and reportable; sellers can retrieve their tax
documents.

---

## Phase 6 — Hardening (1–2 weeks)

**Do:**
1. **Rotate the QR secret** — short-lived signed token replacing the static shared string
2. Move settlement into a queued job (off the request path)
3. Fix the N+1 trust lookup in `pendingApprovals`
4. Geospatial index + pagination for product discovery
5. Fraud signals: under-reporting detection (cash-vs-digital ratio per seller), repeat "lost" claims,
   velocity checks
6. Platform balance monitoring and low-balance alerts

---

## What to build later (deliberately deferred)

| Feature | Why it waits |
|---|---|
| Inventory insurance | Needs loss data from Phase 4 to price |
| Seller cash advances | Needs repayment history from Phase 3 — then it's the highest-margin product available |
| Shelter guarantor programme | Needs the credit-limit engine first; finish the UI concept already hinted at |
| Hub-to-hub transfers | Not on the money path |
| Dynamic split pricing | Needs sales history |
| Customer accounts and loyalty | Needs the receipt flow from Phase 2 to seed it |

---

## Decisions needed before Phase 2 starts

| # | Decision | Recommendation |
|---|---|---|
| 1 | Fee differential digital vs cash | 8% vs 10% |
| 2 | Credit limits per tier | Bronze $200 / Silver $1,000 / Gold $5,000 |
| 3 | Enforce tier payout holds? | Yes — 3 days / 1 day / instant |
| 4 | Refund window | 14 days, hub-configurable |
| 5 | Default refund absorption | Platform absorbs; seller charged when at fault |
| 6 | Loss liability | Wholesale value, capped by tier |
| 7 | Launch geography | Determines which tax obligations apply first |

Items 1–3 shape the data model. Settle them before Phase 2 begins.

---

## Success metrics

| Metric | Target |
|---|---|
| % of sales on the digital rail | > 60% within 3 months |
| Platform fee collection rate | > 95% (today: ~0%) |
| Ledger reconciliation drift | $0, always |
| Failed payouts outstanding > 24h | 0 |
| Average seller cash debt | < 50% of their limit |
| Settlement latency | < 60s p95 |
| Refund turnaround | < 48h |

The first two are the business case. The third is the audit case. **If ledger drift is ever non-zero,
stop feature work and fix it** — a marketplace that cannot prove its own books cannot raise money,
pass an audit, or be sold.

---

## Final note on sequencing

It will be tempting to build the digital rail first, because it is the visible, exciting part. Resist
it. **The ledger is what makes the digital rail correct**, and retrofitting accounting underneath
live money movements is far harder than laying it down first.

But do Phase 0 immediately. It takes days and stops real money leaving the building.
