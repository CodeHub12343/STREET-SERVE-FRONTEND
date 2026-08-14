# The Customer Purchase Flow

**Sections 1–3 describe the current implementation. Section 4 onward is recommendation.**

---

## 1. The customer's journey today

```
Customer walks past a street seller
        ▼
Sees something they want
        ▼
Hands over CASH
        ▼
Takes the item and walks away
        ▼
        ✗ no account          ✗ no receipt
        ✗ no order record     ✗ no payment through StreetServe
        ✗ no refund right     ✗ no review of what they bought
```

**The customer does not exist in the consignment software.** The only trace of them is the seller
later typing "sold 4 for $50" into the app — a number nobody can verify.

For comparison, a customer buying from a *vendor* (the orders module) has a full journey: cart,
server-priced quote, card payment, order record, status tracking, receipt. Consignment has none of it.

---

## 2. What this costs the business

| Lost | Consequence |
|---|---|
| **The payment** | The platform's fee is uncollectable — this is the P0 finding |
| **The customer relationship** | No account, so no repeat purchase, no marketing, no lifetime value |
| **Sales truth** | Amounts are self-reported; under-reporting is profitable and invisible |
| **Demand data** | No idea what sells, where, at what price, to whom — which cripples the AI recommendations already built |
| **Consumer protection** | No receipt and no refund path; a legal problem in a retail context |
| **Trust signal** | Customers can't review a seller they have no recorded relationship with |
| **Network effects** | Customers never become a reason to open the app |

The last one is strategic. In every successful marketplace, **the customer is the demand side that
makes supply want to join.** StreetServe currently has hubs and sellers but no demand side at all —
so it cannot create the flywheel that makes marketplaces defensible.

---

## 3. Why the current design ended up here

This was a reasonable MVP simplification, not an oversight to mock. Street vending *is* a cash
business; building custody, terms, trust and approvals first was the right sequencing. The mistake
was that the **settlement code was written as if the digital rail already existed**, which is what
created the financial hole. Had settlement simply recorded the split without transferring money, the
system would have been an accurate (if incomplete) consignment ledger.

---

## 4. Recommended customer flow

Two rails, one ledger. The customer chooses at the point of sale.

### Rail A — Digital (primary, encouraged)

```
Seller opens "Sell an item" and picks the product + quantity
        ▼
App shows a QR code / payment link  (amount is SERVER-priced from the checkout snapshot)
        ▼
Customer scans with their own phone — no app install required
        ▼
Pays by card / Apple Pay / Google Pay / local wallet
        ▼
┌───────────────────────────────────────────────────────────┐
│  Money lands on the PLATFORM balance (separate charges)    │
│      then splits, in one transfer_group:                   │
│        • platform fee   → retained                         │
│        • seller net     → seller's connected account       │
│        • hub share      → hub's connected account          │
└───────────────────────────────────────────────────────────┘
        ▼
Customer gets a digital receipt (SMS/email) + optional account
Sale is recorded automatically — nothing is self-reported
```

**Why a QR/payment link and not a card reader:** zero hardware cost, works on any seller's phone,
and the customer pays with the device already in their hand. Square built a hardware business here;
StreetServe should not — hardware is capital the target sellers don't have.

**Critical Stripe detail:** this must use **separate charges and transfers**, *not* destination
charges. A destination charge can pay only **one** connected account, and consignment needs a
**three-way** split. The money must land on the platform balance first, then be split. The existing
settlement code already uses `createTransfer` with a `transfer_group` — the plumbing is half-built.

### Rail B — Cash (supported, priced as risk)

```
Customer pays cash → seller logs the sale as CASH
        ▼
No money moves through the platform
        ▼
A DEBT is recorded against the seller:
      hub share + platform fee   (e.g. $374.75 of a $903 sale)
        ▼
Recovered by:
   1. netting against the seller's next digital payouts (automatic, preferred)
   2. seller settling the balance in-app by card
   3. blocking new checkouts once debt exceeds their trust-tier limit
```

Cash is never *forbidden* — that would be unrealistic and would push sellers off-platform — but it
is **bounded**: a seller can only accumulate as much cash debt as their trust tier permits, and they
cannot take more stock until they clear it.

### Making the digital rail the obvious choice

Don't mandate; make it better for everyone:

- **Seller:** a lower platform fee on digital sales (e.g. 8% vs 10%), instant payout at higher tiers,
  no debt to track, and trust that rises faster with verified sales.
- **Customer:** a receipt, a refund right, and a purchase history.
- **Hub:** confidence the reported figures are real.

Fee differentiation is the cleanest lever: it prices the risk difference honestly rather than
policing behaviour.

---

## 5. What the customer needs (minimum viable)

| Need | Why |
|---|---|
| Pay without installing an app | Street purchases are impulsive; an install kills the sale |
| See what they're buying and the price before paying | Basic trust and fraud prevention |
| A receipt | Consumer protection, and the seed of an account |
| A refund path | Legal requirement in most retail contexts |
| Optional account creation *after* paying | Converts a one-off buyer into a returning customer |

Deliberately **not** required: an account before purchase. Forcing signup before a $5 mango would
destroy conversion. Capture the payment, then invite.

---

## 6. Refunds — the flow that must exist

Today this is impossible. It needs to work like this:

```
Customer requests a refund (from receipt link, or via the seller)
        ▼
Was the sale settled yet?
        │
   NO ──┴── YES
   │          │
   │          ▼
   │    Reverse the transfers (Stripe reverse_transfer),
   │    refund the application fee, and write REVERSAL
   │    entries to the ledger — never mutate the original
   │          │
   ▼          ▼
Refund the customer from the platform balance
        ▼
Restore inventory if the item comes back
        ▼
Trust adjustment if the refund reflects seller fault
```

The Stripe integration **already supports** `reverse_transfer` and `refund_application_fee` — the
consignment flow just never calls them. The harder half is the ledger: because settlements are
immutable (correctly), a refund must be a **new reversing entry**, not an edit.

---

## 7. Edge cases the customer flow must survive

| Case | Required behaviour |
|---|---|
| Customer pays but the seller has no stock left | Oversell guard rejects before charging; never charge first |
| Payment succeeds, app crashes before recording | Webhook reconciles the charge to the sale; idempotency prevents doubles |
| Partial refund (2 of 5 items) | Proportional reversal across all three parties |
| Customer disputes the card charge (chargeback) | Freeze the related payouts; platform absorbs, then recovers per policy |
| Seller sells the last unit to two customers at once | Atomic decrement — the existing oversell guard already handles this |
| Offline — no signal on the street | Queue the sale locally, sync later; cash rail as the fallback |
| Customer pays partly cash, partly card | Split-tender: record two sale legs against one checkout |
| Refund after the seller has been paid and spent it | Recover from future earnings; platform carries the float, bounded by trust tier |

The offline case deserves emphasis: **street commerce happens in places with poor connectivity.**
The digital rail must degrade gracefully to the cash rail, not fail. A payment flow that only works
on good signal will drive sellers back to untracked cash.
