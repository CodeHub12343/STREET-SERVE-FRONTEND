# Feature Completion Matrix

Every requirement extracted from the specification, with the twelve tracking fields the audit brief requires.

**Legend**
- **Status:** Complete · Partial · Missing · Needs Fixing · Needs Refactoring · Recommended Improvement
- **FE / BE:** ✅ done · ◐ partial · ✗ absent · — not applicable
- **Pri:** P0 blocker · P1 high · P2 medium · P3 low
- **Cx:** S (≤2 d) · M (3–8 d) · L (2–4 wk) · XL (>1 mo)

Percentages are weighted 50/50 frontend/backend unless the requirement is backend-only.

---

## A. Marketplace & Sales

| ID | Feature / description | Status | FE | BE | % | Pri | Cx | Issues found | Required work · dependencies · next step |
|---|---|---|---|---|---|---|---|---|---|
| MS-1 | **Mobile business online storefronts** — a public page per business with identity, offering, and a buy path | Partial | ◐ | ◐ | 70 | P1 | M | Business profile + menu exist (`/business/[id]`, `GET /businesses/:id/menu`); seller profile exists (`/seller/profile`, `sellers` module). There is no general per-business product catalog outside hub consignment inventory — a non-hub vendor cannot list goods | Add a business-scoped product listing distinct from `products.hub_id`. Deps: none. **Next:** decide whether a storefront is a vendor menu or a true catalog; the two are currently conflated |
| MS-2 | **Pre-order and scheduled pickup** — order now, collect at a chosen time | Partial | ◐ | ◐ | 45 | P1 | M | Service *bookings* are complete (`scheduling` module: services, availability windows, bookings, reminders). Goods orders have **no** scheduled fulfilment time — `orders.model.ts` carries no `pickup_at`/`scheduled_for` field | Add a scheduled-fulfilment time to orders + vendor capacity per slot. Deps: `scheduling` availability windows (reusable). **Next:** extend `PlaceOrderBody` with an optional pickup window validated against the vendor's availability |
| MS-3 | **Rent-to-own listings** | Partial | ✗ | ✅ | 50 | P0 | L | Backend complete and high quality (§42–§53). **No customer can create or accept an agreement** — `features/rto/components/` contains only `RtoDashboard.tsx`; `useRtoDisclosure` ([useRto.ts:16](../../src/features/rto/hooks/useRto.ts#L16)) has zero consumers | Build disclosure → acceptance → schedule UI, plus seller-side listing creation. Deps: §60 attorney text. **Next:** wireframe the §44 disclosure screen — every field is already returned by `POST /rto/disclose` |
| MS-4 | **Consignment marketplace** | Complete | ✅ | ✅ | 100 | — | — | None. Hubs, products, checkouts, sales, returns, settlements, QR chain-of-custody, approval gating, fraud sweeps, analytics — all present and tested | Maintain. **Next:** none |
| MS-5 | **Used equipment marketplace** | Missing | ✗ | ✗ | 0 | P3 | M | No condition/used-goods concept; `products` has `condition_requirements` (a consignment care instruction, not a grading) | Add condition grading + a used-goods category and filter. Deps: MS-1 storefronts. **Next:** defer until MS-1 lands |
| MS-6 | **Wholesale supplier marketplace** | Partial | ◐ | ◐ | 35 | P2 | L | `wholesale` exists only as a **listing type** ([constants.ts:436](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L436)) — seller pays the hub upfront and keeps the resale. There is no supplier-side marketplace, no supplier role, no bulk pricing | Add a supplier entity, bulk price breaks, and MOQ. Deps: MS-1. **Next:** confirm whether "hub with wholesale listings" already satisfies the intent before building a second concept |
| MS-7 | **Digital gift cards** | Complete | ✅ | ✅ | 100 | — | — | `gifts` collection, `POST /gifts`, `/gifts/:code/redeem`, hourly expiry sweep, `/gift/[code]` + `/business/[id]/gift` pages | Maintain |
| MS-8 | **Loyalty rewards program** | Missing | ✗ | ✗ | 0 | P2 | M | Zero hits for loyalty/punch-card/points. The one `loyalty` mention is a comment explaining why the platform funds discounts from its own cut | Design points or punch-card accrual on completed orders. Deps: orders (done). **Next:** choose stamps vs points — stamps are far cheaper to explain and to build |
| MS-9 | **Customer subscriptions (weekly/monthly recurring purchase)** | Missing | ✗ | ✗ | 0 | P2 | L | `subscriptions` module is **seller/business plans**, not recurring customer purchases. No recurring-order concept exists | Add a recurring order schedule + card-on-file consent. Deps: MS-2 scheduled fulfilment. **Next:** sequence after MS-2 |
| MS-10 | **Flash sales with countdown timers** | Partial | ◐ | ◐ | 40 | P2 | M | A time-decaying **queue discount schedule** exists (`PUT /queues/:ownerType/:ownerId/discount-schedule`, countdown logic in `queue.service.ts`) and feeds the Trending "discount boost". That is a queue mechanic, not a product-level flash sale with a start/end window | Add a scheduled price override on a product/menu item with an end time. Deps: none. **Next:** reuse the discount-schedule shape rather than inventing a second discount model |

---

## B. Revenue Features

| ID | Feature / description | Status | FE | BE | % | Pri | Cx | Issues found | Required work · dependencies · next step |
|---|---|---|---|---|---|---|---|---|---|
| RV-11 | **Featured business placement on the map** | Partial | ✗ | ✅ | 50 | P1 | M | Backend complete: `POST /placements/featured`, `featured_hub`/`featured_product` kinds, budget + CPM, disclosure labelling, `AD_MAX_SHARE_OF_FEED` cap, and a real Trending boost ([livemap.service.ts:430](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/livemap/livemap.service.ts#L430)). **No UI at all** — endpoints are in `endpoints.ts:194-197` and referenced by exactly one query key and zero components | Build the promote flow + the map/feed ad slot renderer with its required disclosure label. Deps: none. **Next:** this is the cheapest unlocked revenue in the repo — do it first |
| RV-12 | **Sponsored search results** | Partial | ✗ | ◐ | 30 | P2 | M | `sponsors` module serves and counts impressions; paid boost is wired into **Trending**, not into search/list results | Extend placement serving to the discovery list and map-list surfaces. Deps: RV-11 UI. **Next:** bundle with RV-11 |
| RV-13 | **Premium verified badge subscription** | Partial | ◐ | ✅ | 60 | P2 | S | Plan defined (`verified_badge`, $9.99, [constants.ts:538](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L538)) and purchasable via `/seller/membership`. Could not confirm the badge is actually **rendered** on pins or profiles — no badge component found tied to the subscription | Verify and, if absent, render the badge on profile + map pin. Deps: none. **Next:** grep the pin renderer for a verified state; build if missing |
| RV-14 | **Monthly Pro business accounts** | Complete | ✅ | ✅ | 100 | — | — | `pro` at $29.99, inside the spec's $19.99–$99 band; six plans total; `/seller/membership` + `/seller/plan` pages; cancel path | Maintain |
| RV-15 | **Transaction processing fees** | Complete | ✅ | ✅ | 100 | — | — | Full registry (§31–§34) with launch flags; itemized checkout | Maintain |
| RV-16 | **Booking/service fees** | Partial | ◐ | ◐ | 40 | P2 | S | Bookings charge `price_cents`; no platform fee is applied to a booking. `FEE_TYPES` has no `booking` type | Add a `booking` fee type and apply it at booking settlement. Deps: fee registry (done — this is a config + one call site). **Next:** small, high-value; schedule early |
| RV-17 | **Advertising dashboard for businesses** | Missing | ✗ | ✅ | 40 | P1 | M | `GET /placements/mine`, `POST /placements/campaigns`, `POST /placements/:id/pause`, `POST /placements/:id/click` all exist. No dashboard page exists in `app/(dashboard)/` or `app/(seller)/` | Build a campaign list + create + pause + spend/impressions/clicks view. Deps: RV-11. **Next:** one page covers RV-11, RV-17, RV-18 |
| RV-18 | **Local banner ads** | Partial | ✗ | ✅ | 50 | P1 | M | `AD_PLACEMENTS = ['map_banner','discovery_card','earn_slot']` with per-placement CPM ([constants.ts:663](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L663)); creative fields, geo/category targeting, prepaid budget. No renderer | Build the three placement renderers with disclosure labels. Deps: RV-11. **Next:** bundle |
| RV-19 | **Video ads before viewing profiles** | Missing | ✗ | ✗ | 0 | P3 | M | No video creative field; `image_url` only. Also a UX risk — an interstitial before a profile is the single most reliable way to make discovery feel hostile | Add video creative + a frequency cap if pursued. **Next:** recommend declining, or capping at one per session |
| RV-20 | **AI marketing assistant subscription** | Partial | ◐ | ✅ | 70 | P2 | M | Plan `ai_assistant` ($19.99) exists; the AI module is substantial (coach plans, pricing suggestion, sales coaching, recommendations, Gemini narration over a deterministic engine). Marketing *copy generation* specifically is not a distinct surface | Add a marketing-copy generator gated on the plan. Deps: `ai` module (done). **Next:** confirm the plan actually gates the existing AI endpoints |

---

## C. Customer Features

| ID | Feature / description | Status | FE | BE | % | Pri | Cx | Issues found | Required work · dependencies · next step |
|---|---|---|---|---|---|---|---|---|---|
| CU-21 | **"Wave Down" live request button** | Complete | ✅ | ✅ | 100 | — | — | `wave_downs` with SLA sweep every 30 s, accept/decline, `/business/[id]/wave` + `/wave/[id]` | Maintain |
| CU-22 | **Live GPS tracking** | Complete | ✅ | ✅ | 100 | — | — | Live sessions with heartbeat, TTL staleness sweep, geohash bucketing, socket layer | Maintain |
| CU-23 | **ETA countdown** | Partial | ◐ | ◐ | 60 | P2 | S | `eta_seconds` is captured on wave-down accept ([queue.model.ts:46](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/queue/queue.model.ts#L46)) and pushed in the notification. There is no ETA on a *live session* — a customer watching a truck drive toward them sees no arrival estimate | Derive session ETA from live position + destination. Deps: livemap (done). **Next:** cheap win on the map sheet |
| CU-24 | **Push notifications when favorites are nearby** | Complete | ✅ | ✅ | 100 | — | — | `proximity-alert-eval` every 60 s, `POST /live-sessions/:id/notify-me`, web-push tokens, preferences | Maintain |
| CU-25 | **Route alerts** | Partial | ◐ | ◐ | 40 | P2 | M | Proximity alerts fire on position; there is no route/corridor subscription ("tell me when anyone passes down my street") | Add a saved-geometry alert subscription. Deps: CU-24 (reuse the sweep). **Next:** model as a favorite with a geofence rather than a new subsystem |
| CU-26 | **Customer wish lists** | Missing | ✗ | ✗ | 0 | P2 | S | Zero hits for wishlist in either repo | Add a saved-product list + a back-in-stock notification. Deps: notifications (done). **Next:** small; good candidate to pair with MS-8 |
| CU-27 | **Favorite businesses list** | Complete | ✅ | ✅ | 100 | — | — | `POST/DELETE /live-sessions/:id/follow`, `GET /users/me/favorites`, `/favorites` page | Maintain |
| CU-28 | **QR code ordering** | Complete | ✅ | ✅ | 100 | — | — | Rotating HMAC hub tokens ([hubQr.ts](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/hubQr.ts)), job QR, `/pay/[token]`, `QrCheckout.tsx`. The rotating-token design closes the "photograph the poster once" hole | Maintain |
| CU-29 | **Live inventory updates** | Complete | ✅ | ✅ | 100 | — | — | Atomic `quantity_sold` `$inc`, hub inventory map, realtime hub channel | Maintain |
| CU-30 | **Customer reviews with photos** | Partial | ◐ | ◐ | 55 | P2 | S | Reviews are solid and anti-manipulation (one per transaction, unique index). **No photo field** — [reviews.model.ts](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/reviews/reviews.model.ts) has `rating`, `comment`, and nothing else | Add `photos: [String]` + presigned upload + moderation. Deps: `storage` presigned uploads (done). **Next:** ~1 day of work |

---

## D. Business Tools

| ID | Feature / description | Status | FE | BE | % | Pri | Cx | Issues found | Required work · dependencies · next step |
|---|---|---|---|---|---|---|---|---|---|
| BT-31 | **Employee management** | Missing | ✗ | ✗ | 0 | P2 | L | No employee/staff concept. `jobs` is a **gig marketplace** (post, apply, check in/out, no-show), not payroll or staff records. A business has one owner | Add staff records + per-staff roles under a business. Deps: RBAC (extensible). **Next:** decide staff-vs-gig — the `jobs` module may already satisfy the real need |
| BT-32 | **Shift scheduling** | Missing | ✗ | ✗ | 0 | P2 | M | No shifts or rosters. `availability_windows` schedule the *business*, not people | Add shifts on top of BT-31. Deps: BT-31. **Next:** blocked on BT-31 |
| BT-33 | **Sales analytics dashboard** | Complete | ✅ | ✅ | 100 | — | — | `GET /businesses/:id/analytics`, hub + seller analytics services, `/vendor/analytics`, `/hub/analytics`, `/seller/analytics` | Maintain |
| BT-34 | **Expense tracker** | Missing | ✗ | ✗ | 0 | P2 | M | No expense concept anywhere | Add expense entries + categories feeding the tax statement. Deps: `tax` module (done). **Next:** pairs naturally with BT-36 |
| BT-35 | **Mileage tracker** | Missing | ✗ | ✗ | 0 | P2 | M | No mileage concept — notable, because live GPS position history already exists and is the hard part | Derive mileage from live-session tracks with user confirmation. Deps: livemap (done). **Next:** high value-to-effort given the data already exists |
| BT-36 | **Tax report generator** | Complete | ✅ | ✅ | 100 | — | — | `GET /tax/statements/seller`, `/tax/statements/hub/:id`, remittance, `taxStatements.service.ts`, `/seller/tax` | Maintain |
| BT-37 | **Invoice generator** | Missing | ✗ | ✗ | 0 | P2 | M | The only `invoice` hit is inside the Stripe gateway wrapper — no platform invoicing | Add invoice documents from orders/bookings. Deps: orders (done). **Next:** most valuable for the service archetypes (mechanics, detailers) |
| BT-38 | **Inventory management** | Complete | ✅ | ✅ | 100 | — | — | Products, checkouts, holders, inventory map, approval policy, settlements | Maintain |
| BT-39 | **Customer CRM** | Missing | ✗ | ✗ | 0 | P3 | L | No customer records from a vendor's perspective; messaging threads exist but are not a CRM | Add a per-business customer roll-up. Deps: orders + messaging (both done). **Next:** defer |
| BT-40 | **AI business recommendations** | Complete | ✅ | ✅ | 100 | — | — | `GET /ai/recommendations/products`, `/locations`, accept, pricing suggestion, demand forecast, income coach, hub reallocation, `/seller/ai` + `/hub/ai` | Maintain |

---

## E. Community Features

| ID | Feature / description | Status | FE | BE | % | Pri | Cx | Issues found | Required work · dependencies · next step |
|---|---|---|---|---|---|---|---|---|---|
| CM-41 | **Mobile business events calendar** | Complete | ✅ | ✅ | 100 | — | — | `events` module with `GET /events/nearby`, create, cancel | Maintain |
| CM-42 | **Local festivals directory** | Partial | ◐ | ◐ | 50 | P3 | S | `concerts_and_festivals` exists as an AI calendar signal ([constants.ts:999](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L999)) and the events model has festival typing — but there is no browsable directory surface | Add a festivals filter/browse view over `events`. Deps: CM-41. **Next:** small |
| CM-43 | **Vendor meetup networking** | Missing | ✗ | ✗ | 0 | P3 | M | Nothing. `block_party` detects spontaneous vendor clustering — adjacent but not a meetup product | Add vendor-only events. Deps: CM-41. **Next:** defer |
| CM-44 | **Referral rewards** | Partial | ◐ | ◐ | 40 | P2 | M | The one `referral` hit is in `ping.service.ts`. There is no referral code, attribution, or reward payout | Add referral codes + attribution + reward credit. Deps: `growth` (reusable patterns from gifts). **Next:** model on the gift-code flow, which already does code generation and redemption |
| CM-45 | **Charity fundraising days** | Missing | ✗ | ✗ | 0 | P3 | M | Order round-up exists (`round_up_cents`) but has no charity destination | Add a beneficiary + a fundraising event type. Deps: CM-41, round-up (done). **Next:** the round-up plumbing is the hard part and it exists |
| CM-46 | **Business mentorship network** | Missing | ✗ | ✗ | 0 | P3 | L | Nothing. The `academy` module teaches; it does not pair people | Add mentor profiles + matching. Deps: academy, messaging (both done). **Next:** defer |
| CM-47 | **Community voting for favorite vendors** | Missing | ✗ | ✗ | 0 | P3 | M | No voting/poll concept. Reviews are transaction-gated by design, so voting needs its own anti-brigading model | Add a periodic vote with an eligibility rule. **Next:** defer; do not reuse reviews |
| CM-48 | **Emergency roadside assistance directory** | Missing | ✗ | ✗ | 0 | P3 | S | Nothing | A category + filter over existing businesses may be sufficient. Deps: category matrix (done). **Next:** check whether `BUSINESS_CATEGORY_MATRIX.md` already covers roadside |
| CM-49 | **Mobile business insurance marketplace** | Missing | ✗ | ✗ | 0 | P2 | XL | **Deliberately absent.** `stock_waiver` is a contractual **damage waiver**, and the code carries an explicit prohibition on the words "insurance", "policy", "premium", "claim", "covered peril" in user copy ([constants.ts:618](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L618)). Treat this feature as a regulated-broker project, not a build | Requires licensing/broker partnership. **Next:** do not build in-house; the existing prohibition must survive any partnership copy |
| CM-50 | **Financing / small business loan marketplace** | Partial | ◐ | ◐ | 30 | P2 | XL | Adjacent primitives exist: `debt` (seller debt + credit limit), `spot_me` (peer micro-advances with default sweeps), shelter starter grants. None is a lending marketplace, and all of them are lending-adjacent enough to carry regulatory weight | Requires lender partners + licensing review. **Next:** legal review before any product work; the `debt` module is already close enough to lending to warrant it |

---

## F. High-Revenue Ideas

| ID | Idea | Status | FE | BE | % | Pri | Cx | Notes · next step |
|---|---|---|---|---|---|---|---|---|
| HR-1 | Pro Membership $19.99–$99/mo | Complete | ✅ | ✅ | 100 | — | — | `pro` $29.99. See RV-14 |
| HR-2 | Featured listings (daily/weekly fee) | Partial | ✗ | ◐ | 40 | P1 | M | Exists as **CPM**, not the spec's flat $5/$15/$40 day-tiers (§32). Add flat-tier pricing + UI. See RV-11 |
| HR-3 | Sponsored pins on the map | Partial | ✗ | ✅ | 50 | P1 | M | `map_banner` placement + Trending boost, no renderer. See RV-11 |
| HR-4 | Marketplace transaction fee 3–10% | Complete | ✅ | ✅ | 100 | — | — | 10% default; 8% digital consignment rail |
| HR-5 | Consignment fee | Complete | ✅ | ✅ | 100 | — | — | Rail-differentiated, Trust-discounted, fully settled |
| HR-6 | Rent-to-own service fee | Partial | ✗ | ✅ | 50 | P0 | L | `rto_installment` 10% per payment, locked at acceptance. Unreachable without MS-3 UI |
| HR-7 | Digital advertising | Partial | ✗ | ✅ | 50 | P1 | M | See RV-17/RV-18 |
| HR-8 | Fleet GPS subscription | Missing | ✗ | ✗ | 0 | P3 | L | Single-vehicle live sessions only; no fleet/multi-vehicle entity. Deps: BT-31 |
| HR-9 | Business websites / landing pages | Missing | ✗ | ✗ | 0 | P3 | L | No hosted-page product. Deps: MS-1 |
| HR-10 | Point-of-sale (POS) system | Missing | ✗ | ✗ | 0 | P2 | XL | No POS. `LogSale` + `/hub/station` are the closest analogue and are consignment-specific |
| HR-11 | Payment processing revenue share | Partial | — | ◐ | 50 | P2 | S | `processing` fee type exists as a pass-through; no revenue-share margin is modelled |
| HR-12 | Equipment leasing | Missing | ✗ | ✗ | 0 | P3 | L | `rental` is a declared listing type ([constants.ts:436](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L436)) but only `consignment` is honoured by settlement; the others are gated off. Deps: MS-3 |
| HR-13 | Business insurance referrals | Missing | ✗ | ✗ | 0 | P2 | M | Referral is far safer than the CM-49 marketplace. **Next:** prefer this over CM-49 |
| HR-14 | Fuel discount program | Missing | ✗ | ✗ | 0 | P3 | M | Requires a fuel-network partner |
| HR-15 | Wholesale buying club | Missing | ✗ | ✗ | 0 | P3 | L | Deps: MS-6 |
| HR-16 | Business financing referrals | Missing | ✗ | ✗ | 0 | P2 | M | Referral-only is materially lower-risk than CM-50 |
| HR-17 | AI-powered marketing tools | Partial | ◐ | ✅ | 70 | P2 | M | See RV-20 |
| HR-18 | SMS and email marketing platform | Missing | ✗ | ✗ | 0 | P2 | L | No Twilio/SendGrid/any messaging provider in `integrations/`. In-app + web push only |
| HR-19 | Online booking system | Complete | ✅ | ✅ | 100 | — | — | `scheduling` module + `/vendor/services`, `/vendor/bookings`, `/business/[id]/book`, `/booking/[id]` |
| HR-20 | Customer rewards subscription | Missing | ✗ | ✗ | 0 | P2 | M | All six subscription plans are seller/business-scoped. Deps: MS-8 |

---

## G. Part B — Fees (§31–§34, §57–§59)

| ID | Requirement | Status | FE | BE | % | Pri | Cx | Issues · next step |
|---|---|---|---|---|---|---|---|---|
| S31.1 | 10% marketplace fee on completed sales | Complete | ✅ | ✅ | 100 | — | — | `DEFAULT_CONSIGNMENT_FEE_BPS = 1000` |
| S31.2 | Processing fee charged separately at processor rates | Complete | ✅ | ✅ | 100 | — | — | 2.9% + 30¢, config-overridable, launch-flagged |
| S31.3 | Checkout shows subtotal / tax / delivery / service fee / processing / tip / total | Complete | ✅ | ✅ | 100 | — | — | `OrderBreakdown`; all lines exist, MVP rates zeroed |
| S31.4 | No permanent processing-rate guarantee | Complete | — | ✅ | 100 | — | — | Rate lives in the versioned schedule, not in copy |
| S32.1 | Regular sale: 10% + processing | Complete | ✅ | ✅ | 100 | — | — | |
| S32.2 | Consignment: 10% platform + agreed commission + owner remainder | Complete | ✅ | ✅ | 100 | — | — | Split + settlement + per-leg payout status |
| S32.3 | RTO: 10% per payment + processing + $5–$25 setup + late fee + early-payoff discount | Complete | ✗ | ✅ | 60 | P0 | — | Backend complete; unreachable without MS-3 |
| S32.4 | Waved Down: 10% + customer convenience fee + vendor travel fee, all disclosed pre-confirm | Partial | ◐ | ◐ | 35 | P1 | S | **No convenience fee type exists**; `travel_fee_cents` is stored on the business and never charged. **Next:** add both as fee types and render them in the wave confirmation |
| S32.5 | Promoted product: $5/1d, $15/7d, $40/30d flat tiers | Missing | ✗ | ✗ | 10 | P1 | M | CPM only. **Next:** add flat duration tiers alongside CPM |
| S33 | Optional customer service fee 3% / min $0.50 / max $10, displayed pre-payment; may be off at launch | Complete | ✅ | ✅ | 100 | — | — | Exactly as specified, and off by default |
| S34 | Worked $100 example; tips to the seller minus unavoidable processing | Complete | — | ✅ | 100 | — | — | Matches `computeOrderBreakdown`; tips are pass-through and never fee'd |
| S57.1 | Seller fee calculator: price, fee, processing, commission, tax, payouts, customer total | Partial | ◐ | ✅ | 70 | P2 | S | `FeeCalculator.tsx` covers price/split/net/fee/hub share; tax and customer-total rows not shown |
| S57.2 | Calculator RTO rows: initial, installment, count, total, payoff, fee/payment, expected earnings | Missing | ✗ | ◐ | 15 | P1 | S | Server math exists in `rto.pricing.ts`; the component header still says "reserved for Phase 3". **Next:** wire `POST /rto/disclose` into the calculator |
| S58 | Refund/fee policy: fee returned on full pre-fulfilment cancel; proportional on partial; processing non-refundable; tips returned on full cancel; chargebacks deductible | Needs Fixing | ✅ | ◐ | 80 | P1 | S | `processingRetainedCents` hardcoded `0` in all three branches ([refundPolicy.ts:60](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/refundPolicy.ts#L60), [:79](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/refundPolicy.ts#L79), [:94](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/refundPolicy.ts#L94)) while the header claims it makes the disclosure honest. See F-1 |
| S59 | Launch structure summary | Complete | ✅ | ✅ | 100 | — | — | Every stated default matches the constants |

---

## H. Part B — Consignment terms (§35–§41)

| ID | Requirement | Status | FE | BE | % | Pri | Cx | Issues · next step |
|---|---|---|---|---|---|---|---|---|
| S35.1 | Durations 7/14/30/60/90/180/365 | Complete | ✅ | ✅ | 100 | — | — | `CONSIGNMENT_TERM_DAYS` |
| S35.2 | Custom end date | Partial | ◐ | ◐ | 50 | P3 | S | `term_days` is free-form on the product but `extendTerm` validates against the enum + `no_limit`. **Next:** accept an explicit end date |
| S35.3 | No fixed time limit | Complete | ✅ | ✅ | 100 | — | — | `term_days: null` |
| S35.4 | Duration accepted by both parties before transfer | Complete | ✅ | ✅ | 100 | — | — | Hub approval gate (`pending_approval` → `approved_at`) |
| S36 | 30-day default | Complete | ✅ | ✅ | 100 | — | — | |
| S36.2 | At term end: change the commission | Missing | ✗ | ✗ | 0 | P2 | S | Extend and reduce-price exist; commission change does not. **Next:** small addition to the extend flow |
| S37.1 | No-limit continues until sold/recalled/ended/etc. | Complete | — | ✅ | 100 | — | — | |
| S37.2 | Either party may terminate on advance notice: 3 / 7 / 14–30 days by value | Missing | ✗ | ✗ | 0 | P1 | M | `endConsignment` ends immediately **and is seller-only** — the owner cannot terminate. See F-2. **Next:** add `termination_notice_days` to the terms snapshot and a scheduled effective date |
| S38.1 | Notices at 14 / 7 / 3 / 0 days | Complete | ✅ | ✅ | 100 | — | — | Daily sweep, idempotent |
| S38.2 | Five notice actions offered | Complete | ✅ | ✅ | 100 | — | — | All five endpoints exist |
| S38.3 | No auto-renew unless previously agreed | Complete | — | ✅ | 100 | — | — | Satisfied *by absence* — nothing renews |
| S39 | Optional automatic renewal (7/30/60/90/monthly/until-sold), pre-notified, cancellable | Missing | ✗ | ✗ | 0 | P2 | M | Zero hits for `auto_renew` in either repo. **Next:** add the flag to the terms snapshot + a pre-renewal notice in the existing sweep |
| S40 | Unsold → Return-Pending; responsibility, window, storage fees, abandonment; never auto-keep | Complete | ✅ | ✅ | 100 | — | — | All six fields present and bounded 7–14 days |
| S41 | Pricing controls incl. minimum authorized price | Complete | ✅ | ✅ | 100 | — | — | `seller_permissions` + floor, snapshotted |

---

## I. Part B — Rent-to-Own (§42–§53)

| ID | Requirement | Status | FE | BE | % | Pri | Cx | Issues · next step |
|---|---|---|---|---|---|---|---|---|
| S42.1 | Customer uses the product while paying toward ownership | Partial | ✗ | ✅ | 50 | P0 | L | Backend complete, no acceptance UI |
| S42.2 | Ownership retained until conditions satisfied | Complete | — | ✅ | 100 | — | — | `ownership_transferred_at` gated on completion |
| S42.3 | Approved sellers + eligible categories only | Complete | ✗ | ✅ | 60 | P1 | S | `rto_seller_approvals` + city feature flag. No admin UI to grant approval |
| S43 | Eligible product examples; restrict unsafe/regulated; vehicles excluded | Partial | ✗ | ◐ | 40 | P1 | M | Approval + city gating exist; **no category allow/deny list for RTO**. §43's explicit vehicle exclusion is not encoded. **Next:** add an RTO category allowlist — this is a compliance control, not a nicety |
| S44 | Listing shows all 22 disclosure fields | Partial | ✗ | ✅ | 50 | P0 | M | `disclose` returns the money fields; maintenance/damage/return-rights/cancellation prose lives only in the placeholder agreement. **Next:** MS-3 UI + real §60 text |
| S45.1 | Six payment frequencies | Complete | ✗ | ✅ | 60 | P1 | — | `RTO_FREQUENCIES` |
| S45.2 | Dashboard: next due, amount, balance, paid/remaining count, total paid, ownership % | Complete | ✅ | ✅ | 100 | — | — | `RtoDashboard.tsx` + `getDashboard` |
| S46 | Terms 30 d – 24 mo; no unlimited RTO | Complete | — | ✅ | 100 | — | — | `RTO_MAX_INSTALLMENTS = 104` bounds it |
| S47 | Worked example; customer must see total may exceed cash price | Complete | ✗ | ✅ | 60 | P0 | — | The disclosure string is written and says exactly this — but no screen renders it |
| S48 | Early purchase / payoff; formula immutable after acceptance | Complete | ✅ | ✅ | 100 | — | — | `POST /:id/payoff`; terms frozen on the agreement |
| S49 | Grace periods 3/5/7–10 d; reminders before/on/during/late/pre-recovery | Partial | ✗ | ◐ | 60 | P1 | S | `RTO_GRACE_DAYS` matches the spec; the hourly sweep escalates Grace→Late. Could not confirm all five reminder stages fire — pre-recovery in particular has no recovery action to precede |
| S50.1 | Eleven-state missed-payment lifecycle | Needs Fixing | ✗ | ◐ | 35 | P1 | M | Five of nine declared statuses are unreachable. See F-3 |
| S50.2 | Seven seller remedies | Missing | ✗ | ✗ | 0 | P1 | M | No endpoints for extra time, partial payment, date move, catch-up schedule, pause, request return, reinstate |
| S51 | Voluntary return with refundability, restocking, transport, condition, reinstatement, credit preservation disclosed | Missing | ✗ | ✗ | 0 | P1 | M | Nothing. **Next:** this is the customer-protection half of RTO and should not launch without it |
| S52.1 | Delivery condition report | Partial | ✗ | ◐ | 40 | P1 | S | Photos + serial captured at acceptance. Missing: video, existing damage, accessories, estimated value, dual acknowledgment |
| S52.2 | Return condition report | Missing | ✗ | ✗ | 0 | P1 | S | `condition_return` declared, never written. See F-4 |
| S53 | Nine-step ownership transfer | Complete | ✗ | ✅ | 60 | P1 | S | `completeAndTransfer` covers paid-in-full, receipt, notifications, ownership record, proof doc, closing autopay. Feedback request not confirmed |

---

## J. Part B — Consignment Rent-to-Own (§54–§56)

| ID | Requirement | Status | FE | BE | % | Pri | Cx | Issues · next step |
|---|---|---|---|---|---|---|---|---|
| S54 | Three-party agreement with all ten responsibilities defined | Partial | ✗ | ◐ | 35 | P1 | L | Data model supports it (`is_consignment`, `owner_id`, `owner_type`, `commission_bps`); the ten responsibility terms live only in placeholder agreement text; no creation path exists |
| S55 | Payment split owner / managing business / platform / processor | Complete | ✗ | ✅ | 60 | P1 | — | `recordSplit` + immutable `rto_statements` rows per party |
| S56.1 | Automatic split of owner, commission, platform fee, processing, tax, delivery, refund, balance | Partial | ✗ | ◐ | 60 | P2 | M | Owner / commission / platform / processor are computed. Tax, delivery, and refund legs are not split |
| S56.2 | Each party receives an electronic statement | Complete | ✅ | ✅ | 100 | — | — | `GET /rto/agreements/:id/statements` + `useRtoStatements` |
| S56.3 | Payouts may be delayed until funds clear | Complete | — | ✅ | 100 | — | — | `funding_source` + `awaiting_funds` + `payout-retry` sweep |

---

## K. Part B — Agreements (§60)

| ID | Requirement | Status | FE | BE | % | Pri | Cx | Issues · next step |
|---|---|---|---|---|---|---|---|---|
| S60.1 | Four separate digital agreements | Complete | ✅ | ✅ | 100 | — | — | `AGREEMENT_TYPES`, versioned + sha256-hashed + tamper-evident acceptance |
| S60.2 | **Attorney review before launch** | Missing | — | ✗ | 0 | **P0** | — | All four bodies are 3–4 lines of self-declared placeholder text. **Hard launch blocker for RTO, consignment, and consignment-RTO** |
| S60.3 | RTO limited to approved sellers and approved locations initially | Complete | ✗ | ✅ | 60 | P1 | S | Seller approval table + city feature flag. No admin UI to manage either |
