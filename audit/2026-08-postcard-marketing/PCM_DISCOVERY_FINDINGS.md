# PCM Discovery Findings (partial PC-17-A)

**Date:** 2026-08-08 · **Method:** public web research + unauthenticated probes against `api.pcmintegrations.com` using the sandbox key.
**Status:** ✅ **COMPLETE.** The OpenAPI spec was obtained (`DirectMail-API-v3.json`) and the API surface is now fully known. Strategic findings below stand; §8 has been replaced with confirmed facts, and §9 records what the spec settled.

No orders were submitted. Probes were read-only.

> **Six open questions closed by the spec** — details in §9:
> 1. **PII stays with the vendor.** Area targeting works via *list counts*: we send a ZIP/route/radius, they return an **id and a count**. No consumer names or addresses reach StreetServe. This is the mitigation `ARCHITECTURAL_IMPROVEMENTS.md` §6 hoped for, and it is available.
> 2. **Idempotency exists** — `extRefNbr`, with 409 on a duplicate. Closes audit F-6; retrying a submission is safe.
> 3. **Auth is a login exchange**, not a static key — and needs a key **and secret** pair.
> 4. **No quote endpoint.** Pricing is published per-design volume breaks; the run price is computed by us and is not binding.
> 5. **No status webhooks.** Status must be polled.
> 6. **"One side" means one *designed* side.** The vendor requires both `front` and `back`.

---

## Finding 1 — PCM Integrations is PostcardMania

The Stoplight documentation workspace resolves to slug `postcardmania` (`projectId: 18203562583`).

PostcardMania is a large, long-established direct-mail printer (Clearwater, FL), not a small integrator. This matters commercially: they have their own merchant processing, their own AR, an existing reseller channel, and materially more negotiating leverage than a startup vendor. It also means the integration is likely to be stable and well-supported.

---

## Finding 2 — Their partner model is wholesale-and-markup, not split payments 🔴

This is the most important finding, and it bears directly on the blocking question 0.2.

PostcardMania's own published partner language:

> *"You'll receive **wholesale pricing that you can mark up** and still remain competitive. This income stream can add up quickly."*

> *"For franchises or organizations looking to offer direct mail to their users, they provide a branded platform where they can design, send, and optionally purchase mailing lists — **earning a commission for each order**."*

Both descriptions are **Topology B (resale)**. Neither resembles Topology A (Stripe Connect destination charge with an application fee).

A wholesale supplier bills its reseller on account. It does not onboard as a marketplace seller under the reseller's Stripe platform, submit KYC to that platform, and receive customer money as transfers — that inverts the commercial relationship, and for a company of this size there is no reason to accept it.

**Assessment: the probability that PostcardMania accepts Stripe Connect onboarding is low.**

This does not make the feature harder to *sell* — a wholesale/markup model is a perfectly good business, and arguably a better one, since margin is set by us rather than capped by a negotiated split. But it means the specific promise made in the transcript — *"instantly route the printing cost to the partner and drop our 10% straight into our account… zero manual accounting"* — is **probably not deliverable as described**.

**Consequence:** plan for Topology B. `IMPLEMENTATION_ROADMAP.md` Phase 5 becomes ~3 weeks rather than ~1.5, and requires payables tracking, a settlement job, and invoice reconciliation. Still fully automatable — just not an instant split.

**Still confirm in writing** (question B1 in the partner brief). This is inference from public marketing copy, not a statement from PostcardMania. It is strong enough to plan against and not strong enough to treat as settled.

---

## Finding 3 — They already sell the product we were about to build 🟡

PostcardMania offers a **Storefront Solution**: a white-label branded portal where an organization's users *design, send, and optionally purchase mailing lists*, with the organization earning commission per order.

That overlaps a large share of the specification: PC-1 (upload), PC-2 (design tool), PC-4–PC-8 (targeting and quantity), PC-10 (ordering), and PC-14/PC-20 (revenue share).

**This deserves a serious evaluation before any build.** The audit costed a bespoke build at 10–12 weeks, with the design tool (PC-2, XL) deferred as too expensive to justify. If a white-label storefront delivers most of that — including the design tool — the calculus changes completely.

The trade-off is real and cuts both ways:

| | Build (current roadmap) | White-label storefront |
|---|---|---|
| Time to first order | 10–12 weeks | Plausibly days–weeks |
| Design tool (PC-2) | Deferred as XL | Likely included |
| UX integration | Native to StreetServe | Likely an embed or redirect — a seam in the product |
| Margin control | Ours to set | Their commission schedule |
| Vendor lock-in | Adapter keeps it low | High |
| Data / analytics | Ours | Theirs, possibly not exposed |

