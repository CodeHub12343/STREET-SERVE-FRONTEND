# ADR-007 — Postcard Marketing: money topology and merchant of record

**Status:** 🟢 **ACCEPTED for §1–§4.** Topology decided 2026-08-08: **Option B, wholesale resale.** Sections 5–7 remain pending (merchant of record awaits accounting review; PII and build-vs-storefront await the partner conversation).
**Date:** 2026-08-08
**Supersedes:** nothing · **Related:** ADR-005 (custodial community funds), ADR-006 (crowdfunding capture)

This ADR is written *before* the build, deliberately, because five decisions here each have a cheap right answer now and an expensive wrong one later. Where a decision is not yet made, the options are specified precisely enough that recording the answer is a one-line edit rather than a rewrite.

---

## 1. DECIDED — Postcard Marketing is a sibling of Boost, not a variant

**Decision:** new `modules/postcards`. Do not extend `modules/boost`. Share the fulfilment pipeline via an extracted `modules/fulfilment`.

**Context.** Boost My Marketing (ADR-006) already mails postcards. The superficial overlap invites merging them.

**Why not.** The money semantics are opposites:

| | Boost | Postcard Marketing |
|---|---|---|
| Money | Custodial community funds (ADR-005) | Direct B2B purchase |
| Contributors | Many | One buyer |
| Refundability | Refundable until the goal is met | Irreversible once submitted |
| Trigger | Goal reached by deadline | Checkout |

ADR-006 faced this exact question when it kept `boost_campaigns` separate from `placements`:

> *"Forcing both into one document gives you a schema where half the fields are null for half the rows and an `owner_id` that means two different things. The lifecycle patterns are shared; the table is not."*

That reasoning applies with more force here, because the difference is about *whose money it is*. Custodial funds held for contributors and a business's own purchase money in one table is a compliance problem, not a schema inconvenience.

**Consequences.** Some duplication of campaign-shaped fields. Accepted. The fulfilment status machine is **extracted, not copied** — two copies will drift, and the drift surfaces as one feature reporting a status the other cannot.

---

## 2. DECIDED — the point of no return is the vendor's batch cutoff, not submission

> **Refined 2026-08-08 by the vendor's spec, in the buyer's favour.** Submission is *not* instantly irreversible: the vendor batches orders at end of day (their docs say 11:30 PM EST) and honours `DELETE /order/{orderID}` until then. After that the batch goes to press and cancellation is refused.
>
> So there is a **real cancellation window** to offer — cancel-until-cutoff, then hard stop. The state machine still needs a hard irreversible edge and the refund policy still needs the rule; the edge simply sits at the cutoff rather than at the click. Everything below stands, with `submitted` reinterpreted as *submitted-and-batch-closed*.
>
> The vendor is authoritative here: the service must ask them to cancel and honour their refusal, never assume the window from our own clock.

### Original decision

**Decision:** the order state machine is `draft → quoted → paid → submitted → printing → mailed`, plus `cancelled` and `failed`. Once `submitted`, cancellation is refused **by the service**, not merely hidden in the UI. The rule lives in `refundPolicy.ts` alongside every other refund rule.

**Context.** Every existing refundable path in this platform involves something reversible or undelivered. Boost only ever refunds *before* anything is printed. Nothing covers an irreversible physical good.

**Why.** You cannot unprint a postcard. Without an explicit rule, a support agent eventually refunds a mailed order and the platform absorbs the full vendor cost with nothing to reclaim. A cancel button that appears to work after submission is worse than no button.

**Consequences.** Artwork moderation and pre-press validation must both complete *before* `submitted`, so rejection composes cleanly with a full refund. Disclosed at checkout and in the order agreement.

---

## 3. DECIDED — The vendor environment is explicit and boot-enforced

**Decision:** `PCM_ENVIRONMENT` (`sandbox` | `production`) is a required, defaulted config value. Boot fails if it is `production` while `NODE_ENV` is not.

**Context.** PostcardMania's sandbox and production keys are both base64-wrapped UUIDs and are **indistinguishable by shape**. Nothing about a key tells you which environment it spends money in.

**Why.** A print run is the one action in this platform that cannot be rolled back. A dev box pointed at the live print queue sends physical mail to real households at real cost, discovered days later. Inferring the environment from the key is impossible; inferring it from `NODE_ENV` alone silently trusts whoever set the key.

**Implemented** in `config/env.ts` (Phase 0.1), verified against all three configurations.

---

## 4. DECIDED (2026-08-08) — Money topology is **B, wholesale resale**

