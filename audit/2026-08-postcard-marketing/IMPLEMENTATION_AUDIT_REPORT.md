# Postcard Marketing — Implementation Audit Report

**Audit date:** 2026-08-08
**Specification source:** WhatsApp transcript (James Bowser ↔ Santiago Rueda, 7/17 and 6/15–6/25)
**Repos audited:** `STREET-SERVE-APPLICATION` (frontend), `STREET-SERVE-APPLICATION-BACKEND`
**Method:** requirement extraction from the transcript, then direct source verification. Every status below cites a file. Nothing is marked Complete on the strength of a document alone.

> **⚠️ Updated 2026-08-08 — read `PCM_DISCOVERY_FINDINGS.md` alongside this report.** Vendor discovery changed three conclusions:
> - **PCM Integrations is PostcardMania**, a large established printer. Their partner model is **wholesale-and-markup**, so the "instant split" in §0.2 is probably **not** deliverable as described — plan for Topology B.
> - **They already sell a white-label storefront** covering much of PC-1 through PC-10, including the design tool this report deferred as too expensive. Evaluate before building.
> - **Their mail appears list-based, not saturation**, which puts consumer PII back in scope and reverses the recommendation in `ARCHITECTURAL_IMPROVEMENTS.md` §6.
>
> Phase 0 is partly executed: `PHASE_0_TRACKER.md`. Decisions: `ADR-007`.

---

## 0. Read this first — three findings that change the plan

### 0.1 A live vendor API key was transmitted in plaintext (CRITICAL)

The transcript contains what is presented as the PCM Integrations **production** API key. It is a base64-wrapped UUID beginning `YWI0Zjg4Nzgt…` (decoding to `ab4f8878-…`) — the shape of a portal API token. It has now travelled through at least one consumer messaging app and one AI chat transcript.

*The full value is deliberately not reproduced here.* Writing a live credential into a repo file is the same mistake in a different medium; the prefix is enough to identify which key to rotate.

**Treat it as compromised.** Rotate it at `portal.pcmintegrations.com` before any integration work begins, and put the replacement in the platform secret store (`SECRET_MANAGEMENT_REVIEW.md`), never in a repo, `.env` committed to git, or a chat message. This key would authorise *spending real money on printing and postage*; an attacker with it can drain the partner account. It is deliberately **not** written into any file in this audit set.

### 0.2 The "automatic split" has a commercial dependency nobody has confirmed

The transcript promises: *"We can easily configure the payment gateway to instantly route the printing/mailing cost to the partner and drop our 10% profit margin straight into our account."*

Technically, the primitive already exists and is good news — see §3.2. But it only works one way: **PCM Integrations must onboard as a Stripe Connect connected account under StreetServe's platform.** That means PCM accepts StreetServe's Connect terms, submits KYC to Stripe, and receives money as transfers rather than as an invoiced vendor.

Established print vendors frequently decline this. They are not marketplace sellers; they have their own merchant processing and their own AR process. If PCM says no, the requirement as written — instant automatic split — **is not buildable**, and the fallback is: StreetServe collects the full amount, recognises the 10% as revenue, and settles with PCM on net terms via ACH. That is still automatable, but it is *not* an instant split and it *does* involve accounting.

**This must be settled in the partnership contract before a line of payment code is written.** It is the single largest risk to the stated design, and it is a commercial question, not an engineering one. See `ARCHITECTURAL_IMPROVEMENTS.md` §1.

### 0.3 The feature the transcript describes is not the feature already in the codebase

There is already a postcard feature: **Boost My Marketing** (`modules/boost`, ADR-006). It is fully built and it is **inert in production**.

|  | Boost My Marketing (exists) | Postcard Marketing (specified) |
|---|---|---|
| Who pays | Many contributors crowdfund one business's mailing | One business buys its own mailing |
| Money model | Custodial community fund (ADR-005), refundable if goal unmet | Direct B2B purchase, non-refundable once printed |
| Trigger | Goal reached by deadline | Checkout |
| Targeting | None | Cities / ZIPs / neighborhoods / routes |
| Artwork | None | Upload or on-platform design |
| Fulfilment | Admin clicks status manually | Vendor API + webhook |

These are **siblings, not the same feature**. Merging them would put refundable custodial money and non-refundable purchase money in the same table — the exact mistake ADR-006 already documents avoiding when it separated `boost_campaigns` from `placements`. Build Postcard Marketing as its own module that *shares the fulfilment pipeline* with Boost.

