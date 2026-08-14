# Payment & Architecture Gap Analysis

**Findings are ranked by severity. Each states the gap, the concrete failure, and the impact.**
Severity: **P0** = platform-threatening · **P1** = serious · **P2** = important · **P3** = hardening

---

## Severity summary

| # | Gap | Severity | Domain |
|---|---|---|---|
| 1 | No money ever enters the system | **P0** | Financial |
| 2 | Payouts sent from platform's own funds | **P0** | Financial |
| 3 | No ledger / no double-entry accounting | **P0** | Reconciliation |
| 4 | Refunds after settlement are impossible | **P1** | Financial |
| 5 | Sale amounts are self-reported and unverifiable | **P1** | Fraud |
| 6 | Settlement can partially fail and still be "settled" | **P1** | Reconciliation |
| 7 | QR secret is static and shareable | **P1** | Security |
| 8 | No balance check before payout | **P1** | Financial |
| 9 | Lost/damaged inventory has no financial consequence | **P1** | Business logic |
| 10 | Disputes don't freeze money | **P2** | Financial |
| 11 | No tax handling anywhere | **P2** | Compliance |
| 12 | Payout timing by tier is claimed but not enforced | **P2** | Trust |
| 13 | Trust score defaults to maximum for new sellers | **P2** | Fraud |
| 14 | Settlement runs synchronously on the request path | **P2** | Scalability |
| 15 | No KYC gate before holding high-value stock | **P3** | Compliance |
| 16 | Webhook secret is a placeholder | **P3** | Operational |

---

## P0 — Platform-threatening

### 1. No money ever enters the system

**Gap.** No step in the consignment lifecycle charges anyone. `logSale` writes a database row.

**Failure.** Customer pays the seller $903 in cash. StreetServe records $903 of gross sales and a
$90.30 fee it will never collect.

**Impact.** The platform's entire consignment revenue line is fictional. There is no business here —
only a bookkeeping exercise.

---

### 2. Payouts are made from the platform's own funds

**Gap.** `settle` calls `payoutTransfer` for both the seller and the hub, drawing on the platform's
Stripe balance, with no corresponding inbound charge.

**Failure.** Verified in live data: `tr_1Tvzyn…` moved **$284.45 of StreetServe's money** to a hub
for a sale that collected nothing.

**Impact.** Loss scales linearly with success — the more the marketplace is used, the faster the
platform drains. At 1,000 sales of this size: **−$812,700**. This is the single most urgent finding.

---

### 3. No ledger, no double-entry accounting

**Gap.** There are no account balances. Nothing anywhere answers "what does the platform owe the
seller?" or "what does the seller owe the hub?"

**Failure.** A CFO cannot produce a trial balance. Money movements exist only as scattered Stripe
transfer IDs on settlement rows, with no counter-entries.

**Impact.** Unauditable. Blocks financing, blocks an audit, blocks any correction workflow, and makes
every subsequent fix (refunds, debt, disputes) impossible to build cleanly. **This must be built
before, not after, the payment rail** — retrofitting a ledger over live money is far harder.

---

## P1 — Serious

### 4. Refunds after settlement are impossible

**Gap.** Settlements use `immutablePlugin` (append-only, correct) but there is **no reversal entry
type**. A refund therefore has nowhere to be recorded.

**Failure.** Customer returns a faulty candle the day after settlement. The seller has been paid,
the hub has been paid, the fee is booked. Nothing can be undone or recorded.

**Impact.** No consumer-refund capability at all — which for a retail marketplace is a legal problem
as much as a technical one. Note the Stripe integration *does* already support `reverse_transfer`
and `refund_application_fee`; the consignment flow simply never uses them.

---

### 5. Sale amounts are self-reported and unverifiable

**Gap.** The seller types the sale amount. Nothing corroborates it.

**Failure.** A seller sells 10 candles at $30 ($300) and logs 10 at $10 ($100). Their 65% of $100 is
$65 instead of $195 — but they *hold all $300 in cash*, so under-reporting makes them richer. The
hub is defrauded of its share on $200, and the platform of its fee.

**Impact.** In a cash model, **under-reporting is directly profitable and nearly undetectable.** The
optional proof photo is not verification. The minimum-authorised-price check helps a little but is
per-unit and easily gamed by reporting fewer units.

---

### 6. Settlement can partially fail and still be marked settled

**Gap.** `payoutTransfer` returns `null` when there is no payout-enabled account; the return value
is stored but never checked. Status becomes `settled` regardless.

**Failure.** Exactly what happened: seller transfer `NONE`, hub transfer real, checkout `settled`,
seller UI displaying "$528.25 · 1 payout".

**Impact.** "Settled" is not a reliable financial state. Because settlements are immutable and there
is no retry job, the failed leg can never be completed — the money is simply stuck forever.

---

### 7. QR secret is static and shareable

**Gap.** One permanent secret per hub, checked by string equality.

**Failure.** A seller photographs the printed code once. From then on they can reserve stock from
anywhere, at any time, without ever visiting the hub. Post it in a group chat and anyone can.

**Impact.** The QR is the *only* proof of physical presence at hand-over. Defeating it undermines
the whole custody model. Needs rotation, or a short-lived signed token, or hub-side confirmation.

---

### 8. No balance check before payout

