# Payment Model Comparison

**Objective comparison of every viable model, scored before any recommendation is made.**

---

## The models under consideration

| | Model | One-line description |
|---|---|---|
| **0** | **Current implementation** | Record sales, pay both parties from platform funds, collect nothing |
| **A** | **Pure cash + collections** | Cash only; seller owes hub+platform; platform collects the debt |
| **B** | **Pure in-app checkout** | All sales must run through the platform; cash forbidden |
| **C** | **Hybrid (digital-first, cash supported as debt)** | Digital preferred and cheaper; cash allowed but creates a bounded debt |
| **D** | **Escrow / prefunded float** | Platform holds a seller deposit that covers the hub's exposure |
| **E** | **Wholesale flip (not consignment)** | Seller buys stock upfront at a discount; no split, no settlement |

---

## Model 0 — Current implementation

**How it works.** Sales are logged manually. Settlement calculates a three-way split and transfers
money out to the seller and hub from the platform's Stripe balance. Nothing is ever collected.

| ✅ Advantages | ❌ Disadvantages |
|---|---|
| Simple for sellers — nothing to learn | **Platform loses money on every sale** |
| Works with zero connectivity | Revenue is fictional; fee is uncollectable |
| Custody and terms modelling is excellent | Sale amounts unverifiable; under-reporting is profitable |
| | No refunds, no customer, no demand data |

**Verdict: not viable.** This is not a business model; it is an accounting error. Everything else in
this document is a candidate to replace it.

---

## Model A — Pure cash + collections

Seller collects all cash and owes the hub share + platform fee. The platform invoices and collects.

| ✅ Advantages | ❌ Disadvantages |
|---|---|
| Matches how street vending actually works today | **Collections from low-income sellers is brutal and often futile** |
| No connectivity requirement | Requires debt-collection machinery, and possibly a lending licence |
| Zero payment-processing cost | Sale amounts still self-reported → same fraud exposure |
| Fast to build | No customer relationship, no demand data, no refunds |
| | Reputationally dangerous: chasing debt from vulnerable users |

**Precedent:** traditional consignment shops. They work because the shop *is* the point of sale and
handles the till — not because collection from a roaming agent works.

**Verdict:** viable but weak. The fraud problem is unsolved and the collections burden falls on
exactly the people the platform exists to help.

---

## Model B — Pure in-app checkout

All sales must be processed through StreetServe. Cash is prohibited.

| ✅ Advantages | ❌ Disadvantages |
|---|---|
| **Fee collection is automatic and guaranteed** | **Unrealistic for street commerce** — many customers carry cash |
| Sale amounts are verified, not reported | Fails on poor connectivity |
| Full customer relationship + demand data | Sellers will transact off-platform and log nothing |
| Refunds, disputes, receipts all become possible | Excludes unbanked customers |
| Clean reconciliation | Enforcement is impossible — you cannot stop someone accepting cash |

**Precedent:** Uber, DoorDash, Etsy — all effectively cash-free. Note they all operate where the
*customer* is already online and the transaction is pre-arranged. A street mango is neither.

**Verdict:** financially ideal, operationally naive. A rule you cannot enforce simply creates
under-reporting — the same fraud as Model A, but with the platform pretending otherwise.

---

## Model C — Hybrid: digital-first, cash as bounded debt

Digital is the default and is cheaper for the seller. Cash is permitted but records a debt, capped by
the seller's trust tier, recovered by netting against future digital earnings.

| ✅ Advantages | ❌ Disadvantages |
|---|---|
| **Reflects reality** — cash exists, so model it rather than ban it | Most complex to build |
| Fee collection is guaranteed on the digital rail | Requires a real ledger with debt accounting |
| Economic incentive (lower fee) pulls volume digital without policing | Cash sales remain self-reported |
| Cash risk is **bounded** by credit limits, not unlimited | Needs clear, humane debt-recovery policy |
| Gives Trust Score genuine economic meaning | Two rails to maintain and explain |
| Degrades gracefully offline | |

**Precedent:** Square (card-first, cash tracked in the same ledger), Shopify POS, and micro-finance
groups that use graduated credit limits based on repayment history.

**Verdict:** strongest overall. It is the only model that is simultaneously honest about street
commerce and solvent.

---

## Model D — Escrow / prefunded float

The seller deposits (or is advanced) funds covering the hub's exposure before taking stock.

| ✅ Advantages | ❌ Disadvantages |
|---|---|
| Hub is fully protected against loss | **Destroys the product's entire purpose** |
| Simple accounting | The target seller has no capital — that is *why* they need consignment |
| Losses are recoverable from the deposit | Excludes exactly the users the platform exists to serve |