**Recommendation: get a demo and their storefront terms before committing to the build.** Even if the answer is "build it," that decision should be made against a real alternative rather than in ignorance of one. A hybrid is also plausible — storefront for MVP to prove demand, native build later once volume justifies it.

This is question B4 in the partner brief.

---

## Finding 4 — Mail is list-based, not saturation. This reverses an audit recommendation 🔴

The API is transactional and per-recipient: *"Instantly trigger personalized postcards or letters from your CRM or software."* Individual recipient names and addresses appear to be required per piece. Targeting is expressed as **purchased mailing lists** — advertised list types include *new movers, consumer, and carrier route*.

No EDDM or saturation-mail capability was found.

**This contradicts `ARCHITECTURAL_IMPROVEMENTS.md` §6**, which recommended saturation-only precisely so that StreetServe would never touch consumer names and addresses. If PostcardMania is list-based, that avoidance is not available with this vendor.

**Consequence — NF-8 is now in scope, and it is not a small item:**

- StreetServe would be involved in purchasing and processing consumer PII (names, home addresses)
- Data-broker sourcing terms flow through to us
- State privacy regimes apply, with retention and deletion obligations
- A breach surface exists that saturation mail would not have created
- Our own privacy policy likely needs amending

**Mitigation to explore (question A4):** if the list is purchased *through* PostcardMania and never leaves their systems — we send targeting criteria, they resolve, print, and mail — StreetServe may never hold the PII at all. That would preserve most of the benefit. **Establish whether this is possible; it is worth designing the integration around.**

If PII must transit StreetServe, that is a legal review, not an engineering decision, and it belongs in Phase 0 alongside merchant-of-record.

---

## Finding 5 — "One side" probably means one *designed* side, not one printed side 🟡

The transcript says: *"When they buy they only get one side of the postcard."*

A mailed postcard cannot physically be one-sided — USPS requires an address side carrying the recipient block, indicia, and barcode. So this almost certainly means **the buyer designs the front only**, with the back auto-composed from the address block plus whatever minimal content the vendor's template allows.

The distinction is not pedantic. It determines what the upload accepts (one artwork file, not two), what the template pack contains, what the preview renders, and whether the back is sellable later as an upsell.

**Confirm the intent with James** — it is a one-sentence clarification that shapes PC-1, PC-2, and PC-3. Recorded as question C1.

---

## Finding 6 — Commercial terms are favourable for a pilot

Published: *"No tech fees • Printed in-house • Pay per piece mailed"*, and *"does not charge setup fees or monthly minimums. Everything is pay-per-piece."*

No setup cost and no monthly minimum means the pilot in Phase 8 carries almost no fixed downside. Good news for staging a small, careful launch.

Per-piece rates are not published. Still required for Phase 0.4 and to un-zero `BOOST_POSTCARD_UNIT_COST_CENTS`.

---

## Finding 7 — Formats and a product opportunity

Supported: postcards, letters with inserts, folded self-mailers, flyers, brochures, snap-aparts. All support full personalization and **dynamic QR codes**.

Dynamic QR is worth noting beyond MVP: a postcard QR could deep-link to the vendor's live map pin, their queue, or a tracked offer — closing the loop from physical mail to the platform, and giving StreetServe attribution data that justifies the margin. Not in scope now; worth recording as a differentiator.

---

## Finding 9 — The API surface, confirmed from the spec ✅

Source: PostcardMania **DirectMail API v3** OpenAPI document (`DirectMail-API-v3.json`, 50 operations, `x-stoplight.id` `84aca6606cef4`). Live-verified where noted.

### Host and auth

**Base URL is `https://v3.pcmintegrations.com`** — *not* `api.pcmintegrations.com`, which only redirects to their docs. That single wrong host is why every earlier probe returned 404.

Auth is a **login exchange**, not a static header:

```
POST /auth/login   { apiKey, apiSecret }  →  { token, expires }
then:  Authorization: Bearer <token>
```

**Live-verified:** the endpoint returns 400 on an empty body and 401 on bad credentials, so host, path, and shape are confirmed against the running API.

Two consequences:
- **Two credentials are needed, not one.** A key without its secret cannot authenticate. Both are generated together in the portal (My Account → API Keys).
- The token expires, so the client caches it and renews ahead of expiry. Sandbox vs. production is decided purely by *which key pair* you use — which is why `PCM_ENVIRONMENT` is boot-enforced.

### Targeting is "list counts" — and the PII stays with the vendor ✅

```
POST /list/count/zipcode        { listType, zipCodes[],     breakdownType, demographics[] }
POST /list/count/carrier-route  { listType, carrierRoutes[] (e.g. "33755:C002"), … }
POST /list/count/radius         { listType, radius{miles,address,city,state,zip}, … }
                             →  { listCountID, recordCount, breakdown[] }
GET  /list/types             →  available list types (e.g. `IRL` ResOcc)
```