The upside: the PCM partnership resolves **MB-8** ("no print vendor is contracted yet"), which is the blocker that currently makes Boost useless. One integration revives a shipped feature *and* enables a new one.

---

## 1. Scope fence

The transcript covers five separate ventures. Only one is StreetServe.

**In scope (this audit):** Postcard marketing — design, targeting, quantity, ordering, split payment, PCM integration.

**Out of scope, and deliberately not audited:**
- HonestNeed.com — share-per-day limits, share-request flow, OG meta tags, external funding links, music sales. Different product, different repo.
- Sarah's Foundation / sfuganda.com — landing page, volunteers, wish list.
- Sphere of Kings — domain, leaderboards, board game.
- Kickstarter, YouTube SEO, investor materials.

**Adjacent, needs a decision (not audited):** The **Influencer Share** system with 10 follower tiers was discussed for campaign pages. It is unclear whether it targets StreetServe or HonestNeed. It is a large feature (tier grid, budget caps, proof-of-performance submission, manual approval escrow, blacklist admin) and does not belong inside the postcard workstream. Flagged in `MISSING_FEATURES.md` §7 so it is not lost, but it is not planned here. **Confirm which product it belongs to before scheduling it.**

Also noted for the record: the transcript states *"we don't actually have a formalized business plan for Street Serves just yet."* This audit found extensive product documentation in both repos (PRD, `BUSINESS_PLATFORM_VISION.md`, `VISION_GAP_ROADMAP.md`, eight completed build phases). Whatever the commercial status, the product is not undocumented.

---

## 2. Requirements extracted from the specification

The source is a conversation, not a spec document, so requirements are inferred. Where the transcript is silent I say so rather than inventing a rule.

### Functional

| ID | Requirement | Source |
|---|---|---|
| PC-1 | Business uploads its own postcard design | 7/17 1:23 PM |
| PC-2 | Business creates a design on the platform | 7/17 1:23 PM |
| PC-3 | MVP prints **one side only** | 7/17 1:28 PM |
| PC-4 | Target by city | 7/17 1:23 PM |
| PC-5 | Target by ZIP code | 7/17 1:23 PM |
| PC-6 | Target by neighborhood | 7/17 1:23 PM |
| PC-7 | Target by mailing route (USPS carrier route) | 7/17 1:23 PM |
| PC-8 | Choose quantity | 7/17 1:23 PM |
| PC-9 | Show price before ordering | Implied by "choose quantity" + pay |
| PC-10 | Place order through StreetServe | 7/17 1:23 PM |
| PC-11 | Pay through StreetServe | 7/17 1:23 PM |
| PC-12 | Transaction splits automatically | 7/17 1:23 PM |
| PC-13 | Partner receives fulfilment portion immediately | 7/17 1:23 PM |
| PC-14 | StreetServe receives 10% margin to its own account | 7/17 1:28 PM |
| PC-15 | No manual accounting | 7/17 1:23 PM |
| PC-16 | Orders begin processing immediately | 7/17 1:23 PM |
| PC-17 | Integrate PCM Integrations API | 7/17 4:23 PM |
| PC-18 | Order/fulfilment status visible to buyer | Implied |
| PC-19 | Available to mobile **and** local businesses | 7/17 1:23 PM |
| PC-20 | Revenue share configurable (10% at launch) | 7/17 1:27–1:28 PM |

### Non-functional — derived, not stated

The transcript specifies none of these. They are mandatory anyway, because this feature causes irreversible physical actions funded by real money. Each carries its justification.

| ID | Requirement | Why |
|---|---|---|
| NF-1 | Rotate and vault the vendor credential | It authorises spending. See §0.1 |
| NF-2 | Pre-press validation (dimensions, DPI, bleed, safe area, colour space) | A 72-DPI upload prints as a blurry card the buyer already paid for |
| NF-3 | Content moderation of uploaded artwork before print | StreetServe physically mails it. Hate speech, adult content, fraud, or infringing artwork becomes StreetServe's problem, and the USPS's |
| NF-4 | Explicit point of no return + refund policy | You cannot unprint a postcard. `refundPolicy.ts` has no rule for this |
| NF-5 | Idempotency on order submission to PCM | A retried request that double-prints costs real money |
| NF-6 | Signed, deduped vendor webhooks | Same discipline as `/webhooks/stripe` |
| NF-7 | Sales tax determination | Print + mail is taxable in many US states; liability depends on merchant of record |
| NF-8 | Address/PII handling decision | Only applies if targeting uses a purchased consumer list rather than saturation mail |
| NF-9 | Double-entry ledger coverage | Every other money path in this codebase is ledgered. This one must be too |
| NF-10 | RBAC + spend authority | Who in a business may spend $500 on mail? |

