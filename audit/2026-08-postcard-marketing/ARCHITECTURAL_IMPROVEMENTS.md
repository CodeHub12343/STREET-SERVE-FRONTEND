# Architectural Improvements

Design decisions that must be made before implementation, and structural recommendations. Each carries its justification, as required.

> **⚠️ Updated 2026-08-08 after PCM discovery.** Two recommendations below changed:
> - **§1** — Topology B is now the *expected* outcome, not the fallback. PostcardMania's published partner model is wholesale-and-markup.
> - **§6** — the saturation-only recommendation is **probably not available**; their mail appears list-based, which puts consumer PII back in scope.
>
> A third item was added: **§9**, evaluating their white-label storefront, which may replace much of this build.
> Evidence: `PCM_DISCOVERY_FINDINGS.md`. Decisions tracked in `ADR-007`.

---

## 1. Resolve the payment topology before writing payment code — BLOCKING

Two mutually exclusive architectures satisfy "the partner gets paid, we get 10%." They are not variations; they differ in money flow, tax, refunds, risk, and reconciliation.

### Topology A — Marketplace facilitation (what the transcript describes)

PCM is a Stripe Connect connected account. Buyer pays via destination charge; `applicationFeeCents` is StreetServe's 10%; the remainder settles to PCM automatically.

```
Buyer $500 ──▶ Stripe destination charge
                 ├─ application_fee $50 ──▶ StreetServe platform account
                 └─ $450 ─────────────────▶ PCM connected account
```

- **Merchant of record:** arguably PCM for the print service
- **Refunds:** Stripe reverses the transfer; both sides unwind together
- **Float/credit risk:** none — StreetServe never holds PCM's money
- **Build cost:** low. `createDestinationCharge` already exists with exactly these fields
- **Requires:** PCM accepts Connect onboarding and KYC

### Topology B — Resale (the fallback)

StreetServe sells postcard campaigns at retail, buys fulfilment from PCM as a supplier, settles on net terms.

```
Buyer $500 ──▶ StreetServe platform account
                 └─ (net 30, ACH) ──▶ PCM $450
```

- **Merchant of record:** StreetServe, for the whole transaction
- **Refunds:** StreetServe refunds the buyer and separately disputes with PCM. Asymmetric
- **Float/credit risk:** StreetServe carries both
- **Build cost:** higher — payables tracking, settlement job, invoice reconciliation
- **Tax:** StreetServe is selling a taxable service in every state it mails into. Materially heavier

### Recommendation — REVISED 2026-08-08

**Plan for Topology B. Still confirm in writing before building.**

Discovery found PostcardMania's own partner language to be unambiguously wholesale — *"wholesale pricing that you can mark up"*, *"earning a commission for each order"*. A supplier of that size has no reason to onboard as a marketplace seller under a reseller's Stripe platform. See `PCM_DISCOVERY_FINDINGS.md` Finding 2.

This is inference from marketing copy, not their statement, so it is strong enough to plan against and not strong enough to build on. Question B1 in the partner brief settles it.

**Two consequences worth stating plainly:**
- Phase 5 is ~3 weeks, not ~1.5.
- The transcript's promise of an *instant* split with *zero manual accounting* does not hold under B. Settlement is automatable but periodic. Say so to stakeholders rather than shipping B under A's language.

**Commercially, B is arguably better:** margin is ours to set rather than capped by a negotiated split.

The original reasoning is preserved below, since it still governs if PostcardMania surprises us.

---

### Original recommendation (superseded)

**Pursue Topology A. Do not build until PCM confirms in writing.**

A is what the specification describes, is cheaper to build, carries less risk, and reuses primitives already in this codebase. But its feasibility is a *commercial* fact about PCM, not an engineering choice — and speculative work on either path is likely to be discarded.

**Justification for treating this as blocking rather than parallelising:** the two topologies diverge at the first line of the order service, not at the last. Order status, refund rules, ledger accounts, tax handling, and the reconciliation job all differ. There is very little that can be built safely in common.