**Decision:** StreetServe buys printing from PostcardMania at wholesale and resells at retail. We collect the full customer payment, keep the margin, and settle with the vendor on net terms. **Not** a Stripe Connect destination charge.

**Why B, given A is cheaper to build.**

A is ~1.5 weeks of build against a primitive that already exists; B is ~3. But A's *calendar* risk is the larger number. A requires PostcardMania to accept Connect terms and pass Stripe KYC under our platform — a legal and finance review at a company of that size, if they agree at all. Their published partner model is wholesale-and-markup and commission-per-order, which is a supplier's model, not a marketplace seller's. Building A and being declined costs the code *and* the calendar, then B anyway. B is the only path that can actually be scheduled.

B is also commercially better: **margin is ours to set** rather than capped by a negotiated split. The earlier analysis suggesting 15–20% remains available under B in a way it would not be under A.

**Consequences, accepted:**
- Phase 5 is ~3 weeks. Requires a payables model, a settlement sweep, and invoice reconciliation — all shapes this codebase already has (`modules/ledger`, the Boost deadline/rollover sweeps, the nightly Stripe reconciliation job).
- StreetServe carries float and credit risk between collection and settlement.
- Refunds are asymmetric: refund the buyer, dispute with the vendor separately. This makes §2's point of no return more important, not less.
- **The customer-facing promise must change.** "Instant split" is not true under B. "Zero manual accounting" survives — the settlement job does the work, nobody keys invoices — but settlement is *periodic*, not instantaneous. Say so plainly rather than shipping B under A's language.

**Implemented in the adapter.** `integrations/print/types.ts` treats the vendor as a supplier: every amount crossing the boundary is the wholesale cost to us, never a customer-facing price. Margin is applied above this layer and is deliberately invisible to the adapter.

**Still confirm with the vendor** (partner brief §B1) — payment terms, credit application, prepay vs. invoicing. Those are B's parameters, not a re-opening of the choice.

---

### The rejected option, recorded

**Option A — marketplace facilitation.** PostcardMania as a Stripe Connect connected account; buyer pays via destination charge; `applicationFeeCents` is our margin; remainder settles to them automatically.

```
Buyer $500 ──▶ Stripe destination charge
                 ├─ application_fee $50 ──▶ StreetServe
                 └─ $450 ─────────────────▶ PostcardMania (connected account)
```

Genuinely cheaper to build — `createDestinationCharge({ destinationAccountId, applicationFeeCents, … })` already exists in `integrations/stripe`. No float, no credit risk, refunds unwind both legs together.

Rejected on feasibility, not merit. If PostcardMania unexpectedly offers Connect, revisit — the primitive is still sitting there.

---

<details>
<summary>Original framing of the pending decision (superseded)</summary>

**The decision:** does PostcardMania receive money as a Stripe Connect connected account (A), or as an invoiced wholesale supplier (B)?

### Option A — Marketplace facilitation

```
Buyer $500 ──▶ Stripe destination charge
                 ├─ application_fee $50 ──▶ StreetServe
                 └─ $450 ─────────────────▶ PostcardMania (connected account)
```

Build cost **low** — `createDestinationCharge({ destinationAccountId, applicationFeeCents, … })` already exists in `integrations/stripe`. No float, no credit risk, refunds unwind both legs together. Phase 5 ≈ 1.5 weeks.

**Requires PostcardMania to accept Connect onboarding and Stripe KYC.**

### Option B — Wholesale resale

```
Buyer $500 ──▶ StreetServe
                 └─ (net terms, ACH) ──▶ PostcardMania $450
```

StreetServe sells at retail, buys at wholesale, settles on account. Needs payables tracking, a settlement job, and invoice reconciliation. StreetServe carries float and credit risk. Refunds are asymmetric — refund the buyer, dispute with the vendor separately. Phase 5 ≈ 3 weeks.

**Margin is ours to set** rather than a negotiated split, which is commercially better.

### Current expectation: **B**

PostcardMania's published partner language is unambiguously wholesale:

> *"You'll receive wholesale pricing that you can mark up and still remain competitive."*
> *"…earning a commission for each order."*

A wholesale supplier of this size has no reason to onboard as a marketplace seller under a reseller's Stripe platform. See `PCM_DISCOVERY_FINDINGS.md` Finding 2.

**This is inference from marketing copy, not their statement.** Confirm before recording (partner brief, question B1).

**Note for stakeholders:** under B, the transcript's promise of an *instant* split with *zero manual accounting* is not literally deliverable. Settlement is automatable, but it is periodic, not instantaneous. Say this plainly rather than shipping B under A's language.

