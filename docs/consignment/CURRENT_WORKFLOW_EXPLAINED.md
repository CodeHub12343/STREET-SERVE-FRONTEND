# Current Workflow — Explained in Plain Language

**This document describes what the system does *today*. It contains no recommendations.**

---

## The cast

| Who | What they are | What they want |
|---|---|---|
| **Hub owner** | A business with a physical location (shop, church, warehouse, maker studio) that owns stock | Move inventory without hiring staff or opening more shops |
| **Seller** | A street vendor who takes stock on consignment and sells it in public | Earn without capital — they cannot afford to buy inventory upfront |
| **Customer** | Whoever buys from the seller on the street | A mango, a candle, a tote bag |
| **StreetServe** | The platform | A fee on the value it moves |

The whole product exists because of one fact: **the seller has no money to buy stock, and the hub
has stock it cannot move.** Consignment bridges that.

---

## Ownership — the thing to get straight first

> **The hub owner owns the goods the entire time the seller is holding them.**

This is a *bailment*, not a sale. When a seller checks out 10 candles, no purchase happens. The
candles are still the hub's property; the seller is legally responsible for them while they hold
them. Ownership passes **directly from hub to customer** at the moment of sale — it never passes
through the seller.

That single fact explains every design choice below: the QR scan, the condition photos, the trust
score, the approval queue, the return deadline. They all exist because valuable property is leaving
a building in someone else's hands.

---

## 1. The hub owner's workflow

```
Register business  →  Register as hub  →  Add products with terms  →  Approve requests
      (vendor)          (get QR secret)      (H-02 catalog)              (H-03 queue)
                                                                              │
                          Get paid  ←  Watch stock move  ←──────────────────┘
                          (H-05)         (H-04 holders)
```

**Step 1 — Become a hub.** The owner registers a business, then registers it as a hub. The system
generates a **QR secret** — a unique code they print and post at their counter. This is the physical
key to their inventory.

**Step 2 — List products.** For each product the owner sets not just name/price/quantity but the
**terms of the consignment**:

| Term | What it means | Default |
|---|---|---|
| Consignment split % | The seller's share of the proceeds | 65% |
| Term length | How long the seller may hold it before it must come back | 30 days |
| Minimum authorised price | The floor the seller may not sell below | none |
| Seller permissions | May they discount? bundle? accept offers? sell below the floor? | yes/yes/yes/no |
| Return responsibility | Who physically returns unsold stock — seller or hub | seller |
| Return window | Days to return after the term ends | 14 |

These terms are **snapshotted onto each checkout** at hand-over. If the owner later changes the
product, existing checkouts keep the terms they were agreed under. This is correct and important.

**Step 3 — Approve requests.** When a seller asks for stock, it either clears the hub's
auto-approve rule (trust ≥ 85 *and* value ≤ $200 by default) or lands in the approval queue showing
the seller's name, Trust Score, and the declared value at risk. The owner approves or declines.
Declining puts the held stock back on the shelf.

**Step 4 — Watch and get paid.** The hub sees who is holding what and their return deadlines, and a
settlements screen showing gross, hub share, and settled date per checkout.

---

## 2. The seller's workflow

```
Get seller role  →  Verify to Bronze  →  Browse inventory  →  Reserve  →  Scan QR + photo
                                                                                  │
        Settlement  ←  Return unsold  ←  Log each sale  ←  Collect stock  ←──────┘
```

**Step 1 — Qualify.** The seller needs the `seller` role **and Bronze verification tier**. Checkout
is blocked below Bronze — this is the platform's first risk control. They must also accept the
**Seller Agreement** (the bailment clickwrap), versioned and recorded.

**Step 2 — Browse and reserve.** They see nearby hub inventory: what it is, the hub, their split,
how many units, the return window, and the per-unit price.

**Step 3 — Take custody.** At the hub they scan the posted **QR code** and take a **condition
photo**. The QR proves they were physically present at that hub; the photo proves what condition the
goods were in when handed over. Both are required.

**Step 4 — Sell.** Out on the street, for each sale they open the app and log *quantity sold* and
*amount*, optionally with a proof photo. An **oversell guard** makes it impossible to report more
sold than they took, even under concurrent requests.

Two rules are enforced here:
- If the owner set a **minimum authorised price**, a sale below it is blocked unless the seller was
  granted `may_sell_below_min`.
- Selling is blocked entirely unless the checkout is `active` (i.e. approved).