**Gap.** Transfers are attempted with no verification that the platform balance can cover them.

**Failure.** Stripe rejects the transfer on insufficient funds, or the platform balance goes
negative if a top-up is configured.

**Impact.** Cascading settlement failures with no queue or retry, plus potential Stripe account
standing issues.

---

### 9. Lost and damaged inventory has no financial consequence

**Gap.** Returns accept `conditionAssessment: 'good' | 'damaged' | 'lost'`. Only `good` restocks.
`damaged` and `lost` are recorded — and then nothing happens.

**Failure.** A seller takes 10 candles worth $200, sells none, and reports all 10 "lost". They owe
nothing. The hub absorbs a $200 loss. The seller can repeat this at a different hub.

**Impact.** A free-inventory exploit. There is no liability charge, no insurance, no deposit, no
trust penalty tied to the value lost.

---

## P2 — Important

### 10. Disputes don't freeze money

The disputes module exists (open, evidence, resolve) and correctly gates Trust Score changes on
resolution. But an open dispute does **not** hold settlement. Money can be paid out while the
ownership of that money is actively contested, and clawback is impossible post-settlement.

### 11. No tax handling anywhere

`MVP_ORDER_FEE_RATES` sets tax to zero and `STRIPE_TAX_ENABLED=false`. There is no sales-tax
calculation, no marketplace-facilitator logic, and no 1099-K style reporting. In most US states a
marketplace that processes payments becomes the **marketplace facilitator** and is legally obliged to
collect and remit sales tax. Sellers earning over the federal threshold need tax forms. This becomes
a hard legal requirement the moment payments run through the platform.

### 12. Payout timing by tier is claimed but not enforced

The settlement view reports "Bronze — payout held 3 days", but settlement transfers immediately
regardless of tier. The hold is **display text only**. This is both a missed risk control and a
statement to users that isn't true.

### 13. Trust score defaults to maximum for new sellers

`TRUST_DEFAULT_SCORE = 100`, and the auto-approve floor is 85. A brand-new account with zero history
is therefore treated as maximally trustworthy — it clears auto-approval instantly. Trust should be
*earned*; a new seller should start low and rise. (The default value cap of $200 currently limits the
blast radius, but the underlying signal is inverted.)

### 14. Settlement runs synchronously on the request path

Settlement performs fee resolution, two Stripe network calls, a database write, an audit write, an
event publish, and a Trust Score recompute — all inside the seller's HTTP request. A slow or failing
Stripe call blocks the user and risks partial completion with no transaction boundary.

---

## P3 — Hardening

### 15. No KYC gate before holding high-value stock
Bronze verification gates checkout, but nothing scales identity requirements to the *value* being
released. Holding $5,000 of stock should require more identity assurance than holding $50.

### 16. Webhook secret is a placeholder
`STRIPE_WEBHOOK_SECRET=whsec_replac…`. Webhook-driven state (notably `payouts_enabled`) can't verify.
The vendor payouts screen works around this by polling Stripe directly — a good pattern, now mirrored
for sellers — but the webhook path should be fixed properly (Stripe CLI in dev, real secret in prod).

---

## Fraud vectors, collected

| Vector | Mechanism | Currently detectable? |
|---|---|---|
| **Under-reporting sales** | Log less than sold; pocket the difference | No |
| **False "lost" claims** | Report inventory lost; no liability | No |
| **QR sharing** | Photograph the code; reserve without visiting | No |
| **New-account farming** | New accounts start at trust 100 → instant auto-approve | No |
| **Collusion** | Seller and hub owner conspire to inflate/deflate sales | No |
| **Never returning** | Take stock and disappear | Overdue sweep flags it; no recovery |

Every one of these is *cheaper to commit* in a cash model, because in a cash model the fraudster is
already holding the money.

---

## Scalability concerns

- **Settlement on the request path** (see #14) — should be a queued job.
- **`pendingApprovals` does an N+1 trust-score lookup** — one query per pending item. Fine at 10
  pending, poor at 500.
- **Products discovery has no geospatial index or pagination** — `listAvailableProducts` caps at 200
  rows with no distance filter, despite the UI implying "nearby". Won't survive real inventory volume.
- **No idempotency on settlement retries** — transfers use idempotency keys (good), but there is no
  job to retry a failed leg at all.

---

## Compliance considerations

| Area | Status | Trigger |
|---|---|---|
| Money transmission | Mitigated by Stripe Connect if structured correctly | Holding funds between parties |
| Marketplace facilitator tax | **Not handled** | Processing customer payments |
| 1099-K / seller tax reporting | **Not handled** | Sellers crossing earnings thresholds |
| KYC / AML | Partial (Stripe Connect onboarding) | Higher payout volumes |
| Consumer refund rights | **Not possible today** | Any retail sale |
| Record retention | Good — immutable ledgers + audit log | — |
| PCI | Handled — card data never touches the server | — |

---

## The through-line

Almost every P0 and P1 finding traces to the same root: **the platform pays out money it never
collected, and has no ledger to notice.** Fix the inbound rail and add double-entry accounting, and
gaps 1, 2, 3, 4, 6, 8 and 10 collapse into solved problems. The remainder (fraud, QR, lost stock,
tax) are then normal marketplace hardening.
