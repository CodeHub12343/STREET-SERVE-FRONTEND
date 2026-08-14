# Backend Changes

**Design specification.** Follows the existing module pattern:
`{module}.{model,repository,service,controller,routes,schema}.ts`.

---

## New modules

### `modules/ledger/` — NEW, and the foundation of everything

The single writer of financial truth. Every money movement in the platform goes through it.

**Core responsibility:** accept a *balanced set* of entries or reject the whole thing.

```
post({ transactionId, entries[], refType, refId, memo })
     │
     ├─ validate: SUM(debits) === SUM(credits)   ← reject the whole set if not
     ├─ validate: all entries share one currency
     ├─ write entries atomically (transaction)
     ├─ update cached account balances
     └─ emit ledger.posted
```

**Key principle: no other service may write a ledger entry directly.** Payments, settlement, refunds
and debt all call `ledgerService.post()`. That single chokepoint is what makes the books provable.

Also provides: `balanceOf(account)`, `reverse(transactionId, reason)` (writes negating entries,
never edits), and `reconcile()` for the nightly drift check.

**MongoDB note:** the replica set (`rs0`) is already configured, so multi-document transactions are
available — use them for entry sets.

### `modules/salepayments/` — NEW

Owns the digital rail: creating payment intents, hosting the public pay page, confirming payment,
and triggering the three-way split.

```
createIntent(checkout, quantity, unitPrice)
   ├─ assert checkout active + seller owns it
   ├─ assert quantity ≤ remaining      (reuse the atomic oversell guard)
   ├─ assert price ≥ minimum_authorized_price (unless permitted)
   ├─ RESERVE the units                ← before payment, not after
   ├─ price server-side from the checkout snapshot
   └─ create Stripe PaymentIntent WITHOUT transfer_data
                                        ← funds land on the PLATFORM balance

onPaymentSucceeded(webhook)             ← the ONLY trusted confirmation
   ├─ idempotency check
   ├─ create inventory_sales row (rail: digital)
   ├─ ledger.post: platform cash DR / seller+hub payable CR / fee revenue CR
   ├─ transfer to seller + hub in transfer_group `sale_<saleId>`
   └─ send the customer's receipt
```

**Never confirm payment from the client.** The webhook is the only source of truth.

### `modules/debt/` — NEW

Cash-sale obligations, loss/damage liabilities and refund clawbacks.

```
createDebt(sellerId, origin, amountCents, hubId)
repay(debtId, amountCents, method)
netAgainstPayout(sellerId, availableCents)   ← called during settlement
creditCheck(sellerId)                        ← called at checkout + sale
```

**`netAgainstPayout` is the humane recovery mechanism:** rather than chasing a low-income seller,
their next digital payout is reduced until the balance clears.

---

## Modified services

### `consignment.service.ts` → `settle()` — the central rewrite

```
BEFORE                                   AFTER
──────                                   ─────
sum sales                                sum sales, SPLIT BY RAIL
compute split                            compute split (unchanged maths)
transfer to seller  ← unfunded           digital portion: release held payables
transfer to hub     ← unfunded           cash portion:    hub share already a payable;
                                                          seller share offsets their debt
                                         net any outstanding debt from the seller's share
                                         ledger.post the whole settlement
mark settled                             record PER-LEG payout status
                                         (paid|pending|failed|netted|no_account)
```

Additional guards to add:
- **Block settlement while a dispute is open** on the checkout
- **Never transfer without a matching payable balance**
- **Move off the request path** — settlement currently performs two Stripe calls, a trust recompute,
  an audit write and an event publish inside the seller's HTTP request. It belongs in a BullMQ job
  with retries.

### `consignment.service.ts` → `logSale()`

- Require `paymentRail` and `unitPriceCents`
- For `cash`: create a `seller_debts` row and post ledger entries — **no future payout to the seller**
- Enforce the cash-debt ceiling before accepting
- Keep the oversell guard and minimum-price check exactly as they are

### `consignment.service.ts` → `checkout()`

Add a **credit-limit check**: total active checkout value for this seller must stay within their
trust tier's ceiling. This slots naturally beside the approval gate already built.

### `payments.service.ts`

- **New:** `chargeToPlatform()` — PaymentIntent *without* `transfer_data` (separate charges pattern)
- **New:** `splitTransfer()` — multiple transfers in one `transfer_group`, each idempotent
- **New:** `refundWithReversal()` — `reverse_transfer` + `refund_application_fee`
- **Modify:** `payoutTransfer()` must **fail loudly**. Returning `null` silently when no payout
  account exists is exactly how $528.25 went missing. Return a typed result the caller must handle.