---

## 3. What exists today — verified

### 3.1 Boost My Marketing — built, inert

`modules/boost` (1,131 LOC backend) + `features/boost` (frontend) + `app/(dashboard)/vendor/boost`.

Complete and well-built: campaign lifecycle, contribution capture, `on_unmet` refund/roll-forward choice, rollover expiry sweep, deadline sweep, anonymity, idempotency, rate limiting.

**Why it is inert** — [`config/constants.ts:175`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts):

```ts
export const BOOST_POSTCARD_UNIT_COST_CENTS = 0;
```

Zero means "no rate configured." `GET /boost/estimate` therefore returns `postcards: null`, and the UI correctly renders nothing rather than a fabricated number. A vendor creating a campaign cannot be told what their money buys.

`campaign_service: { rate_bps: 0 }` ([`constants.ts:429`](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts)) is unpriced for the same reason.

The mailing pipeline (`preparing → printing → mailed`) is admin-only, explicitly pending a vendor webhook ([`boost.routes.ts:107-118`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/boost/boost.routes.ts)).

**This is honest engineering, not a defect.** The prior team refused to fabricate a price. The PCM partnership is exactly what unblocks it.

### 3.2 The split-payment primitive already exists — the best news in this audit

[`integrations/stripe/types.ts:13-18, 52`](../../../STREET-SERVE-APPLICATION-BACKEND/src/integrations/stripe/types.ts):

```ts
export interface DestinationChargeInput {
  amountCents: number;
  currency: string;
  destinationAccountId: string;
  applicationFeeCents: number;
  transferGroup: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}
createDestinationCharge(input: DestinationChargeInput): Promise<...>;
```

A Stripe destination charge with an application fee is *precisely* the mechanism PC-12/13/14 describe. Buyer pays $500 → $50 application fee to StreetServe → $450 settles to the partner's connected account. One API call. No manual accounting.

Supporting infrastructure also present and verified:
- `connected_accounts` collection with `charges_enabled`, `payouts_enabled`, `payouts_frozen` ([`payments.model.ts:11-25`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/payments.model.ts))
- Hosted Connect onboarding — `POST /payments/connect/onboard`
- `createTransfer`, `reverseTransfer`, `createRefund`
- Solvency guard `canDisburse()` ([`balanceMonitor.service.ts:81`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/balanceMonitor.service.ts))
- Signature-verified Stripe webhooks with event dedupe

**Estimated effort for PC-12/13/14 is therefore low — conditional entirely on §0.2 resolving in our favour.**

### 3.3 The integrations adapter pattern is real

`src/integrations/` contains `auth`, `gemini`, `kyc`, `messaging`, `storage`, `stripe`, `weather.ts`. `THIRD_PARTY_INTEGRATIONS.md` §1 mandates that every third party sit behind a swappable internal interface, and the codebase honours it.

A `integrations/print` adapter is the correct home for PCM, and the pattern is proven. It also means a second print vendor later is a one-file change — worth insisting on given the partnership is not yet signed.

### 3.4 What does not exist

Verified by exhaustive search across both `src` trees:

- **No PCM code of any kind.** `grep -i pcmintegrations` → zero hits.
- **No postcard order model, route, service, or screen.** The only `postcard` hits are Boost's estimate helper and its constants.
- **No geographic targeting suitable for mail.** What exists is lat/lng + `radius_m` for ad placements ([`ads.model.ts:44`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ads/ads.model.ts), [`ads.service.ts:311`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ads/ads.service.ts)) and `postal_code` as a plain delivery-address string ([`delivery.service.ts:155`](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/delivery/delivery.service.ts)). Neither is a mailing-audience model. A radius is not a carrier route.
- **No design tool.** `features/storage` handles uploads generally; there is no editor, template, or pre-press validation.
- **No print-vendor webhook endpoint.**
- **No unified marketing hub.** `boost`, `ads`, `promotions` are three separate surfaces. `features/marketing/` is the public landing page, not a vendor tool.

