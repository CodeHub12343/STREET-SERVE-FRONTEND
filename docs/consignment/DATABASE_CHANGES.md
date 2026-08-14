# Database Changes

**Design specification. No production code — field lists, invariants and migrations.**
Conventions follow the existing codebase: `snake_case` fields, integer cents, `defineModel`,
`immutablePlugin` for append-only financial records.

---

## Overview

| Collection | Change | Purpose |
|---|---|---|
| `ledger_accounts` | **NEW** | One balance per party per account type |
| `ledger_entries` | **NEW** (immutable) | Balanced double-entry rows — the financial source of truth |
| `sale_payments` | **NEW** | A customer payment against a consignment sale |
| `seller_debts` | **NEW** | Cash-sale obligations, losses, refund clawbacks |
| `refunds` | **NEW** (immutable) | Refund + reversal records |
| `inventory_sales` | **MODIFY** | Add payment rail + link to payment |
| `settlements` | **MODIFY** | Per-leg payout status; funded vs unfunded |
| `inventory_checkouts` | **MODIFY** | Loss/damage liability fields |
| `hubs` | **MODIFY** | Refund policy, insurance opt-in |
| `users` / trust | **MODIFY** | Credit limits derived from tier |

---

## 1. `ledger_accounts` — NEW

One row per (owner, account type). This is what finally answers *"what does each party hold or owe?"*

| Field | Type | Notes |
|---|---|---|
| `owner_type` | enum | `platform` \| `user` \| `business` |
| `owner_id` | string | null for `platform` |
| `account_type` | enum | `cash`, `payable`, `receivable`, `fee_revenue`, `reserve`, `write_off` |
| `currency` | string | ISO 4217; multi-currency ready from day one |
| `balance_cents` | number | **Derived** — a cached projection of entries, never authoritative |
| `version` | number | Optimistic concurrency |
| `created_at` / `updated_at` | date | |

**Indexes:** unique `{owner_type, owner_id, account_type, currency}`

**Critical rule:** `balance_cents` is a cache. The truth is always `SUM(ledger_entries)`. A nightly
job must recompute and alert on any drift — that job is the early-warning system for financial bugs.

---

## 2. `ledger_entries` — NEW (immutable)

The heart of the system. Entries are written in **balanced sets** that always sum to zero.

| Field | Type | Notes |
|---|---|---|
| `transaction_id` | string | Groups the entries of one event; **all entries in a group must sum to 0** |
| `account_id` | ObjectId | → `ledger_accounts` |
| `direction` | enum | `debit` \| `credit` |
| `amount_cents` | number | Always positive; direction carries the sign |
| `currency` | string | |
| `entry_type` | enum | `sale_capture`, `platform_fee`, `seller_share`, `hub_share`, `payout`, `cash_receivable`, `debt_repayment`, `refund`, `reversal`, `write_off`, `adjustment` |
| `ref_type` / `ref_id` | string | `checkout` \| `sale` \| `settlement` \| `refund` \| `debt` |
| `reverses_entry_id` | ObjectId | Set only on reversal entries |
| `memo` | string | Human-readable |
| `created_at` | date | |

**Indexes:** `{transaction_id}`, `{account_id, created_at}`, `{ref_type, ref_id}`

**Plugin:** `immutablePlugin` — append-only. Corrections are new reversing entries, never edits.

**Invariant to enforce in code and test:**
> For every `transaction_id`: `SUM(debits) === SUM(credits)`.

### Worked example — a $903 digital sale

| Account | Direction | Amount |
|---|---|---|
| Platform cash | debit | $903.00 |
| Payable → seller | credit | $528.25 |
| Payable → hub | credit | $284.45 |
| Platform fee revenue | credit | $90.30 |

Then when payouts execute (a separate `transaction_id`):

| Account | Direction | Amount |
|---|---|---|
| Payable → seller | debit | $528.25 |
| Payable → hub | debit | $284.45 |
| Platform cash | credit | $812.70 |

### Worked example — the same sale in cash

| Account | Direction | Amount |
|---|---|---|
| Receivable ← seller | debit | $374.75 |
| Payable → hub | credit | $284.45 |
| Platform fee revenue | credit | $90.30 |