</details>

---

## 5. PENDING — Merchant of record

**The decision:** who is the merchant of record for the print-and-mail service?

**§4 now points hard at StreetServe.** Under wholesale resale we are selling a print-and-mail service to the customer, in our own name, at our own price. But this is a tax and liability question, so it needs an accountant's confirmation rather than an inference from the money flow — and the multi-state sales-tax exposure it implies is significant enough to be worth the review on its own.

**It settles four things at once:**

1. **Margin vs. fee.** The fee registry (`config/constants.ts`) holds *fees* — deducted from a counterparty's proceeds and disclosed. The 10% under B is a **resale margin**, embedded in retail price and not normally itemised. Registering it as a fee without deciding produces a disclosure that is either wrong or missing.
2. **Sales tax.** Print and mail is taxable in many US states. Under B, StreetServe is selling a taxable service into every state it mails to — materially heavier than under A. Stripe Tax is integrated but unwired for this.
3. **Chargeback liability.**
4. **What the buyer's receipt says.**

**When decided,** register `postcard_margin: { rate_bps: 1000 }` with a comment stating explicitly whether it is a margin or a fee, and why. Admin-adjustable — the transcript anticipates the rate moving with volume.

---

## 6. RESOLVED (2026-08-08) — Consumer PII stays with the vendor

**Decision:** use the vendor's **list-count** path exclusively. StreetServe never holds consumer names or addresses.

The vendor's spec settled this. Area targeting works as: send a ZIP / carrier route / radius → receive a `listCountID` and a `recordCount` → order against that id. **The response is an id and a number, not addresses.** They resolve, hold, and mail the list.

**Why this is a decision and not just a happy fact:** the same API *also* offers a recipient-supplying shape (`POST /order/postcard` with a `recipients[]` array of names and home addresses). Using it would pull consumer PII into our database — data-broker terms, state privacy regimes, retention and deletion duties, and a breach surface — for no product gain. The adapter therefore implements only the list-count path, and the sandbox harness asserts on the *live* response that no recipient fields come back, so a future change in either direction is caught rather than discovered.

NF-8 is out of scope while this holds. If a requirement ever needs named recipients, that is a legal review, not a code change.

<details>
<summary>Original framing (superseded)</summary>

## 6. PENDING — Consumer PII

**Reopened by discovery.** `ARCHITECTURAL_IMPROVEMENTS.md` §6 recommended saturation (EDDM) mail specifically so StreetServe would never handle consumer names and addresses. Discovery found no EDDM capability — PostcardMania appears list-based, with lists purchased by type (new movers, consumer, carrier route).

**If mail is list-based, NF-8 is in scope:** data-broker sourcing terms, state privacy regimes, retention and deletion obligations, breach surface, privacy-policy amendments.

**Preferred mitigation, to be confirmed (question A4):** if the list is purchased *through* PostcardMania and never leaves their systems — StreetServe sends targeting criteria, they resolve, print, and mail — then StreetServe never holds the PII. **Design the integration around this if it is possible.**

If PII must transit StreetServe, that is a legal review and belongs in Phase 0 beside merchant of record.

</details>

---

## 7. PENDING — Build vs. white-label

**Newly raised by discovery, and it may moot much of this ADR.**

PostcardMania sells a white-label **Storefront Solution** where an organization's users design, send, and buy lists, with commission per order. That overlaps PC-1, PC-2, PC-4–8, PC-10, and PC-14/20 — including the design tool this audit deferred as too expensive (XL).

**Do not skip this evaluation.** The bespoke build is costed at 10–12 weeks. If a storefront delivers most of it in days, the decision to build should at least be made against a real alternative. A hybrid — storefront to prove demand, native build once volume justifies it — is also plausible.

Trade-offs and the full comparison: `PCM_DISCOVERY_FINDINGS.md` Finding 3. Partner brief, question B4.

---

## Decision log

| § | Decision | Status | Owner |
|---|---|---|---|
| 1 | Sibling module, shared fulfilment | ✅ Decided | Eng |
| 2 | `submitted` = point of no return | ✅ Decided | Eng + Product |
| 3 | Explicit boot-enforced vendor environment | ✅ Implemented | Eng |
| 4 | Money topology | ✅ **Decided — B, wholesale resale** (2026-08-08) | Business |
| 5 | Merchant of record + tax | 🟡 Pending — §4 points at StreetServe | Business + accountant |
| 6 | Consumer PII exposure | ✅ **Resolved — list-count path only; PII never reaches us** | Eng |
| 7 | Build vs. white-label | 🟡 Pending | Product + Business |
