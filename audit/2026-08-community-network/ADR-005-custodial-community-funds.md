# ADR-005 · Whose money is a Pay It Forward balance

**Status:** Accepted — 2026-08-04 (community-network roadmap Phase 0.2)
**Decides:** what a pooled community balance *is* in accounting terms, who may move it, what happens
to it if nobody redeems it, and who pays the fees on both legs.
**Blocks:** all of Pay It Forward (PIF-1 … PIF-24), the `community_fund_payable` account type (X-2),
and — via [ADR-006](ADR-006-crowdfunding-capture-model.md) — Boost My Marketing.
**Depends on:** the `tax_payable` precedent in [`ledger.model.ts`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ledger/ledger.model.ts).

---

## The situation

The specification describes a business-scoped pool: customers contribute money, later customers
redeem it against their orders. The example in the brief is a $187.35 balance, a $20 contribution, a
$16.45 redemption.

That balance is **real customer money, held by the platform, owed to no identified person**. None of
the seven existing account types describes it:

- `cash` alone records that the platform holds money but loses the obligation entirely — it would book community money as though it were the platform's.
- `payable` means *owed to a seller* and is consumed by payout logic. Crediting pool money there would inflate seller payouts and pay out money nobody earned.
- `fee_revenue` would be straightforwardly wrong, and the kind of wrong that is discovered at an audit.

The right precedent is already in the file. `tax_payable` carries the comment: *"NEVER revenue and
never distributable — it is the state's money held on their behalf until it is remitted."* A community
fund is the same shape with a different beneficiary — held, not earned, not the platform's, and not
the vendor's until a redemption discharges it.

There is also a warning in the codebase about the specific mistake to avoid. `PingBudgetTopup` exists
because a balance was once credited by *"simply incrementing a counter — no money was ever collected"*.
A pool is the same shape and the same trap, with community money instead of platform capital.

## Decision

### 1 · A pool balance is a custodial liability of the platform

New account type `community_fund_payable`, **credit-normal**, scoped per business. It is never
revenue, never distributable as cash, and never counted in platform earnings or in a vendor's balance.

Entry types: `community_contribution`, `community_redemption`, `community_expiry`, `community_refund`.

Per [ARCHITECTURAL_IMPROVEMENTS.md](ARCHITECTURAL_IMPROVEMENTS.md) A-2, the normal balance side is
declared explicitly rather than inherited from the `DEBIT_NORMAL` exception set — otherwise the
correct behaviour here happens by luck rather than by construction.

### 2 · The balance is credited only when money actually arrives

Contribution creates a payment intent; the pool is credited **only** in the webhook handler, keyed on
the intent id with a unique index. Field-for-field the `PingBudgetTopup` pattern. There is an
invariant test: *a pool balance cannot rise without a `succeeded` contribution row.*

### 3 · Pool money can only ever discharge an order at that business. It is never withdrawable.

This is the load-bearing anti-abuse control, and it is worth stating as a rule rather than as an
implementation detail. A vendor can never withdraw, transfer, or cash out a pool balance. The only
movement out of `community_fund_payable` is a redemption against a real order, or expiry (§6).

Without this rule, a vendor could fund their own pool and withdraw it — turning the feature into a
money-movement service, which is a different regulated business entirely.

### 4 · Fees: nothing on the contribution, standard rate on the redemption

**No platform fee on contributions.** Taking a cut of a gift is indefensible, and the amount involved
would never justify explaining it.

**Processing costs** on the contribution are real (~2.9% + 30¢). The contributor is offered — default
on, clearly labelled, one tap to decline — the option to cover them, so that the full intended amount
reaches the pool. If they decline, the platform absorbs it. The platform takes **zero margin** on this
leg either way.

**The standard marketplace fee applies at redemption**, exactly as it would for any sale, and is
disclosed. Two reasons, the second decisive:

1. The redemption leg is an ordinary sale. The vendor hands over a real meal and receives real money for it; the platform processes it and carries the same costs it always does.
2. **A fee-free redemption path is an arbitrage.** If sales settled through the pool cost less than sales that did not, the rational move for any vendor is to route ordinary sales through it. A generosity feature must not be cheaper than honesty.

### 5 · Redemption is capped, and caps are enforced server-side

Per-redemption, per-customer, per-day, and percentage caps are vendor-configured
(PIF-9) and enforced **in the same transaction as the deduction** — never in the client, never in a
prior read. Plus the fraud floor: a unique index on `{business_id, user_id, day_key}` and verification-tier
gating (PIF-10a).

Two controls to start, not the eight the specification lists. Uncalibrated controls on a generosity
feature mean denying a genuinely hungry person a meal because a heuristic fired, and there is no data
yet to calibrate against.

### 6 · Funds expire after 12 months. "Never" is removed as an option.

