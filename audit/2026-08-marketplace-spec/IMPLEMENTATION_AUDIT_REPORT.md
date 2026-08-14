# StreetServe — Implementation Audit Report

**Audit date:** 2026-08-01
**Specification under audit:** the pasted "Street Serves" document — Part A (50 features + 20 high-revenue ideas) and Part B (§31–§60: marketplace fees, consignment terms, rent-to-own).
**Repos audited:**
- Frontend — `c:\Users\HP\STREET-SERVE-APPLICATION` (Next.js App Router PWA)
- Backend — `c:\Users\HP\STREET-SERVE-APPLICATION-BACKEND` (Express + Mongoose + BullMQ)

**Method:** every requirement extracted from the specification was traced to concrete source. Claims below cite `file:line`. Where a requirement could not be traced to source it is recorded as **Missing** or **Could not be confirmed** — never assumed complete.

> ### Update — 2026-08-01: roadmap Phase 1 is complete
>
> Five of seven defects are fixed (F-1, F-2, F-5, F-6, F-7), plus **three more found while fixing
> F-1** — all in the same family: money arithmetic that was correct only because the customer-facing
> fees were switched off. The §44/§54 structuring decision is made and the legal brief is ready to
> send. F-3 and F-4 remain open by design; they need the Phase 3 return flow to exist first.
>
> **Tracks A and B are also complete.** Track A (rent-to-own) is built end to end — browse, §44
> disclosure, §47 acceptance, agreements list, seller listing manager, and the `/admin/rto`
> compliance screen — and **acceptance is gated closed at runtime until M-1 (attorney text)
> returns**, so the code ships without the legal exposure. Building it exposed three holes the audit
> had not caught: agreement terms were **customer-authored** with no seller consent, the §60.3 city
> gate was documented and never checked, and §43 category eligibility was allow-by-default.
>
> **Track B (paid placements) is also complete.** Building it surfaced the gap that made the whole
> track necessary: **placements charged nothing.** `ads.service.ts` had zero payment references
> despite claiming budgets were "prepaid", `settleImpressions` was never scheduled, and no code
> closed a campaign when its window passed — so the ad product accrued impressions and no revenue.
> Placements are now created unpaid and activate only when the charge settles.
>
> **Track C (consignment + platform) is complete too** — §36 commission change, §37 termination
> notice, §39 auto-renewal, the §32 booking fee, and the §32.4 convenience fee. Ending a
> consignment now gives notice rather than ending it, which is what makes §37's periods mean
> anything.
>
> **Phase 3 is complete too** — §51 voluntary return, §50's seven seller remedies, §52's two
> condition reports with dual acknowledgment, §49's five reminder stages, §56.1's remaining split
> legs, review photos with moderation, the live ETA, and the verified badge. **F-3 and F-4 are now
> closed: no unreachable enum values remain**, which was the last of the seven audited defects.
>
> **Phase 4 (architecture) is complete** — A-1, A-2, A-5, A-7, A-8, A-10. The two *gates* mattered
> more than the refactors: they found 27 endpoints with no caller, 39 routes with no test, and 15
> declared-but-unwritten enum values, none of which anyone was looking for. The most serious is
> `Refund.status.failed` — a failed Stripe refund leaves the row `pending`, so **a customer can
> appear refunded when they are not**. New debt items D-13 and D-14 record the inventories.
>
> **Phase 5 (performance) is complete too** — Redis-backed fee cache with pub/sub invalidation,
> perf budgets and Lighthouse actually run and recorded, sweep capacity modelled and instrumented,
> and three missing indexes found and fixed. The traffic-dependent half of the index review is
> explicitly deferred rather than guessed.
>
> **Phase 6 (security) is complete too** — a CVE gate scoped to the production tree with expiring
> exceptions, a secret-management review, 19 adversarial money-path attacks, real audit-log
> retention, and a dated sunset for the static hub QR. The attacks found one real defect: two money
> routes honoured an idempotency key without comparing the request body, so a replay with a
> different amount silently returned the original result.
>
> **Phase 7 (UX) is complete** — the ten features plus the outbound notice channel (A-9), which
> closes the last of this report's architectural recommendations except A-4. Contractual notices
> (§37/§38/§49/§51/§53) now go out on every channel with the attempt recorded immutably, and
> **in-app alone is deliberately not counted as delivered**.
>
> **Phase 8 (production readiness) is complete**, and its result is
> [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md). The checklist pass found six stale entries and
> one requirement that had never been built; the alerting decision was extracted from a BullMQ
> worker so a seeded failure can be *run* rather than only read. **Six items still need a person
> rather than a commit** — chief among them M-1, which remains the single launch blocker.
>
> **Test state now: backend 611/611 (was 343/351), frontend 223/223, both typechecks clean, both
> repos lint clean.** Details in [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) Phases 1–2 and
> [FEATURES_REQUIRING_FIXES.md](FEATURES_REQUIRING_FIXES.md). The body of this report describes the
> state **as audited**, before those fixes.