**Verdict:** rejected on mission grounds. Requiring capital from people who have none defeats the
point. *(A shelter-backed guarantee — see below — achieves the same protection without the capital
requirement, and is the right version of this idea.)*

---

## Model E — Wholesale flip

The seller buys stock upfront at a discount and keeps everything above their cost.

| ✅ Advantages | ❌ Disadvantages |
|---|---|
| Radically simpler — one payment, no settlement, no split | Same fatal flaw as D: requires seller capital |
| No custody accounting needed | Seller carries all inventory risk |
| No fraud exposure on reporting | Abandons the consignment proposition entirely |

**Verdict:** a legitimate *additional* listing type (the product model already supports
`listing_type: wholesale`), but not a replacement for consignment.

---

## Scored comparison

Scoring **1 (poor) – 5 (excellent)** against the decision framework.

| Criterion | 0 Current | A Cash | B In-app | **C Hybrid** | D Escrow | E Wholesale |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| User experience (seller) | 5 | 4 | 2 | **4** | 1 | 3 |
| User experience (customer) | 1 | 1 | 5 | **5** | 1 | 2 |
| Business scalability | 1 | 2 | 5 | **5** | 2 | 3 |
| Revenue generation | 1 | 2 | 5 | **5** | 3 | 3 |
| Operational simplicity | 4 | 2 | 4 | **2** | 3 | 5 |
| Fraud prevention | 1 | 1 | 5 | **4** | 4 | 5 |
| Financial reconciliation | 1 | 2 | 5 | **5** | 4 | 5 |
| Compliance | 2 | 2 | 3 | **3** | 3 | 4 |
| Engineering complexity *(5 = simplest)* | 5 | 3 | 3 | **2** | 3 | 5 |
| Long-term maintainability | 1 | 2 | 4 | **4** | 3 | 4 |
| **Total (/50)** | **22** | **21** | **41** | **39** | **27** | **39** |

### Reading the scores honestly

**Model B scores highest numerically (41) but the score is misleading.** Its two weakest cells —
seller UX (2) and the unenforceability of a cash ban — are not merely inconvenient; they are the
failure mode that makes the whole model collapse in the field. A seller who cannot take cash from a
cash customer will either lose the sale or take it off-platform. Either way the platform gets
nothing, and its data becomes a lie.

**Model C scores 39 and loses points precisely where it should:** operational simplicity and
engineering complexity. Those are *costs the business can pay*. Model B's weaknesses are *risks the
business cannot control*.

**Model E's 39 is real but answers a different question** — it is a good complementary listing type,
not a consignment model.

> **The correct question is not "which model scores highest?" but "which model's weaknesses can we
> actually survive?"** Model C's weaknesses are engineering effort. Model B's are behavioural, and
> behaviour cannot be deployed.

---

## Industry precedent, and what it actually teaches

| Company | Model | Transferable lesson |
|---|---|---|
| **Square** | Card-first, cash recorded in the same ledger | **Track cash even when you don't process it.** Cash sales still appear in reporting, so the merchant sees one truthful picture. This is the core of Model C. |
| **Shopify** | Platform processes; merchant owns the customer | Fee collection at the payment layer is what makes the platform durable. |
| **DoorDash / Uber Eats** | Platform collects 100%, then pays out | Clean because the customer is *already* online. Doesn't transfer to walk-up street sales. |
| **Etsy** | Platform collects, pays sellers on a schedule | **Payout scheduling as a risk control** — delayed payout funds the refund window. StreetServe claims tiered timing but doesn't enforce it. |
| **Airbnb** | Holds funds until service delivered | **Escrow-until-delivery** for high-value items — worth adopting for expensive consignment stock. |
| **Traditional consignment shops** | Shop is the point of sale and runs the till | Their fraud problem doesn't exist because the *owner* handles the money. StreetServe's roaming seller is what creates the gap. |
| **Micro-finance (Grameen model)** | Graduated credit limits from repayment history | **Directly applicable:** trust tier → credit limit → more stock. Proven with exactly this demographic. |

The two most valuable precedents are the least obvious: **Square** (record cash you don't process)
and **micro-finance** (graduated credit from behaviour). Together they *are* Model C.

---

## Conclusion

Model C (Hybrid) is recommended. It is the only option that:

1. Makes the platform **solvent** — fees are collected automatically on the digital rail.
2. Is **honest about street commerce** — cash exists and is modelled rather than wished away.
3. **Bounds** the risk it cannot eliminate — cash debt is capped by earned trust.
4. Turns the **Trust Score into a real economic instrument** rather than a badge.
5. Keeps everything already built well — custody, terms, approvals, immutable records.

Full justification, architecture and edge cases: **`RECOMMENDED_BUSINESS_MODEL.md`**.
