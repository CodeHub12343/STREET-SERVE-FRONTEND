# API Changes

**Design specification.** Conventions follow the existing codebase: `/api/v1`, `{ data }` envelope,
Zod `.strict()` bodies, `requirePermission` + resource-ownership checks, idempotency keys on money
paths, integer cents.

---

## Summary

| Group | New | Modified | Retired |
|---|---:|---:|---:|
| Customer payment | 5 | 0 | 0 |
| Sales | 1 | 1 | 0 |
| Refunds | 3 | 0 | 0 |
| Seller debt | 3 | 0 | 0 |
| Ledger / finance | 4 | 0 | 0 |
| Settlement | 1 | 1 | 0 |
| Hub policy | 2 | 0 | 0 |
| Webhooks | 0 | 1 | 0 |

---

## 1. Customer payment (the digital rail)

### `POST /api/v1/sales/payment-intent` — NEW
Seller creates a payment for a customer to pay. **Amount is server-priced** from the checkout
snapshot; the client never supplies it.

- **Auth:** seller, must own the checkout · **Idempotency:** required
- **Body:** `{ checkoutId, quantity, unitPriceCents?, customerEmail?, customerPhone? }`
  - `unitPriceCents` optional and validated against the minimum authorised price + seller permissions
- **Returns:** `{ saleId, paymentUrl, qrPayload, amountCents, expiresAt }`
- **Errors:** `409 OVERSELL` (exceeds remaining), `409 INVALID_STATE` (checkout not active),
  `422 BELOW_MINIMUM_PRICE`, `403 CREDIT_LIMIT_EXCEEDED`

> **Reserve stock at intent creation, don't decrement at payment.** Otherwise two customers can pay
> for the same last unit. The existing atomic guard should be reused here.

### `GET /api/v1/pay/:token` — NEW (public, unauthenticated)
The page the customer lands on after scanning. No account required.
- **Returns:** `{ businessName, productName, quantity, amountCents, currency, expiresAt }`

### `POST /api/v1/pay/:token/confirm` — NEW (public)
- **Returns:** `{ status, receiptUrl }`

### `GET /api/v1/sales/:id/payment-status` — NEW
Polled by the seller's device while the customer pays.
- **Returns:** `{ status: pending|succeeded|failed|expired, paidAt }`

### `POST /api/v1/sales/:id/cancel-payment` — NEW
Cancels an unpaid intent and releases the reserved units.

---

## 2. Sales

### `POST /api/v1/checkouts/:id/sales` — MODIFIED
The existing manual-log endpoint becomes explicitly the **cash rail**.

- **Body adds:** `paymentRail: 'cash' | 'digital'` (required), `unitPriceCents` (required)
- **Behaviour change:** a `cash` sale now **creates a `seller_debts` row** for hub share + platform
  fee, and writes balanced ledger entries. It no longer implies a future payout to the seller.
- **New error:** `403 CASH_DEBT_LIMIT_EXCEEDED` — seller is over their tier's cash-debt ceiling

### `GET /api/v1/checkouts/:id/sales` — NEW
Per-sale history for a checkout, with rail and payment status. Needed for partial refunds.

---

## 3. Refunds

### `POST /api/v1/sales/:id/refund` — NEW
- **Auth:** hub owner, seller (own sale), or admin · **Idempotency:** required
- **Body:** `{ amountCents?, reason, restock?: boolean, absorbedBy?: 'platform'|'seller'|'hub'|'shared' }`
- **Behaviour:**
  - Before settlement → reverse the sale, restore stock, no payout ever occurred
  - After settlement → Stripe `reverse_transfer` on both legs + `refund_application_fee`, write
    **reversal entries**; if funds are already spent, create a `refund_clawback` debt
- **Returns:** `{ refundId, amountCents, reversals: { sellerCents, hubCents, feeCents } }`
- **Errors:** `409 ALREADY_REFUNDED`, `422 EXCEEDS_REFUNDABLE`, `409 REFUND_WINDOW_CLOSED`

### `GET /api/v1/sales/:id/refunds` — NEW
### `GET /api/v1/refunds/mine` — NEW (customer, via receipt token)

---

## 4. Seller debt

### `GET /api/v1/sellers/me/debts` — NEW
- **Returns:** `{ totalOutstandingCents, creditLimitCents, availableCreditCents, debts: [...] }`

### `POST /api/v1/sellers/me/debts/:id/repay` — NEW
Seller clears a balance by card. **Idempotency:** required.
- **Body:** `{ amountCents }` → **Returns:** `{ paymentIntentClientSecret, remainingCents }`