- **New:** `assertPlatformBalance()` before transfers

### `trust.service.ts`

- Expose `creditLimits(sellerId)` → inventory ceiling, cash-debt ceiling, payout-hold hours
- **Fix the inverted default:** `TRUST_DEFAULT_SCORE = 100` means new sellers begin at maximum trust.
  Start new accounts low (~40) and let verified sales raise them. Do not retro-adjust existing users.
- Penalise lost/damaged inventory **in proportion to value**
- Support `guarantor` (shelter co-sign) as a trust input

### `feeService`

Add fee types to the versioned schedule — no code change needed, it is already config-driven:

| Type | Rate | Purpose |
|---|---|---|
| `consignment_digital` | 800 bps (8%) | Digital rail — cheaper, prices lower risk |
| `consignment_cash` | 1000 bps (10%) | Cash rail |
| `debt_repayment` | 0 | Never profit from repayment |
| `instant_payout` | 150 bps | Optional future revenue |

---

## Background jobs (BullMQ — the scheduler already exists)

| Job | Cadence | Purpose |
|---|---|---|
| `settlement.process` | On demand + retry | Settlement off the request path |
| `payout.retry` | Every 15 min | Complete failed/pending payout legs — **the missing piece today** |
| `ledger.reconcile` | Nightly | Cached balances vs summed entries; alert on drift |
| `debt.remind` | Daily | Notify sellers of outstanding balances |
| `debt.escalate` | Daily | Block checkout past ceiling; escalate aged debt |
| `payment.expire` | Every 5 min | Release units from unpaid intents |
| `payout.release` | Hourly | Release tier-held payouts when the hold elapses |
| `tax.report` | Monthly | Marketplace facilitator remittance data |

Existing consignment sweeps (expiry notices, return-pending, overdue) are unchanged.

---

## Webhook handling

`webhooks/stripe.webhook.ts` gains the events listed in `API_CHANGES.md` §8. Two rules:

1. **Idempotent by Stripe event id** — store processed ids; webhooks are delivered more than once.
2. **`charge.dispute.created` must freeze payouts** for that seller immediately. Today a dispute
   doesn't stop money leaving, and post-settlement clawback is impossible.

---

## Domain events to add

```
sale.payment_initiated     { saleId, checkoutId, amountCents }
sale.paid                  { saleId, rail, amountCents }
sale.refunded              { saleId, refundId, amountCents }
debt.created               { sellerId, debtId, amountCents, origin }
debt.repaid                { sellerId, debtId, amountCents }
debt.limit_reached         { sellerId, outstandingCents }
ledger.posted              { transactionId, entryCount }
ledger.imbalance_detected  { transactionId }      ← alert-worthy
payout.failed              { settlementId, party, reason }
```

---

## Notifications to add

| Recipient | Trigger | Message |
|---|---|---|
| Seller | Customer paid | "Payment received — $X, your share $Y" |
| Seller | Payout sent | "$X is on its way to your account" |
| Seller | Payout held by tier | "$X will arrive in N days (Bronze)" |
| Seller | Debt created | "You owe $X from a cash sale — netted from your next payout" |
| Seller | Nearing credit limit | "You can take $X more stock" |
| Seller | Blocked by debt | "Clear $X to take more inventory" |
| Hub | Sale of their stock | "3 × Candles sold — your share $X" |
| Hub | Refund issued | "Refund of $X processed" |
| Customer | Payment succeeded | Receipt with refund link |
| Admin | Ledger drift / payout failure / low balance | Operational alerts |

The notifications module (durable inbox + realtime + push) already supports all of this.

---

## Testing requirements

The seven ledger invariants in `DATABASE_CHANGES.md` must be enforced by tests **before any money
moves**. Beyond those:

- Concurrency: two customers paying for the last unit simultaneously
- Idempotency: duplicate webhooks, retried settlements, replayed refunds
- Partial refunds reversing all three parties proportionally
- Debt netting across multiple payouts
- Settlement with mixed cash + digital sales
- Failed transfer → retry job → eventual completion
- Dispute blocking settlement

The existing `test/phase4.test.ts` harness (fake Stripe gateway, seeded hubs/sellers) is a good
foundation and should be extended rather than replaced.
