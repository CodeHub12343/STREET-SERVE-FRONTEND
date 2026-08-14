# Postcard Marketing — Pilot Playbook (Phase 8)

**Status: engineering ready, pilot not yet run.**

Phases 1–7 built the feature. This phase is the part that cannot be built: putting real money through it with real businesses and looking at what comes out the other end. Everything below is for the people who will do that.

---

## Why there is a pilot at all

This is the platform's first feature that produces an **irreversible physical artifact**, paid for with real money, fulfilled by a third party nobody has run a live order against. A bug in the map is a refresh. A bug here is paper in strangers' mailboxes, billed to a small business that trusted us.

There is also one genuinely open question that only real orders can close. The audit could never verify the unit economics — the per-piece cost was assumed, never confirmed against an invoice. **Until a vendor payable settles, our margin is a hypothesis.**

So: a handful of businesses, watched individually, before anyone else can touch it.

---

## What is already enforced in code

You do not have to remember these. They are guards, not conventions.

| Guard | Where | What it does |
|---|---|---|
| Pilot allowlist | `pilot.service.ts` | Only businesses ops added can create an order. **A business cannot add itself** — that is the difference between a pilot and a feature flag |
| Per-order ceiling | $1,000 | An order above it is refused, not charged. Guards against *our* arithmetic, not the buyer |
| Moderation before print | `fulfilment.service.ts` | Nothing unreviewed reaches a press, ever |
| Pre-press before checkout | `artwork.service.ts` | A file that would print badly is caught before money moves |
| Duplicate submission | vendor `extRefNbr` → 409 | A retry cannot print the run twice |
| Environment guard | `config/env.ts` | A non-production process cannot reach the live print queue |

Going general is one constant: `POSTCARD_ACCESS_MODE = 'general'`. Do not flip it until §5 is answered.

---

## 1. Before the first order

- [ ] **Rotate the leaked production API key** (still outstanding from Phase 0.1b)
- [ ] Vendor account has a **payment method on file** — their portal warns if not, and an empty retainer stalls every order at `payment_hold`
- [ ] `POSTCARD_BACK_TEMPLATE_URL` points at **real address-side artwork**. It currently points at a placeholder, deliberately obvious so it cannot ship unnoticed
- [ ] Acceptable-use agreement has been through **legal review** (`reviewed: false` today, and the flow checks that flag)
- [ ] Merchant-of-record decided; tax treatment confirmed (ADR-007 §5 — still open)
- [ ] `npm run probe:print -- --real` passes end to end against the sandbox
- [ ] Someone is named as **on call** for the moderation queue, with the runbooks read

## 2. Choosing the businesses

Five to ten. Choose for **tolerance, not enthusiasm** — you want people who will tell you it went wrong, not people who will be too polite to.

Good picks: businesses you already talk to weekly; ones whose customers are geographically tight, so a mailing plausibly works for them; at least one who is bad with computers, because they will find the parts of the flow that are confusing.

Tell each of them, in these words or close to them:

> This is new. We think it works. If it goes wrong we will refund you in full and tell you exactly what happened. We would rather you tried it and it broke than that you never tried it.

Add them:

```
POST /api/v1/postcards/pilot   { "businessId": "...", "note": "why this one" }
```

The note is not decoration. In six weeks nobody will remember why a business is on the list.

## 3. Watching an order

**One person follows each order the whole way.** Not "the team watches the dashboard".

| Stage | What you check | What good looks like |
|---|---|---|
| Area chosen | Deliverable count is plausible for that ZIP | A whole Modesto ZIP is ~20,000, not ~300. A very low count usually means the wrong list type |
| Priced | Total is close to what you expected per card | Wildly off means the wrong volume band or the wrong size |
| Artwork | Pre-press verdict matches what you can see | A file that looks fine and fails, or looks bad and passes, is a bug in the checker |
| Reviewed | Decision made within a few hours | Wait time is the TD-8 scaling signal |
| Submitted | Vendor order id recorded | Sitting in `paid` past a minute means the sweep is not running |
| Mailed | Stage reaches `mailed` | This is where our visibility ends, by design |
| **In hand** | **A physical card arrives** | **Do not start the next batch until this happens** |

**Hold the card.** Check the trim, the colour, whether text got cut off, whether the address side looks like a real business's mail. Every automated check in this system is a proxy for this moment.

## 4. When something goes wrong

Follow `RUNBOOKS.md`. Then write down what happened — not just that it was fixed. The pilot's output is the list of failure modes that turned out to be real, and the ones the audit predicted that never happened.

## 5. The review — before going general

```
npm run pilot:review
```

Read it with a person, not a dashboard. Five questions:

**1. What did the vendor actually bill us, versus what we quoted?**
The single most important number. Until a payable settles, the report says `unverified` rather than guessing — that is deliberate. A variance over 5% means the pricing model is wrong and needs fixing before volume, not after.

**2. What margin did we actually keep?**
Not the quoted margin. The quoted one is arithmetic; the realised one is a fact. If they differ materially, the 10% assumption from the original conversation does not survive contact with reality.

**3. How long did artwork wait for a human?**
Median and p90. If p90 is over a day, mail dates are already slipping and manual moderation is the ceiling on this product.

**4. Which failure modes actually happened?**
Especially `rejectedAfterPayment`. If it is anything other than zero-ish, moderation belongs *before* checkout and the flow needs reordering.

**5. Did a card reach a mailbox, and was it good?**
No report can answer this. Somebody has to have held one.

## 6. Going general

Only when:

- [ ] 5–10 orders completed end to end
- [ ] At least one physical card inspected and acceptable
- [ ] Cost variance measured and understood (not merely small — *understood*)
- [ ] Realised margin matches the business case, or the pricing is changed to match reality
- [ ] No unexplained `submission_failed` orders
- [ ] Moderation wait times are survivable at 10× the volume
- [ ] Every Phase 0 item closed — merchant of record, tax, legal review of the agreement

Then: set `POSTCARD_ACCESS_MODE = 'general'`, and consider lifting the per-order cap.

**Deliberately not in scope until after this:** neighborhood targeting, the unified marketing hub, reorder, campaign analytics. Building them now would mean scaling a feature whose economics are still a hypothesis.

---

## What engineering cannot do here

Worth stating plainly, because the rest of this roadmap has been code.

The pilot itself is not implementable. Nobody can write a test that proves a postcard looked right in someone's hand, that a vendor's invoice matched their quote, or that a business owner understood what they were buying. Those need a person, some real money, and about two weeks of paying attention.

What has been built is everything that makes running it *safe and measurable*: the gate that keeps the blast radius small, the ceiling that keeps a mistake survivable, and the review that turns the result into numbers rather than impressions.
