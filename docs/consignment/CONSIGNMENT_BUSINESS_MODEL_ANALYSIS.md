# Consignment Marketplace — Business Model Analysis

**Status:** Architecture review · **Date:** 2026-07-22 · **Scope:** Seller / Hub Owner / Customer / Money
**Rule for this document set:** *Current implementation* and *recommendations* are always kept separate and labelled.

---

## Read this first: the one-paragraph summary

StreetServe's consignment module is **operationally strong and financially incomplete**. The physical
side — who owns the goods, who is holding them, what terms apply, when they must come back — is
modelled carefully and correctly. The money side has a structural hole: **a consignment sale never
collects any money, but settlement pays out two parties from the platform's own balance.** Every
completed consignment sale is a net cash *outflow* for StreetServe with zero matching inflow. At one
sale it looks like a display bug. At a thousand sales it is an insolvent platform.

This is not a coding defect to patch. It is an unmade business decision — *how does the customer's
money enter the system?* — and the code has quietly assumed two contradictory answers at once.

---

## The evidence, in one table

| Question | What the code actually does | Where |
|---|---|---|
| Does a consignment sale charge anyone? | **No.** `logSale` writes an `inventory_sales` row and returns. No PaymentIntent, no transaction. | `consignment.service.ts` → `logSale` |
| Does settlement move money? | **Yes — outward, twice.** `payoutTransfer` to the seller *and* to the hub. | `consignment.service.ts` → `settle` |
| Where does that money come from? | The **platform's Stripe balance**. Nothing ever paid into it. | `payments.service.ts` → `payoutTransfer` |
| Does anything reconcile the two? | **No.** No ledger account, no receivable, no balance check. | — |

Your live data proves it:

```
checkout=6a606db9…   gross=$903.00   platformFee=$90.30   seller=$528.25   hub=$284.45
   sellerTransfer = NONE (seller had no payout account)
   hubTransfer    = tr_1Tvzyn…      ← real money left the platform
```

StreetServe paid the hub **$284.45 of its own money** for a sale in which it collected **$0**.

---

## The two models the code is caught between

```
MODEL A — "cash on the street"          MODEL B — "in-app checkout"
(what sale-logging implies)             (what settlement implies)

 Customer                                Customer
    │ pays cash                             │ pays card in app
    ▼                                       ▼
 Seller  ← holds 100% of gross           PLATFORM ← holds 100% of gross
    │ owes hub + platform                   │ splits
    ▼                                       ├──► Seller
 Platform ──► Hub                           └──► Hub

 Settlement must COLLECT                 Settlement must DISBURSE
```

The app **records** sales as Model A (manual log, cash assumed) and **settles** as Model B (pay
everyone out). Neither is wrong on its own. Running both at once is what creates the hole.

---

## What we recommend (detail in `RECOMMENDED_BUSINESS_MODEL.md`)

**A hybrid, digital-first marketplace built on Stripe *separate charges and transfers*, with cash
sales modelled as seller debt.**

1. **Digital rail (primary).** The customer pays in-app. Money lands on the **platform balance**,
   then splits three ways — platform fee, seller net, hub share — inside one `transfer_group`.
   This is the only Stripe pattern that supports a genuine 3-way split; destination charges (what
   the orders module uses today) can pay only one connected account.
2. **Cash rail (supported, not preferred).** A logged cash sale creates a **payable owed by the
   seller**, not a payout to them. It is recovered by netting against their future digital earnings,
   bounded by a trust-tier credit limit.
3. **One ledger.** Every movement — charge, fee, split, refund, write-off, debt — becomes a
   double-entry row. This is what makes the platform auditable and, later, financeable.

Street vending is genuinely a cash business, so a digital-only mandate would fail in the field. But
cash must be treated as **credit risk**, which is exactly what the existing Trust Score was built to
price.

---

## Document map

**Understand the present**
| File | What it answers |
|---|---|
| `CURRENT_WORKFLOW_EXPLAINED.md` | How the seller, hub, and customer journeys work today, step by step |
| `CURRENT_PAYMENT_FLOW.md` | Every payment event that exists today, and who holds money at each moment |
| `SELLER_HUB_OWNER_RELATIONSHIP.md` | The commercial and legal relationship (bailment), and what it obliges each side to do |
| `CUSTOMER_PURCHASE_FLOW.md` | The customer's journey — including the fact that they cannot currently buy a consignment item in-app |

**Diagnose**
| File | What it answers |
|---|---|
| `PAYMENT_GAP_ANALYSIS.md` | Every gap, fraud vector, reconciliation failure and compliance exposure, ranked by severity |

**Decide**
| File | What it answers |
|---|---|
| `PAYMENT_MODEL_COMPARISON.md` | Cash vs in-app vs hybrid vs escrow, scored against nine criteria, with Shopify/Square/DoorDash/Etsy precedent |
| `RECOMMENDED_BUSINESS_MODEL.md` | The recommendation, the justification, and the edge cases it must survive |

**Build**
| File | What it answers |
|---|---|
| `IMPLEMENTATION_IMPACT_ANALYSIS.md` | What breaks, what migrates, what stays |
| `DATABASE_CHANGES.md` | New collections, changed fields, migrations, invariants |
| `API_CHANGES.md` | New/changed/retired endpoints with contracts |
| `BACKEND_CHANGES.md` | Services, jobs, webhooks, ledger engine |
| `FRONTEND_CHANGES.md` | Screens and flows for seller, hub, customer |
| `IMPLEMENTATION_ROADMAP.md` | Sequenced phases with exit criteria |

---

## What is genuinely good today (do not rebuild these)

An audit that only lists faults is misleading. These parts are well built and the recommendation
deliberately preserves them:

- **Chain of custody** — QR-secret checkout, condition photos at hand-over and return, and a
  per-checkout snapshot of the owner's terms. This is better than most consignment software.
- **The oversell guard** — a race-safe atomic conditional update (`applySaleGuarded`). Correct under
  concurrency, which is rare and valuable.
- **Immutable financial records** — settlements are append-only via `immutablePlugin`. The right
  instinct; the recommendation extends it rather than replacing it.
- **A versioned fee registry** — `fee_schedule.fees` resolves fees by type as configuration, not
  code. New fee types (cash-settlement, storage, insurance) plug in without a deploy.
- **Owner-authored terms** — term length, minimum authorised price, seller permissions, return
  responsibility, all snapshotted onto the checkout at hand-over so later edits can't rewrite history.
- **The approval gate** — trust- and value-based auto-approval with a manual queue, which is exactly
  the right shape for a liability decision.

The financial layer needs to be brought up to the standard the physical layer already sets.

---

## The single most important decision

Everything else follows from one question the product owner must answer:

> **When a customer buys a mango from a street seller who is holding a hub's stock — do we want that
> payment to run through StreetServe?**

- **Yes** → build the digital rail; the platform becomes a real marketplace with real revenue,
  real data, and real leverage. Cash becomes the fallback, priced as risk.
- **No** → StreetServe is a logistics and trust product, not a payments product; delete the payout
  transfers entirely and charge hubs a subscription instead.

Both are legitimate businesses. **The current code accidentally implements a third option — paying
everyone out of your own pocket — which is not a business.**