No platform cash moves — correctly. The hub is still owed exactly what it is owed.

---

## 3. `sale_payments` — NEW

A customer's actual payment for a consignment sale.

| Field | Type | Notes |
|---|---|---|
| `sale_id` | ObjectId | → `inventory_sales` |
| `checkout_id` | string | Denormalised for query |
| `rail` | enum | `digital` \| `cash` |
| `amount_cents` | number | |
| `currency` | string | |
| `stripe_payment_intent_id` | string | null for cash |
| `stripe_charge_id` | string | null for cash |
| `transfer_group` | string | `sale_<saleId>` — ties the split transfers together |
| `status` | enum | `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded`, `disputed` |
| `customer_email` / `customer_phone` | string | Optional — for receipts |
| `idempotency_key` | string | Unique |
| `paid_at` | date | |

**Indexes:** `{sale_id}`, unique `{idempotency_key}`, unique sparse `{stripe_payment_intent_id}`,
`{status, paid_at}`

---

## 4. `seller_debts` — NEW

What a seller owes, and why.

| Field | Type | Notes |
|---|---|---|
| `seller_id` | string | |
| `origin_type` | enum | `cash_sale`, `lost_inventory`, `damaged_inventory`, `refund_clawback`, `chargeback` |
| `origin_ref_id` | string | The sale / checkout / refund it came from |
| `hub_id` | string | Which hub is owed (if applicable) |
| `principal_cents` | number | Original amount |
| `outstanding_cents` | number | Remaining |
| `status` | enum | `open`, `partially_repaid`, `repaid`, `written_off`, `disputed` |
| `due_at` | date | |
| `repayments` | array | `{amount_cents, method: netted\|card\|manual, at, ref}` |
| `created_at` / `updated_at` | date | |

**Indexes:** `{seller_id, status}`, `{hub_id, status}`, `{status, due_at}`

**Invariant:** `outstanding_cents` = `principal_cents` − Σ repayments, and never below zero.

---

## 5. `refunds` — NEW (immutable)

| Field | Type | Notes |
|---|---|---|
| `sale_payment_id` | ObjectId | |
| `amount_cents` | number | Supports partial |
| `reason` | enum | `customer_request`, `defective`, `not_received`, `seller_error`, `dispute_resolution`, `chargeback` |
| `stripe_refund_id` | string | |
| `reversed_seller_cents` / `reversed_hub_cents` / `reversed_fee_cents` | number | Proportional reversal per party |
| `absorbed_by` | enum | `platform`, `seller`, `hub`, `shared` — policy outcome |
| `restocked_quantity` | number | If goods came back |
| `status` | enum | `pending`, `succeeded`, `failed` |
| `created_by` / `created_at` | | |

**Plugin:** `immutablePlugin`.

**Proportional reversal rule:** a partial refund must reverse each party proportionally to their
original share, so the ledger stays balanced. Refunding $100 of the $903 sale reverses $58.53 seller,
$31.52 hub, $10.00 fee (using the same floor-seller/remainder-hub rounding).

---

## 6. `inventory_sales` — MODIFY

| Field | Change | Notes |
|---|---|---|
| `payment_rail` | **ADD** enum | `digital` \| `cash`; **required going forward** |
| `sale_payment_id` | **ADD** ObjectId | null for cash |
| `unit_price_cents` | **ADD** number | Currently only a total is stored — needed for proportional refunds |
| `settled` | **ADD** boolean | Whether this sale has been included in a settlement |
| `logged_via` | *(existing)* | Keep `manual` \| `qr_scan` |

**Migration:** backfill existing rows with `payment_rail: 'cash'`, `settled: true`, and
`unit_price_cents` derived from `sale_amount_cents / quantity_sold`.

---

## 7. `settlements` — MODIFY

The key change: settlements must record **whether money actually moved**, per party.