**Step 5 — Return and settle.** They return unsold units (with a condition assessment: good /
damaged / lost). Good-condition returns go back into the hub's sellable stock. Returning triggers
**settlement**. Selling out entirely also triggers settlement automatically.

**Lifecycle controls** the seller also has: extend the term, reduce the price (floored at the
owner's minimum), or end the consignment early (moves to Return-Pending).

---

## 3. The customer's journey

This is the shortest section in the document, because:

> **The customer does not exist in the software.**

They walk up to a seller on the street, hand over cash, and take the item. StreetServe never sees
them. There is no customer account involved, no receipt, no order record, no payment. The only
trace they leave is the seller later typing "I sold 4 for $50" into the app.

*(See `CUSTOMER_PURCHASE_FLOW.md` for the full analysis of what this costs the business.)*

---

## 4. QR codes and chain of custody

The QR secret is generated once at hub registration and shown to the owner **once**. It functions
as a physical presence check:

```
Seller stands at hub counter
        │  scans posted QR  →  token must equal hub.checkout_qr_secret
        ▼
Takes condition photo       →  stored to R2, URL recorded on the checkout
        ▼
Agreement version recorded  →  proves what terms they accepted
        ▼
Custody transferred         →  chain of custody now: HUB → SELLER
```

At return, another condition photo and a good/damaged/lost assessment close the loop. So for any
unit of stock the platform can answer *who had it, from when, in what condition, under what terms*.

**One weakness worth naming:** the QR secret is a **static shared string**. Anyone who photographs
the printed code can reserve stock from anywhere in the world. It proves knowledge of the code, not
physical presence.

---

## 5. Sale logging — what it actually is

This is the most misunderstood part of the system, so it is worth stating bluntly:

> **Logging a sale is bookkeeping, not payment.** It creates a database row. No card is charged, no
> money moves, no customer is involved.

A sale record contains: quantity sold, amount, how it was logged (`manual` or `qr_scan`), and an
optional proof photo. That is all. The money for that sale is, in the real world, cash in the
seller's pocket.

---

## 6. Settlement — the maths

Settlement runs when the seller returns stock, or automatically when they sell out. Using your real
numbers:

```
Gross sales (sum of logged sales)                       $903.00
  − Platform fee  (10%, from the fee registry)          − $90.30
  ─────────────────────────────────────────────────────────────
  = Distributable                                        $812.70
      ├─ Seller net   (65% split, rounded down)          $528.25
      └─ Hub share    (the remainder)                    $284.45
```

The platform fee rate comes from the **versioned fee schedule**, not hardcoded. The split percentage
is the one snapshotted onto the checkout at hand-over. Rounding always favours the hub (the seller's
share is floored, the hub takes the remainder) so cents can never go missing.

The result is written to an **immutable, append-only** settlements record, and the checkout is
marked `settled`. The seller's Trust Score is then recomputed.

**And then it attempts to transfer money out to both the seller and the hub.** That is where the
model breaks — see `CURRENT_PAYMENT_FLOW.md`.

---

## 7. The state machine

```
                    ┌──────────────────┐
   seller reserves  │ pending_approval │  (hub must decide)
        ───────────►└────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
      approve │                             │ decline
              ▼                             ▼
        ┌──────────┐                  ┌──────────┐
        │  active  │                  │ declined │  stock returns to shelf
        └────┬─────┘                  └──────────┘
             │
   ┌─────────┼──────────┬────────────────┐
   │         │          │                │
   │ sells   │ term     │ seller ends    │ deadline
   │ out     │ expires  │ early          │ passes
   ▼         ▼          ▼                ▼
┌────────┐  ┌────────────────┐      ┌─────────┐
│settled │  │ return_pending │      │ overdue │
└────────┘  └───────┬────────┘      └─────────┘
                    │ returns
                    ▼
                ┌────────┐
                │settled │
                └────────┘
```

Background jobs handle the passage of time: expiry notices at 14/7/3 days, automatic movement to
Return-Pending on expiry, and an overdue sweep for missed return deadlines.

---

## What this workflow gets right

The physical and contractual model is genuinely well designed. Ownership is unambiguous, terms are
snapshotted so history can't be rewritten, custody is evidenced at both ends, concurrency is handled
correctly, and the risk decision (approval) is separated from the mechanical one (checkout).

The gap is not in this workflow. It is that **this workflow has no money in it**, while the
settlement step behaves as though it does.
