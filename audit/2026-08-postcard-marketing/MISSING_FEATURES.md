# Missing Features

Requirements specified but not implemented. Verified by exhaustive search of both `src` trees — `grep -i pcmintegrations` returns zero hits, and the only `postcard` matches are Boost's estimate helper and its two constants.

Each entry proposes a design. Designs marked **assumption** depend on PC-17-A (PCM discovery) and must be revisited after it.

---

## 1. PCM Integrations adapter (PC-17) — build this first

Nothing exists. Everything else depends on it.

**Proposed shape** — `src/integrations/print/`, following the pattern already proven by `integrations/stripe` and `integrations/kyc`:

```ts
export interface PrintVendorGateway {
  listAudiences(input: { type: 'city'|'zip'|'route'; query: string }): Promise<AudienceOption[]>;
  quote(input: { sku: string; audienceKeys: string[]; quantity: number }): Promise<VendorQuote>;
  submitOrder(input: { quoteRef: string; assetUrl: string; mailDate: Date; idempotencyKey: string }): Promise<{ vendorOrderId: string }>;
  getStatus(vendorOrderId: string): Promise<'preparing'|'printing'|'mailed'>;
  parseWebhook(rawBody: Buffer, signature: string): PrintVendorEvent;
}
```

Domain-shaped, not PCM-shaped. `THIRD_PARTY_INTEGRATIONS.md` §1 requires it, and given the partnership is unsigned, a second vendor is a live possibility — the adapter is what makes that a one-file change rather than a rewrite.

**Prerequisites:** rotated credential (audit report §0.1); sandbox access.

**PC-17-A — discovery spike (do this before estimating anything else).** Answer in writing: auth scheme; targeting taxonomy and whether neighborhoods exist at all; artwork spec (trim, bleed, DPI, colour profile, formats); SKU catalogue and whether one-sided is a SKU or a flag; pricing model and quote binding/expiry; minimum order quantity; webhook events and signature scheme; idempotency support; rate limits; sandbox fidelity.

> If PCM does not support idempotency keys on order submission, we must build our own dedupe on top — a retried submit that double-prints is money burned with no recourse. Establish this in the spike, not in production.

---

## 2. Postcard order model and lifecycle (PC-10, PC-16)

**Proposed** — `postcard_orders`:

| Field | Notes |
|---|---|
| `business_id`, `created_by` | Owner + actor |
| `sku` | FK to product registry (§4) |
| `audience_id` | FK to audience (§3) |
| `quantity`, `unit_cost_cents`, `vendor_cost_cents`, `margin_cents`, `tax_cents`, `total_cents` | Full itemisation, per the platform's existing itemisation convention |
| `quote_ref`, `quote_expires_at` | Binding vendor quote |
| `asset_id` | FK to artwork (§5) |
| `mail_date` | Buyer-chosen, as Boost's MB-6 already does |
| `status` | `draft → quoted → paid → submitted → printing → mailed`; `cancelled`, `failed` |
| `vendor_order_id` | Set on submission |
| `stripe_payment_intent_id` | Unique |

**The state machine's one hard rule:** `submitted` is the point of no return. Once PCM holds the job, `cancel` must be refused by the service, not merely hidden in the UI. A cancel button that appears to work after submission is worse than none.

**Submission is a job, never inline.** Enqueue `postcard.submit` on payment webhook confirmation, with the idempotency key, bounded retry, and a dead-letter that pages ops. Submitting inside the webhook handler means a vendor timeout produces a paid order that never ships and never retries.

Follow `modules/rto`'s state machine — the closest well-built precedent in this codebase.

---

## 3. Mailing audience model (PC-4, PC-5, PC-6, PC-7)

Nothing suitable exists. Explicitly **not** reusable:

- `ads.radius_m` — a circle is not a deliverable postal area. Postal geography is discrete.
- `delivery.postal_code` — a field on one address, not an audience.
- `livemap/corridors.service.ts` — models *travel* corridors. Superficially similar to "mailing routes," semantically unrelated to USPS carrier routes. Do not conflate; the resemblance is a trap.

**Proposed** — `postcard_audiences`: `order_id`, `selection_type` (`city`|`zip`|`neighborhood`|`route`), `selected_keys[]`, `deliverable_count`, `vendor_quote_ref`, `resolved_at`.

