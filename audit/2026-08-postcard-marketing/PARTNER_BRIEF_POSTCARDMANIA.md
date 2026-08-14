# Partner Brief — PostcardMania (PCM Integrations)

**Purpose:** unblock roadmap items 0.2 and 0.4, plus the unanswered half of PC-17-A, in a single exchange.
**Owner:** Business (James), with engineering on the technical section.
**Contact:** PostcardMania sales — 1-800-690-0945 · developer/API support channel via the portal.

Section A is technical (engineering can absorb the answers directly). Section B is commercial and blocks the architecture. Section C is internal — one question for James, not for PostcardMania.

**Ask for the OpenAPI spec or Postman collection first.** It answers most of Section A in one attachment, and it is minutes of their time versus days of ours.

---

## The three answers that matter most

If the conversation is short, get these:

1. **B1** — Will you accept payment as a Stripe Connect connected account, or do you bill us wholesale on account? *(Determines the entire payment architecture.)*
2. **B4** — Tell us about the white-label Storefront Solution: terms, what it includes, what it looks like embedded. *(May replace 10–12 weeks of our build.)*
3. **A4** — Can we send targeting criteria and have you resolve, purchase, and use the mailing list entirely on your side, so consumer addresses never enter our systems? *(Determines whether we take on consumer-PII obligations.)*

---

## Section A — Technical

### A1 · Documentation and access
- Can we have the OpenAPI/Swagger spec or a Postman collection for DirectMail API v3?
- Is there a sandbox environment, and does it fully mirror production? Do sandbox submissions ever produce physical mail?
- We hold a sandbox key. Which **header** carries it, and what is the exact **base path**? (We confirmed the host is `api.pcmintegrations.com`; endpoint paths were not discoverable from the public docs.)
- v2 is still published — is v3 stable and the one to build against? What is the deprecation policy?

### A2 · Ordering
- What is the minimum order quantity, if any?
- Is a quote binding, and for how long? Is there a quote endpoint separate from submission?
- **Do you support idempotency keys on order submission?** ⚠️ Critical for us — a retried request that prints twice costs real money. If not supported, how do you recommend clients guard against duplicate submission?
- What is the cut-off between "cancellable" and "in production"? Is there a cancellation endpoint, and until when does it work?
- How far ahead can a mail date be scheduled?

### A3 · Artwork
- Exact specs for a postcard: trim sizes offered, bleed, safe area, minimum DPI, colour profile (CMYK?), accepted file formats, max file size.
- Do you provide downloadable design templates we can pass to our customers?
- **Our customers design the front only** — the back carries the address block. Is that a standard product for you, and what, if anything, can we put on the back?
- Do you review artwork before printing, or is that entirely our responsibility?
- What is your policy on prohibited content, and where does liability sit if a customer submits something unmailable or unlawful?

### A4 · Targeting and mailing lists ⚠️
- We want businesses to target **cities, ZIP codes, neighborhoods, and carrier routes**. Which of those do you support natively?
- Do you offer **EDDM / saturation mail** (every deliverable address in an area, no named recipients)? We did not find it in your public materials.
- Is there an endpoint that returns a **deliverable count and price** for a given area *before* ordering? We want the count to come from you rather than being computed on our side, so our quote matches your invoice.
- **The important one:** can we send you targeting criteria and have you purchase and use the list entirely on your side, so that consumer names and addresses never enter our systems? If yes, that is our strongly preferred design.
- If we must handle list data: what are the sourcing terms, and what obligations flow through to us?
- Is "neighborhood" a real targeting unit for you, or does it resolve to a set of carrier routes?

### A5 · Status and webhooks
- What order statuses do you report, and via webhook or polling?
- **Do you confirm delivery, or only handover to USPS?** We deliberately do not show customers a status we cannot observe, so this decides whether "delivered" exists in our product at all.
- Webhook signature scheme and secret? Do you retry failed deliveries? Can events arrive out of order or duplicated?

### A6 · Operations
- Rate limits?
- Typical turnaround from submission to mail drop?
- Support channel and escalation path for a stuck order.
- Historical uptime, and what happens to in-flight orders during an outage?

---

## Section B — Commercial ⚠️ blocks the architecture

