# The Seller ↔ Hub Owner Relationship

**Sections 1–4 describe the current implementation. Section 5 onward is analysis and recommendation.**

---

## 1. What the relationship legally is

The seller and hub owner are in a **bailment** — the hub owner (*bailor*) hands physical possession
of goods to the seller (*bailee*) for a purpose, while keeping ownership.

```
        OWNERSHIP                          POSSESSION
   ┌─────────────────┐              ┌─────────────────┐
   │  Hub Owner      │              │  Seller         │
   │  owns the goods │──────────────│  holds the goods│
   │  start → sale   │  bailment    │  checkout→return│
   └─────────────────┘              └─────────────────┘
              │
              │ ownership passes DIRECTLY to the customer at the moment of sale
              ▼
        ┌──────────┐
        │ Customer │        ← ownership NEVER passes through the seller
        └──────────┘
```

**The seller never owns the goods.** This is what makes consignment work for someone with no
capital: they are not buying stock, so they risk no money. The hub carries the inventory risk; the
seller carries the *custody* risk.

The platform records this properly. The Seller Agreement is an explicit, versioned clickwrap of type
`bailment`, and checkout is blocked until it's accepted at the current version.

---

## 2. What each party owes the other

| | **Hub owner owes the seller** | **Seller owes the hub owner** |
|---|---|---|
| Before | Honest description, working goods, stated terms | Identity, verification to Bronze, accepted agreement |
| During | Honour the agreed split; don't change terms retroactively | Reasonable care of the goods; sell within the terms |
| Sale | Pay the agreed share | Report every sale honestly and promptly |
| After | Accept good-condition returns without charge | Return unsold stock by the deadline, in good condition |

The **terms snapshot** is the mechanism that enforces the hub's "don't change terms retroactively"
obligation: every checkout copies the product's terms at hand-over, so a later edit to the product
cannot rewrite an agreement already in force. This is well designed.

---

## 3. The terms the hub owner sets

| Term | Meaning | Default |
|---|---|---|
| **Consignment split %** | Seller's share of the distributable amount (after platform fee) | 65% |
| **Term length** | How long the seller may hold the goods (or `no_limit`) | 30 days |
| **Minimum authorised price** | Per-unit floor the seller may not sell below | none |
| **May discount** | Seller may reduce price above the floor | yes |
| **May bundle** | Seller may sell items together | yes |
| **May accept offers** | Seller may negotiate | yes |
| **May sell below minimum** | Seller may break the floor | **no** |
| **Return responsibility** | Who physically moves unsold stock back | seller |
| **Return window** | Days to return after the term ends | 14 |
| **Storage fee / day** | Charged for stock held past terms | 0 |
| **Abandonment after** | Days until unreturned stock is deemed abandoned | 30 |

Note that `storage_fee_cents_per_day` and `abandonment_after_days` are **stored and snapshotted but
never actually charged or enforced** — they exist in the data model awaiting the financial layer.

---

## 4. How the split is calculated

The seller's percentage applies to the **distributable amount** — *after* the platform fee, not
before. Using your live settlement:

```
Gross sales                                $903.00     ← what customers paid
  − Platform fee (10%)                     − $90.30    ← StreetServe's cut, taken first
  ──────────────────────────────────────────────────
  Distributable                             $812.70
      ├─ Seller  65%  (floored)             $528.25
      └─ Hub     remainder                  $284.45
```

**Why the fee comes first matters commercially:** the seller and hub *share* the cost of the
platform proportionally. If the fee were taken after the split, one party would bear it alone. The
current arrangement is the fairer one and should be kept.

**Rounding** favours the hub: the seller's share is floored and the hub takes whatever remains, so
the three amounts always reconcile exactly to the gross with no cent created or destroyed.

---

## 5. The relationship's central weakness (analysis)

> **In the current implementation, the party who physically holds the customer's money is the party
> with the least accountability and the weakest balance sheet.**

The seller collects cash. They then have three obligations they can simply decline to meet:

1. **Report the sale honestly** — under-reporting directly increases their take.
2. **Hand over the hub's share** — there is no mechanism that makes them.
3. **Return unsold stock** — reporting it "lost" carries no financial consequence.

The platform currently resolves this by **paying the hub itself** — which protects the hub but is
exactly the behaviour that bankrupts the platform.

The economic reality is a **debt relationship the software does not model**:

```
At the moment of a cash sale, the seller owes:

    Hub share       $284.45      (the hub's property was sold)
  + Platform fee     $90.30      (the service was used)
  ─────────────────────────
  = Total owed      $374.75      ← this liability exists in reality
                                   and appears NOWHERE in the system
```

The seller is functionally a **collections agent holding platform-and-hub money**, but is modelled
as a *payee*. That inversion is the root cause of the financial gap.

---

## 6. Trust: the right instrument, under-used

The Trust Score is the correct tool for pricing this risk, and the newly built approval gate uses it
well. But today:

- New sellers start at **100 (maximum)** — trust is granted, not earned.
- Trust affects **approval** but not **credit limits**, **payout timing**, or **cash eligibility**.
- Lost/damaged inventory doesn't reduce it in proportion to value.
- There is no consequence ladder between "fine" and "banned".

**Recommendation:** make Trust the seller's *credit rating*. It should govern how much uncollateralised
inventory value they may hold at once, whether they may take cash sales at all, how fast they are
paid, and what happens when they fail an obligation.

| Tier | Suggested max inventory at risk | Cash sales | Payout speed |
|---|---|---|---|
| Unverified | $0 — cannot check out | No | — |
| Bronze | $200 | Digital only | 3-day hold |
| Silver | $1,000 | Cash allowed up to $200 outstanding debt | 1-day hold |
| Gold | $5,000 | Cash allowed up to $1,000 outstanding debt | Instant |

---

## 7. Recommended relationship model

Keep the bailment. Change **who holds the money**, not who owns the goods.

```
CURRENT (broken)                         RECOMMENDED
─────────────────                        ───────────
Customer → Seller (cash)                 Customer → PLATFORM (card, in-app)
Platform → Seller  (payout)                        ├──► Platform fee   (retained)
Platform → Hub     (payout)                        ├──► Seller net     (transfer)
                                                   └──► Hub share      (transfer)
Platform funds both. Insolvent.          Platform splits money it holds. Solvent.

                                         CASH FALLBACK
                                         Customer → Seller (cash)
                                         Seller now OWES hub + platform
                                           → recorded as a debt
                                           → netted from future digital earnings
                                           → capped by trust-tier credit limit
```

The bailment, the terms snapshot, the custody evidence, the approval gate and the split maths all
stay exactly as they are. What changes is that **the customer's payment enters the platform**, so the
platform is distributing money it actually holds — and where it can't (cash), the seller's obligation
is recorded as a debt rather than silently absorbed.

---

## 8. Shelter co-signing — an unfinished idea worth completing

The approvals UI displays a **"Shelter cosigned"** badge, and the design docs describe a
shelter-cosigned onboarding path, but the checkout model has no co-sign field — the flag is currently
hardcoded `false`.

The concept is strong and directly addresses the trust problem: a partner shelter or nonprofit
**vouches for a seller who has no history**, letting them start with a real credit limit instead of
nothing. In credit terms the shelter is a guarantor.

Worth building properly, because it is the answer to "how does a brand-new seller with no track
record ever get their first stock?" — a question the platform's whole social mission depends on.