The specification offered 30 days / 60 days / **Never**. "Never" is declined: it creates a permanent,
unbounded liability, and several US states treat long-dormant prepaid balances as unclaimed property
with escheatment obligations. A liability with no end date is one the platform cannot close its books
against.

**12 months** from each contribution, expired FIFO, with notice to the vendor at 30 days remaining so
the balance can be publicised and used.

**Where expired money goes: to a platform-administered city fund, redistributed to other pools in the
same city. Never to the platform, and never to the vendor.**

The vendor exclusion is the important half. If unredeemed money fell to the vendor, the vendor would
profit from suppressing redemption — and they control the caps, the settings, and the prompt. Never
build an incentive to withhold generosity into a generosity feature. The platform exclusion is
simpler: this money was given by the public for the public, and recognising it as revenue would make
every impact number the product publishes a little bit false.

This is disclosed at contribution time, in one sentence, before payment.

### 7 · Contributions are final, with a 24-hour window for mistakes

Refundable within 24 hours if not yet redeemed. After that, or once redeemed, no refund except
confirmed fraud. A gift that can be clawed back a month later is not a gift, and the customer who
already ate the meal cannot be un-fed.

### 8 · Impact numbers are derived, never incremented

Every metric the specification asks for — meals given, money shared, people helped, the platform-wide
live counter, the public impact page — is computed from immutable receipt rows and cached with a TTL.
Counters drift under refunds, reversals, and clawbacks, and a public "$4,873,993 shared" that is wrong
is a credibility problem rather than a rounding error.

## Why not the alternatives

**Why not hold pool money in the vendor's own balance?** It would be simplest, and it is wrong twice:
the money would be reachable by the vendor's payouts and by their creditors, and it would be recorded
as though they had earned it. A vendor's insolvency must not consume the community's money.

**Why not a stored-value / gift-card model?** Gift cards are directed instruments with a known holder,
and the platform already has one (`gifts`, with a recipient hash and a redemption code). A pool is
definitionally undirected — the beneficiary is unknown at contribution time, which is the whole point
of the feature and the whole reason it needs its own accounting.

**Why not let the vendor withdraw against redemptions in advance?** Because it converts a custodial
balance into a credit facility, and the platform has already declined to be a lender
([ADR-003 §3](../2026-08-marketplace-spec/ADR-003-revenue-decisions.md)).

## Consequences

| Item | Resolution |
|---|---|
| **X-2 / A-1** ledger | `community_fund_payable` + four entry types; reconciliation covers it; shadow-run before go-live |
| **PIF-2/3** pool + contribution | Intent → webhook → credit, `PingBudgetTopup` pattern, invariant test |
| **PIF-4** redemption | Applied **after** discounts; standard marketplace fee applies; capped in-transaction |
| **PIF-9** settings | Caps configurable; expiry choice reduced to 30 / 60 / 365 days |
| **PIF-24** expiry | 12-month default; city redistribution; vendor and platform both excluded |
| **PIF-11/12/21** metrics | Derived from receipts, TTL-cached |
| **PIF-16** reporting | A *contribution record*, never a tax-deductibility claim — see the copy rule |
| **PIF-19** corporate sponsorship | Still deferred. Multi-business pooled custody multiplies the hardest part of this ADR; revisit after single-business pools have run a quarter |
| **PIF-20** priority groups | Self-attestation only. The platform does not adjudicate membership of protected or sensitive classes |

## The copy rule this creates

**Nothing in the product may describe a contribution as tax-deductible, a donation to a charity, or a
charitable gift.** A vendor is not a 501(c)(3), and a contribution to a for-profit business's community
pool is generally not deductible for the giver. The specification's "tax-friendly donation reports"
(PIF-16) ships as a **contribution record**: what was given, when, to whom, and what it was used for.

Prohibited in user-facing copy: *tax-deductible, tax deduction, write-off, charitable donation, 501(c)(3), nonprofit*.
Permitted: *contribution, gift, pay it forward, community fund*.

Enforced by test, in the same manner as the `stock_waiver` prohibition. See
[COPY_RULE_REGISTER.md](COPY_RULE_REGISTER.md).

## What is not decided here

- **Counsel review of the custodial structure and the 12-month escheatment position.** This ADR states an engineering design that is defensible on its face; whether 12-month redistribution satisfies each pilot state's unclaimed-property statute is a question for a lawyer, and it is a launch gate.
- **Whether holding custodial balances triggers state money-transmitter licensing.** The §3 no-withdrawal rule is designed to keep the answer "no" — the platform never moves money between two third parties, it only discharges obligations at the business that holds the pool. Confirm it.
- **The city-fund redistribution mechanism** (who decides which pools receive it). Deferred until there is a first expiry, twelve months after launch. It does not block anything.