**Contingency if PCM declines:** say so plainly to stakeholders rather than quietly shipping B under A's language. The transcript has already promised "instant" and "zero manual accounting" to the client; under B, neither is strictly true, and discovering that after launch is worse than renegotiating the description now.

---

## 2. Decide merchant of record — it settles four downstream questions

Unresolved, and it determines: whether the 10% is a **fee** (disclosed, deducted from a counterparty) or a **margin** (embedded in retail price); who owes sales tax in each destination state (F-13); who owns chargeback liability; and what the buyer's receipt says.

**Recommendation:** decide this in the same conversation as §1 — Topology A implies PCM is merchant for the print service, Topology B implies StreetServe is. Then record it as an ADR. This codebase already uses ADRs for exactly this class of decision (ADR-004 driver classification, ADR-005 custodial funds, ADR-006 crowdfunding capture), and the next engineer will need the reasoning, not just the outcome.

**Proposed: ADR-007 — Postcard marketing money topology and merchant of record.**

---

## 3. Build Postcard Marketing as a sibling of Boost, sharing fulfilment

**Recommendation:** new `modules/postcards`. Do **not** extend `modules/boost`.

**Justification, in the codebase's own words.** ADR-006 already faced this exact question when it separated `boost_campaigns` from `placements` ([`boost.model.ts:11-17`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/boost/boost.model.ts)):

> *"Forcing both into one document gives you a schema where half the fields are null for half the rows and an `owner_id` that means two different things. The lifecycle patterns are shared; the table is not."*

The same reasoning applies with more force here, because the difference is about money semantics rather than shape: Boost holds **custodial community funds** (ADR-005) that are refundable until the goal is met; postcard orders are **direct purchases** that become irreversible at submission. Putting refundable custodial money and non-refundable purchase money in one table is the kind of mistake that surfaces as a compliance problem, not a bug.

**Share these, deliberately:**

| Shared component | Home | Consumed by |
|---|---|---|
| `PrintVendorGateway` adapter | `integrations/print` | both |
| Fulfilment status machine (`preparing→printing→mailed`) | new `modules/fulfilment` (extracted from Boost) | both |
| Product registry (`postcard_products`) | `modules/postcards` | both |
| Vendor webhook receiver | `modules/postcards` | both |
| Unit cost / margin config | `config/constants.ts` | both |

**Extract, do not copy, the status machine.** Two copies will drift, and the drift will be discovered when one of them reports a status the other cannot.

---

## 4. Keep the adapter domain-shaped, not PCM-shaped

`THIRD_PARTY_INTEGRATIONS.md` §1 already mandates this and the codebase honours it (`integrations/` holds `auth`, `gemini`, `kyc`, `messaging`, `storage`, `stripe`, `weather`).

**Justification specific to this integration:** the partnership is unsigned, the transcript's own framing is exploratory (*"I'll keep you posted if I get close to a partnership"*), and print/mail is a commodity market with many substitutable vendors. The probability of switching is materially higher than for, say, Stripe. The adapter is what makes that a one-file change.

Concretely: no PCM field names, status strings, or error codes above `integrations/print/`. Translate at the boundary.

---

## 5. Recommended improvement — treat the vendor as untrusted for money

**Not required by the specification.** Justified because vendor-reported values drive real charges.

Prices, deliverable counts, and statuses come from an external system we do not control. Recommend:

- **Sanity bounds on quotes.** Reject a quote outside a configured plausible range rather than charging it. A vendor-side pricing bug that returns $50,000 for 500 cards should fail loudly, not charge a card.
- **Never trust a webhook payload's amounts.** Use it as a signal to re-fetch authoritative state, as the Stripe webhook handling already does.
- **Verify webhook signatures and dedupe by event id**, matching `/webhooks/stripe` discipline.

---

## 6. Saturation mail only for MVP — ⚠️ LIKELY UNAVAILABLE (revised 2026-08-08)

