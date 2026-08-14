# Missing Features

Requirements the specification states that **have no implementation in either repo**. Each entry was verified by grep across `STREET-SERVE-APPLICATION/src` and `STREET-SERVE-APPLICATION-BACKEND/src`; "zero hits" below means exactly that.

45 items. Ordered by priority, then by group.

> **Update 2026-08-01.** Track B closed **M-7, M-11, M-12** and P-18; building it exposed that
> **placements were never charged for at all**, now fixed. Track A closed **M-2, M-9, M-10** — the
> RTO listing/disclosure/acceptance stack, the §43 default-deny category allowlist, and the admin
> compliance screen. Building Track A exposed three more: agreement terms were **customer-authored**
> with no seller consent, the §60.3 city gate was documented and never checked, and category
> eligibility was allow-by-default. All three are fixed.
>
> Track C closed **M-6, M-8, M-13, M-14, M-15** — §37 termination notice, §32.4 convenience fee,
> §39 auto-renewal, §36 commission change, and the §32 booking fee.
>
> **M-1 (attorney-reviewed agreement text) remains the blocker.** RTO acceptance is now refused at
> runtime until it returns — the code ships, the product stays closed.

---

## P0 — Launch blockers

### M-1 · Attorney-reviewed agreement text (§60)

**What's specified:** four separate digital agreements — regular seller participation, consignment, rent-to-own, consignment rent-to-own — reviewed by a qualified attorney before launch, because RTO, installment payments, late charges, consumer disclosures, repossession, taxes, lending classification, and consignment requirements differ by state and product category.