**Note on file placement:** an earlier audit already occupies `audit/` and uses five of the eleven filenames this brief requires. To avoid destroying that prior work, this audit is written to `audit/2026-08-marketplace-spec/`. Nothing in the existing `audit/` folder was modified.

---

## 1. Executive summary

StreetServe is materially further along than a greenfield audit would expect. The **backend is the strong half of the system**: 37 domain modules, ~200 routes, a double-entry ledger, an immutable RTO ledger, a versioned fee registry, RBAC + idempotency + rate-limiting on the money path, and 29 test files that pass. The specification's *financial* core — §31–§34, §57–§59 — is implemented with real rigour and, in several places, exceeds the spec (rail-differentiated consignment pricing, Trust-band fee discounts, funding-source-aware payouts).

The weakness is **reachability**. Several of the specification's headline products exist as correct backend code that no user can actually reach, because the frontend for them was never built. The clearest case is Rent-to-Own: §42–§53 is implemented server-side to a high standard, but a customer cannot enter an RTO agreement in the product, because the disclosure/acceptance UI does not exist. `useRtoDisclosure` is written and exported ([useRto.ts:16](../../src/features/rto/hooks/useRto.ts#L16)) and consumed by zero components. The same is true of the entire Phase F paid-placement product (§32 promoted products, RV-11/12/17/18): six working endpoints, zero UI.