### `GET /api/v1/sellers/me/credit` — NEW
Powers the "how much stock can I take?" display and gates checkout.
- **Returns:** `{ tier, maxInventoryValueCents, currentInventoryValueCents, maxCashDebtCents, currentDebtCents, availableCents, payoutHoldHours }`

---

## 5. Ledger and finance (internal / admin)

### `GET /api/v1/finance/accounts/:ownerType/:ownerId` — NEW *(admin)*
### `GET /api/v1/finance/entries` — NEW *(admin)* — filter by ref, account, date; paginated
### `GET /api/v1/finance/reconciliation` — NEW *(admin)*
Compares cached balances against summed entries and flags drift. **This is the early-warning system
for financial bugs** and should be monitored.
### `GET /api/v1/finance/platform-balance` — NEW *(admin)*
Stripe balance vs ledger-expected balance vs outstanding payables.

---

## 6. Settlement

### `POST /api/v1/checkouts/:id/settle` — NEW (explicit trigger)
Settlement currently only happens implicitly (on return, or on sell-out). An explicit, idempotent,
**retryable** endpoint is needed so a failed payout leg can be completed later.
- **Auth:** hub owner or system · **Returns:** the settlement view with per-leg statuses

### `GET /api/v1/checkouts/:id/settlement` — MODIFIED
- **Adds:** `sellerPayoutStatus`, `hubPayoutStatus`, `fundingSource`, `debtAppliedCents`,
  `cashSalesCents`, `digitalSalesCents`, `ledgerTransactionId`
- **Fixes:** `payoutTiming` must reflect an **enforced** hold, not descriptive text

---

## 7. Hub policy

### `GET|PATCH /api/v1/hubs/:id/payment-policy` — NEW
- **Body:** `{ acceptsCashSales?, refundWindowDays?, refundPolicy?, insuranceOptIn? }`

*(`/hubs/:id/approval-policy` already exists from the approval-gate work.)*

---

## 8. Webhooks — MODIFIED

`POST /webhooks/stripe` must additionally handle:

| Event | Action |
|---|---|
| `payment_intent.succeeded` | Mark `sale_payments` succeeded; write ledger entries; trigger split transfers |
| `payment_intent.payment_failed` | Release reserved units |
| `charge.refunded` | Record refund; write reversal entries |
| `charge.dispute.created` | **Freeze the seller's pending payouts**; open a dispute record |
| `charge.dispute.closed` | Resolve; clawback or release |
| `transfer.failed` | Mark the payout leg failed; queue retry; alert |
| `account.updated` | *(already handled)* — sync `payouts_enabled` |

**Operational note:** `STRIPE_WEBHOOK_SECRET` is currently the placeholder `whsec_replac…`. Webhooks
cannot verify until this is set (Stripe CLI in dev, real secret in prod). The polling fallback added
for Connect status is a workaround, not a substitute — **webhooks become mandatory** once money flows
in, because payment confirmation cannot be safely client-driven.

---

## New permissions

| Permission | Roles | Notes |
|---|---|---|
| `sale:collect_payment` | seller | Create a customer payment intent |
| `sale:refund` | hub, admin | Seller may refund own sales within policy |
| `debt:read_own` | seller | |
| `debt:repay_own` | seller | |
| `finance:read` | admin | Ledger and reconciliation |
| `hub:payment_policy` | hub | |

---

## New error codes

| Code | HTTP | Meaning |
|---|---|---|
| `CREDIT_LIMIT_EXCEEDED` | 403 | Requested stock exceeds the tier's inventory ceiling |
| `CASH_DEBT_LIMIT_EXCEEDED` | 403 | Outstanding cash debt over the tier ceiling |
| `PAYMENT_REQUIRED` | 402 | Sale requires payment before settlement |
| `REFUND_WINDOW_CLOSED` | 409 | Past the hub's refund window |
| `EXCEEDS_REFUNDABLE` | 422 | Refund exceeds the remaining refundable amount |
| `ALREADY_REFUNDED` | 409 | |
| `INSUFFICIENT_PLATFORM_BALANCE` | 409 | Payout cannot be funded — queue and alert |
| `SETTLEMENT_BLOCKED_BY_DISPUTE` | 409 | Open dispute on the checkout |
| `LEDGER_IMBALANCE` | 500 | Entry set did not sum to zero — **must never reach a client** |

---

## Backward compatibility

| Consumer | Impact | Handling |
|---|---|---|
| Existing seller app | `POST /checkouts/:id/sales` gains two required fields | Version the endpoint or default `paymentRail: 'cash'` for one release |
| Existing hub dashboard | Settlement response gains fields | Additive — safe |
| Existing settlements | New status fields absent | Treat missing as `legacy_unfunded` |

Everything else is additive. No endpoint is retired.