**What exists:** the *framework* is complete and well built. `AGREEMENT_TYPES` ([agreements.registry.ts:10](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/agreements/agreements.registry.ts#L10)) defines all four; each is versioned, its body is sha256-hashed, and acceptance stores version + hash so it is tamper-evident. Swapping in final text is a one-line change per agreement.

**What's missing:** the text. All four bodies are three or four sentences that say, in the source itself, `PLACEHOLDER — pending legal review, spec §60`.

**Why this blocks:** a rent-to-own agreement is a consumer credit-adjacent instrument. Launching one on placeholder terms exposes the platform in every state it operates in and gives customers no enforceable statement of their rights — which is the specific harm §44, §48, §51, and §52 are written to prevent.

**Dependencies:** none technical. **Complexity:** S to integrate, external to produce. **Next step:** send the four placeholder bodies to counsel as a scoping brief; they already enumerate the obligations each agreement must cover.

---

### M-2 · Rent-to-own agreement creation and acceptance UI (§42, §44, §47)

**What's specified:** a customer sees the full cost — cash price, initial payment, payment amount and frequency, number of payments, total cost to own, rental vs ownership split per payment, fees, taxes, late terms, grace period, early payoff, return rights, cancellation terms — and *then* accepts.

**What exists:** `POST /rto/disclose` returns every money field plus the plain-language line *"Rent-to-own may cost more than buying outright"* ([rto.service.ts:66](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/rto/rto.service.ts#L66)). `POST /rto/agreements` creates and locks the agreement. The React hook to call the disclosure is written: `useRtoDisclosure` ([useRto.ts:16](../../src/features/rto/hooks/useRto.ts#L16)).

**What's missing:** any component that calls it. `features/rto/components/` contains exactly one file, `RtoDashboard.tsx`, which serves an agreement that already exists. There is no route to reach agreement creation, no seller-side RTO listing form, and no agreements list page. **`POST /rto/agreements` is unreachable from the product.**

**Why this blocks:** the entire RTO revenue line (HR-6, §32.3, `rto_installment` 10%/payment) produces zero revenue until a customer can sign. This is the single largest gap between what is built and what is usable.

**Dependencies:** M-1 (real agreement text must render on the acceptance screen). **Complexity:** L. **Next step:** wireframe the §44 disclosure screen against the existing `RtoDisclosure` response shape — no backend work is required to start.

---

## P1 — High

### M-3 · RTO voluntary return (§51)

Zero endpoints, zero UI. The specification requires the agreement to disclose whether prior payments are refundable, whether they are treated as rent, whether a restocking fee applies, who pays return transport, required condition, reinstatement rights, and whether ownership credit is preserved — and requires that the customer is **not** told prior payments create ownership unless the agreement grants credit.

This is the customer-protection half of rent-to-own. RTO should not launch without it. **Complexity:** M. **Deps:** M-1, M-2. **Next:** model the return as a status transition into `return_pending` (the enum value already exists) plus a settlement of ownership credit.

### M-4 · RTO seller remedies on a missed payment (§50)

The specification lists seven actions a seller may take: give additional time, accept a partial payment, move the payment date, create a catch-up schedule, pause the agreement, request return, reinstate after payment. **None has an endpoint.** The hourly sweep can move an agreement Grace → Late and no further.

The consequence is that the only outcome available to a struggling customer is delinquency, which is the opposite of the specification's closing instruction that *"Street Serves should encourage communication before cancellation."* **Complexity:** M. **Deps:** M-2. **Next:** implement `pause` and `arrangement` first — they unblock two dead enum values and cover most real cases.

### M-5 · RTO return condition report (§52)

`condition_return` is declared in the schema ([rto.model.ts:57](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/rto/rto.model.ts#L57)) and written by no code path. Without it there is no evidence baseline when a returned item is disputed, which is the exact risk §52 exists to manage — for both parties. **Complexity:** S. **Deps:** M-3. **Next:** reuse the delivery-report capture; the storage presign path already exists.

### M-6 · Consignment termination notice periods (§37)

The specification requires either party to be able to terminate a no-limit consignment on advance notice — 3 days for low-value goods, 7 for standard, 14–30 for expensive or specialized — and requires the agreement to state the exact period.

There is no `termination_notice_days` field, no scheduled effective date, and `endConsignment` ([consignment.service.ts:1674](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.service.ts#L1674)) terminates immediately. It is also seller-only — see defect **F-2**, because the owner-side gap is a defect rather than an omission. **Complexity:** M. **Next:** add the notice period to the terms snapshot alongside `return_window_days`, which is already snapshotted the same way.

### M-7 · Promoted-product flat pricing tiers (§32)

Specified: $5 for one day, $15 for seven days, $40 for thirty. Implemented: prepaid CPM campaigns with per-placement rates ([ads.model.ts:53](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ads/ads.model.ts#L53)).

CPM is the more sophisticated model and should stay. But a street vendor deciding whether to spend $5 today cannot price a CPM campaign, and the spec's tiers are the accessible on-ramp. **Complexity:** M. **Next:** add duration tiers that translate to a bounded CPM budget internally — one pricing surface, two purchase experiences.

### M-8 · Waved Down convenience fee (§32)

The specification allows a customer convenience fee on a Wave Down, disclosed before the customer confirms. `FEE_TYPES` has no such type, and no wave-down path applies one. **Complexity:** S — the fee registry makes this a config entry plus one call site. **Next:** add `wave_convenience` to `FEE_TYPES` and surface it in the wave confirmation sheet.

### M-9 · RTO product category allow/deny list (§43)

The specification requires restricting products that are illegal, unsafe, heavily regulated, or unsuitable, and states explicitly that **vehicles and other specially regulated products must not use the standard RTO system**.

Seller approval (`rto_seller_approvals`) and city feature-flagging both exist. Category gating does not. A seller approved for furniture is, today, equally approved for a motorcycle. This is a compliance control, not a nicety. **Complexity:** M. **Next:** add an RTO category allowlist checked in `accept`, defaulting to deny — matching the default-deny pattern already used for food gating.

### M-10 · Admin UI for RTO seller approval and city flags (§42, §60.3)

`POST /rto/approvals` exists; nothing in `app/(admin)/` calls it. Approvals must be granted by direct database or API access today. **Complexity:** S. **Deps:** M-2.

### M-11 · Advertising dashboard (RV-17)

Six working endpoints — `GET /placements/mine`, `POST /placements/campaigns`, `POST /placements/featured`, `POST /placements/:id/pause`, `GET /placements/serve`, `POST /placements/:id/click` — and no page. Verified: the only frontend reference to any of them is a single unused query key at [keys.ts:107](../../src/lib/query/keys.ts#L107). **Complexity:** M. **Next:** one dashboard page covers M-11, M-12, and RV-11 together.

### M-12 · Ad placement renderers (RV-18)

`map_banner`, `discovery_card`, and `earn_slot` are defined with per-placement CPM and a hard `AD_MAX_SHARE_OF_FEED` cap. No component renders any of them, so impressions are never served, never billed, and the disclosure label the backend insists on is never shown. **Complexity:** M. **Deps:** M-11.

---

## P2 — Medium

### M-13 · Consignment automatic renewal (§39)

Renew for 7/30/60/90 days, month-to-month, or until sold; notify both parties before renewal; either party may turn it off before the renewal date. **Zero hits for `auto_renew` in either repo.** The spec's §38.3 requirement — *no* auto-renewal unless previously agreed — is satisfied today only because nothing renews at all. **Complexity:** M. **Next:** add the flag to the terms snapshot and a pre-renewal notice to the existing daily expiry sweep, which already has the right cadence and idempotency.

### M-14 · Consignment commission change at term end (§36)

The spec lists changing the commission among the end-of-term options. Extend and reduce-price exist; commission change does not. **Complexity:** S.

### M-15 · Booking/service platform fee (RV-16)

Bookings charge the vendor's `price_cents` and the platform takes nothing. No `booking` fee type exists. Given the fee registry, this is a config entry plus one settlement call. **Complexity:** S. **Note:** unusually high revenue-per-hour-of-work; consider promoting to P1.

### M-16 · Customer wish lists (CU-26)

Zero hits. **Complexity:** S. Pairs naturally with a back-in-stock notification, for which the notification infrastructure already exists.

### M-17 · Loyalty rewards program (MS-8)

Zero hits for loyalty, points, or punch-card. **Complexity:** M. **Next:** stamps are cheaper to build and far easier to explain than points.

### M-18 · Customer recurring subscriptions (MS-9)

The `subscriptions` module is seller/business plans only. No recurring customer purchase exists. **Complexity:** L. **Deps:** scheduled fulfilment (see PARTIAL P-2).

### M-19 · Customer rewards subscription (HR-20)

All six plans in `SUBSCRIPTION_PLAN_DEFS` are seller- or business-scoped. **Deps:** M-17.

### M-20 · Referral rewards (CM-44)

No referral code, attribution, or reward payout. **Complexity:** M. **Next:** the gift-code flow already does code generation, redemption, and expiry — copy its shape rather than starting fresh.

### M-21 – M-26 · Business back-office tooling

Six specified tools with no implementation anywhere:

| ID | Feature | Cx | Note |
|---|---|---|---|
| M-21 | Employee management (BT-31) | L | `jobs` is a gig marketplace, not staffing. Confirm which one the business actually needs before building |
| M-22 | Shift scheduling (BT-32) | M | Blocked on M-21 |
| M-23 | Expense tracker (BT-34) | M | Feeds the existing tax statement |
| M-24 | Mileage tracker (BT-35) | M | **Best effort-to-value ratio here** — live GPS tracks already exist; this is derivation plus confirmation UI |
| M-25 | Invoice generator (BT-37) | M | Most valuable to service archetypes (mechanics, detailers, groomers) |
| M-26 | Customer CRM (BT-39) | L | Orders + messaging supply the data; only the roll-up is missing |

### M-27 · SMS and email marketing platform (HR-18)

No Twilio, SendGrid, Postmark, or any messaging provider in `integrations/`. The platform reaches users only through in-app notifications and web push. **Complexity:** L. **Note:** this is also a latent operational risk — there is currently no channel to reach a user who has disabled push.

### M-28 · Point-of-sale system (HR-10)

No POS. `LogSale.tsx` and `/hub/station` are the nearest analogue and are consignment-specific. **Complexity:** XL.

### M-29 · Business insurance referrals (HR-13) and M-30 · Business financing referrals (HR-16)

Both missing. Both are materially lower-risk than the corresponding *marketplaces* (CM-49, CM-50) and capture much of the same value. **Recommendation:** build the referral versions; do not build the marketplaces in-house.

### M-31 · Payment-processing revenue share (HR-11)

`processing` exists as a pure pass-through. No margin is modelled. **Complexity:** S if pursued — but note that marking up a disclosed pass-through fee sits uneasily with §31's transparency framing. Flagging as a decision, not a task.

---

## P3 — Low / deferred

| ID | Feature | Spec ref | Cx | Note |
|---|---|---|---|---|
| M-32 | Used equipment marketplace | MS-5 | M | Needs condition grading; deps MS-1 |
| M-33 | Video ads before profiles | RV-19 | M | **Recommend declining.** An interstitial before a profile is the most reliable way to make discovery feel hostile. If pursued, cap at one per session |
| M-34 | Vendor meetup networking | CM-43 | M | `block_party` detection is adjacent |
| M-35 | Charity fundraising days | CM-45 | M | Order round-up plumbing already exists; only a beneficiary is missing |
| M-36 | Business mentorship network | CM-46 | L | Academy + messaging supply the parts |
| M-37 | Community voting | CM-47 | M | Needs its own anti-brigading model; do **not** reuse transaction-gated reviews |
| M-38 | Roadside assistance directory | CM-48 | S | May already be satisfiable as a category filter — check `BUSINESS_CATEGORY_MATRIX.md` first |
| M-39 | Fleet GPS subscription | HR-8 | L | Needs a multi-vehicle entity; deps M-21 |
| M-40 | Business websites / landing pages | HR-9 | L | Deps MS-1 storefronts |
| M-41 | Equipment leasing | HR-12 | L | `rental` listing type is declared but gated off; only `consignment` is honoured by settlement |
| M-42 | Fuel discount program | HR-14 | M | Requires a fuel-network partner |
| M-43 | Wholesale buying club | HR-15 | L | Deps MS-6 |
| M-44 | RTO custom end date for consignment terms | §35.2 | S | `extendTerm` validates against the enum; an explicit date is not accepted |
| M-45 | Tax / delivery / refund legs in the consignment-RTO split | §56.1 | M | Owner, commission, platform, and processor legs are computed; the other three are not |

---

## Explicitly *not* recommended

**CM-49 · Mobile business insurance marketplace.** The codebase contains a deliberate, well-reasoned prohibition: `stock_waiver` is a contractual **damage waiver**, and [constants.ts:618](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L618) forbids the words *insurance, policy, premium, claim, covered peril* in user copy. Building an insurance marketplace means becoming or partnering with a licensed broker. Recommend M-29 (referrals) instead, and ensure any partner's copy does not erode the existing waiver/insurance distinction.

**CM-50 · Financing / small business loan marketplace.** The `debt` module (seller debt, credit limits, escalation) and `spot_me` (peer micro-advances with default sweeps) are already close enough to lending to warrant a regulatory review on their own merits, independent of this feature. Recommend M-30 (referrals) and a legal review of what already ships.