**Discovery found no EDDM or saturation capability at PostcardMania.** Their API is transactional and per-recipient; targeting is expressed as *purchased mailing lists* (advertised types: new movers, consumer, carrier route). See `PCM_DISCOVERY_FINDINGS.md` Finding 4.

If mail is list-based, the PII avoidance this recommendation was built on is not available with this vendor, and **NF-8 comes into scope**: data-broker sourcing terms, state privacy regimes, retention and deletion obligations, breach surface, privacy-policy amendments.

**Preferred mitigation, to be confirmed (partner brief question A4):** have PostcardMania purchase and use the list entirely on their side — we send targeting criteria, they resolve, print, and mail. StreetServe then never holds consumer PII, preserving most of the benefit below. **Design the integration around this if it is possible.**

If PII must transit StreetServe, that is a legal review, not an engineering decision (tracker item 0.6).

The original reasoning is preserved below because it still states *why* PII avoidance is worth engineering for.

---

### Original recommendation (conditionally superseded)

**Not required by the specification, and it does not reduce stated scope.**

Every targeting unit the transcript names — cities, ZIP codes, neighborhoods, mailing routes — is an *area*. Saturation mail (every deliverable address in the area) satisfies all four.

**Justification:** the alternative, targeted list mail, means StreetServe handles purchased consumer names and addresses. That pulls in data-broker sourcing agreements, consumer privacy obligations across state regimes, retention and deletion policy, and a meaningful breach surface — for functionality the specification never asked for.

Ruling it out explicitly, in the ADR, is a large compliance saving for zero loss of scope. Revisit only if a customer actually asks.

---

## 7. Recommended improvement — pre-press validation before payment, not after

**Not required by the specification.** Justified by the irreversibility of the output.

The natural order (pay, then upload, then print) means artwork problems surface after money has moved. Validate at upload, before checkout: DPI at trim size, aspect ratio, bleed, colour space, format. Show a preview with trim and safe-area overlays.

This is the difference between "your file is too low-resolution, here's why" at upload and a refund conversation about 500 blurry cards already in the mail.

---

## 8. Recommended improvement — one ADR, written before the build

Record in **ADR-007**: the topology choice and why; merchant of record; the sibling-not-variant module decision; saturation-only; the point of no return at `submitted`; margin-vs-fee classification.

**Justification:** every one of these is a decision whose *reasoning* matters more than its outcome, and all six will be questioned later. The existing ADRs in this repo are the reason the current codebase is auditable at all — `boost.model.ts`'s comments explaining why `delivered` is absent and why `raised` is derived saved this audit hours of guessing. Extend the practice rather than breaking it.

**Written 2026-08-08** as `ADR-007-postcard-money-topology.md`. Three decisions settled (sibling module; `submitted` as point of no return; boot-enforced vendor environment); four framed and pending on Phase 0.

---

## 9. Evaluate the white-label storefront before building (added 2026-08-08)

**Not in the specification. Raised by discovery, and potentially the highest-impact item in this document.**

PostcardMania sells a white-label **Storefront Solution**: a branded portal where an organization's users design, send, and optionally purchase mailing lists, with commission per order. That overlaps PC-1, PC-2, PC-4–PC-8, PC-10, and PC-14/PC-20 — **including the design tool this audit deferred as XL and too expensive to justify**.

| | Bespoke build | White-label storefront |
|---|---|---|
| Time to first order | 10–12 weeks | plausibly days–weeks |
| Design tool (PC-2) | deferred as XL | likely included |
| UX | native to StreetServe | embed or redirect — a seam |
| Margin control | ours to set | their commission schedule |
| Lock-in | low (adapter) | high |
| Order data | ours | theirs, possibly not exposed |

**Justification for making this a gate rather than a footnote:** the audit costed a multi-month build on the assumption that nothing comparable existed. Something comparable does. Even if the answer is "build it anyway" — for UX control, margin, and data — that should be a decision made against a real alternative, not in ignorance of one. A hybrid is plausible too: storefront to prove demand, native build once volume justifies it.

Partner brief question B4 asks for a demo and terms. **Do not skip it.**
