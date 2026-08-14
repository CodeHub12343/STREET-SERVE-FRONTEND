# Copy Rule Register

**Status:** Accepted — 2026-08-04 (community-network roadmap Phase 0.4)
**Purpose:** the single list of claims this product may never make, why each is prohibited, and how
each is enforced.

A copy rule exists when **a word is a legal claim rather than a description**. In every case below,
using the prohibited word would assert a relationship, a status, or an obligation the platform does
not have and cannot honour. These are not style preferences and they are not resolved by careful
writing — they are asserted in tests, because copy changes and the people changing it will not have
read the ADR.

**Enforcement mechanism** (established by `test/phaseF.test.ts` F-4): call the endpoints that serve
user-facing copy, concatenate the response bodies, lowercase, and assert the forbidden substrings are
absent. It is crude, it has no false negatives on the thing that matters, and it survives refactoring.

```ts
const copy = `${JSON.stringify(a.body.data)} ${JSON.stringify(b.body.data)}`.toLowerCase();
for (const forbidden of [...]) expect(copy).not.toContain(forbidden);
```

---

## CR-1 · Stock Protection is a waiver, not insurance — **existing, enforced**

**Source:** [ADR-003 §2](../2026-08-marketplace-spec/ADR-003-revenue-decisions.md) · **Test:** `test/phaseF.test.ts` F-4

| | |
|---|---|
| **Prohibited** | `insurance` · `insured` · `policy` · `premium` · `claim` |
| **Scope** | `/subscriptions/plans`, `/subscriptions/waiver/status`, and any surface describing Stock Protection |
| **Why** | It suppresses a debt the platform is owed; it never pays money out. That distinction is what keeps it out of insurance regulation |
| **Say instead** | *waiver*, *protection*, *covered loss* → *waived balance* |

## CR-2 · Crew members are not employees — **existing, enforced**

**Source:** [ADR-002](../2026-08-marketplace-spec/ADR-002-staff-vs-gig.md)

| | |
|---|---|
| **Prohibited** | `employee` · `staff` · `hire` · `wage` · `salary` |
| **Scope** | crew, jobs, back-office, and scheduling surfaces |
| **Why** | Those words are what a regulator and a court read as claims about a relationship. The platform's payment rail is a contractor rail |
| **Say instead** | *crew*, *engagement*, *rate*, *work with* |

## CR-3 · Drivers are not covered by the platform — **new, ADR-004**

**Source:** [ADR-004 §3](ADR-004-driver-classification-and-liability.md) · **Test:** to land with DAN-3 (Phase 5a)

| | |
|---|---|
| **Prohibited** | `insured` · `covered` · `coverage` · `protected` · `policy` · `premium` · `claim` — in **driver-facing** copy |
| **Scope** | driver onboarding, offer cards, driver earnings, driver settings, delivery notifications |
| **Why** | The platform's own liability cover protects the platform, not the driver. A driver whose personal policy excludes delivery use, and who has been told they are "covered", has been misled by omission — the exact harm ADR-003 refused to risk |
| **Permitted** | Factual statements of the driver's own obligation: *"You must hold valid insurance for delivery use."* *"Confirm your insurance expiry date."* |
| **Note** | Narrower than CR-1: the word *insurance* itself must be usable, because the platform has to ask drivers about theirs. The prohibition is on **attributing** cover |

## CR-4 · Drivers are not employed — **new, ADR-004**

**Source:** [ADR-004 §1–2](ADR-004-driver-classification-and-liability.md) · **Test:** to land with DAN-3

| | |
|---|---|
| **Prohibited** | CR-2's list, plus `shift` · `schedule` · `assigned` · `dispatched to you` |
| **Scope** | all driver surfaces |
| **Why** | Classification turns on control. Language implying assignment or scheduling is evidence of the thing the model must not be |
| **Say instead** | *offer*, *available delivery*, *accept*, *decline* |

## CR-5 · No guarantees — **new, ADR-004**

**Source:** [ADR-004](ADR-004-driver-classification-and-liability.md) copy rules · **Test:** to land with DAN-11

| | |
|---|---|
| **Prohibited** | `guaranteed delivery` · `guaranteed earnings` · `guaranteed acceptance` · `guaranteed arrival` |
| **Scope** | customer delivery UI, driver recruitment, vendor-facing delivery copy |
| **Why** | The platform controls none of the three. A guarantee is a contractual undertaking, and a delivery guarantee to a customer is one the platform would have to honour out of its own pocket |
| **Say instead** | *estimated*, *typically*, *most deliveries* |

## CR-6 · Contributions are not tax-deductible — **new, ADR-005**

**Source:** [ADR-005](ADR-005-custodial-community-funds.md) copy rule · **Test:** to land with PIF-3 (Phase 3a)

| | |
|---|---|
| **Prohibited** | `tax-deductible` · `tax deductible` · `tax deduction` · `write-off` · `charitable donation` · `501(c)(3)` · `nonprofit` |
| **Scope** | contribution flow, PIF dashboards, contribution records, impact page, marketing copy |
| **Why** | A vendor is not a charity. A contribution to a for-profit business's community pool is generally not deductible for the giver, and the specification's "tax-friendly donation reports" is exactly the phrasing that would imply otherwise |
| **Say instead** | *contribution*, *gift*, *pay it forward*, *community fund*, *contribution record* |
| **Note** | The word *donation* alone is permitted — it is ordinary English for a gift. The prohibition is on **tax treatment** claims |

## CR-7 · The platform does not hold money for people — **new, ADR-005/006**

**Source:** [ADR-005 §3](ADR-005-custodial-community-funds.md), [ADR-006](ADR-006-crowdfunding-capture-model.md) · **Test:** with PIF-3 and MB-3

| | |
|---|---|
| **Prohibited** | `escrow` · `your balance` (for a pool) · `wallet` (for a pool) · `withdraw` (for a pool) · `deposit` |
| **Scope** | pool surfaces, campaign surfaces, vendor dashboards |
| **Why** | Pool money is never withdrawable and never the vendor's — that rule is what keeps the feature from being a money-movement service. Copy implying a withdrawable balance contradicts the design and invites the support ticket that reveals it |
| **Say instead** | *community fund*, *available to give*, *contributed*, *redeemed* |

---

## Enforcement schedule

| Rule | Test lands in | Blocking? |
|---|---|---|
| CR-1 | shipped | — |
| CR-2 | shipped | — |
| CR-3, CR-4 | Phase 5a, with the driver role | 🔒 before delivery ships |
| CR-5 | Phase 5c, with delivery pricing | 🔒 before delivery ships |
| CR-6 | Phase 3a, with contributions | 🔒 before Pay It Forward ships |
| CR-7 | Phase 3a / Phase 4 | 🔒 before either ships |

## How to add a rule

1. It must come from a decision with a written reason — an ADR, or counsel. A rule with no source gets deleted by the next person who finds it inconvenient, and they will be right to.
2. State the prohibited **substrings**, not concepts. `expect(copy).not.toContain('tax-deductible')` is testable; "don't imply deductibility" is not.
3. State what to say instead. A prohibition with no replacement gets worked around.
4. Name the endpoints in scope. The test asserts against real response bodies, so the scope is a list of routes.
5. Add it here, then add the test.

## Known limitation

These tests cover **server-supplied copy**. Text hardcoded in React components is not caught. That is
a real gap and the reason each rule names its replacement vocabulary — the register has to work as
guidance for the people writing UI strings, not only as a gate.

Closing it properly would mean linting the frontend string literals. Worth doing before the marketing
site describes any of these features, and out of scope for Phase 0.
