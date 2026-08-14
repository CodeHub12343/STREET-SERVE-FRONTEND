# ADR-003 · Four revenue ideas, decided

**Status:** Accepted — 2026-08-04 (checklist item 7.17)
**Decides:** video ads, an insurance marketplace, a loan marketplace, and payment-processing revenue
share. Each was left as an open question by the audit; each is answered here so nobody builds one on
an assumption.

These four are grouped because they share a shape: **each earns money by taking something from the
user rather than by making the platform more useful to them.** That is not automatically
disqualifying. It does mean the burden of proof runs the other way, and for a platform whose users
are sole traders on the edge of the formal economy, "we could monetise this" is not a reason.

---

## 1 · Video ads before profiles (M-33 / RV-19) — **DECLINED**

**Decision: no. Not now, not capped, not "one per session".**

The mechanic is an interstitial video before a customer sees a vendor's profile. The revenue is real
and the cost lands on the wrong person twice over:

- **On the customer**, who is standing on a pavement deciding where to buy lunch. Discovery on this
  platform happens in the thirty seconds before someone joins a queue. An unskippable pre-roll in
  that window is not an ad — it is a toll on finding a taco truck.
- **On the vendor**, whose profile is now behind a delay they did not choose and cannot remove. The
  platform would be charging a third party for the right to interrupt a vendor's own customer.

The audit's own note said *"the most reliable way to make discovery feel hostile"*, and that is
right. There is already a working paid-placement product (§32, Phase F) that is **disclosed,
additive, and capped at 20% of a feed** — a boost, never a filter. That is the honest version of the
same revenue, and it is built.

**What would change this:** nothing about the format. If video advertising is wanted, it belongs in
a place a person chose to enter — a vendor's own gallery, an Academy course — not between someone
and the thing they were already looking at.

---

## 2 · Insurance marketplace (CM-49) — **DECLINED**

**Decision: no in-house marketplace. Referrals only (M-29), and never under the platform's brand.**

Selling insurance means being an intermediary in a regulated product: licensing per state,
suitability obligations, and liability when a policy does not pay out the way the buyer understood
it would. StreetServe's users are the population least able to absorb a policy that turns out not to
cover what they thought — and most likely to have trusted the platform's framing over the document.

There is also a specific hazard already anticipated in this codebase. `stock_waiver` is a
**contractual damage waiver, not insurance**, and the copy prohibition on *insurance / policy /
premium / claim / covered peril* is enforced by test. Standing up an insurance marketplace next to
it puts the two products a tab apart in the same app, and the distinction that prohibition protects
would not survive contact with a hurried user.

**Referrals are acceptable** because the platform is not the counterparty and does not describe the
cover. The rule: a referral names the insurer, states plainly that StreetServe is not providing the
cover and does not advise on it, and never appears inside the Stock Protection surface.

---

## 3 · Loan / financing marketplace (CM-50) — **DECLINED, and this is the most important of the four**

**Decision: no. Referrals only (M-30), with the same non-counterparty rule.**

This one is dangerous precisely *because* the platform is close to being able to do it. `debt`
models seller balances, credit limits, and escalation. `spot_me` does peer micro-advances with
default sweeps. RTO is an instalment product with a disclosed markup. The plumbing exists.

Which is the reason to be careful rather than a reason to proceed:

- **Lending to the financially precarious is where consumer-protection law is densest**, and rightly
  so — truth-in-lending disclosure, APR calculation, state usury caps, collections conduct. The
  platform currently makes none of those claims and is not built to.
- **The platform already holds the borrower's income.** It processes their sales, sets their payout
  timing, and can see their balances. A lender with that position over a borrower is not a
  marketplace participant; it is a party with leverage a regulator will look at closely.
- **Checklist item 1.8 is still open** — the *existing* lending-adjacent modules (`debt`, `spot_me`,
  shelter grants) have not had a legal review. Building a loan marketplace before that review
  returns would be adding a floor to a building whose foundations are unsurveyed.

**What would change this:** counsel's view on 1.8 first, then a separate, deliberate decision with a
licensed partner as the actual lender. Not a feature ticket.

---

## 4 · Payment-processing revenue share (M-31 / HR-11) — **DECLINED as a markup; ACCEPTED as a rebate**

**Decision: the processing fee stays a true pass-through. Any processor rebate is the platform's
revenue and is never added to the customer's disclosed rate.**

Today `processing` is modelled as a pass-through at the processor's own rate, disclosed as its own
line, and switched off at launch. The proposal is to earn a margin on it.

The distinction that decides this:

- **Marking up a fee presented as a pass-through is a lie in the checkout.** §31 requires the
  customer to see what they are paying and to whom. A line reading "Processing" at 3.4% when the
  processor charges 2.9% tells them a specific untruth about a specific number. The audit's own note
  — *"sits uneasily with §31's transparency framing"* — understates it.
- **A volume rebate from the processor is different in kind.** The customer pays the disclosed rate;
  the processor returns some of its own margin. Nothing the customer sees is false.

So: rebates yes, markup no. And if a margin is ever wanted on the customer side, it must be a
**separately named line** with its own label — at which point it is a platform fee and should be
called one.

---

## The rule these four share

**The platform may charge for things it does. It may not charge by misdescribing them.**

Paid placement is fine because it says it is paid. A referral is fine because it says who the
counterparty is. A pass-through is fine while it passes through. Each declined item above fails that
test in a different way: a video ad charges the customer's attention for something they did not
choose, an insurance or loan marketplace charges trust the platform has not earned the right to
spend, and a processing markup charges money under a label that says it is somebody else's.
