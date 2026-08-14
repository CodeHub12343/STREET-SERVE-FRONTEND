# Frontend Changes

**Design specification.** Follows the existing structure: `src/features/*`, hooks with `isMapDemo`
branching, `endpoints.ts` / `keys.ts` registries, render-prop gates, `useRequireRole` guards.

---

## Summary by persona

| Persona | New screens | Modified screens |
|---|---:|---:|
| Seller | 4 | 4 |
| Hub owner | 2 | 3 |
| Customer | 3 (public, no auth) | 0 |
| Admin | 2 | 0 |

---

## Seller

### NEW — "Collect payment" (the digital rail)
The single most important new screen. Reached from an active checkout.

```
┌─────────────────────────────┐   ┌─────────────────────────────┐
│  Sell an item               │   │  Show this to your customer │
│                             │   │                             │
│  Product  [Candles      ▾]  │   │      ▛▀▀▀▀▀▀▀▀▀▀▀▘          │
│  Quantity [ 3 ]             │   │      █  QR CODE  █          │
│  Price    $30.00 / unit     │──▶│      ▙▄▄▄▄▄▄▄▄▄▄▖          │
│                             │   │                             │
│  Customer pays      $90.00  │   │  $90.00 · 3 × Candles       │
│  Your share         $52.65  │   │  ⏱ expires in 4:52          │
│                             │   │  ● waiting for payment…     │
│  [ Card / QR ]  [ Cash ]    │   │  [ Cancel ]                 │
└─────────────────────────────┘   └─────────────────────────────┘
                                              │ paid
                                              ▼
                                  ┌─────────────────────────────┐
                                  │  ✓ Paid — $52.65 is yours   │
                                  │  Arriving in 3 days (Bronze)│
                                  └─────────────────────────────┘
```

Design notes:
- **Show the seller's share before they choose the rail** — the 8% vs 10% difference is the whole
  incentive, so make it visible: *"Card: you keep $52.65 · Cash: you keep $51.30"*.
- Poll payment status; a socket update is better if available.
- Must work one-handed, outdoors, in sunlight — high contrast, large touch targets.

### NEW — "My balance / debts"
Outstanding cash debt, credit limit, and how much stock they can still take.
Framed as *"$120 will be taken from your next payouts"*, never as collections language.

### NEW — Payment status / receipt detail
Per-sale record: rail, amount, customer, refund state.

### NEW — Credit & limits card
"You can hold up to $200 of stock · currently holding $150 · Silver unlocks $1,000."
Makes trust tangible and gives sellers a reason to build it.

### MODIFIED — `MyInventory`
- Per-checkout: units sold by rail, remaining, and value at risk
- "Collect payment" as the **primary** action (currently "Log a sale" implies cash-only)
- Warn when close to a credit limit

### MODIFIED — `LogSale`
Becomes explicitly the **cash** path. Must state the consequence plainly:
> *"You keep the $90 cash. $34.65 (hub share + fee) will be taken from your next payouts."*

Sellers must not discover the debt later.

### MODIFIED — `SellerEarnings`
- Split settled/pending by rail
- Show outstanding debt as a deduction line
- Show enforced payout timing ("held 3 days — Bronze") instead of descriptive text
- Keep the payout-account connect banner already added

### MODIFIED — `SettlementView`
Show funding source, per-leg payout status, and any debt netted — so "settled" is never ambiguous.

---

## Hub owner

### NEW — Payment policy settings
Accept cash sales? Refund window. Who absorbs refunds. Insurance opt-in.
*(Sits alongside the approval-policy controls already built.)*

### NEW — Refunds screen
Issue and track refunds; see which party absorbed each.

### MODIFIED — `HubSettlements`
Add rail breakdown (cash vs digital), payout status per settlement, and refunds deducted.
Hubs need to know which sellers generate cash sales — that is their risk exposure.

### MODIFIED — `HubApprovals`
Show the requesting seller's **outstanding debt** and **credit utilisation** alongside their Trust
Score. A seller who owes money on three other checkouts is a materially different risk.

### MODIFIED — `HubInventory`
Show value at risk per holder, not just quantities.

---

## Customer — all public, no authentication

### NEW — Payment page (`/pay/:token`)
The customer's entire experience. Must be **fast, mobile-first, and installation-free**.

```
┌──────────────────────────────┐
│  Taco Loco                   │
│  3 × Soy Candles             │
│                              │
│         $90.00               │
│                              │
│  [  Apple Pay            ]   │
│  [  Google Pay           ]   │
│  [  Card                 ]   │
│                              │
│  Secured by Stripe           │
└──────────────────────────────┘
```

- No signup. No app install. Wallet buttons first — they are one tap.
- Must load on a poor mobile connection.

### NEW — Receipt page
Confirmation, what was bought, from whom, and a refund-request link.

### NEW — Refund request
Simple reason-based form from the receipt.

---

## Admin

### NEW — Ledger explorer
Accounts, entries, drill-down by reference. The finance team's window into the books.

### NEW — Reconciliation dashboard
Cached balances vs summed entries, Stripe balance vs ledger expectation, failed payouts, and
outstanding debt totals. **This is the operational early-warning system** and should be checked daily.

---

## Registry additions

**`endpoints.ts`**
```
salesPaymentIntent, payPage, payConfirm, salePaymentStatus, saleCancelPayment,
checkoutSales, saleRefund, saleRefunds, myDebts, debtRepay, myCredit,
financeAccounts, financeEntries, financeReconciliation, hubPaymentPolicy, settleCheckout
```

**`keys.ts`**
```
salePayment(id), myDebts, myCredit, checkoutSales(id), saleRefunds(id),
hubPaymentPolicy(id), financeReconciliation
```

**New feature folders:** `src/features/payments/` (customer-facing), `src/features/debt/`,
`src/features/finance/` (admin).

---

## Cross-cutting requirements

**Offline resilience.** Street commerce happens where signal is poor. Cash sales must queue locally
and sync (the existing offline queue pattern in `QrCheckout` is the model). Digital payments cannot
be queued — so when connectivity fails, the UI must **fall back to cash gracefully** rather than
blocking the sale.

**Money display.** Always `formatCents`; never floating point. Always show the seller's take, not
just the customer's total — sellers think in "what do I keep".

**Honest copy.** Two rules learned from the current implementation:
1. Never say "settled" or "paid" unless money actually moved.
2. Never let a seller discover a debt after the fact — state it at the moment of the cash sale.

**Accessibility.** The payment page will be used one-handed, outdoors, by users of varying literacy.
Large targets, high contrast, minimal text, and currency always rendered in full.

**Demo mode.** Every new hook needs an `isMapDemo` branch so the demo build keeps working without a
backend — consistent with the existing codebase.