---

## 4. Classification summary

| Status | Count | Requirements |
|---|---|---|
| Complete | 0 | — |
| Partial | 4 | PC-9, PC-18, PC-19, PC-20 |
| Missing | 15 | PC-1..PC-8, PC-10..PC-17 |
| Needs Fixing | 1 | PC-9 (wrong direction: converts money→quantity, spec needs quantity→money) |
| Needs Refactoring | 0 | — |

**Overall feature completion: ~12%**, and that 12% is entirely reusable substrate (Stripe splits, adapter pattern, ledger, storage, Boost's fulfilment enum), not delivered functionality. No user can order a postcard today.

The substrate is genuinely strong. This is a feature with a good foundation and nothing built on it yet.

---

## 5. Could not be verified

Stated explicitly, per the audit's own rules.

1. **PCM Integrations' API surface.** No public documentation was accessible and no integration exists to inspect. Everything about their endpoints, targeting taxonomy, artwork specs, pricing model, webhook events, sandbox availability, and rate limits is **unknown**. Effort estimates for PC-17 are therefore ranges, not commitments. **A discovery spike against their sandbox is the first task in the roadmap and must complete before anything downstream is estimated.**
2. **Whether PCM will accept Stripe Connect onboarding.** See §0.2. Commercial, unresolved.
3. **Actual unit economics.** The transcript's "$500 order" is illustrative. Real per-piece cost, postage class, and minimum order quantity are unknown until the contract exists.
4. **Whether the transcript's terms were ever agreed.** "10% is fine for us" is one message in a chat. No signed agreement was found in either repo.
5. **Live production behaviour.** This audit is static analysis. Nothing was executed against a running system.

---

## 6. Recommendation

**Do not start building.** Three things must land first, in order:

1. **Rotate the leaked key** (today, no dependencies).
2. **Resolve the Connect question** with PCM in writing (§0.2). It determines the entire payment architecture — building either topology before this is answered risks throwing the work away.
3. **Run a discovery spike** against PCM's sandbox to replace the five unknowns in §5 with facts.

Then build, in this order: PCM adapter → order + audience models → checkout with split → upload + pre-press + moderation → status webhook → **backfill Boost's unit cost, which revives an already-shipped feature for nearly free** → design tool (defer; it is the largest single item and the weakest justified).

Full sequencing in `IMPLEMENTATION_ROADMAP.md`.

---

## Document set

| Document | Contents |
|---|---|
| `FEATURE_COMPLETION_MATRIX.md` | All 20 requirements, twelve tracked fields each |
| `MISSING_FEATURES.md` | The 15 unbuilt requirements, with proposed designs |
| `PARTIALLY_IMPLEMENTED_FEATURES.md` | The 4 partials and what completes them |
| `FEATURES_REQUIRING_FIXES.md` | Defects and correctness gaps |
| `ARCHITECTURAL_IMPROVEMENTS.md` | Money topology, module boundaries, adapter design |
| `TECHNICAL_DEBT.md` | Debt this feature creates or inherits |
| `PRODUCTION_READINESS_REPORT.md` | Scalability, security, performance, usability, compliance |
| `IMPLEMENTATION_PRIORITY_MATRIX.md` | Value/effort/risk ranking |
| `IMPLEMENTATION_ROADMAP.md` | Eight dependency-ordered phases |
| `FINAL_IMPLEMENTATION_CHECKLIST.md` | Pre-launch gate |

**Added 2026-08-08 (Phase 0 execution):**

| Document | Contents |
|---|---|
| `PCM_DISCOVERY_FINDINGS.md` | Vendor discovery — who PostcardMania is, their money model, what the API does and does not do |
| `ADR-007-postcard-money-topology.md` | Three decisions settled, four framed and pending |
| `PARTNER_BRIEF_POSTCARDMANIA.md` | Send-ready. Closes items 0.2, 0.4, 0.5, 0.7 and the rest of PC-17-A |
| `MERCHANT_OF_RECORD_BRIEF.md` | Send-ready. Self-contained brief for the accountant; closes 0.3 |
| `PHASE_0_TRACKER.md` | Live status, owners, exit criteria |
