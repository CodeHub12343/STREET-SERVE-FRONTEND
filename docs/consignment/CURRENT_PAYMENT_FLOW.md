# Current Payment Flow — Where the Money Actually Goes

**This document describes what the system does *today*. It contains no recommendations.**

---

## The short version

There are **exactly two payment operations** in the entire consignment lifecycle. Both send money
**out** of StreetServe. There are **zero** operations that bring money **in**.

---

## Every payment event in the consignment lifecycle

| # | Lifecycle step | Payment event? | Direction | Notes |
|---|---|---|---|---|
| 1 | Seller reserves stock | **None** | — | Inventory hold only |
| 2 | Hub approves | **None** | — | Status change only |
| 3 | Seller collects goods | **None** | — | Custody change only |
| 4 | **Customer buys from seller** | **None** | — | Happens entirely outside the system |
| 5 | Seller logs the sale | **None** | — | Writes an `inventory_sales` row |
| 6 | Seller returns unsold stock | **None** | — | Restocks inventory |
| 7 | **Settlement — seller payout** | **Transfer** | **OUT** ⬅ platform | `payoutTransfer` → seller's connected account |
| 8 | **Settlement — hub payout** | **Transfer** | **OUT** ⬅ platform | `payoutTransfer` → hub business's connected account |

**Inflows: 0. Outflows: 2.**

---

## Who holds the money, moment by moment

Follow a single $903 of goods:

```
TIME ──────────────────────────────────────────────────────────────────────►

 Hub hands over stock
   │  Hub holds: goods worth $903 (as inventory)
   │  Seller holds: nothing
   │  Platform holds: nothing
   ▼
 Customer pays the seller CASH on the street
   │  Hub holds: nothing               ← goods are gone
   │  Seller holds: $903 CASH          ← ALL the money is here
   │  Platform holds: nothing          ← never saw a cent
   ▼
 Seller logs the sale in the app
   │  (nothing changes financially — this is a database write)
   ▼
 SETTLEMENT RUNS
   │  Platform pays seller  $528.25   ← from platform's own balance
   │  Platform pays hub     $284.45   ← from platform's own balance
   │  Platform "earns" fee   $90.30   ← on paper only; no cash was collected
   ▼
 FINAL STATE
      Seller:   $903.00 cash  +  $528.25 transfer   =  $1,431.25   ← paid twice
      Hub:      $284.45                                            ← correct amount, wrong source
      Platform: −$812.70                                           ← pure loss
```

**The platform lost $812.70 on a sale where it was supposed to earn $90.30.**

---

## What actually happened in your database

This is not theoretical. Running the diagnostic against your live data:

```
─── settlements (1) ───
  checkout=6a606db94d962415d7695111
  gross=90300  sellerNet=52825  hub=28445
      sellerTransfer = NONE (no payout-enabled account)
      hubTransfer    = tr_1TvzynDQLfeG3uzwennMOHZE     ← a REAL Stripe transfer
```

- The hub received a **real transfer of $284.45** out of the platform's Stripe balance.
- The seller received **nothing**, purely by accident — they had never connected a payout account,
  so `payoutTransfer` returned `null` and the code moved on without comment.

That accident is the only reason the loss was $284.45 instead of $812.70.

---

## Why the seller transfer silently vanished

```
payoutTransfer(seller, $528.25)
        │
        ├─ amount ≤ 0 ?                         no
        ├─ account exists AND payouts_enabled ? ─── NO ──► return null   ← silent
        │                                                     │
        └─ otherwise: create Stripe transfer                  ▼
                                          settlement records seller_payout_ref = null
                                          seller sees "Settled net $528.25 · 1 payout"
```

The seller's earnings screen displayed **$528.25 settled** while no money had moved and nothing
anywhere flagged a problem. The record said "settled"; the bank said nothing happened.

*(A "Payout on hold" notification and a Connect-onboarding path have since been added, so this
particular silence is now broken. The underlying model problem remains.)*

---

## How the rest of the platform does it (for contrast)

The **orders** module — a customer buying from a vendor in-app — is built correctly, using a Stripe
**destination charge**:

```
Customer card
     │  one PaymentIntent
     ▼
 ┌─────────────────────────────────────────┐
 │  application_fee_amount → PLATFORM      │  ← platform keeps its fee
 │  transfer_data.destination → VENDOR     │  ← vendor gets the rest, automatically
 └─────────────────────────────────────────┘
```

Money comes **in**, the platform's cut is retained automatically, and the remainder lands with the
vendor. Solvent by construction.

**Consignment has no equivalent.** And crucially, a destination charge could not serve consignment
even if one were added, because it pays **exactly one** connected account. Consignment needs a
**three-way** split (platform / seller / hub). That constraint drives the recommendation.

---

## Reconciliation: where it happens today

**Nowhere.** Specifically, there is no:

- Ledger account per party (no notion of "what does the platform owe the seller?")
- Receivable or payable (no notion of "what does the seller owe the hub?")
- Balance check before transferring (the platform will attempt to pay out money it doesn't have)
- Link between a `settlement` row and any inbound money (there is none to link to)
- Reversal path (settlements are immutable, so a refund after settlement has nowhere to go)
- Cash-vs-digital distinction (`loggedVia: 'manual' | 'qr_scan'` is recorded but never affects money)

The settlements collection is an accurate record of *what was calculated*. It is not, and cannot be,
a record of *what was paid* — because for the seller side, in your live data, nothing was.

---

## The accounting problems, stated formally

1. **No inflow.** Revenue is recognised (a $90.30 platform fee) against a transaction that produced
   no cash. This is fictional revenue.
2. **Unfunded liabilities.** The platform creates an obligation to pay two parties without holding
   the corresponding funds.
3. **Double payment of the seller.** In the cash reality the seller keeps the gross *and* receives a
   payout.
4. **Unrecoverable hub share.** The hub is owed $284.45 by *the seller* (who holds the cash) but is
   paid by *the platform*, which has no mechanism to recover it.
5. **Silent partial settlement.** A settlement can be marked complete with one, both, or neither
   transfer actually executed, and the record does not distinguish these cases.
6. **No idempotent recovery.** Settlements are immutable and there is no retry job, so a transfer
   that failed at settlement time can never be completed later.

---

## Where the fee is right

Worth noting for balance: **the fee calculation itself is well built.** It resolves through a
versioned `fee_schedule` registry by fee type (`consignment` → 1000 bps = 10%), with a code-level
fallback, so pricing is configuration rather than code. Rounding is deliberate and safe — the
seller's share is floored and the hub takes the remainder, so no cent is ever created or lost.

The arithmetic is correct. The problem is that it is arithmetic performed on money the platform
never received.
