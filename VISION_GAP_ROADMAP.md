# StreetServe — Vision Gap Analysis & Implementation Roadmap

**Date:** 2026-07-30
**Source of truth for the vision:** James Bowser + Imma Nuel WhatsApp briefs (7/9 and 7/31) and the shared ChatGPT "Consignment Marketplace & Mobile Seller Network" conversation.
**Codebase audited:** `STREET-SERVE-APPLICATION` (Next.js PWA) and `STREET-SERVE-APPLICATION-BACKEND` (Express/Mongo).
**Companion docs:** [audit/FEATURE_COMPLETION_MATRIX.md](audit/FEATURE_COMPLETION_MATRIX.md), [API_CONTRACT_RECONCILIATION.md](API_CONTRACT_RECONCILIATION.md), [BUSINESS_PLATFORM_VISION.md](BUSINESS_PLATFORM_VISION.md). This document does **not** repeat those; it measures the code against the *vision brief specifically* and lists only what is missing, partial, or wrong.

---

## 0. Executive verdict

The platform is **substantially further along than the brief assumes**. The hard, unglamorous parts that most teams never finish — double-entry ledger, Stripe Connect settlement, immutable consignment checkouts, trust scoring with a confidence ramp, dispute resolution, tiered payout holds, RTO installments, tax reporting — are built and verified.

The gap is **not infrastructure. It is the "AI" layer, the discovery surfaces, and the growth/monetization products** that the brief leads with. Concretely:

| Vision pillar | Reality |
|---|---|
| Consignment marketplace + settlement | ✅ Genuinely built, deep |
| Wavedown / Lineup / live GPS | ✅ Built |
| Trust & reputation | ✅ Built (all three subject types) |
| Jobs / "Earn Today" | ✅ **Phase A + D** — job taxonomy, and one hub ranked on payout *and* time-to-payout |
| Shelter program | ✅ **Phase B** — invite/claim, capped cosign, custody payouts, training, starter grant |
| AI assistant | ✅ **Phase E** — outcome dataset, weather, calendar, events, a demand forecaster, skill matching, bundle pricing, and the Income Coach. **Statistical, not a trained model** — the distinction is documented rather than glossed |
| Live inventory map | ✅ **Phase C + E-4** — hubs, demand tiles, seller-held stock and events all plotted |
| Smart event selling | ✅ **Phase E** — event entity, manual + Ticketmaster ingestion, "N people expected" alerts |
| Seller Academy / certifications | ✅ **Phase D** — 3-course catalog, badges, certifications gating real access |
| Instant payout | ⚠️ Deliberately *not* instant (tiered hold). A-2 made the in-app copy honest; **the external marketing copy still isn't** |
| Monetization breadth | ✅ **Phase F** — 6 plans incl. two seller-scoped, featured placement, CPM ad inventory, paid certification. Insurance reframed as a waiver |
| Smart lockers / NFC / AI vision verification | ❌ Not built (explicitly "future" in brief — fine) |
| Creative Design Network / dev services | ❌ Not built, not scoped anywhere — a decision, not a ticket |

~~The single most dangerous gap is **the AI story**.~~ **Closed in Phase E**, with one honest
caveat that should travel with any external claim: what ships is a **statistical forecaster**
(`src/modules/ai/engine/forecast.ts`) over a real outcome dataset, with weather, calendar and event
signals — not a trained model. It answers "what does the AI actually predict?" with a number, a
confidence, and the factors behind it. That is a stronger position than a black box, and the
`RecommendationEngine` seam means a trained model drops in once there is enough history to validate
one. **Do not market it as machine learning until that swap happens.**

The remaining honesty gap is elsewhere: the **"instant payout" external copy** still contradicts the
tiered hold the system deliberately enforces.

---

## 1. What is genuinely implemented (baseline — no work needed)

Recorded so the roadmap below isn't misread as "nothing is done."

**Consignment core** — hub registration, product listing with owner-authored terms snapshotted per checkout, QR pickup/return, partial-sale settlement, immutable settlements, fee registry, approval policies, price-reduction and extension flows, fraud signals, seller + hub analytics.
`src/modules/consignment/*`, `src/features/consignment/components/*`, `src/app/(seller)/seller/*`, `src/app/(dashboard)/hub/*`

**Money** — double-entry ledger with reconciliation endpoint, Stripe Connect onboarding, transfer-group settlement, refunds, disputes with evidence + resolution, debt/credit, tax module, RTO with installment sweep and ownership transfer.
`src/modules/{ledger,payments,salepayments,refunds,disputes,debt,tax,rto}`

**Discovery & demand** — live GPS sessions with heartbeat/status/pop-up, nearby, trending (discount × demand × recency × proximity × paid boost), follow/notify-me, favorites, queue with position-locked discounts, wave-downs, scheduling, reviews, messaging with presence and read receipts, notifications inbox + push tokens.
`src/modules/{livemap,queue,scheduling,reviews,messaging,notifications,growth}`

