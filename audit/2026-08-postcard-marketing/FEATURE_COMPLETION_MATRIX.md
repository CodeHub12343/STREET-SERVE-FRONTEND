# Postcard Marketing — Feature Completion Matrix

Every requirement from the specification, with the twelve tracked fields. Statuses are verified against source; see `IMPLEMENTATION_AUDIT_REPORT.md` §3 for evidence.

**Complexity scale:** XS (<1d) · S (1–3d) · M (3–8d) · L (8–15d) · XL (15d+)
All estimates assume the PCM discovery spike (PC-17-A) has completed. Before that they are guesses.

---

## Summary

| # | Feature | Status | FE | BE | % |
|---|---|---|---|---|---|
| PC-1 | Upload own design | Missing | 0% | 0% | 0% |
| PC-2 | On-platform design tool | Missing | 0% | 0% | 0% |
| PC-3 | One-sided MVP constraint | Missing | 0% | 0% | 0% |
| PC-4 | Target by city | Missing | 0% | 0% | 0% |
| PC-5 | Target by ZIP | Missing | 0% | 0% | 0% |
| PC-6 | Target by neighborhood | Missing | 0% | 0% | 0% |
| PC-7 | Target by carrier route | Missing | 0% | 0% | 0% |
| PC-8 | Quantity selection | Missing | 0% | 0% | 0% |
| PC-9 | Price quote | Needs Fixing | 0% | 25% | 15% |
| PC-10 | Order placement | Missing | 0% | 0% | 0% |
| PC-11 | Payment through platform | Missing | 0% | 10% | 5% |
| PC-12 | Automatic split | Missing | n/a | 40% | 40% |
| PC-13 | Partner paid immediately | Missing | n/a | 35% | 35% |
| PC-14 | 10% margin to StreetServe | Missing | n/a | 40% | 40% |
| PC-15 | No manual accounting | Missing | n/a | 30% | 30% |
| PC-16 | Immediate processing | Missing | 0% | 0% | 0% |
| PC-17 | PCM API integration | Missing | n/a | 5% | 5% |
| PC-18 | Fulfilment status | Partial | 20% | 30% | 25% |
| PC-19 | Mobile + local businesses | Partial | 30% | 40% | 35% |
| PC-20 | Configurable revenue share | Partial | n/a | 30% | 30% |

Backend percentages above 0% for unbuilt features reflect **reusable substrate already in place** (Stripe split primitives, adapter pattern, ledger, fee registry), not partial delivery of the feature itself.

---

## PC-1 — Upload own postcard design