The second theme is **legal**. All four agreement bodies required by §60 are placeholder text pending attorney review ([agreements.registry.ts:26](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/agreements/agreements.registry.ts#L26)). The framework around them (versioning, sha256 content hashing, tamper-evident acceptance) is done and good. The text is not. RTO, consignment, and consignment-RTO cannot lawfully launch on placeholder agreements.

**Headline numbers (verified, not estimated):**

| Measure | Value |
|---|---|
| Specification requirements extracted | 100 Part A features + 30 Part B sections = **130** |
| Complete | **46** (35%) |
| Partial | **31** (24%) |
| Missing | **45** (35%) |
| Needs Fixing | **7** (5%) |
| Needs Refactoring | **2** (1%) |
| Backend routes implemented | ~200 across 37 modules |
| Frontend routes implemented | 108 pages |
| Frontend tests | 38 files / 182 tests — **all pass** |
| Frontend typecheck | **clean** |
| Backend typecheck | **clean** |
| Backend tests | 29 files / 351 tests — **343 pass, 8 fail** (see §7) |

---

## 2. Verification evidence

Commands run during this audit, and their results:

| Check | Command | Result |
|---|---|---|
| Frontend typecheck | `npx tsc --noEmit` | **PASS** (clean) |
| Backend typecheck | `npx tsc --noEmit` | **PASS** (clean) |
| Frontend unit/component tests | `npx vitest run` | **PASS** — 38 files, 182 tests |
| Backend tests | `npx vitest run` (×2) | **FAIL** — 8 of 351 failed, reproducible; see §7 |

Node is not on the default `PATH` in this environment; all commands required `C:\Program Files\nodejs` to be prepended. This is an environment quirk, not a repo defect, but it does mean `npm run verify` fails out of the box for a new contributor on this machine.

---

## 3. What the specification asks for, and where it lives

### 3.1 Part B — Fees (§31–§34, §57–§59)

The specification's fee model is **implemented as configuration, not code**, which is the right shape. `FEE_TYPES` ([constants.ts:200](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L200)) enumerates ten fee types; `resolveFeeRule` ([fees.ts:68](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/fees.ts#L68)) resolves each from a versioned `fee_schedule` document with a code-level fallback.

Traced against the spec:

- **10% marketplace fee (§31)** — `DEFAULT_CONSIGNMENT_FEE_BPS = 1000` ([constants.ts:192](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L192)). ✅
- **Separate processing fee at processor rates (§31)** — `processing: { rate_bps: 290, flat_cents: 30 }` ([constants.ts:241](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L241)), pass-through, gated by `PROCESSING_FEE_ENABLED`. ✅
- **Itemized checkout: subtotal, tax, delivery, service fee, processing, tip, total (§31)** — every line exists in `OrderBreakdown` ([pricing.ts:33](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/orders/pricing.ts#L33)), computed server-side and shared by the quote and the charge so preview and charge cannot disagree. ✅
- **Customer service fee: 3%, min $0.50, max $10 (§33)** — `customer_service: { rate_bps: 300, min_cents: 50, max_cents: 1000 }` ([constants.ts:239](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L239)), off by default at launch exactly as §33 recommends. ✅
- **RTO 10% per installment + $5–$25 setup fee (§32)** — `rto_installment: { rate_bps: 1000 }`, `RTO_SETUP_FEE_MIN_CENTS/MAX_CENTS` ([constants.ts:492](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L492)). ✅
- **Refund/fee policy (§58)** — `computeRefund` ([refundPolicy.ts:45](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/refundPolicy.ts#L45)) implements all three scenarios the spec describes with plain-language disclosure. ⚠️ One defect — see §5.
- **Seller fee calculator (§57)** — exists for regular/consignment sales ([FeeCalculator.tsx](../../src/features/consignment/components/FeeCalculator.tsx)); the RTO half of §57 is absent, and the file's own header admits it: *"RTO installment rows are reserved for Phase 3."* ⚠️
- **Promoted product flat tiers: $5/1d, $15/7d, $40/30d (§32)** — **Missing.** The ads module prices by CPM with a prepaid budget ([ads.model.ts:53](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ads/ads.model.ts#L53)), not by the spec's flat day-tiers.
- **Waved Down convenience fee + vendor travel fee (§32)** — **Missing on the money path.** `travel_fee_cents` exists on the business record ([vendors.model.ts:34](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/vendors/vendors.model.ts#L34)) but appears nowhere in `modules/orders` or `modules/queue` — it is displayed, never charged. There is no wave-down convenience fee type at all.

### 3.2 Part B — Consignment terms (§35–§41)

Strong, and clearly written against this exact specification (the source comments cite the spec by section).

- **Duration options 7/14/30/60/90/180/365 (§35)** — `CONSIGNMENT_TERM_DAYS` ([constants.ts:411](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L411)). ✅
- **30-day default (§36)** — `DEFAULT_CONSIGNMENT_TERM_DAYS = 30`. ✅
- **No-fixed-limit option (§37)** — `term_days: null` / `expires_at: null` ([consignment.model.ts:151](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.model.ts#L151)); `extendTerm` accepts `'no_limit'`. ✅
- **Expiry notices at 14/7/3/0 days (§38)** — `CONSIGNMENT_EXPIRY_NOTICE_DAYS = [14, 7, 3, 0]` driving a daily sweep ([scheduler.ts:119](../../../STREET-SERVE-APPLICATION-BACKEND/src/jobs/scheduler.ts#L119), `sweepExpiryNotices` at [consignment.service.ts:1701](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.service.ts#L1701)), idempotent via `notices_sent`. ✅
- **Notice actions: extend / return / reduce price / continue open-ended / end (§38)** — all five have endpoints (`/:id/extend`, `/:id/return`, `/:id/reduce-price`, extend-to-`no_limit`, `/:id/end`). ✅
- **Automatic renewal (§39)** — **Missing entirely.** No `auto_renew` field, flag, or job exists in either repo. Grep returns zero hits.
- **Return-Pending on expiry, never auto-keep (§40)** — implemented; `return_pending_at`, `return_responsibility`, `return_window_days` (7–14 bounded), `storage_fee_cents_per_day`, `abandonment_after_days` all present ([consignment.model.ts:161](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.model.ts#L161)). ✅
- **Pricing controls: discount / bundle / accept offers / minimum authorized price (§41)** — `seller_permissions` + `minimum_authorized_price_cents`, snapshotted onto the checkout so mid-term drift cannot re-price a live consignment ([consignment.model.ts:102](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.model.ts#L102)). ✅ Excellent.
- **Termination notice periods, 3 / 7 / 14–30 days (§37)** — **Missing.** `endConsignment` ([consignment.service.ts:1674](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.service.ts#L1674)) terminates immediately with no notice window, and is seller-only: it rejects any caller who is not `checkout.seller_id`, so the **hub/product owner has no way to terminate at all**, which §37 requires to be mutual.
- **Commission change at term end (§36)** — Missing. `extend` and `reduce-price` exist; there is no change-commission path.

### 3.3 Part B — Rent-to-Own (§42–§53)

The backend here is the best-engineered part of the codebase and the least usable part of the product.

**Implemented (backend):**
- Approval-gating to named sellers (§42/§60) — `rto_seller_approvals` + `POST /rto/approvals`. ✅
- Full disclosure quote (§44) — `disclose` returns cash price, initial payment, installment amount/count, total-to-own, cost-over-cash, markup, fee, and the plain-language *"Rent-to-own may cost more than buying outright"* line ([rto.service.ts:66](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/rto/rto.service.ts#L66)). ✅ This is exactly what §44 and §47 demand.
- Payment schedules daily/weekly/biweekly/twice-monthly/monthly/custom (§45) — `RTO_FREQUENCIES` + `RTO_FREQUENCY_DAYS` ([constants.ts:467](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L467)). ✅
- Grace periods 3/5/7 days by frequency (§49) — `RTO_GRACE_DAYS` ([constants.ts:485](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L485)) matching the spec's suggestion exactly. ✅
- Hourly installment sweep + delinquency escalation (§49/§50) — `rto-installments` job ([scheduler.ts:124](../../../STREET-SERVE-APPLICATION-BACKEND/src/jobs/scheduler.ts#L124)). ✅
- Early payoff, locked at acceptance (§48) — `POST /rto/agreements/:id/payoff`; the formula is derived from terms frozen on the agreement, so a seller cannot change it after acceptance as §48 requires. ✅
- Ownership transfer + proof of ownership (§53) — `completeAndTransfer`, `ownership_transferred_at`, `proof_of_ownership_ref`. ✅
- Immutable append-only money record (§56) — `rto_ledger` with `immutablePlugin` and unique idempotency keys ([rto.model.ts:122](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/rto/rto.model.ts#L122)). ✅
- Three-party consignment-RTO split + per-party statements (§54–§56) — `is_consignment`, `owner_id`, `commission_bps`, and immutable `rto_statements` rows per party ([rto.model.ts:144](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/rto/rto.model.ts#L144)). ✅ *at the data layer.*

**Missing:**
- **Any way for a customer to accept an agreement.** Only `RtoDashboard.tsx` exists in `features/rto/components/`. There is no disclosure screen, no acceptance screen, no agreements list, and no seller-side RTO listing creation. `POST /rto/agreements` is unreachable from the product.
- **Voluntary return (§51)** — no endpoint, no refundability disclosure, no restocking-fee handling, no reinstatement.
- **Seller remedies on a missed payment (§50)** — the spec lists seven (extra time, partial payment, move the date, catch-up schedule, pause, request return, reinstate). None have endpoints. The statuses `arrangement`, `paused`, `return_pending`, `cancelled`, `disputed` are declared in the enum ([rto.model.ts:66](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/rto/rto.model.ts#L66)) and **unreachable** — only `active`, `grace`, `late`, `completed` are ever written.
- **Return condition report (§52)** — `condition_return` is declared in the schema and written by nothing. Grep confirms a single writer for `condition_delivery` ([rto.service.ts:152](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/rto/rto.service.ts#L152)) and none for `condition_return`. The spec's video, accessories list, estimated value, and dual acknowledgment fields are absent from both reports.
- **Consignment-RTO listing/creation path** — the model supports it; nothing creates one.
- **RTO rows in the seller fee calculator (§57)** — absent.

### 3.4 Part B — Agreements (§60)

The framework is right and the content is not.

`AGREEMENT_TYPES = ['bailment', 'regular_sale', 'rto', 'consignment_rto']` ([agreements.registry.ts:10](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/agreements/agreements.registry.ts#L10)) is exactly the four separate agreements §60 requires. Each is versioned, sha256-hashed over its exact body, and acceptance stores version + hash so it is tamper-evident. That is better than most platforms manage.

Every one of the four bodies is three or four lines of placeholder text explicitly marked *"PLACEHOLDER — pending legal review, spec §60"*. §60's central instruction — attorney review before launch, because RTO, installment payments, late charges, repossession, and lending classification vary by state — is **not satisfied**.

### 3.5 Part A — the 50 features and 20 revenue ideas

Full per-feature detail is in [FEATURE_COMPLETION_MATRIX.md](FEATURE_COMPLETION_MATRIX.md). Summary by group:

| Group | Complete | Partial | Missing |
|---|---|---|---|
| Marketplace & Sales (10) | 3 | 4 | 3 |
| Revenue Features (10) | 4 | 3 | 3 |
| Customer Features (10) | 7 | 2 | 1 |
| Business Tools (10) | 4 | 1 | 5 |
| Community Features (10) | 2 | 2 | 6 |
| High-Revenue Ideas (20) | 6 | 4 | 10 |

Customer-facing discovery is the most complete surface: Wave Down, live GPS, favorites, proximity push, QR ordering, live inventory, and a genuinely sophisticated Trending ranker are all real. Business back-office tooling is the least complete: there is no employee management, shift scheduling, expense tracking, mileage tracking, invoicing, or CRM anywhere in either repo.

---

## 4. Architecture assessment

**What is right and should not be disturbed:**

- **Money is server-authoritative.** Fee rates are never client-supplied; `resolveOrderFeeRates` reads the registry server-side ([fees.ts:109](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/fees.ts#L109)) and the same `computeOrderBreakdown` serves both quote and charge.
- **Immutability where it matters.** Settlements, the RTO ledger, and RTO statements all carry `immutablePlugin`. Financial history cannot be rewritten.
- **Terms are snapshotted, not referenced.** Consignment checkouts freeze the owner's terms, the seller's Trust band, and the fee discount at pickup ([consignment.model.ts:150](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.model.ts#L150)). A retuned Trust table cannot silently re-price a consignment already in flight. This is a genuinely hard thing to get right and it is right.
- **Funding-source-aware payouts.** `funding_source` and per-leg `seller_payout_status` ([consignment.model.ts:269](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.model.ts#L269)) mean "settled" can never again hide the fact that no money moved.
- **Middleware discipline.** `authenticate` → `requirePermission` → `idempotency` → `validate` is applied consistently on write paths, with a `rateLimit('money')` tier ([orders.routes.ts:22](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/orders/orders.routes.ts#L22)). Helmet, CORS allowlist, and a 1 MB JSON cap are in place, with Stripe webhooks mounted before the JSON parser so signature verification works.
- **Background work is real.** 20 scheduled jobs including reconciliation, ledger integrity, balance monitoring, and the consignment/RTO sweeps.

**What needs attention:**

- **A UI-completeness gate is missing from the delivery process.** Three separate revenue products (RTO, consignment-RTO, paid placements) shipped backend-first and stopped. Nothing in CI catches "endpoint exists, no caller." See [ARCHITECTURAL_IMPROVEMENTS.md](ARCHITECTURAL_IMPROVEMENTS.md) §2.
- **Enum-declared, transition-less states.** The RTO status enum promises a lifecycle the service does not implement. A status enum should not contain values no code path can write.
- **The fee cache is per-process.** `CACHE_TTL_MS = 30_000` in-memory ([fees.ts:33](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/payments/fees.ts#L33)) means N app instances can price differently for up to 30 seconds after a schedule change. The file already flags Redis-backed caching as the follow-up.

---

## 5. Defects found (Needs Fixing)

Seven verified defects, detailed in [FEATURES_REQUIRING_FIXES.md](FEATURES_REQUIRING_FIXES.md). Summary:

| # | Defect | Severity |
|---|---|---|
| F-1 | `processingRetainedCents` is hardcoded `0` in all three refund branches while the disclosure claims to surface retained processor fees — §58's honesty requirement fails the moment `PROCESSING_FEE_ENABLED` is on | High |
| F-2 | `endConsignment` is seller-only; the hub/product owner cannot terminate, contradicting §37's mutual-termination requirement | High |
| F-3 | RTO statuses `arrangement`/`paused`/`return_pending`/`cancelled`/`disputed` are declared and unreachable | High |
| F-4 | `condition_return` is declared and never written — §52's second condition report cannot exist | High |
| F-5 | `travel_fee_cents` is collected from vendors and never charged to customers — §32's travel/delivery fee is display-only | Medium |
| F-6 | 8 of 351 backend tests fail; the suite no longer functions as a regression gate, and is masking two untested access controls | Medium |
| F-7 | `subscriptions-render.test.tsx` asserts "the four subscription plans" while six are defined in `SUBSCRIPTION_PLAN_DEFS` — a stale test that will not catch a plan regression | Low |

---

## 6. Production readiness

Full detail in [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md). Headline: **not launch-ready for the RTO and consignment-RTO products; close to launch-ready for the core marketplace + consignment products**, with the following hard blockers:

1. Attorney-reviewed agreement text for all four types (§60). Legal blocker, not engineering.
2. RTO acceptance UI, or RTO must be feature-flagged off at launch.
3. F-1 refund disclosure accuracy, before any customer-facing processing fee is enabled.

---

## 7. Backend test suite

The backend suite (29 test files, spanning phases 1–8 and A–F plus dedicated `fees`, `refundPolicy`, `rto`, `ledger`, `agreements`, `authz`, and `e2e` suites) was executed twice, with identical results:

> **4 files failed, 25 passed. 8 tests failed, 343 passed (351).** Duration ~5 min.

Backend `tsc --noEmit` is clean. The failures fall into three clusters, analysed in full at [FEATURES_REQUIRING_FIXES.md](FEATURES_REQUIRING_FIXES.md) F-6:

1. **Module resolver defaults changed; tests were not updated (4 failures).** `on_demand_service` now leads with `booking` rather than `wave_down` — a deliberate, documented change at [modules.service.ts:31](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/vendors/modules.service.ts#L31). The tests still assert the old default. The `requireModule` gate failure follows from it: `booking` is now on by default, so the write is legitimately not blocked.
2. **Messaging tests predate a security fix (3 failures).** `startThread` gained a transaction gate closing an "any stranger can message any business" hole. The tests open a thread with no prior booking or order and now correctly receive 403.
3. **Ping tip qualification (1 failure).** `phase5` › `isPaid` expected true, received false. **Root cause not determined** — no corresponding intentional change was found. This one needs triage; an anti-abuse rule silently declining legitimate payouts would be a real defect.

Seven of eight are stale tests trailing intentional changes. The systemic problem is that **a red suite is not a gate** — and it is currently masking two specific holes: the `requireModule` access control and the new messaging gate both have no working test.

---

## 8. Where to start

The dependency-ordered plan is in [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md). The one-line version:

> Fix the six defects, get the agreements to an attorney, then build the three missing frontends (RTO acceptance, paid placements, consignment-RTO) before adding any of the 45 missing Part A features — because those three unlock revenue products that are already paid for and built.

---

## Document index

| Document | Purpose |
|---|---|
| [FEATURE_COMPLETION_MATRIX.md](FEATURE_COMPLETION_MATRIX.md) | Every one of the 130 requirements, with all 12 tracking fields |
| [MISSING_FEATURES.md](MISSING_FEATURES.md) | The 45 specified-but-absent features |
| [PARTIALLY_IMPLEMENTED_FEATURES.md](PARTIALLY_IMPLEMENTED_FEATURES.md) | The 31 partials, with the exact remaining delta |
| [FEATURES_REQUIRING_FIXES.md](FEATURES_REQUIRING_FIXES.md) | The 6 verified defects, with reproduction and fix |
| [ARCHITECTURAL_IMPROVEMENTS.md](ARCHITECTURAL_IMPROVEMENTS.md) | Structural recommendations, each justified |
| [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) | Debt register with interest rate and payoff cost |
| [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md) | Scalability, security, performance, usability, maintainability |
| [IMPLEMENTATION_PRIORITY_MATRIX.md](IMPLEMENTATION_PRIORITY_MATRIX.md) | Impact × effort ranking of all outstanding work |
| [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) | Eight dependency-ordered phases |
| [FINAL_IMPLEMENTATION_CHECKLIST.md](FINAL_IMPLEMENTATION_CHECKLIST.md) | The tick-list to call this done |
