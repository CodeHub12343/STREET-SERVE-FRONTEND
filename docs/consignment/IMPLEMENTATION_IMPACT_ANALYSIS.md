# Implementation Impact Analysis

**What breaks, what changes, what stays — if the recommended hybrid model is adopted.**

---

## Impact at a glance

| Area | Impact | Why |
|---|---|---|
| Ledger / accounting | 🔴 **New subsystem** | Nothing exists today |
| Consignment settlement | 🔴 **Rewritten** | Must consume collected funds, not create them |
| Customer payment | 🔴 **New** | No consignment purchase flow exists |
| Seller debt tracking | 🔴 **New** | No concept of a receivable |
| Refunds / reversals | 🔴 **New** | Impossible today |
| Sales recording | 🟡 **Extended** | Needs a payment rail + link to a charge |
| Trust Score | 🟡 **Extended** | Becomes a credit limit, not just a badge |
| Fee registry | 🟢 **Config only** | Add `consignment_digital` / `consignment_cash` types |
| Custody (QR, photos, terms) | 🟢 **Keep** | Well built; QR needs hardening only |
| Approval gate | 🟢 **Keep** | Just built; add a debt check |
| Oversell guard | 🟢 **Keep** | Correct under concurrency |
| Products / hubs / inventory | 🟢 **Keep** | Unaffected |

🔴 build new · 🟡 modify · 🟢 keep as-is

---

## What breaks

### 1. `settle()` — the core change
Today it *creates* money by transferring from platform funds. It must become a **distributor of
already-collected funds**.

```
BEFORE                                  AFTER
──────                                  ─────
sum sales                               sum sales (already paid, per rail)
compute split                           compute split (unchanged)
transfer OUT to seller  ← from nothing  release DIGITAL proceeds already held
transfer OUT to hub     ← from nothing  net any CASH debt against the seller's share
mark settled                            write balanced ledger entries
                                        mark settled with per-leg payout status
```

The split arithmetic is correct and stays. The funding source changes completely.

### 2. "Settled" stops meaning one thing
Today `settled` is a single status that hides whether money actually moved. It must decompose into
per-leg outcomes (`paid` / `pending` / `failed` / `netted_against_debt`) so a partial failure is
visible and retryable.

### 3. Immutability needs a reversal concept
Settlements are append-only (correct), but refunds currently have nowhere to go. Reversals become
**new balanced entries** that reference the original — never edits.

### 4. Existing data needs a decision
Your one live settlement paid the hub $284.45 of platform money and stranded the seller's $528.25.

**Recommendation: leave it.** Mark historical settlements `legacy_unfunded` and exclude them from the
new ledger's opening balances. Backfilling fictional inflows to make old rows balance would corrupt
the first thing the new ledger says. Start the ledger clean, from a stated date.

---

## What stays untouched

These are genuinely good and the plan depends on them:

- **Bailment agreement** — versioned, hashed, enforced at checkout
- **Terms snapshot** — history can't be rewritten by later edits
- **Condition photos + R2 presigned uploads** — evidence at both ends of custody
- **Atomic oversell guard** — race-safe; rare and valuable
- **Approval gate** — trust/value auto-approval with a manual queue
- **Fee registry** — versioned config; new types plug in without a deploy
- **Audit log + immutable ledgers** — the right instinct throughout
- **Consignment lifecycle sweeps** — expiry notices, return-pending, overdue

---

## New concepts entering the domain

| Concept | Purpose |
|---|---|
| **Ledger account** | A balance per party per type (cash, payable, receivable, revenue) |
| **Ledger entry** | Balanced double-entry rows; the single source of financial truth |
| **Payment rail** | `digital` \| `cash` on every sale — drives all downstream behaviour |
| **Seller debt** | What a seller owes from cash sales, losses, or refunds |
| **Credit limit** | Trust-tier-derived ceiling on inventory value + cash debt |
| **Reversal** | Balanced entries undoing a prior movement (refunds, chargebacks) |
| **Payout leg** | Per-party payout status within one settlement |

---

## Risk assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Ledger bugs corrupt financial truth | **High** | Build ledger first, in isolation, with invariant tests (every entry set sums to zero); shadow-run against existing settlements before going live |
| Sellers reject digital payments | **Medium** | Don't mandate — use the fee differential; keep the cash rail fully functional |
| Cash debt becomes uncollectable | **Medium** | Hard credit limits by tier; net from digital earnings; block new stock over the ceiling |
| Migration disrupts active checkouts | **Medium** | New model applies to *new* checkouts; let existing ones finish under old rules |
| Tax obligations arrive with the payment rail | **High** | Enable Stripe Tax with the digital rail, not after; get legal review before launch |
| Chargeback exposure as merchant of record | **Medium** | Payout holds by tier (actually enforced); reserve a small float; dispute-freeze on settlement |
| Scope creep across 14 documents | **Medium** | Follow the phased roadmap; each phase ships independently |

---

## Effort estimate

Rough order of magnitude, one experienced full-stack engineer:

| Phase | Scope | Effort |
|---|---|---|
| 1 | Ledger foundation + invariants | 2–3 weeks |
| 2 | Stop the bleeding (settlement records, stops transferring unfunded) | 3–5 days |
| 3 | Digital rail (charge, split, receipts) | 3–4 weeks |
| 4 | Cash rail (debt, netting, credit limits) | 2–3 weeks |
| 5 | Refunds, disputes, reversals | 2 weeks |
| 6 | Tax, reporting, compliance | 2–3 weeks |
| 7 | Hardening (QR rotation, async settlement, fraud signals) | 1–2 weeks |
| | **Total** | **~3–4 months** |

**Phase 2 is days, not weeks, and stops active financial loss.** It should ship immediately regardless
of decisions about everything else.

---

## Dependency order

```
        ┌─────────────────────┐
        │ 1. LEDGER           │  ← everything depends on this
        └──────────┬──────────┘
                   │
   ┌───────────────┼───────────────┐
   ▼               ▼               ▼
┌────────┐   ┌──────────┐   ┌────────────┐
│2. Stop │   │3. Digital│   │4. Cash rail│
│ losses │   │   rail   │   │  (debt)    │
└────────┘   └────┬─────┘   └─────┬──────┘
                  │               │
                  └───────┬───────┘
                          ▼
                  ┌───────────────┐
                  │5. Refunds &   │
                  │   disputes    │
                  └───────┬───────┘
                          ▼
                  ┌───────────────┐
                  │6. Tax &       │
                  │   reporting   │
                  └───────────────┘
```

Phase 2 can run in parallel with Phase 1 and should — it is a small change that stops real money
leaving the building.

---

## Decisions the product owner must make before Phase 3

1. **Fee differential** — is digital cheaper than cash? (Recommended: 8% vs 10%.)
2. **Credit limits** — confirm the inventory-value and cash-debt ceilings per trust tier.
3. **Payout timing** — enforce the tier holds that are currently only claimed in the UI?
4. **Refund window** — how long can a customer request one, and who absorbs it by default?
5. **Loss liability** — what does a seller owe for inventory reported lost? (Recommended: wholesale
   value, capped by tier.)
6. **Launch geography** — determines which tax obligations apply first.

Questions 1–3 shape the data model, so they should be settled before Phase 3 starts.
