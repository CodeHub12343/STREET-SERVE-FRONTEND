# Partially Implemented Features

Features that exist and work, but do not yet satisfy the specification. Each entry states **what works**, **what is missing**, and **the exact delta** — so the remaining work can be scoped without re-reading the code.

31 items.

---

## The dominant pattern: backend-complete, frontend-absent

Six of these partials share one shape — correct, tested backend code that no user can reach because the UI was never built. They are grouped first because they should be fixed together, and because they represent revenue that is already paid for.

| ID | Feature | BE | FE | The delta |
|---|---|---|---|---|
| ~~P-1~~ | ~~Rent-to-own listings (MS-3, §42–53)~~ | ✅ | ✅ | **Done 2026-08-01** — browse, §44 disclosure, §47 acceptance, agreements list, seller listing manager. Acceptance gated closed until M-1 |
| ~~P-2~~ | ~~Featured map placement (RV-11, HR-3)~~ | ✅ | ✅ | **Done 2026-08-01** — promote flow + map/feed renderers |
| ~~P-3~~ | ~~Local banner ads (RV-18)~~ | ✅ | ✅ | **Done** — all three placement renderers |
| ~~P-4~~ | ~~Advertising dashboard (RV-17)~~ | ✅ | ✅ | **Done** — `/vendor/ads` |
| P-5 | Consignment RTO (§54–56) | ◐ | ✗ | Creation path + UI (§54 terms now structured — A-6) |
| ~~P-6~~ | ~~RTO seller approval (§42.3, §60.3)~~ | ✅ | ✅ | **Done** — `/admin/rto`: approvals, city flags, category eligibility |

> **P-2/P-3/P-4 note.** Shipping these required fixing something the audit had not caught: the
> placements backend, though complete and tested, **charged nothing for a placement**. The dashboard
> would have reported delivery on a free product. See the roadmap's Track B section.

---

### P-1 · Rent-to-own listings — 50%

**Works:** approval-gated sellers; full disclosure quote with the mandated *"may cost more than buying outright"* line; six payment frequencies; grace periods matching §49 exactly (3/5/7 days); hourly installment charge + delinquency sweep; early payoff with a formula frozen at acceptance; ownership transfer with a proof-of-ownership record; an immutable append-only ledger keyed by idempotency key; a customer dashboard showing next due, balance, counts, total paid, and ownership progress — every field §45 asks for.

**Missing:** the disclosure screen, the acceptance screen, the agreements list, and the seller-side listing form. See [MISSING_FEATURES.md](MISSING_FEATURES.md) M-2. Also missing: voluntary return (M-3), seller remedies (M-4), the return condition report (M-5), and category gating (M-9).

**Delta:** roughly one frontend epic plus four backend endpoints. **Deps:** attorney text (M-1).

---

### P-2 / P-3 / P-4 · Paid placements — 40–50%