**The response is an id and a count — never addresses.** You then order against `listCountID`. The vendor resolves, holds, and mails the list.

This resolves the concern in Finding 4 and reopened §6 of `ARCHITECTURAL_IMPROVEMENTS.md`: **consumer PII need never enter StreetServe systems.** The integration should be kept this way on purpose — the vendor *also* offers a recipient-supplying shape (`POST /order/postcard` with a `recipients[]` array), and using it would drag names and home addresses into our database for no product gain. The adapter deliberately implements only the list-count path, and the harness asserts on the live response that no recipient fields come back.

Note this is *targeted list* mail, not EDDM saturation — so it is not the "no PII by construction" model originally recommended, but it is operationally equivalent for our purposes.

### Pricing — there is no quote endpoint

Prices are published as **per-design volume breaks** on `GET /gallery/designs`:

```json
{ "mailClass": "Standard", "price": 0.38, "breakQty": 1000 }
```

Dollars as floats; converted to integer cents at the boundary. The applicable break is the highest one the quantity reaches.

**So a "quote" is computed by us and is not binding** — the authoritative charge lands on the invoice. `RunPrice.isBinding` is typed as the literal `false` to keep callers honest, and audit F-8's stale-quote risk becomes a re-price-at-checkout requirement rather than an expiry check.

`GET /integration/balance` returns `moneyOnAccount` — a **prepaid retainer**. That is a supplier relationship, and it independently corroborates Topology B (ADR-007 §4).

### Ordering, idempotency, and cancellation

```
POST /order/postcard/with-list-count   { mailClass, size, front, back,
                                         listCountID, recordCount,
                                         extRefNbr, mailDate, returnAddress }
                                    →  { orderID, batchID, extRefNbr }
GET    /order/{orderID}   → status        DELETE /order/{orderID} → cancel
```

**`extRefNbr` is the idempotency mechanism** — every order route documents **409 on a duplicate reference**. A retried submission cannot produce a second print run; it either lands once or is refused. **This closes audit F-6**, which was open only because the answer was unknown, and `PRINT_VENDOR_IDEMPOTENCY_CONFIRMED` is now `true` on documented evidence.

**Cancellation is real, until the daily cutoff.** Orders batch at end of day (their docs say 11:30 PM EST); after that the batch goes to press and cancellation is refused. This *improves* ADR-007 §2 rather than contradicting it: the point of no return is the batch cutoff, not the instant of submission, so there is a genuine cancel window to offer buyers.

### Statuses

| Vendor | Ours | Note |
|---|---|---|
| `Pending` | `preparing` | |
| `Processing`, `Processed` | `printing` | |
| `Mailing`, `Complete` | `mailed` | `Mailing` appears on the batch, not the order |
| `Delivered` | `mailed` | See below |
| `Canceled` | `canceled` | terminal |
| `Undeliverable` | `undeliverable` | terminal |
| `Failed` | `failed` | terminal |
| `Pending Payment`, `Failed Payment` | `payment_hold` | terminal — **ops alert**, retainer ran dry |

**`Delivered` exists**, which the earlier audit assumed it would not. But the vendor defines it as *"scanned by the last postal facility and will start hitting mailboxes"* — real signal, not arrival in a mailbox. Surfacing that to a buyer as "delivered" would overclaim, so it maps to `mailed`. Adding a distinct *arriving soon* state is now an evidence-backed **product decision**, no longer blocked by lack of information.

The terminal states were a genuine gap in the first design: an order can end in ways that are not "further along the pipeline", and a mapper with nowhere to put them would either throw on a legitimate value or mislead.

### Products

Postcard sizes: `46S` (4×6), `46` (4.25×6), `58` (5.5×8.5), `68` (6×8.5), `69` (6×9), `611` (6×11). `46S`/`46` are **First Class only**. Mail classes: `FirstClass`, `Standard`.

### "One side" — settled by the API itself ✅

An order requires **either** `designID` **or** `size` + `front` + `back`. Both artwork sides are mandatory.

That confirms the reading in Finding 5: **one *designed* side, two *printed* sides.** The buyer supplies the front; the back carries the address block. The upload flow takes one file, and the platform supplies a standard back. No need to ask James after all — though it is worth telling him, since it decides whether the back becomes a paid upgrade later.

### Also available, not used yet

Embedded **design editor** (`POST /design/custom`, `GET /design/{id}/edit` return a URL to their editor) — directly relevant to the PC-2 build-vs-buy question in Finding 3. **Dynamic QR codes** with scan tracking (`/qr-code/*`), a **suppression list**, **address verification**, **drip campaigns**, and proof generation (`/design/generate-proof/postcard`) — the last of which could serve the pre-press preview requirement (NF-2) without us building a renderer.

