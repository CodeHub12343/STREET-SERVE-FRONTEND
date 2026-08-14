# ADR-004 · What a delivery driver is, and who carries the risk

**Status:** Accepted — 2026-08-04 (community-network roadmap Phase 0.1)
**Decides:** whether a dispatched delivery driver is an **engagement** under [ADR-002](../2026-08-marketplace-spec/ADR-002-staff-vs-gig.md) or something else; what the platform may say about insurance; and which dispatch mechanics are prohibited because they change the answer.
**Blocks:** the entire Delivery Assist Network — DAN-1 through DAN-16, and the `driver` role (X-3).
**Depends on:** ADR-002 (engagements, not employment), [ADR-003 §2](../2026-08-marketplace-spec/ADR-003-revenue-decisions.md) (no insurance marketplace; the `stock_waiver` copy prohibition).

---

## The situation

The specification asks for real-time dispatch: a vendor taps "Need Delivery Help", nearby drivers are
alerted, the first to accept takes the job, and the customer watches a GPS trace until hand-off.

Two prior decisions bear on it, and they pull in different directions.

**ADR-002** established that the platform models *engagements, not employment*, and gave three
reasons — the strongest being that storing a wage and a schedule asserts a relationship the platform
cannot support honestly, for users who are "sole traders on the edge of the formal economy". It
created a test-enforced copy rule against *employee / staff / hire / wage / salary*.

**ADR-003 §2** declined an insurance marketplace, because selling insurance means state licensing,
suitability obligations, and liability when a policy does not pay out as the buyer understood. It
noted that `stock_waiver` is a *contractual damage waiver, not insurance*, and that the prohibition on
*insurance / insured / policy / premium / claim* is asserted by test.

What is new, and what neither ADR anticipated, is **physical risk to third parties**. Every existing
engagement on this platform is someone selling, holding a sign, sampling, or staffing an event. A
delivery driver is in a vehicle, carrying someone else's goods, on a trip the platform arranged. If
they injure someone, the question of who arranged that trip is asked by a court, not by a product
manager.

## Decision

### 1 · A driver is an engagement. ADR-002 extends unchanged.

A delivery is a discrete offer, accepted or declined at will, at a price disclosed **before**
acceptance. There is no schedule, no minimum, no exclusivity, and no ongoing relationship in the data.
This is the same model as every other gig on the platform, and the same reasoning applies with equal
force: these users cannot absorb the consequences of a relationship the platform mislabels.

### 2 · Three dispatch mechanics are prohibited, because they are what would change the answer

Classification does not turn on what the platform calls the relationship. It turns on **control**. The
specification is silent on these three, and each would quietly convert an engagement into something a
regulator reads differently:

| Prohibited | Why |
|---|---|
| **Assignment** — allocating a delivery to a specific driver rather than broadcasting an offer | Directing *who* does the work is the clearest indicator of control there is |
| **Acceptance-rate pressure** — tracking, displaying, ranking on, or deactivating for declined offers | A right to decline that carries a penalty is not a right to decline. This is the mechanic most likely to be proposed as a "quality" feature, and it is the one to refuse |
| **Exclusivity or scheduling** — shifts, minimum hours, or blocking a driver from other work | ADR-002 already forbids the shape; dispatch makes it tempting again |

First-to-accept broadcast (DAN-4) is deliberately compatible with all three prohibitions. That is not
a coincidence — it is why it was chosen over assignment in [ARCHITECTURAL_IMPROVEMENTS.md](ARCHITECTURAL_IMPROVEMENTS.md) A-4.

**Ranking is permitted; penalising is not.** A driver who completes deliveries well may be offered
work sooner. A driver who declines work may not be offered less of it.

### 3 · The platform does not provide, arrange, or describe insurance to drivers

This follows directly from ADR-003 §2 and is not reopened here. Concretely, three separate things,
which the product must never blur:

**(a) The driver's own cover is the driver's obligation.** A driver attests at onboarding that they
hold valid personal auto insurance and any endorsement their state or insurer requires for commercial
or delivery use. The platform **records the attestation and the stated expiry date**; it does not
verify the policy, advise on adequacy, or comment on whether an endorsement is needed. Saying
"you're covered" to someone whose personal policy excludes delivery use is exactly the harm ADR-003
refused to risk.

**(b) The platform carries its own cover, for itself.** Commercial general liability plus contingent
auto, as a business expense protecting the platform. **It is not a driver benefit and must never be
presented as one.** A driver who believes the platform's policy protects *them* has been misled by
omission.

**(c) Lapse suspends dispatch.** A sweep suspends any driver whose attested licence or insurance
expiry has passed, until they re-attest. This is a factual eligibility check, not a coverage
assessment — the distinction that keeps it out of ADR-003's territory.

### 4 · Vetting is required, and the `driver` role is never self-grantable

Identity verification at `silver` tier or above, a valid licence, a vehicle record, and a third-party
background check before the first offer is received. Vetting is the one place the platform *should*
exercise control: a background check is about third-party safety, not about directing how work is
performed, and it does not bear on classification.

