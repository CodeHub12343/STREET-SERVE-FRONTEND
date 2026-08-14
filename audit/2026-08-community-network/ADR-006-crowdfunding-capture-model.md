# ADR-006 · When a Boost campaign takes the money

**Status:** Accepted — 2026-08-04 (community-network roadmap Phase 0.3)
**Decides:** whether contributions to a community-funded marketing campaign are captured on
contribution or only authorised until the goal is met; what happens at an unmet deadline; and who
absorbs the cost of failure.
**Blocks:** MB-1, MB-2, MB-3, MB-10, MB-12, MB-13.
**Depends on:** [ADR-005](ADR-005-custodial-community-funds.md) — this ADR reuses its custodial
account type and would be much harder without it.

---

## The situation

The specification describes a vendor setting a goal ($1,000), customers and other vendors
contributing toward it, and a direct-mail campaign firing when the goal is reached. The brief raised
the open question itself, and it is the right one:

> *"One thing to think through is what happens if the goal isn't reached for a long time (for example,
> refunds, allowing the owner to add the remaining balance, or rolling contributions into a larger
> campaign)."*

That is not an edge case. **Most crowdfunding campaigns miss their goal**, so the unmet path is the
main path, and until it is decided the money model is undefined.

## The recommendation this ADR overturns

The audit ([IMPLEMENTATION_AUDIT_REPORT §3.3](IMPLEMENTATION_AUDIT_REPORT.md), A-10) recommended
**authorise-don't-capture**: authorise each contribution, capture only when the goal is met, release
authorisations otherwise. The argument was that the platform never holds the money, which deletes the
escrow question, the refund pipeline, and the dormancy policy at a stroke.

Writing out the mechanics defeats that argument on two counts.

**1 · It does not survive its own failure mode.** Card authorisations are not money. A campaign that
reaches $1,000 in *authorisations* and then captures will lose some percentage to expired holds,
closed cards, and insufficient funds. The vendor is then told their goal was met, and the campaign is
short — with no way to recover the difference except asking the same people twice. A goal-based
product whose goal can be met and unfunded at the same time has a defect at its centre.

**2 · Its main benefit has already been paid for.** The "no custody" argument assumed custodial
machinery was work this feature would uniquely incur. ADR-005 builds `community_fund_payable`,
reconciliation, and the intent→webhook discipline for Pay It Forward regardless. The marginal cost of
reusing it here is small, and the single counsel conversation covers both.

There is also a constraint that makes the original recommendation impractical: auth holds typically
expire in ~7 days, which would cap campaigns at a week. A $1,000 goal for a street vendor in seven
days is not a realistic ask, and shortening the window to fit a payments limitation is letting the
tail wag the product.

**Recorded plainly because the earlier recommendation is written down in four documents and someone
will otherwise build it.** The revised answer follows.

## Decision

### 1 · Capture on contribution, into custody

A contribution is charged immediately and credited to a campaign-scoped custodial balance using
ADR-005's `community_fund_payable` account type and its intent→webhook discipline. The money is real,
the total is true, and "raised: $375" means $375 exists.

`raised` is **derived from contribution rows**, never an incremented counter.

### 2 · Every campaign has a hard deadline. 60 days maximum.

Set at creation, disclosed on the campaign page, and enforced by sweep. No open-ended campaigns:
an indefinite hold on other people's money is the escrow shape this ADR exists to avoid, and a
campaign with no deadline is one that can never fail and therefore never resolve.

### 3 · If the goal is not met by the deadline, every contributor is refunded in full, automatically

Not on request. Not as credit. Refunded to the original payment method, swept automatically, with
notification.

**The platform absorbs the processing cost of the refund.** Stripe does not return processing fees on
a refund, so a failed campaign costs the platform ~2.9% of the money it moved. That is accepted as the
cost of running the feature. Charging the failure cost to people whose only action was generosity —
by refunding them 97% — is indefensible, and would be the single most damaging thing this product
could do to its own premise.

### 4 · The owner may top up before the deadline. Not after.

The brief's second suggestion, accepted with one constraint: a vendor may contribute the remaining
balance themselves at any point before the deadline, which fires the campaign normally. After the
deadline the campaign is closed and the money is gone back to the contributors — reopening it would
mean re-charging people who have already been refunded.

### 5 · Rolling into another campaign requires consent, given up front

The brief's third suggestion, accepted as **opt-in only**. At contribution time, one choice:

> *If this campaign doesn't reach its goal by <date>: **refund me** (default) · **put it toward this
> business's next campaign***

Default refund. Rolling money into a campaign somebody did not choose to fund, by default, is deciding
what to do with their money for them — and it is how the "long time" in the brief's question becomes
indefinite.

### 6 · No platform fee on contributions. The campaign service fee comes out of a funded campaign.

Same principle as ADR-005 §4: nothing is taken from a contribution. When a campaign funds, a disclosed
service fee is deducted from the raised total before the mailing is bought, covering the platform's
coordination and the print vendor's handling. Shown on the campaign page **before** anyone contributes,
as a line: *"$1,000 goal · approximately X postcards after fees."*

### 7 · The campaign fires only against money actually held

A campaign moves to `funded` only when captured contributions ≥ goal. This is the same solvency rule
the ad placements, the ping budget, and the consignment settlement rail already follow: never spend,
or deliver, against money that has not arrived.

## Consequences

| Item | Resolution |
|---|---|
| **MB-1/2** campaign entity | `boost_campaigns`, sibling of `placements` ([A-9](ARCHITECTURAL_IMPROVEMENTS.md)); `raised` derived from rows |
| **MB-3** contributions | Captured on contribution, ADR-005 custodial rail, no platform fee |
| **MB-10** unmet goal | Automatic full refund at a ≤60-day deadline; owner top-up before it; roll-forward only if opted in |
| **MB-12** escrow accounting | Reuses `community_fund_payable`, campaign-scoped. No new account type |
| **MB-13** regulatory | One counsel review covering both this and ADR-005 |
| **MB-4** postcard estimate | Computed **after** the service fee, so the number shown is the number mailed |
| **A-10** | Superseded by this ADR |

## What this costs, stated honestly

The rejected model had one real advantage and it is worth naming rather than burying: it kept the
platform entirely out of custody. This decision accepts custody, and with it a refund pipeline, a
deadline sweep, a reconciliation surface, and a counsel question.

That is the right trade because the alternative produces underfunded campaigns that were declared
successful — and because ADR-005 means most of the machinery is being built anyway. If counsel comes
back and says custodial balances are not viable in the pilot state, the fallback is not
authorise-don't-capture; it is **not shipping Boost My Marketing**, which the roadmap already lists as
the second thing to cut under time pressure.

## What is not decided here

- **Counsel review**, shared with ADR-005. Launch gate.
- **The print/mail vendor**, which sets the service fee and therefore MB-4's numbers. Nothing here depends on which vendor, but the fee cannot be published until one is contracted.
- **Whether other vendors contributing to a competitor's campaign needs any special handling.** The brief imagines vendors helping each other, which is a genuinely good idea; no rule is needed for it yet.