### B1 · How money flows — the blocking question

> We are building a platform where local and mobile businesses order postcard campaigns directly from us. We need to settle with you automatically, without manual accounting on either side.
>
> **Two models are possible. Which do you support?**
>
> **Option A — split payment at the point of sale.** You onboard as a connected account under our Stripe platform. When a customer pays, Stripe routes your portion to you immediately and our margin to us, in the same transaction. No invoicing, no AR on your side.
>
> **Option B — wholesale.** You bill us at wholesale rates on account; we sell at retail, keep the difference, and settle with you on net terms.
>
> Your published partner materials describe wholesale pricing and markup, so we expect **Option B** — but we would like it confirmed, because it changes how we build.

**Why this blocks:** the two topologies diverge at the first line of our order service. Building the wrong one is discarded work.

Follow-ups if **B**: What are the payment terms (net 15/30)? Do we need a credit application or a deposit? Is there a prepay or account-balance model instead of invoicing? How are billing disputes and reprints handled?

Follow-ups if **A**: Are you willing to complete Stripe Connect onboarding and KYC under our platform account?

### B2 · Pricing
- Per-piece wholesale pricing for a one-sided postcard, by quantity band. Postage included or separate?
- Does the rate change by targeting type or postage class?
- Volume tiers — what is the path to better rates?
- Any setup fee, tech fee, or monthly minimum? *(Your materials say none — confirming.)*
- How much notice before a rate change? **We need this: our quotes are binding on our customers, and a rate change we learn about after the fact is a loss we absorb.**

### B3 · Agreement
- Is there a standard reseller/partner agreement we can review?
- Exclusivity or volume commitments?
- Term, termination, and what happens to in-flight orders on termination?
- Who owns the customer relationship? **We need it to be clearly ours.**
- Can we present the service under our own brand?

### B4 · The Storefront Solution ⚠️

> Your materials describe a white-label storefront where an organization's users design, send, and optionally purchase mailing lists, with the organization earning commission per order. That sounds close to what we are planning to build ourselves.
>
> We would like a demo and the terms.

- What exactly does it include — design tool, templates, targeting UI, checkout?
- How is it branded and embedded? Iframe, subdomain, redirect, full white-label?
- Commission structure versus the wholesale-and-markup model — can we choose?
- Can we keep our own checkout and payment relationship, or must payment run through you?
- Do we get order data and analytics back via API?
- What can we customise, and what is fixed?

**Why we are asking:** if the storefront covers most of this, it could replace a multi-month build. We would rather know before we start than after.

### B5 · Compliance
- Who is merchant of record for the print-and-mail service under each model?
- How is sales tax handled, and who remits in each destination state?
- Do you carry liability for content mailed on a customer's behalf, or does that sit entirely with us?

---

## Section C — Internal, for James

**C1 · "One side" — please confirm what you meant.**

You said: *"When they buy they only get one side of the postcard."*

A mailed postcard always has two printed sides — USPS requires an address side with the recipient block, indicia, and barcode. So we read this as: **the customer designs the front only**, and the back is the address side, composed automatically.

Confirming matters because it decides whether the upload takes one artwork file or two, what the template pack contains, and whether the back becomes a paid upgrade later. If you actually meant something else, now is the cheap time to say so.

**C2 · Margin.** You said 10% is fine. Under the wholesale model (B1), margin is ours to set rather than a negotiated split — we could price at 15–20% and still be competitive, as the earlier analysis suggested. Do you want to hold 10%, or set it once we see real wholesale rates? **Recommend deciding after B2**, since 10% of an unknown cost is not yet a meaningful number.

---

## After the answers land

1. Record the topology decision in **ADR-007 §4**; merchant of record in **§5**; PII in **§6**; build-vs-storefront in **§7**.
2. Re-estimate the feature matrix — most current numbers rest on assumptions (TD-10).
3. Set `BOOST_POSTCARD_UNIT_COST_CENTS` to the real per-piece rate. **This alone revives Boost, a complete feature that has shipped and been inert since launch** (~1 day of work).
4. Update `IMPLEMENTATION_ROADMAP.md` Phase 5 to the confirmed topology.