Note the trap this sits next to: `SELF_GRANTABLE_ROLES` in `constants.ts` is an **allowlist** whose
doc comment currently says the opposite ([F-7](FEATURES_REQUIRING_FIXES.md)). Fix the comment before
adding the role.

### 5 · Drivers never handle money, and never carry restricted goods

**No cash.** Prepaid orders only. A driver collecting payment creates a cash-reconciliation problem
the platform has deliberately avoided everywhere except self-reported consignment sales — where it is
priced as unsecured debt precisely because it is worse.

**No age-restricted or licensed goods** — alcohol, tobacco, pharmacy. Default-deny, consistent with
the existing food-gating precedent. Delivery of these requires licensing the platform does not hold,
and an ID check the platform cannot supervise.

### 6 · Address disclosure is staged, and this is a safety decision, not a UX one

Drivers see an **approximate area** in the broadcast, the **exact address** only after acceptance, and
**nothing** after completion. A broadcast carrying a precise home address reaches every nearby driver,
almost all of whom will not take the job. That is an address disclosure to strangers with no
countervailing benefit.

## Why not employees

ADR-002 answered this and nothing about delivery changes it. Briefly, for readers arriving here first:
employment is a legal status with withholding, workers' compensation, unemployment insurance, and
wage-and-hour obligations; the money rails here are Stripe Connect transfers, which are a *contractor*
payment rail; and there is no path from what exists to a W-2 that does not begin with a payroll
provider nobody has asked for.

Delivery does add one genuinely new argument *for* employment — a driver bears more risk than a
sign-holder, and employment status would put that risk on the platform. That argument is real, and it
is answered by insurance and by vetting rather than by reclassification. Making these users employees
to solve a liability problem would hand them a worse deal overall: fewer hours, less flexibility, and
a platform that can only afford a fraction of them.

## Consequences

| Item | Resolution |
|---|---|
| **DAN-3** driver role & vetting | Proceed. `driver` role, not self-grantable, `silver` tier + licence + background check + insurance attestation |
| **DAN-2** radius broadcast | Proceed as **broadcast**. Assignment is prohibited |
| **DAN-4** first-to-accept | Proceed. Deliberately the classification-safe mechanic |
| **DAN-13** failure paths | Declining is free and untracked. "Nobody accepted" is a platform problem, never a driver's record |
| **DAN-15** driver earnings | Per-engagement earnings only. No wage, no hourly rate, no schedule |
| **DAN-9** payout | Existing Stripe Connect gig rail, unchanged — it is already a contractor rail |
| **DAN-11** customer pricing | Price disclosed before acceptance, on both sides. Non-negotiable: an undisclosed price is a directed assignment wearing a price tag |
| **DAN-6** live tracking | Permitted during an active delivery only. Continuous location tracking of an idle contractor is surveillance, and it is also evidence of control |

## The copy rules this creates

Added to the register in [COPY_RULE_REGISTER.md](COPY_RULE_REGISTER.md), enforced by test in the same
way as `stock_waiver`:

1. **No employment language** — *employee, staff, hire, wage, salary, shift*. (ADR-002, extended to driver surfaces.)
2. **No coverage language** — the product may never tell a driver they are *insured*, *covered*, or *protected*, and may never use *policy, premium, claim, coverage* in driver-facing copy. Factual statements about the driver's own obligation are permitted: *"You must hold valid insurance for delivery use."*
3. **No guarantees** — not *guaranteed delivery*, *guaranteed earnings*, or *guaranteed acceptance*. The platform does not control any of the three.

## What is decided here, and what is not

**Decided, and buildable on:** classification, the prohibited mechanics, vetting requirements, cash
and restricted-goods policy, address staging, and the copy rules.

**Not decided here — these require a person, not a commit, and remain launch gates:**

- **Insurance must be quoted and bound before the first real delivery.** This ADR states the requirement and the structure; it does not procure the cover. No delivery ships without it.
- **Counsel review of the driver terms of engagement** (agreement type registered in Phase 2, X-5). Custodial-money and driver terms must not ship as `reviewed: false` placeholders, whatever happens to the existing RTO backlog.
- **Background-check vendor selection** and the adverse-action process that legally accompanies it.
- **State-by-state variation.** California's ABC test is the strictest and is the sensible design target; a pilot city should be chosen with counsel rather than by market size.

## What would change this decision

- A state adopting a classification test that first-to-accept broadcast cannot satisfy. Then the choice is to exit that market or to employ drivers there — not to relabel.
- Insurance proving unobtainable or uneconomic at pilot scale. Then delivery does not launch. Given the audit already recommends cutting delivery first under time pressure, that is a survivable outcome.
- Evidence that vendors want *their own* couriers dispatched rather than a shared pool. That is a different and much simpler product — the vendor's crew, using the existing jobs flow — and it would not need this ADR at all.