**Deliverable counts must come from PCM, never from us.** Only the vendor knows current counts per route. A count we compute will disagree with the invoice, and the buyer will have been quoted the wrong price.

**PC-6 (neighborhood) is at risk.** "Neighborhood" is not a postal unit — USPS delivers to ZIP+4 and carrier routes. Expect to implement it as a friendly label over a route set, *if* PCM exposes one. Confirm in PC-17-A before promising it.

**Open question for the spike:** saturation mail (every address in the area; area determines quantity; no consumer PII) versus targeted list (chosen count; filtered; **we would be handling consumer names and addresses**, triggering NF-8). **Recommend saturation-only for MVP** — it satisfies the specification's language ("cities, ZIP codes, neighborhoods, or mailing routes" are all *areas*), and it keeps consumer PII entirely out of StreetServe's systems. That is a large compliance saving for no loss of stated scope.

---

## 4. Product registry and the one-sided constraint (PC-3)

**Proposed** — `postcard_products`: vendor SKU, `sides`, trim size, paper stock, postage class, min/max quantity, `active`.

MVP seeds one row with `sides: 1`.

Configuration, not a literal. The codebase's own rule, [`config/constants.ts:2-4`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts): *"Anything a product decision could change lives here (or in DB config), never scattered as magic numbers."* One-sided is exactly such a decision — the transcript already frames it as an MVP choice, meaning it is expected to change.

---

## 5. Artwork upload and pre-press (PC-1)

**Proposed** — `postcard_assets`: `business_id`, `order_id`, storage key, `width_px`/`height_px`, `dpi`, `color_space`, `validation` (`pending`|`passed`|`failed` + reasons), `moderation` (`pending`|`approved`|`rejected` + reason), `preview_url`.

**Pre-press validation (NF-2)** — reject before payment, not after: below 300 DPI at trim size; wrong aspect ratio; missing bleed; RGB where CMYK is required; unsupported format; oversized file. Render a preview with trim and safe-area overlays so the buyer sees what will be cut off. Every one of these caught late is a reprint at our cost or an angry buyer holding a blurry card.

**Content moderation (NF-3) — non-negotiable.** StreetServe would be physically printing and mailing third-party artwork into people's homes. Needs: an acceptable-use policy in the order agreement (`modules/agreements` already exists for this); an automated first pass; **human review before submission for the MVP** — volume will be low and the downside is unbounded; a rejection path that refunds cleanly, because rejection happens *before* the point of no return.

Categories to block: adult content, hate speech, harassment/targeting of individuals, fraudulent claims, election material with disclosure requirements, third-party trademarks, and anything violating USPS mailability rules.

---

## 6. Quantity, quote, checkout, split (PC-8, PC-9, PC-11, PC-12–15)

Covered in detail in `FEATURE_COMPLETION_MATRIX.md`. Summary of what must be built:

- Quote endpoint answering **quantity → price** (Boost's helper answers the inverse; keep both).
- Quote expiry. Postage and vendor pricing move; honouring a stale quote books a silent loss.
- Destination charge with application fee — the primitive exists, the wiring does not.
- **Ledger accounts for postcard orders.** PC-15 ("no manual accounting") is not satisfied by a correct Stripe split alone. Money that moves without a ledger entry is manual accounting deferred to quarter-end. Every other money path in this codebase is double-entry ledgered; this one must be too.

---

## 7. Not planned here — Influencer Share (needs a product decision)

The transcript (6/16) specifies an Influencer Share system: a second share button beside Community Share, a 10-tier follower grid (1K → 1M+) with per-tier payouts, creator controls (on/off, budget cap, per-tier opt-in), and a three-layer anti-cheat design (manual approval escrow, proof-of-performance submission with live link + username + follower screenshot, admin blacklist and tier caps).

**It is unclear whether this targets StreetServe or HonestNeed** — the surrounding conversation is about campaign pages, which exist in both.

It is recorded here so it is not lost. It is **not** planned in this roadmap: it is a large, independent feature (tier grid, escrow, verification queue, fraud tooling) with no dependency on postcards, and bundling it would delay both.

**Next step:** confirm which product owns it, then scope it separately.

One substantive note if it does come to StreetServe: the anti-cheat design in the transcript rests on manual review of screenshots. Screenshots are trivially forged, and manual review does not scale past a few dozen submissions a week. If this ships, plan for platform API verification (each network's official API) as the real control, with manual review as the fallback — not the reverse.