| Field | Change | Notes |
|---|---|---|
| `funding_source` | **ADD** enum | `collected` (digital) \| `receivable` (cash) \| `mixed` \| `legacy_unfunded` |
| `seller_payout_status` | **ADD** enum | `paid`, `pending`, `failed`, `netted_against_debt`, `no_account` |
| `hub_payout_status` | **ADD** enum | same |
| `seller_debt_applied_cents` | **ADD** number | Amount netted against outstanding debt |
| `ledger_transaction_id` | **ADD** string | Links to the balanced entry set |
| `cash_sales_cents` / `digital_sales_cents` | **ADD** number | Rail breakdown of the gross |

**Migration:** mark the one existing settlement `funding_source: 'legacy_unfunded'`,
`seller_payout_status: 'no_account'`, `hub_payout_status: 'paid'`. **Do not** backfill ledger entries
for it — see `IMPLEMENTATION_IMPACT_ANALYSIS.md`.

---

## 8. `inventory_checkouts` — MODIFY

| Field | Change | Notes |
|---|---|---|
| `lost_quantity` / `damaged_quantity` | **ADD** number | Currently assessments are recorded with no financial effect |
| `liability_cents` | **ADD** number | Charged to the seller for loss/damage |
| `liability_status` | **ADD** enum | `none`, `assessed`, `charged`, `waived`, `disputed` |
| `declared_value_cents` | **ADD** number | Denormalised (`unit_value × quantity`) for credit-limit checks |
| `dispute_id` | **ADD** ObjectId | Blocks settlement while open |

*(`status` already gained `pending_approval` / `declined` with the approval gate.)*

---

## 9. `hubs` — MODIFY

| Field | Change | Notes |
|---|---|---|
| `refund_window_days` | **ADD** number | Default 14 |
| `refund_policy` | **ADD** enum | `platform_absorbs`, `hub_absorbs`, `shared` |
| `insurance_opt_in` | **ADD** boolean | Future insurance product |
| `accepts_cash_sales` | **ADD** boolean | A hub may require digital-only |

*(`auto_approve_min_trust` / `auto_approve_max_value_cents` already exist.)*

---

## 10. Trust / credit limits — MODIFY

Rather than a new collection, extend the trust subsystem to expose limits:

| Field | Where | Notes |
|---|---|---|
| `max_inventory_value_cents` | derived from tier | Cap on total active checkout value |
| `max_cash_debt_cents` | derived from tier | Cap on outstanding debt |
| `payout_hold_hours` | derived from tier | **Actually enforce** the timing currently only claimed in the UI |
| `guarantor_type` / `guarantor_id` | new fields | Shelter co-sign support |

**Also fix:** `TRUST_DEFAULT_SCORE = 100` means new sellers start at maximum trust. New accounts
should start low (suggested 40) and earn upward.

---

## Migration plan

| # | Migration | Risk | Reversible |
|---|---|---|---|
| 1 | Create the four new collections + indexes | None | Yes |
| 2 | Add fields to `inventory_sales`, backfill rail/settled/unit price | Low | Yes |
| 3 | Add fields to `settlements`, mark existing as `legacy_unfunded` | Low | Yes |
| 4 | Add liability fields to `inventory_checkouts` | None | Yes |
| 5 | Add hub policy fields with defaults | None | Yes |
| 6 | Open ledger accounts for all existing users/businesses at zero | None | Yes |
| 7 | Add fee types `consignment_digital` / `consignment_cash` to `fee_schedule` | None | Yes |
| 8 | Lower default trust for *new* accounts (don't retro-adjust) | Low | Yes |

All are additive. No destructive migration is required, which is a direct benefit of the existing
append-only design.

---

## Invariants worth testing explicitly

1. Every `transaction_id` group sums to zero.
2. `ledger_accounts.balance_cents` equals the sum of its entries (nightly reconciliation).
3. `settlements.seller_net + hub_share + platform_fee === gross` exactly (already true; keep).
4. `seller_debts.outstanding_cents` ≥ 0 and equals principal minus repayments.
5. No payout transfer executes without a matching `payable` balance.
6. A refund's reversal entries sum to the negative of the portion being refunded.
7. Total active checkout value for a seller ≤ their tier's credit limit.

These seven are the financial safety net. They belong in the test suite before any money moves.