**Works:** `placements` collection with featured-product, featured-hub, and standalone-ad kinds; creative fields; city, category, and geo/radius targeting; prepaid budget with spend-down (chosen deliberately over post-pay so the platform never chases an advertiser for spent impressions); CPM per placement; impression batching with `unbilled_impressions`; click tracking; a genuine Trending boost at [livemap.service.ts:430](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/livemap/livemap.service.ts#L430); an `AD_MAX_SHARE_OF_FEED` cap so paid placement can never bury organic results.

That last constraint is worth preserving explicitly in the UI work: the model treats paid placement as a **boost, never a filter**, and the renderer must carry the disclosure label the backend assumes is being shown.

**Missing:** all UI. Verified — the only frontend reference to any placement endpoint is an unused query key ([keys.ts:107](../../src/lib/query/keys.ts#L107)).

**Missing (backend):** the §32 flat duration tiers ($5/$15/$40). See M-7.

**Delta:** one dashboard page, three placement renderers, one promote flow, one pricing addition.

---

### P-5 · Consignment rent-to-own (§54–56) — 35%

**Works:** the three-party data model — `is_consignment`, `owner_id`, `owner_type`, `commission_bps` ([rto.model.ts:85](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/rto/rto.model.ts#L85)); `recordSplit` computing owner, managing-business commission, platform fee, and processor legs; immutable per-party `rto_statements` rows; `GET /rto/agreements/:id/statements` and a `useRtoStatements` hook that the dashboard already renders conditionally on `isConsignment`.

**Missing:** any path that creates one. No listing flow, no owner/managing-business agreement negotiation, no UI. §54's ten required responsibility terms (who owns during payment, who delivers, who handles returns, support, damage, missed payments, early payoff approval, ownership transfer) exist only inside placeholder agreement text. §56.1's tax, delivery, and refund split legs are not computed.

**Delta:** a creation path, the §54 terms as structured fields rather than prose, three additional split legs.

---

### P-6 · RTO seller approval — 60%

`POST /rto/approvals` writes `rto_seller_approvals` and audits it. City-level gating exists via `City.feature_flags.rto`. Neither has an admin screen — approvals require direct API access today. **Delta:** one admin page.

---

## Fees and money (§31–§34, §57–§59)

### P-7 · Waved Down fee stack (§32.4) — 35%

**Works:** the 10% marketplace fee applies to wave-down sales.

**Missing:** the customer convenience fee has no fee type at all (M-8). The vendor travel fee is *stored* — `travel_fee_cents` at [vendors.model.ts:34](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/vendors/vendors.model.ts#L34), read and written through the vendor service — and **never charged**: grep across `modules/orders` and `modules/queue` returns no reference to it. A vendor setting a $5 travel fee today sees it saved and never collected. See defect **F-5**.

**Delta:** two fee types, one call site each, and the pre-confirmation disclosure §32.4 requires.

### P-8 · Seller fee calculator (§57) — 70% regular / 15% RTO

**Works:** [FeeCalculator.tsx](../../src/features/consignment/components/FeeCalculator.tsx) takes a price and a split and returns the seller's net, the platform fee, and the hub share — computed **server-side by the same registry and settlement math the real payout uses**, so the preview cannot drift from reality. That design choice is right and should be kept.

**Missing:** §57 also requires estimated taxes and the customer's total cost on the regular path, and seven RTO rows (initial payment, installment amount, count, total RTO cost, early payoff, fee per payment, total expected earnings). The component's own header still reads *"RTO installment rows are reserved for Phase 3"* — but RTO shipped.

**Delta:** small. The server math already exists in `rto.pricing.ts` and is exposed by `POST /rto/disclose`. This is a wiring task, not a build.

### P-9 · Refund policy (§58) — 80%, with a defect

All three scenarios are implemented with plain-language disclosure. `processingRetainedCents` is hardcoded `0`. See defect **F-1** — this is classified as Needs Fixing rather than Partial because the field exists and reports a wrong value, which is worse than reporting none.

### P-10 · Custom consignment end date (§35.2) — 50%

`term_days` is free-form on the product, but `extendTerm` validates against `CONSIGNMENT_TERM_DAYS ∪ {no_limit}`, so an arbitrary end date cannot be set after the fact. **Delta:** accept an explicit date in the extend schema.

---

## Customer-facing

### P-11 · ETA countdown (CU-23) — 60%

**Works:** `eta_seconds` is captured when a vendor accepts a Wave Down ([queue.model.ts:46](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/queue/queue.model.ts#L46)), validated 0–7200s, and pushed to the customer in the acceptance notification.

**Missing:** a live-session ETA. A customer watching a truck move toward them on the map gets no arrival estimate — the countdown only exists once a wave-down has been accepted. **Delta:** derive from live position + heading; the position stream already exists.

### P-12 · Route alerts (CU-25) — 40%

Proximity alerts fire when a followed business enters a radius (`proximity-alert-eval`, every 60 s). There is no route or corridor subscription — "tell me when any ice cream truck comes down my street." **Delta:** a saved-geometry alert. Best modelled as a favorite with a geofence, reusing the existing sweep, rather than as a new subsystem.

### P-13 · Reviews with photos (CU-30) — 55%

Reviews are well built: one per transaction enforced by a unique index, 1–5 rating, subject typing for business vs seller. There is **no photo field** — [reviews.model.ts](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/reviews/reviews.model.ts) has `rating` and `comment` and nothing else. **Delta:** ~1 day. `photos: [String]` plus the existing `POST /storage/upload-url` presign path, plus a moderation decision.

### P-14 · Pre-order and scheduled pickup (MS-2) — 45%

**Works:** service bookings are complete — services with duration and price, availability windows, booking lifecycle with no-show and complete, and a `booking-reminders` sweep.

**Missing:** goods orders have no scheduled fulfilment. `orders.model.ts` carries no `pickup_at` or `scheduled_for`, and the source comment explicitly frames orders as *"distinct from wave-down (spontaneous) and booking (scheduled)"* — so "order now, collect at 5pm" has no home. **Delta:** an optional fulfilment window on `PlaceOrderBody`, validated against vendor availability, plus per-slot capacity.

### P-15 · Flash sales with countdown (MS-10) — 40%

A time-decaying **queue discount schedule** exists and feeds the Trending discount boost. That is a queue-management mechanic — "shorten my line by discounting as it grows" — not a product-level sale with a start and end time. **Delta:** a scheduled price override on a product or menu item. Reuse the discount-schedule shape rather than introducing a second discount model.

---

## Business and platform

### P-16 · Mobile business storefronts (MS-1) — 70%

**Works:** `/business/[id]` with a full profile experience, menu CRUD, module system, category matrix, reviews, queue, and booking; `/seller/profile` and the `sellers` module for individual sellers.

**Missing:** a general per-business product catalog. Products are bound to a hub (`products.hub_id`) — a non-hub vendor cannot list goods for sale at all. **Delta:** decide whether a storefront is "a menu" or "a catalog"; today the two are conflated, and MS-5, MS-6, HR-9, and M-40 all depend on the answer.

### P-17 · Wholesale supplier marketplace (MS-6) — 35%

`wholesale` exists only as a listing type — "seller pays the hub upfront and keeps 100% of the resale" ([constants.ts:432](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L432)) — and even that is gated off, because only `consignment` is honoured by settlement today ([consignment.model.ts:78](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.model.ts#L78) documents the gating migration). There is no supplier role, no bulk pricing, no MOQ. **Delta:** confirm first whether "a hub offering wholesale listings" already satisfies the intent — if so this is a settlement-path completion, not a new marketplace.

### P-18 · Sponsored search results (RV-12) — 30%

Paid boost is wired into **Trending** only. Search, the map list, and discovery cards do not consult placements. **Delta:** extend placement serving to those surfaces. Bundle with P-2.

### P-19 · Premium verified badge (RV-13) — 60%

The plan exists at $9.99/mo and is purchasable. **Could not confirm** that the badge is rendered anywhere — no badge component was found bound to the subscription state. **Delta:** verify; if absent, render on the profile and the map pin. A badge nobody sees is a subscription nobody renews.

### P-20 · AI marketing assistant (RV-20) — 70%

The AI module is substantial and honestly built — a deterministic engine with Gemini as a narration layer, never for pricing or ranking. Coach plans, pricing suggestions, sales coaching, product and location recommendations, demand forecasting, hub reallocation. **Missing:** marketing *copy generation* as a distinct surface, and confirmation that the `ai_assistant` plan actually gates the existing endpoints. **Delta:** one generator + a gating check.

### P-21 · Local festivals directory (CM-42) — 50%

`concerts_and_festivals` is an AI calendar signal and the events model supports festival typing, but there is no browsable directory. **Delta:** a filter view over `events`.

### P-22 · Referral rewards (CM-44) — 40%

The only `referral` reference is in `ping.service.ts`. No codes, attribution, or payout. Listed here rather than as fully missing because the gift-code flow supplies a complete, working template for code issuance, redemption, and expiry.

### P-23 · Financing marketplace (CM-50) — 30%

`debt` (seller debt with credit limits, reminders, escalation), `spot_me` (peer micro-advances with default sweeps), and shelter starter grants exist. None is a lending marketplace. **Flagged:** these primitives are themselves lending-adjacent and warrant legal review independent of whether CM-50 is ever built.

### P-24 · Payment-processing revenue share (HR-11) — 50%

The `processing` fee type is a clean pass-through. Modelling a margin on it is a *decision*, not just a task: marking up a fee the customer is told is a processor pass-through sits awkwardly with §31's transparency framing. Raise before building.

### P-25 · RTO grace-period reminders (§49) — 60%

`RTO_GRACE_DAYS` matches the spec's suggestion exactly and the hourly sweep escalates Grace → Late. §49 requires five reminder stages: before due, on due, during grace, when late, and before any return or recovery action. **Could not confirm** all five fire — and the fifth cannot meaningfully exist, because no recovery action exists to precede (see M-3/M-4).

### P-26 · RTO delivery condition report (§52.1) — 40%

Photos and serial number are captured at acceptance ([rto.service.ts:152](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/rto/rto.service.ts#L152)). §52 also requires product video, existing damage, included accessories, estimated value, transfer date, and **both parties' acknowledgment**. The dual acknowledgment is the load-bearing one — a condition report only one party signed is weak evidence in the dispute it exists to settle.

### P-27 · RTO ownership transfer (§53) — 60% reachable

`completeAndTransfer` covers paid-in-full marking, completion receipt, both notifications, the ownership record, the proof-of-ownership document, and closing automatic payments. The customer feedback request (§53's ninth step) was not confirmed. Reachability is capped by M-2.

### P-28 · RTO listing information (§44) — 50%

All money fields are returned by `disclose`. The prose obligations §44 lists — maintenance responsibilities, damage responsibilities, return rights, cancellation terms, ownership-transfer requirements — exist only inside placeholder agreement text and are not structured fields on the listing. **Delta:** decide which of these are per-listing terms (and therefore fields) versus universal agreement clauses. §44 reads as though several are per-listing.

### P-29 · Consignment-RTO automatic splitting (§56.1) — 60%

Owner, commission, platform, and processor legs are computed and recorded. Tax, delivery, refund, and remaining-customer-balance legs are not.

### P-30 · Consignment RTO responsibilities (§54) — 35%

See P-5. The ten required terms are prose, not fields.

### P-31 · Business tools coverage (BT group) — 40% as a group

Four of ten complete (analytics, tax, inventory, AI recommendations); six missing entirely (M-21 – M-26). Listed as a group partial because a vendor's back office is experienced as one surface — half a back office reads as no back office, which matters for the Pro subscription's perceived value.