**Trust** — versioned explainable formula across `seller | business | hub`, confidence ramp so new accounts start at the floor, only *upheld resolved* disputes penalize.
`src/modules/trust/trust.service.ts`

**Discount optionality (James's 7/9 note)** — ✅ correctly implemented. Discount schedules are optional per owner; Trending scores discount as one weighted signal (`TRENDING_DISCOUNT_REF_PERCENT`), so no discount = lower trending rank, never a block. This is exactly what was asked for.

---

## 2. Gap register

Severity: **P0** blocks the vision's core claim · **P1** materially weakens it · **P2** future/nice-to-have.

### 2.1 AI layer — *the headline gap*

| # | Gap | Status | Severity |
|---|---|---|---|
| A1 | **Demand prediction** — brief promises "AI predicts best selling products, best times, best locations, weather effects, seasonal trends." | 🟡 **Substantially done (E-6)** — a statistical forecaster per (category × tile × hour) with weather, calendar and event adjustment. **Not** a trained model; see the Phase E note | P2 |
| A2 | **Weather signal** | ✅ **Done (E-2)** |
| A3 | **Seasonality / holiday signal** | ✅ **Done (E-3)** |
| A4 | **AI product↔seller skill matching** | ✅ **Done (D-2 + E-7)** — the seller profile feeds the forecaster; transport is a soft penalty, never a filter |
| A5 | **AI Personal Income Coach** — "to earn $100 today, sell these 12 items at these locations." | ✅ **Done (E-9)** — and it is allowed to return a plan that falls SHORT rather than padding to the goal |
| A6 | **Bundle pricing** — "one for $10 or three for $25." | ✅ **Done (E-8)** — a real multi-unit offer, not a vague "consider discounting" |
| A7 | **Event pricing** | ✅ **Done (E-8)** — event-day note on the pricing suggestion |
| A8 | **Smart Event Selling** — event entity, ingestion, "500 people expected" alerting | ✅ **Done (E-4/E-5)** |
| A9 | **Sales coaching depth** — no per-seller learning from sale outcomes | 🟡 **Unblocked (E-1)** — `outcome_facts` now records what actually sold; the coaching library itself is still static | P2 |
| A10 | **AI Business Dashboard recommendations** — "move inventory to San Jose this weekend" | ✅ **Done (E-10)** — only advises a move when the destination has real evidence behind it |
| A11 | **AI Vision Verification** — photo-based condition/quantity/damage check. `ProductPhotos.tsx` uploads images; nothing inspects them. | ❌ Missing | P2 |

**Framing note, updated after Phase E.** The original note said A1–A5 needed a feedback loop that
didn't exist. E-1 built it (`outcome_facts`), and E-6 forecasts from it. What remains is the step
that loop was always the prerequisite for: **training and validating an actual model**. That is now
a data-volume question rather than an engineering one — `GET /ai/outcomes/stats` reports when there
is enough settled history to be worth it. Until then the statistical forecaster is the honest
answer, and it is explainable in a way a model won't be.

### 2.2 Discovery surfaces

| # | Gap | Status | Severity |
|---|---|---|---|
| D1 | **Live Inventory Map** — hubs, sellers, events, high-demand zones on one interactive map. | ✅ **Done (Phase C)** — hubs, demand and seller-held stock all plotted. Events remain (E-4) |
| D2 | **Demand heat zones** — aggregation of wave-downs/queue joins into geographic tiles. | ✅ **Done (C-3)** |
| D3 | **Customer-facing consignment storefront** — consignment is seller-facing only. A customer browsing the app cannot see or buy consigned products; the brief's "product owners reach customers" claim is currently only true *through* a physical seller. | ❌ Missing | P1 |
| D4 | **Hub discovery for prospective hub partners** — churches/community centers/nonprofits have no marketing surface or self-serve pitch; `hub/register` assumes you already decided. | 🟡 Partial | P2 |

### 2.3 Earning surfaces

| # | Gap | Status | Severity |
|---|---|---|---|
| E1 | **Unified "Earn Today" hub** — brief lists sell / hold signs / deliver / sample / promote / event staffing in one section, ranked by fastest payout. | ✅ **Done (D-1)** — consignment + gigs merged and ranked on payout AND time-to-payout. Promotions deferred to F-3 |
| E2 | **Job taxonomy** — `jobs.model.ts` has no job *type* enum; only `pay_unit: flat\|hourly`. The brief's six categories can't be filtered, matched, or AI-ranked. | 🟡 Partial | P1 |
| E3 | **AI job matching** — the AI module doesn't touch jobs at all. `ai.routes.ts` exposes products/locations/pricing/coaching only. | ❌ Missing | P1 |
| E4 | **Seller Academy** — free training, curriculum, badges, certifications. | ✅ **Done (D-3/D-4)** — 3-course catalog, badges and certifications, on B-5 s completions table |
| E5 | **Certification as revenue** | ✅ **Done (F-5)** — one paid course; required and access-granting courses stay free |

### 2.4 Homeless shelter / access program

| # | Gap | Status | Severity |
|---|---|---|---|
| S1 | Shelter *entity* + admin management exist (`modules/shelter`, `admin/shelters`, `ShelterManagement.tsx`). | ✅ | — |
| S2 | **Resident onboarding path** — "verify identity → complete training → receive starter inventory → earn same day." | ✅ **Done (Phase B)** — invite/claim, training gate, starter grant, resident UI |
| S3 | **Identity without documents** — ~~shelter-vouched attestation is the missing tier~~. **Audit error:** `grantShelterCosign` already existed and always granted Bronze without ID or bank. | ✅ Already existed |
| S4 | **Payout without a bank account** — no cash-out alternative. Blocked the entire program regardless of S2/S3. | ✅ **Done (B-3)** — shelter-custodied rail |

> ~~This is the most under-built pillar relative to how prominently it's pitched.~~ **Resolved.** A
> resident can now be enrolled at a front desk with no account, claim a code on any phone, complete
> a four-module course, take a starter pickup that carries no downside, and be paid through their
> shelter without ever holding a bank account. The one remaining caveat is operational, not
> technical: custody requires the partner org to have completed Stripe Connect onboarding, so
> partner setup is now the gating step rather than resident identity.

### 2.5 Product model & commerce

| # | Gap | Status | Severity |
|---|---|---|---|
| P1 | **Product types** — the `listing_type` enum (`consignment \| wholesale \| rental \| donation`) exists ✅, but only the consignment path has real lifecycle logic. Wholesale (pay upfront), rental (return + deposit + duration), and donation (no split) shared the consignment settlement code, which would produce wrong money movement. | ✅ **Gated (A-1)** — creation and checkout now refuse unsupported types; the three paths remain to be built | **P0** |
| P2 | **Snack/food product category** — brief says "snacks (where permitted)". No jurisdictional gating on product categories; a seller could list food anywhere. Regulatory exposure. | ✅ **Done (A-6)** | P1 |
| P3 | **NFC tags** — per-product NFC identity. QR exists at hub and job level; not per product unit. | ❌ Missing | P2 |
| P4 | **Smart lockers** — unattended pickup. | ❌ Missing | P2 |
| P5 | **Autonomous mobile inventory trailers** | ❌ Missing | P2 (speculative) |

### 2.6 Payouts — *a real product conflict, not just a gap*

| # | Gap | Status | Severity |
|---|---|---|---|
| M1 | **"Instant Payout System" vs tiered payout holds.** The brief promises profits deposited immediately on sale. The code deliberately implements the opposite: `PAYOUT_DELAY_DAYS_BY_TIER` holds funds by verification tier (Bronze = 3 days), plus freeze-on-dispute. The engineering is right for fraud control; **the marketing copy is wrong.** | ⚠️ Conflict | **P0 (decision)** |
| M2 | Settlement correctly refuses to pay out when funds weren't collected (cash sales) — good — but there is no *seller-facing explanation* of why their money is held. Support burden + trust damage. | 🟡 Partial | P1 |

### 2.7 Monetization

Existing plans: `pro`, `featured`, `verified_badge`, `ai_assistant` (`config/constants.ts:346`). Missing from the brief's revenue model:

| # | Gap | Status | Severity |
|---|---|---|---|
| R1 | **Inventory insurance** — no product, no premium, no claim flow. | ✅ **Reframed + done (F-4)** as a contractual WAIVER, not insurance. See the Phase F note |
| R2 | **Advertising** — sponsors module was logo placement + manual reporting. | ✅ **Done (F-3)** — CPM inventory, targeting, prepaid budgets, real delivery reporting |
| R3 | **Featured products** — only businesses could be featured. | ✅ **Done (F-1)** — products AND hubs |
| R4 | **Featured hubs** | ✅ **Done (F-1)** |
| R5 | **Seller memberships** — every plan sold to a business; sellers had nothing to buy. | ✅ **Done (F-2)** — Seller Plus, with enforced perks |
| R6 | **Trust-unlocked benefits** — brief: higher scores unlock better inventory, larger limits, higher profit percentages. | ✅ **Done (A-3)**, extended by D-5: certifications now gate premium stock alongside Trust |

### 2.8 Out-of-scope-but-promised

| # | Gap | Status | Severity |
|---|---|---|---|
| X1 | **Creative Design Network + full-stack development services** (James, 7/9). Zero presence in either repo, not in any planning doc. This is a *separate business line*, not a feature — it needs its own decision, not a ticket. | ❌ Missing | **Decision needed** |

---

## 3. Things that need *fixing*, not building

Distinct from gaps — these are implemented but wrong or risky against the vision.

1. ~~**`listing_type` settlement divergence (P1 above).**~~ ✅ **Fixed (A-1).** `rental` and `donation`
   products would have flowed through consignment settlement math. Now refused at both creation and
   checkout, so nothing unsupported can reach `settle()`.

2. ~~**Recommendation accept-signal is a dead end.**~~ ✅ **Fixed (A-4).** `POST /ai/recommendations/:id/accept`
   is now read back by `aiRepository` and ranked on via `AI_WEIGHTS.acceptance`.

3. **AI entitlement vs. AI value.** `ai_assistant` is a paid plan, but the assistant's output is a rules engine. Charging for it before A1/A4/A5 (Phase E) land is a refund-and-churn risk. **Still open.**

4. ~~**Trust score is computed but under-consumed (R6).**~~ ✅ **Fixed (A-3).** It now sets the
   inventory ceiling, earns a platform-fee discount, and unlocks premium inventory.

5. ~~**Hub discovery is list-only while the whole product is map-first.**~~ ✅ **Fixed (C-1/C-2).**
   Hubs are drawn, with live availability counts and a server-side category filter.

6. **"Instant payout" copy must change** or the hold must change (M1). The in-app screen is now honest (A-2); the external marketing copy is not. **Still open — a decision, not a ticket.**

7. ~~**Jobs module has no type enum.**~~ ✅ **Fixed (A-5).** Taxonomy, backfill migration, server-side
   filter and client chips all shipped.

---

## 4. Implementation roadmap

Ordered by *dependency*, not wish. Each phase is shippable.

### Phase A — Correctness & honesty ✅ **SHIPPED 2026-07-30**
> Removes money bugs and false promises. No new surfaces.

| ID | Task | Repo | Status |
|---|---|---|---|
| A-1 | Gate `listing_type` creation to `consignment` **or** implement distinct settlement paths for `wholesale` / `rental` / `donation` | backend | ✅ Gated at creation **and** checkout; `20260730000001` flags existing rows |
| A-2 | Reconcile payout messaging with tiered holds: seller-facing "why is my money held" explainer + funds-availability component | both | ✅ `GET /payments/funds-availability` + `<FundsAvailability>` |
| A-3 | Wire trust score to real benefits: fee discount, inventory limits, premium-product eligibility (R6) | backend + frontend | ✅ `TRUST_BANDS` + `GET /trust-scores/me/benefits` + `<TrustBenefits>` |
| A-4 | Consume the recommendation accept-signal in ranking, or remove the endpoint | backend | ✅ Consumed; engine bumped to `rule-v2` |
| A-5 | Add `job_type` enum + migration + filters | backend + frontend | ✅ `GET /jobs/types`, `?jobType=` filter, `20260730000002` |
| A-6 | Jurisdictional gating on food/snack product categories | backend | ✅ Default-deny on `City.feature_flags.consignment_food` |

**Design decisions worth carrying forward:**

- **A-1 chose the gate, not the build.** The enum survives (it records real product intent) and
  `SUPPORTED_LISTING_TYPES` is the allow-list. Each type joins it when its own money path exists.
- **A-3's fee discount comes out of the platform's fee, never the hub's share.** The hub is paid
  exactly what its authored split entitles it to, discount or not. The platform funds its own
  loyalty programme rather than quietly redirecting someone else's money.
- **A-3 bands are upside-only** (no multiplier below 1.0). A sub-1.0 band would shrink the ceiling
  for low scores, and low scores are overwhelmingly *new* sellers — the v2 confidence ramp already
  starts everyone at the floor. Scaling down would punish them twice for the same missing history
  and halve a new Bronze seller's first-day stock. Bad behaviour is handled where it belongs: the
  score falls, auto-approval stops, debt escalation blocks checkouts.
- **A-3's band is snapshotted at checkout**, like the owner's terms. Terms in force are the ones the
  seller was shown when they took the stock.
- **A-6 is default-DENY** and deliberately does *not* use `platformService.isFeatureEnabled`, which
  defaults open for unconfigured cities. A jurisdiction nobody has reviewed is not one that said yes.
  Hubs can now set `citySlug` at registration or via the approval-policy patch, so the refusal is
  actionable rather than a dead end.
- **A-4 guards against its own feedback loop**: acceptance is a smoothed *rate*, withheld entirely
  below a minimum sample, so new stock isn't buried and yesterday's winner doesn't win forever.

**Still open from Phase A's neighbourhood:** M1 — the "instant payout" *marketing copy* is now
contradicted by an in-app screen that explains the hold honestly. The external copy still needs
changing; that's a decision, not a ticket.

### Phase B — Access: make the shelter program real ✅ **SHIPPED 2026-07-31**
> The highest social-impact and highest-credibility-risk gap.

**Correction to §2.4 above:** B-1 was already ~80% built. `identityService.grantShelterCosign` has
always issued a Bronze `shelter_cosign` verification with no ID and no bank account, and
`VERIFICATION_TYPE_TIER` already mapped it. The audit was wrong to call the identity path missing.
What was genuinely missing was everything *around* it — and one outright bug.

| ID | Task | Status |
|---|---|---|
| B-1 | Shelter-vouched identity tier | ✅ Identity path already existed; added the **invite/claim flow** so staff can enrol someone before they have an account and hand over a 6-char code |
| B-2 | Capability matrix | ✅ **Fixed a live liability bug** — see below. Plus hub-proximity limit, tighter cash-debt ceiling, `GET /residents/me` |
| B-3 | Non-bank payout rail | ✅ Shelter-custodied account (your call). Redirects at `payoutTransfer`, the single choke point, so settlement, digital splits and gig pay are all covered |
| B-4 | Starter-inventory grant | ✅ First pickup writes no debt on loss — the cosign absorbs it |
| B-5 | Training gate + completion record | ✅ 4-module course, `training_completions` table deliberately generic for the Phase D Academy |
| B-6 | Resident onboarding UI | ✅ `/seller/enroll`, `/seller/training`, resident wallet + status card, shelter staff console |

**The bug B-2 fixed.** `cosigned_allocation_cents` is documented in the schema as *"the HARD cap on
the shelter's liability (FR-12.4)"* and was **enforced nowhere**. A shelter that cosigned $50 was
silently exposed to the full Bronze $200 ceiling. The resident's effective limit is now the minimum
of their tier/Trust ceiling, the shelter's *remaining* cosign, and a platform backstop.

**Design decisions worth carrying forward:**

- **Custody redirects at `payoutTransfer`, not at each call site.** One choke point means a payout
  path added later inherits the behaviour instead of quietly stranding residents again.
- **`custody` is a distinct leg status from `paid`.** The money moved, but it did *not* reach the
  seller's hands. Collapsing them would tell a resident they'd been paid while their cash sits on a
  shelf at the front desk.
- **A resident's own account always wins.** Custody is a fallback for people the banking system
  won't serve, never a default for people it will.
- **Custody is opt-in per partner**, with who accepted it and when. It is a real fiduciary duty and
  nobody is opted into one.
- **The platform ledger is unchanged by custody.** The money genuinely left and our payable is
  genuinely discharged; `shelter_custody` records the duty that then exists *off*-platform.
- **A cosign above the backstop is refused, not clamped.** Staff who believe they cosigned $500 have
  been misled about their own exposure — the exact confusion B-2 exists to remove.
- **Existing residents must re-take training.** The migration leaves `training_completed_at` null on
  purpose: the course covers the return window and what a cash sale costs them, and nobody currently
  enrolled has ever been told either.
- **The claim-code index had to become partial.** A plain unique index permits one null per partner,
  so a shelter could hold exactly one outstanding invite. They enrol in batches.

### Phase C — The map becomes the product ✅ **SHIPPED 2026-08-01**
> Delivers the brief's marquee visual and unblocks event/demand features.

| ID | Task | Status |
|---|---|---|
| C-1 | Hub layer on the live map | ✅ `GET /map/hubs`, `HubPin`, hub detail card. Clusters against business pins via the existing screen-space clusterer |
| C-2 | Inventory-availability layer, filterable by category | ✅ Counts come from live availability; category filter is server-side and **drops** non-matching hubs |
| C-3 | Demand-heat layer from wave-downs + queue joins | ✅ `GET /map/demand` → fixed-degree tiles → GL heatmap |
| C-4 | Unified map filter/legend | ✅ `MapLayerControl` — one control that is both, persisted per device |
| C-5 | Hub-owner "where is my inventory right now" | ✅ `GET /hubs/:id/inventory-map` + `/hub/inventory-map` |

**Events** (the fourth layer named in C-4) are deliberately **not** included — there is no event
entity yet. That is E-4, and the layer control takes a typed key list, so adding it later is one
entry rather than a refactor.

**Design decisions worth carrying forward:**

- **Demand had to be derived, not read.** Wave-downs and queue entries carry no coordinates — they
  reference an *owner*. Demand is therefore located at that owner's live position. My own roadmap
  said "data already exists"; it does, but only through that join.
- **A fixed-degree grid, not viewport-relative.** The same event always lands in the same tile, so
  the layer doesn't shimmer while panning.
- **`DEMAND_MIN_TILE_WEIGHT` is a privacy floor, not a tuning knob.** One person waving once is not
  a hot zone, and rendering it as one would disclose roughly where one identifiable person is
  standing. The endpoint also never returns an actor id — it says *where*, never *who*.
- **Hub pins are a different SHAPE, not a different colour.** Squared badge + package glyph vs. the
  business pin's round ringed avatar, so the layers stay distinguishable peripherally and for anyone
  who can't rely on colour (a11y §2.8).
- **Hubs and businesses share one marker array** so they cluster against each other. Two independent
  layers would let a hub badge land exactly on a vendor's avatar with neither aware of the other.
- **Demand is a GL layer, not markers.** Hundreds of DOM nodes for ambient signal would stall
  exactly the low-end devices this product targets. `MapDataLayer` is deliberately narrow (points +
  paint) so the MapLibre swap the wrapper exists to enable stays a one-file change.
- **Demand defaults OFF.** It's a vendor planning tool; an ambient heat wash under every customer's
  map would degrade the primary use case to decorate a secondary one.
- **C-5 returns unlocatable holders rather than omitting them**, and the UI puts them *above* the
  map. "We don't know where this is" is the most useful thing a hub owner can be told; dropping
  those rows would hide exactly the stock worth chasing.

#### Reconciliation with [MAP_REDESIGN_SPECIFICATION.md](MAP_REDESIGN_SPECIFICATION.md)

The two documents no longer compete. That spec's Phase 1 (basemap palette) shipped earlier; its
remaining phases are **visual treatment** of the map — marker levels-of-detail (§9.2), sheet detents
(§7.2), the glass system (§8), motion tokens (§10.1). Phase C added **what the map contains**.
They're orthogonal, and C touched none of the spec's visual decisions: `HubPin` follows §9.1's
anatomy (badge + tail) and §9.5's per-theme knockout ring rather than inventing a treatment.

Remaining map work is therefore a single queue: MAP_REDESIGN §7–§10 (visual), then E-4/E-5 (the
events layer), then C-3's tiles gain event context.

### Phase D — Earning hub & Academy ✅ **SHIPPED 2026-08-01**
| ID | Task | Status |
|---|---|---|
| D-1 | Unified `/earn` surface, ranked by expected payout **and time-to-payout** | ✅ `GET /earn` + `/seller/earn`. Consignment + gigs merged; promotions deferred (see below) |
| D-2 | Seller skill/persona profile — the missing input for A4 | ✅ `seller_profiles`, `GET/PATCH /sellers/me/profile`, wired into the ranking engine |
| D-3 | Academy: curriculum, delivery, quiz, completions | ✅ 3-course catalog on B-5's `training_completions` table |
| D-4 | Badges + certifications from completions | ✅ `GET /academy/me/credentials` — **derived**, not a second table |
| D-5 | Certification-gated inventory tiers | ✅ `required_certification` on products; `CERTIFICATION_REQUIRED` |

**Design decisions worth carrying forward:**

- **B-5's generic table paid off.** `training_completions` was deliberately not named
  `shelter_training`, so the Academy is a catalog in front of the same table and the resident course
  became course #1 rather than a migration. Both routes write it; both read each other's results.
- **Two ranking axes, both printed on the row.** Payout alone would float a $90 four-hour gig above
  $18 of candles every time, ignoring that the gig pays *after* the shift. Someone who needs money
  for a bed tonight is optimising the second axis, so "$80 · paid today" is on the card rather than
  folded into a rank.
- **Consignment payout is quoted PER UNIT, net of fees** — not the value of the whole pickup.
  Quoting the pickup would be the flattering number and the dishonest one: nobody sells out on day
  one, and a list implying they will is how a seller ends up with stock they can't move.
- **Badges and certifications are derived from completions**, not stored separately. A second table
  would be a copy of the truth that can drift from it.
- **A certification is a different gate from a Trust Score, deliberately.** Trust measures whether
  past consignments went well; a certification says someone was *taught* something. The refusal
  message names the course and its length, because a certification lock is clearable **today** where
  a Trust shortfall takes weeks — that's the difference between a door and a wall.
- **A certification earned against an older course version stops counting for gating.** Only
  current-version completions satisfy D-5; the credentials screen shows the stale one and asks for a
  retake rather than silently revoking it.
- **Declared and inferred profile signals never merge.** When what someone says disagrees with what
  they do, that disagreement is the signal — and a blended number destroys it. The seller sees both.
- **Declared affinity fixes the cold start; behavioural affinity still wins.** `Math.max`, not a sum,
  so a brand-new seller gets personalisation from minute one without out-ranking real evidence.
- **Transport is a soft penalty, never a filter.** A seller who says they can carry it is a better
  authority on their own legs than we are.

**Promotions deferred from D-1.** The brief lists them alongside selling and gigs, but the only
existing mechanic is paid ping-sharing, whose earnings are a tip of a few cents — ranking that beside
an $80 shift would be noise. It belongs with F-3 (real ad inventory), which gives it something worth
ranking. `OpportunityKind` already carries the `promotion` case, so adding it is a producer function.

### Phase E — Real AI ✅ **SHIPPED 2026-08-01**
> Deliberately last: every model here needs Phase A's feedback loop and Phase D's skill profile.

| ID | Task | Status |
|---|---|---|
| E-1 | **Outcome dataset** | ✅ `outcome_facts` — captured at checkout, completed on settlement. `GET /ai/outcomes/stats` reports readiness |
| E-2 | Weather integration | ✅ Provider interface + OpenWeather + **null default**; geo-tile hourly cache |
| E-3 | Calendar/seasonality features | ✅ Pure, no deps. Holidays computed, not tabled. Payday window included |
| E-4 | Events ingestion → `Event` entity | ✅ Manual admin entry (the pilot's primary source) + Ticketmaster ingestion |
| E-5 | Event-aware seller alerts | ✅ Sweep, once per seller per event, floored at 150 expected attendance |
| E-6 | Demand forecast per (category × tile × hour) | ✅ **Statistical forecaster, not a trained model** — see below. Behind `RecommendationEngine`, selected by `AI_PROVIDER=forecast` |
| E-7 | Skill-aware matching using D-2 | ✅ In the forecaster; transport is a soft penalty, never a filter |
| E-8 | Bundle + event pricing | ✅ Real multi-unit offer ("one for $10, or 3 for $25") + event-day note |
| E-9 | **Income Coach** | ✅ `POST /ai/coach/plan` + `/seller/plan`. **Allowed to fall short** — see below |
| E-10 | Hub reallocation advice | ✅ `GET /ai/hubs/:id/reallocation` |

#### ⚠ What "AI" means here, precisely

**E-6 is a statistical forecaster, not a machine-learning model.** It predicts sell-through per
(category × tile × hour) from recency-weighted historical outcomes, adjusted by weather, calendar
and event multipliers. Every number traces to rows in `outcome_facts` and a small set of documented
coefficients.

That is a deliberate choice, and the executive summary above has been updated to say so rather than
letting "Real AI" imply otherwise:

- The labelled dataset only started existing with E-1. Training on it today would fit a few hundred
  rows and produce a model that is confidently wrong.
- Every output decomposes into named factors a seller can read. Replacing an explainable ranking
  with an opaque one, on no evidence the opaque one is better, is a downgrade dressed as an upgrade.
- The `RecommendationEngine` seam means a trained model is one `setRecommendationEngine()` call
  later — and by then `outcome_facts` will have the history to **validate** it, which is the part
  that actually matters.

**Design decisions worth carrying forward:**

- **Thin cells blend toward their category prior.** Two lucky sales in an empty cell would otherwise
  forecast 100%. The blend, plus a pessimistic 0.25 baseline with no evidence at all, is what stops
  the forecaster embarrassing itself on day one.
- **Multiplier bands are asymmetric on purpose.** Calendar ±35%, weather ±60% — because a storm
  doesn't dampen street sales, it ends them, while a Saturday shouldn't make a dead product look
  alive.
- **Absent weather is neutral (1.0), never pessimistic.** No provider must degrade the forecast, not
  skew it.
- **The Income Coach is allowed to say no.** If stock supports $60 against a $200 goal, it returns
  $60, `achievable: false`, and what would close the gap. Goals above $1,000 are refused outright.
  The person reading it may be deciding whether they can eat tonight; over-promising is a harm, not
  a UX flaw.
- **Unknown event attendance stays null**, never 0 — it's the number a seller is most likely to act
  on, so a fabricated one is the most costly kind.
- **E-4 completed C-4's fourth map layer.** The layer control took a typed key list precisely so
  this would be one entry; it was.

### Phase F — Monetization breadth ✅ **SHIPPED 2026-08-01**
| ID | Task | Status |
|---|---|---|
| F-1 | Featured products + featured hubs | ✅ `POST /placements/featured`. Boost-only, slot-scarce per city, always labelled |
| F-2 | Seller membership tier | ✅ **Seller Plus** ($4.99/mo) — 1.5× stock ceiling, 15% fee discount, 12h early access |
| F-3 | Ad inventory + targeting + billing | ✅ CPM campaigns, prepaid budgets, batched impression billing, capped feed share |
| F-4 | ~~Inventory insurance~~ → **Stock Protection waiver** | ✅ Built as a contractual waiver, **not insurance** — see below |
| F-5 | Paid certifications | ✅ "Pro Seller" ($19). Material stays free; only the assessment is gated |

#### ⚠ F-4 is a waiver, not insurance — and that must not drift

The roadmap flagged this as "may be a regulated product". It is. A platform that charges a premium
and pays claims **is an insurer**: licensed carrier or MGA, state-by-state producer licensing, filed
rates and forms. That cannot ship as platform-native code.

So F-4 was built as what it can legitimately be: **the platform waiving its own right to recover**.
When lost/damaged stock would create a debt under `chargeInventoryLiability`, an active waiver
suppresses that debt up to a cap. The hub is still made whole — the platform absorbs it, which is
the product's actual cost and why the caps are low.

The constraints that keep it out of insurance regulation, all enforced in code:
- It **never pays money to a seller** — it only declines to collect.
- It covers **only what the seller would owe US**, never third-party risk.
- The words *insurance, policy, premium, claim* appear nowhere in user-facing copy. Two tests assert
  this, one backend and one frontend. An earlier draft read "this isn't a policy" — even that
  negation was removed, because naming the thing invites the association.

**This still wants a lawyer's read on the agreement wording before launch.** It is materially not an
insurance product, but "materially not" is a judgement someone qualified should confirm.

**Other decisions worth carrying forward:**

- **Paid placement is additive and disclosed, never a filter.** `AD_MAX_SHARE_OF_FEED` caps ads at
  20% of any feed, and `FEATURED_LABEL` has no off switch. Discovery that can be bought outright
  stops being a signal — and the inventory becomes worthless precisely because it worked too well.
- **CPM, not CPC.** Click-pricing on a map surface rewards whatever is most tappable, which here
  means whatever most resembles a live vendor pin — exactly the paid/organic confusion the label
  exists to prevent.
- **Seller Plus's fee discount comes out of the platform's cut**, stacking with A-3's Trust discount
  and capped at the whole fee. The hub's authored split is untouched, same rule as A-3.
- **A course may only be paid if it is optional.** `resident-starter` (required for the shelter
  programme) and `inventory-handling` (unlocks gated stock) are free forever. Charging for either
  would sell the right to earn to people defined by having no money. A test asserts it.
- **The paid course's material stays readable**; only the assessment is gated. Someone who can't
  afford $19 can still learn everything in it.
- **Subscriptions gained `activated_at`.** `created_at` is the row's birth and doesn't move on
  resubscribe — using it would let someone cancel, resubscribe and skip the waiver's waiting period.

### Phase G — Future / speculative
NFC per-unit tagging · AI vision verification of condition and quantity · smart lockers · autonomous mobile inventory trailers · customer-facing consignment storefront (D3 — may deserve promotion into Phase C if the "product owners reach customers" claim becomes a selling point).

### Separate decision — not a phase
**X1: Creative Design Network / full-stack dev services.** This is a services business, not a platform feature. It shares no data model, no user, and no revenue mechanic with StreetServe. Recommend: decide explicitly whether it's a separate product before any engineering time is allocated. Bundling it into this codebase would be a mistake.

---

## 5. Recommended immediate sequence

**Phases A through F are shipped.** What remains is Phase G (speculative), operational work, and
three standing decisions — none of which are engineering tasks.

### The three decisions

1. **Legal review of the Stock Protection wording (F-4).** Built as a contractual waiver rather than
   insurance, with the constraints enforced in code and asserted by tests. It is materially not an
   insurance product, but that judgement should be confirmed by someone qualified before launch.
2. **"Instant payout" external copy** still contradicts the tiered hold the system enforces. The
   in-app copy was fixed in A-2; the marketing wasn't.
3. **Creative Design Network** remains a separate services business, not a feature. It shares no
   data model, user or revenue mechanic with StreetServe.

### Then, in order

1. **Switch `AI_PROVIDER=forecast` when the data says so.** Check `GET /ai/outcomes/stats` — the
   forecaster is live but not the default, because on a cold dataset it is no better than the
   rule-based engine and slower. A config change gated on a number, not a code change.
2. **Seed the event calendar.** E-4/E-5 are built and empty. The pilot's real value is manual
   entry — local markets and fairs aren't in any ticketing feed — so this is someone spending an
   hour a week, and it's what makes the event alerts worth receiving.
3. **Price-test the Phase F products.** Seller Plus at $4.99 and Stock Protection at $2.99 are
   reasoned guesses, not researched prices. The waiver in particular has a real cost of goods —
   `waiver_uses` records exactly what the platform absorbed on every incident, so the price can be
   checked against evidence within a month of launch rather than assumed indefinitely.
4. **Fill the ad inventory.** F-3 is built and has no advertisers. The sponsors module's existing
   relationships are the obvious first source.
5. **Partner onboarding ops** — B-3 custody depends on shelter partners completing Stripe Connect.
   A process problem rather than an engineering one.
6. **MAP_REDESIGN §7–§10** — the visual half of the map workstream, unblocked and non-competing.
7. **F-3 unblocks D-1's `promotion` opportunity kind**, which was deliberately left empty because
   paid ping-shares were too thin to rank beside an $80 shift. Real ad inventory changes that.
8. **A trained model, eventually.** Only once `outcome_facts` has the volume to validate one
   against the current forecaster. The seam is ready; the evidence isn't yet.