---

## Finding 8 — API surface: the original probing attempt (superseded by Finding 9)

**Confirmed:**
- API host: `https://api.pcmintegrations.com` (root returns 302 → `docs.pcmintegrations.com`)
- Docs: Stoplight-hosted, `docs.pcmintegrations.com`; current version **v3**, with **v2** still published
- Credential format: base64-wrapped UUID. The sandbox key decodes to `d907a8d2-…`; the leaked production key to `ab4f8878-…`

> **Sandbox and production keys are indistinguishable by shape.** Nothing about the key tells you which environment it spends money in. This is why `PCM_ENVIRONMENT` is an explicit, boot-enforced variable rather than something inferred — see the guard added in `config/env.ts`.

- Server stack: **`Microsoft-IIS/10.0` / `ASP.NET`** (from 404 response headers)
- Their Stoplight workspace slug is `postcardmania`, project id `18203562583`

**Not confirmed — needs their OpenAPI spec:**
- Endpoint paths. Probes of `/v3/products`, `/v3/orders`, `/v3/templates`, `/api/v3/*`, `/directmail/v3/*`, `/swagger/v1/swagger.json`, `/openapi.json` and others **all returned 404**. A broad scan found no route on the host that returns anything other than 404, so nothing was reachable to inspect
- Auth header name and format (`x-api-key`, `Authorization: Bearer`, and `apikey` were all tried; because no real route was ever reached, the 404s distinguish nothing)
- Request/response shapes, webhook events and signature scheme, **idempotency support** (F-6 — critical: a retry that double-prints costs real money), rate limits, artwork specs, SKU catalogue

**Why probing stopped.** Stoplight's docs API returned 500 for every project-id encoding tried, and the served HTML contains only Optimizely feature-flag data — the table of contents is fetched client-side, so the endpoint list never appears in the markup. Guessing further would have produced plausible-looking wrong code, which is worse than an honest seam. The unknowns are now quarantined in `integrations/print/wire.ts` behind `WIRE_VERIFIED = false`, which refuses to run in production.

**Fastest path to the rest:** ask PostcardMania for the OpenAPI/Postman collection and sandbox docs access. They have a sales line (1-800-690-0945) and an existing developer channel. This is minutes of their time and days of ours.

---

## What changes in the audit

| Document | Change |
|---|---|
| `ARCHITECTURAL_IMPROVEMENTS.md` §1 | Topology B now the *expected* outcome, not the fallback |
| `ARCHITECTURAL_IMPROVEMENTS.md` §6 | Saturation-only recommendation **likely not available**; NF-8 in scope |
| `IMPLEMENTATION_ROADMAP.md` Phase 5 | Plan ~3 weeks (Topology B), not ~1.5 |
| `IMPLEMENTATION_ROADMAP.md` Phase 0 | Add: evaluate white-label storefront; add legal review for consumer PII |
| `IMPLEMENTATION_PRIORITY_MATRIX.md` 5.1 | Design tool may come free via storefront — re-evaluate the deferral |
| `MISSING_FEATURES.md` §3 | Audience model is list-based, not area-based |

Applied in this pass.

---

## Confidence

| Finding | Confidence | Basis |
|---|---|---|
| 1 — PCM is PostcardMania | **High** | Stoplight workspace slug |
| 2 — Wholesale model, not Connect | **Medium-high** | Their own published partner copy. Inference, not their statement |
| 3 — Storefront overlaps our build | **High** (exists) / **Unknown** (fit) | Published product; terms and fit unverified |
| 4 — List-based, not saturation | **Medium** | Absence of EDDM in marketing + per-recipient API framing. Absence of evidence |
| 5 — "One side" = one designed side | **Medium** | Postal reasoning, not a PCM statement |
| 6 — Pay-per-piece, no minimums | **High** | Published repeatedly |
| 8 — API host and key format | **High** | Directly observed |

Findings 2, 4, and 5 are the ones to confirm in writing before they harden into assumptions.

---

## Sources

- [PCM Integrations — Direct Mail API](https://www.pcmintegrations.com/direct-mail-api/)
- [PCM Integrations — CRM Integrations](https://www.pcmintegrations.com/crm-integrations/)
- [DirectMail API v3 docs (Stoplight)](https://docs.pcmintegrations.com/docs/directmail-api/84aca6606cef4-direct-mail-api-v3)
- [PCM Integrations pricing — G2](https://www.g2.com/products/pcm-integrations/pricing)
- [PCM Integrations — Capterra](https://www.capterra.com/p/10009255/Direct-Mail-API/)
