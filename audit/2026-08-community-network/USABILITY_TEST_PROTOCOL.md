# Usability test protocol — the redemption moment

**Status:** ready to run · **Blocks:** Phase 7.1, and therefore the Pay It Forward launch
**Written 2026-08-04** because "usability-test the redemption screen" is a gate nobody can close
without a protocol, and a gate with no protocol quietly becomes a gate nobody closes.

---

## Why this one screen gets its own test

Every other screen in this specification can be judged by looking at it. This one cannot, because the
thing being tested is not comprehension — it is **whether someone will tap it in public**.

The audit called it the hardest screen in the specification. The design is built entirely on an
assumption that has never been checked against a person: that a quiet, uncelebrated, unqualified
checkbox makes accepting help feel possible, where a warm and generous one makes it feel like being
seen. **That assumption may be wrong.** If it is, the feature ships and is admired and unused, and
the failure will look like low adoption rather than a design error.

## What is being tested

**One question:** would this person use the community fund, in a queue, with people behind them?

Everything else — comprehension of the caps, the anonymity model, the fine print — is secondary. A
person who understands the feature perfectly and will not tap it has told you the design failed.

## Who to recruit

**Six to eight people who have been short of money for food in the last year.** Not a proxy for them.

This is the recruitment constraint that will be under pressure, because it is much easier to test
with colleagues, students, or a general consumer panel. Do not. The whole design turns on the
experience of being the person who needs it, and someone who has never been that person will
comfortably tell you the screen is fine.

Practical routes: a partner shelter (the platform already has shelter relationships), a food bank, or
a community organisation — recruited *through* the organisation, compensated in cash, and told
plainly that they are being paid to critique an app and nothing about the session affects any service
they receive.

**Two or three vendors** separately, for the other side. Different session, different script.

## Ethics, which matter more here than usual

- **Compensate in cash, up front, before the session.** Not a voucher, not on completion. Payment must not be conditional on saying anything.
- **Never ask a participant to describe their own circumstances.** Recruitment establishes eligibility; the session does not revisit it. "Tell us about a time you couldn't afford lunch" is not research, it is a cost you are imposing on someone for your product.
- **Use a scenario, not their life.** Hand them the situation; let them keep their own.
- **No recording of faces.** Screen and audio only, and only with consent given after they have seen what is being recorded.
- **Anyone may stop, at any point, and keep the money.** Say this at the start and mean it.

## Setup

Real device, participant's own phone if they will use it. A seeded business with a funded pool, a
cart already containing a $16.45 order — the spec's own example — so the session starts at the
decision, not at shopping.

## The scenario

> "You're getting lunch from a food truck. There's a queue behind you. Your order comes to $16.45.
> Take it from here — think out loud if you can."

That is the whole prompt. Do not mention the fund. **Whether they notice it unprompted is the first
finding**, and telling them about it destroys that finding permanently.

## What to observe, in priority order

1. **Did they see it?** Unprompted, before being asked.
2. **Did they tap it?** If not — why not? Let the silence run before prompting.
3. **How long did they hover?** Hesitation on this control is the signal. Time it.
4. **Did they look up?** Physical checking-who-can-see behaviour is the single most important observation in the session, and it will not appear in anything they say.
5. **What did they think it was?** A discount, a coupon, charity, a mistake?
6. **Who did they think would know?** Ask directly, after. The screen claims nobody is told; find out whether that was believed.

## Prompts, if they do not engage

Escalate only as far as needed, and record where you had to intervene:

1. "Talk me through what you're looking at."
2. "Is there anything on this screen you're not sure about?"
3. *(point at the row)* "What do you think this does?"
4. "Would you ever use it? What would have to be different?"

**If you reached prompt 3 before they noticed it, the screen has failed finding #1.** Record that
plainly rather than counting the session as a success because they liked it once it was pointed out.

## Pass criteria — decided before running, so the result cannot be argued into a pass

The screen passes when, of 6–8 participants:

| # | Criterion | Threshold |
|---|---|---|
| 1 | Noticed the offer unprompted | **≥ 5 of 8** |
| 2 | Understood it as *someone already paid*, not a discount or a coupon | **≥ 6 of 8** |
| 3 | Correctly believed the business is not told who uses it | **≥ 6 of 8** |
| 4 | Said they would use it in a real queue | **≥ 4 of 8** |
| 5 | Nobody described it as embarrassing, pitying, or "charity" | **0 occurrences** |

**Criterion 5 is a hard stop.** One participant saying it feels like charity is a redesign, not a
statistic — the entire design premise is that it does not.

## What each failure means

| Failed | Most likely cause | Direction |
|---|---|---|
| 1 — not noticed | Too quiet. The design optimised for discretion past the point of visibility | Raise contrast/position **without** raising warmth. Do not add colour or an icon |
| 2 — read as a discount | It looks like a summary row, which was deliberate | Strengthen "someone already paid this forward" — the *fact*, not the sentiment |
| 3 — believed the business is told | The privacy claim is not being read, or not believed | Move it up; consider stating it before the amount |
| 4 — understood but would not use | The core assumption is wrong | **Stop and rethink.** Do not iterate on wording. This is the finding the test exists to surface |
| 5 — felt like charity | Tone failure somewhere | Re-audit every word against the copy rules; suspect the profile card as much as the checkout row |

## Vendor session (separate)

Different worry, and a real one: does a vendor believe the money is theirs? Show the impact panel and
ask what they could do with the balance. **If they say "withdraw it" or "pay myself", the panel has
failed** — the rule is enforced server-side, so nothing breaks, but they will discover it as a
support ticket that reads like a broken promise.

## Recording the outcome

Results go in `PRODUCTION_READINESS_REPORT.md` under the Phase 7.1 gate, with the count against each
criterion. A pass records the numbers. A fail records the numbers **and** the redesign it triggered —
"we ran it and iterated" without the before is indistinguishable from not having run it.