- **Description:** A business uploads print-ready artwork for the postcard's single printed side.
- **Status:** Missing · **FE** 0% · **BE** 0% · **Overall** 0%
- **Issues found:** No postcard asset model. `features/storage` and `integrations/storage` exist for general uploads but carry no print-specific validation. An upload accepted today would be a screen-resolution image printed at postcard size — visibly bad, already paid for, and unrecoverable once mailed.
- **Required work:** `postcard_assets` collection (owner, order ref, storage key, dimensions, DPI, colour space, validation verdict, moderation verdict). Upload endpoint. Pre-press validator (NF-2) rejecting under-DPI, wrong aspect ratio, missing bleed. Moderation gate (NF-3). Preview render with trim/safe-area overlay.
- **Dependencies:** PC-17-A (PCM's exact artwork spec — dimensions, bleed, colour profile, accepted formats)
- **Priority:** P0 · **Complexity:** M
- **Next step:** Get PCM's print spec sheet. Do not guess dimensions; a wrong trim size means every card is reprinted at our cost.

## PC-2 — Create a design on the platform

- **Description:** In-browser editor: templates, business logo/details, text, images.
- **Status:** Missing · **FE** 0% · **BE** 0% · **Overall** 0%
- **Issues found:** Nothing exists. This is the single largest item in the specification and the least justified by it — one clause in one message.
- **Required work:** Template library, canvas editor, font/asset licensing for commercial print, server-side render to print-ready PDF/X at 300 DPI with bleed. Browser canvas output is RGB and screen-DPI; it is not print-ready without a server render step, which is the part teams routinely underestimate.
- **Dependencies:** PC-1 (shares the asset pipeline), PC-17-A
- **Priority:** P2 — **recommend deferring past MVP**
- **Complexity:** XL
- **Next step:** Ship MVP with upload-only plus a downloadable template pack (Canva/Illustrator/PDF) sized to PCM's spec. That serves most of the need at ~2% of the cost. Revisit the editor only if upload abandonment proves it necessary.

## PC-3 — One-sided postcard (MVP)

- **Description:** Buyers get one printed side. Explicitly set 7/17 1:28 PM.
- **Status:** Missing · **FE** 0% · **BE** 0% · **Overall** 0%
- **Issues found:** No product model exists, so the constraint has nowhere to live. Risk: it gets hardcoded in three places and becomes impossible to relax when two-sided is offered later.
- **Required work:** `postcard_products` registry keyed by vendor SKU, carrying `sides: 1`, trim size, paper stock, postage class, min/max quantity. Order validates against it. **Configuration, never a hardcoded literal** — this codebase's own convention (`config/constants.ts:2-4`: "Anything a product decision could change lives here").
- **Dependencies:** PC-17-A (PCM's SKU catalogue)
- **Priority:** P0 · **Complexity:** S
- **Next step:** Model it as a product registry from day one. The cost difference versus hardcoding is hours; the cost of unwinding a hardcode later is days.

## PC-4 / PC-5 / PC-6 / PC-7 — Geographic targeting

*Audited as one unit: they are four views of a single audience model.*

- **Description:** Target by city (PC-4), ZIP (PC-5), neighborhood (PC-6), carrier route (PC-7).
- **Status:** Missing · **FE** 0% · **BE** 0% · **Overall** 0%
- **Issues found:** No mailing-audience model. The nearest existing constructs are unsuitable:
  - Ad placements use lat/lng + `radius_m` ([`ads.model.ts:44`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ads/ads.model.ts)). **A radius is not a deliverable mailing area.** Postal geography is discrete and does not follow circles.
  - `delivery.postal_code` is one address's field, not an audience.
  - `livemap/corridors.service.ts` models travel corridors — conceptually appealing for "routes I set up on," but a *travel* corridor and a *USPS carrier route* are unrelated objects. Do not conflate them.
- **Required work:** `postcard_audiences` (order ref, selection type, selected keys, resolved deliverable count, vendor quote ref, resolved_at). Targeting must be **resolved by PCM, not by us** — only the vendor knows current deliverable counts per route, and a count we compute ourselves will disagree with the invoice. Map-based selection UI with running count and cost.
  - **PC-6 (neighborhood) is the weak one.** "Neighborhood" is not a postal unit. USPS delivers to ZIP+4 and carrier routes. Expect to implement it as a friendly label over a route/ZIP set, if PCM supports it at all — flag it as at-risk until PC-17-A confirms.
- **Dependencies:** PC-17-A (targeting taxonomy and count/quote endpoints)
- **Priority:** P0 (PC-4, PC-5, PC-7) · P2 (PC-6)
- **Complexity:** L for the set
- **Next step:** Confirm PCM's targeting taxonomy first. Building our own geography and mapping it onto theirs afterwards is the expensive path.

## PC-8 — Quantity selection

- **Status:** Missing · **FE** 0% · **BE** 0% · **Overall** 0%
- **Issues found:** Nothing exists. Interacts with PC-4..7: for saturation mail, quantity is *determined by* the area selected, not chosen freely. Presenting a free-text quantity box alongside area selection would be incoherent.
- **Required work:** Decide the model — saturation (area determines count) vs. targeted list (count is chosen, area filters). Enforce vendor min/max. Live price recalculation.
- **Dependencies:** PC-3, PC-4..7, PC-9
- **Priority:** P0 · **Complexity:** S
- **Next step:** Settle saturation vs. targeted with PCM. It changes the UI, the pricing model, and whether NF-8 (consumer PII) applies at all.

## PC-9 — Price quote

- **Status:** **Needs Fixing** · **FE** 0% · **BE** 25% · **Overall** 15%
- **Issues found:** `boost.postcardEstimate()` exists but is **the inverse of what is needed**. It answers "how many postcards does $X buy?" ([`boost.controller.ts:82-90`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/boost/boost.controller.ts)) — correct for crowdfunding, where the sum is what varies. Direct ordering needs "what does N postcards to area A cost?" It also returns `null` unconditionally, because `BOOST_POSTCARD_UNIT_COST_CENTS = 0` ([`constants.ts:175`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts)).
- **Required work:** A real quote endpoint that calls PCM for a binding price on (product, audience, quantity), applies the margin (PC-14/20), returns a line-itemised breakdown, and **carries an expiry** — postage rates and vendor pricing move, and a stale quote honoured at checkout is a loss booked silently.
- **Dependencies:** PC-17, PC-3, PC-4..7, PC-20
- **Priority:** P0 · **Complexity:** M
- **Next step:** Keep Boost's estimate as-is for crowdfunding. Write a separate quote path for direct orders. Backfill the unit cost once contracted, which fixes Boost for free.

## PC-10 — Order placement

- **Status:** Missing · **FE** 0% · **BE** 0% · **Overall** 0%
- **Issues found:** No order model, route, service, or screen.
- **Required work:** `postcard_orders` with an explicit state machine: `draft → quoted → paid → submitted → printing → mailed`, plus `cancelled` and `failed`. **The point of no return is `submitted`** — once PCM has the job, cancellation is impossible and the state machine must refuse it (NF-4). Multi-step order wizard on the frontend.
- **Dependencies:** PC-3, PC-4..8, PC-9, PC-11
- **Priority:** P0 · **Complexity:** L
- **Next step:** Model the state machine and its irreversible edge before writing UI. Follow `modules/rto`'s state-machine pattern — it is the closest well-built precedent in this codebase.

## PC-11 — Payment through StreetServe

- **Status:** Missing · **FE** 0% · **BE** 10% · **Overall** 5%
- **Issues found:** No postcard payment path. Stripe payment infrastructure itself is mature and reusable.
- **Required work:** PaymentIntent for the order, `Idempotency-Key` (`middleware/idempotency`), `rateLimit('money')`, webhook-confirmed state transition. **Never advance an order on the client's say-so** — this codebase's established discipline (`boost_contributions`: row created `pending`, only the webhook makes it `succeeded`) must be followed here.
- **Dependencies:** PC-9, PC-10, PC-12
- **Priority:** P0 · **Complexity:** M
- **Next step:** Reuse the Boost contribution intent→webhook→credit pattern verbatim.

## PC-12 / PC-13 / PC-14 / PC-15 — Automatic split payment

*Audited as one unit: one Stripe call satisfies all four.*

- **Description:** Split each transaction — partner gets the fulfilment cost immediately, StreetServe gets 10%, no manual accounting.
- **Status:** Missing · **BE** 35–40% · **Overall** ~37%
- **Issues found:**
  1. **Blocking commercial dependency.** Requires PCM to be a Stripe Connect connected account. Unconfirmed. See audit report §0.2. If PCM declines, this requirement is not achievable as written and must be redesigned as invoiced settlement.
  2. No postcard ledger accounts exist, so PC-15 ("no manual accounting") is unmet even if the charge splits correctly. Money that moves without a ledger entry *is* manual accounting, deferred.
  3. Merchant-of-record is undecided, which determines tax liability (NF-7), refund mechanics, and chargeback exposure.
- **Required work:** Onboard PCM via existing `POST /payments/connect/onboard`. Call `createDestinationCharge({ destinationAccountId: pcmAccount, applicationFeeCents: margin, transferGroup: orderId, idempotencyKey })`. Ledger both legs. Handle `transfer.*` and `charge.dispute.*`. Respect `payouts_frozen`.
- **Existing substrate (verified):** `DestinationChargeInput` with `destinationAccountId` + `applicationFeeCents` ([`integrations/stripe/types.ts:13-18`](../../../STREET-SERVE-APPLICATION-BACKEND/src/integrations/stripe/types.ts)); `connected_accounts` model; hosted onboarding; `canDisburse()` solvency guard; signed webhooks.
- **Dependencies:** **PCM Connect agreement (blocking)**, PC-11, PC-20
- **Priority:** P0 · **Complexity:** M if PCM onboards · L if invoiced settlement is required instead
- **Next step:** **Get the Connect question answered in writing before building either path.** This is the highest-leverage unblocking action in the whole workstream.

## PC-16 — Orders begin processing immediately

- **Status:** Missing · **FE** 0% · **BE** 0% · **Overall** 0%
- **Issues found:** No submission path. Naive design risk: submitting to PCM synchronously inside the payment webhook. A vendor API timeout then leaves a paid order that was never submitted, with no retry.
- **Required work:** BullMQ job `postcard.submit` enqueued on payment confirmation, with idempotency key (NF-5), bounded retry, and a dead-letter path that alerts ops. `modules/*` already use BullMQ (`worker.ts`, `registerScheduledJobs`) — the pattern is established.
- **Dependencies:** PC-11, PC-17
- **Priority:** P0 · **Complexity:** S
- **Next step:** Job-queue it from the start. A double-submitted job prints and mails twice at real cost — the idempotency key is not optional.

## PC-17 — PCM Integrations API

> **Updated 2026-08-08 — now Partial, ~70%.** The `integrations/print` adapter is built: domain-shaped interface, faithful fake, real gateway with auth/timeout/retry/idempotency-safety/sanity-bounds/error-translation, 17 contract tests, sandbox harness (`npm run probe:print`). The remaining 30% is the vendor's wire format (paths, header, field names), quarantined in `wire.ts` behind `WIRE_VERIFIED = false` — which refuses to run in production. Unblocked by one attachment: their OpenAPI spec.

- **Status:** ~~Missing~~ **Partial** · **BE** 70% · **Overall** 70%
- **Issues found:** Zero PCM code. **API surface entirely unverified** — see audit report §5.1. Credential compromised (§0.1).
- **Required work:** `integrations/print` adapter behind a domain-shaped interface (`quote`, `submitOrder`, `getStatus`, `listAudiences`, `parseWebhook`), per `THIRD_PARTY_INTEGRATIONS.md` §1. Vaulted credential. Sandbox-backed contract tests. Webhook receiver with signature verification and event dedupe (NF-6).
  - **Sub-task PC-17-A — discovery spike.** Authenticate to sandbox; document endpoints, targeting taxonomy, artwork spec, SKUs, pricing, webhook events, rate limits, idempotency support. **Everything else in this matrix is estimated on assumptions until this lands.**
- **Dependencies:** Rotated credential; sandbox access
- **Priority:** P0 — **first task in the roadmap**
- **Complexity:** PC-17-A: S · full adapter: M–L (range reflects the unknown)
- **Next step:** Rotate the key, get sandbox access, run the spike, then re-estimate this entire document.

## PC-18 — Fulfilment status

- **Status:** **Partial** · **FE** 20% · **BE** 30% · **Overall** 25%
- **Issues found:** Boost has the right enum and the right honesty. [`boost.model.ts:58-69`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/boost/boost.model.ts) stops at `mailed` and documents why `delivered` is deliberately absent: *"A status the platform cannot observe is a promise it cannot keep."* **Keep that rule.** But the transition is admin-only and manual ([`boost.routes.ts:107-118`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/boost/boost.routes.ts)), there is no vendor webhook, and nothing covers direct orders.
- **Required work:** Shared fulfilment status module used by both Boost and postcard orders. Vendor webhook drives transitions. Buyer-facing timeline. Notifications on each transition via `modules/notifications`.
- **Dependencies:** PC-17, PC-10
- **Priority:** P1 · **Complexity:** M
- **Next step:** Extract Boost's status logic into a shared module rather than copying it — this is the main reuse opportunity between the two features.

## PC-19 — Available to mobile and local businesses

- **Status:** **Partial** · **FE** 30% · **BE** 40% · **Overall** 35%
- **Issues found:** The business/vendor model already supports both archetypes (`BUSINESS_MODULE_SYSTEM.md`, `BUSINESS_CATEGORY_MATRIX.md`), so the *audience* exists. What is missing is the "complete marketing hub" framing: `boost`, `ads`, and `promotions` are three disconnected surfaces, and a business has no single place that answers "how do I get more customers?"
- **Required work:** Vendor marketing hub aggregating Boost, ads/placements, promotions, and postcard orders, with unified spend reporting.
- **Dependencies:** PC-10
- **Priority:** P2 · **Complexity:** M
- **Next step:** Ship postcard as a standalone surface first; unify once there is a fourth thing worth unifying.

## PC-20 — Configurable revenue share

- **Status:** **Partial** · **BE** 30% · **Overall** 30%
- **Issues found:** A mature fee registry exists ([`constants.ts:372-429`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts)) with `rate_bps` / `flat_cents` / `min_cents` / `max_cents`, Redis-backed cache with pub/sub invalidation, and a placeholder `campaign_service: { rate_bps: 0 }`. But **the 10% is not a platform fee** — it is a **resale margin**. Fees in this registry are deducted from a counterparty's proceeds and are disclosed. A margin is embedded in a retail price and normally is not. Putting a margin into the fee registry without deciding this will produce either an incorrect disclosure or a missing one.
- **Required work:** Decide margin vs. fee (see `ARCHITECTURAL_IMPROVEMENTS.md` §2). Then register `postcard_margin: { rate_bps: 1000 }` with an explicit comment recording which it is and why. Admin-adjustable per the transcript's expectation that the rate moves with volume.
- **Dependencies:** Merchant-of-record decision
- **Priority:** P0 · **Complexity:** XS once decided
- **Next step:** Make the merchant-of-record decision. It is one meeting and it unblocks tax, refunds, disclosure, and this.
