# Final Implementation Checklist

The tick-list to call the specification implemented. Every item traces to a requirement or a verified finding. Items already **verified complete by this audit** are pre-ticked with their evidence, so this doubles as the record of what was confirmed.

---

## 1 · Legal and compliance — §60

- [ ] **1.1** Attorney-reviewed body for the **regular sale** agreement replaces the placeholder — M-1
- [ ] **1.2** Attorney-reviewed body for the **consignment / bailment** agreement — M-1
- [ ] **1.3** Attorney-reviewed body for the **rent-to-own** agreement — M-1
- [ ] **1.4** Attorney-reviewed body for the **consignment rent-to-own** agreement — M-1
- [x] **1.5** Structured-vs-prose boundary for §44 / §54 obligations decided **before** counsel review — A-6 (`src/modules/rto/rto.terms.ts`; brief in [LEGAL_REVIEW_BRIEF.md](LEGAL_REVIEW_BRIEF.md))
- [~] **1.6** The `City.feature_flags.rto` gate is now **enforced** (it was documented and never checked) and admin-controllable at `/admin/rto`. Which states to open remains a legal decision
- [x] **1.7** RTO limited to approved sellers **and** approved categories; vehicles and regulated goods are non-overridably excluded — M-9, §43
- [ ] **1.8** Legal review of the lending-adjacent modules (`debt`, `spot_me`, shelter grants) — P-23
- [x] **1.9** Four separate agreement types exist, versioned and content-hashed — `AGREEMENT_TYPES` ([agreements.registry.ts:10](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/agreements/agreements.registry.ts#L10))
- [x] **1.10** Acceptance is tamper-evident (version + sha256 stored per acceptance)
- [x] **1.11** "Stock Protection" is presented as a **waiver**, never insurance; the vocabulary prohibition holds ([constants.ts:618](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L618))

---

## 2 · Fees — §31–§34, §57–§59

- [x] **2.1** 10% marketplace fee — `DEFAULT_CONSIGNMENT_FEE_BPS = 1000`
- [x] **2.2** Processing fee separate, at processor rates, no permanent-rate guarantee — 2.9% + 30¢, config-overridable
- [x] **2.3** Checkout itemizes subtotal / tax / delivery / service / processing / tip / total — `OrderBreakdown`
- [x] **2.4** Customer service fee 3%, min $0.50, max $10, off at launch — §33 exactly
- [x] **2.5** Consignment: 10% platform + agreed commission + owner remainder
- [x] **2.6** RTO: 10% per installment; $5–$25 setup fee bounds
- [x] **2.7** Quote and charge share one pricing function — customer cannot be charged a total they did not preview
- [x] **2.8** Fee rates resolved server-side, never client-supplied
- [x] **2.9** Tips pass through to the seller and are never fee'd
- [x] **2.10** Wave Down convenience fee exists, is itemised by payee before confirmation, and is off at launch like the other customer-facing fees — M-8, §32.4
- [x] **2.11** Vendor travel fee is actually charged, and disclosed before the customer confirms — F-5
- [x] **2.12** Promoted-product flat tiers $5 / $15 / $40, served from the API so the price cannot drift — M-7, §32
- [x] **2.13** Booking platform fee — 10% on completion, nothing on a no-show — M-15
- [x] **2.14** `processingRetainedCents` reports real retained fees; disclosure matches — F-1 **(unblocks enabling processing fees)**
- [x] **2.15** Fee calculator shows estimated tax and the customer's total cost — §57.1
- [x] **2.16** Fee calculator shows all seven RTO rows, from the same quote the customer is charged — §57.2
- [x] **2.17** Refund policy: fee returned on full pre-fulfilment cancel; pro-rata on partial; retained post-fulfilment; tip returned on full cancel — `computeRefund`
- [x] **2.18** Refund preview and actual refund share one function

---

## 3 · Consignment terms — §35–§41

- [x] **3.1** Durations 7 / 14 / 30 / 60 / 90 / 180 / 365
- [x] **3.2** 30-day default
- [x] **3.3** No-fixed-limit option
- [x] **3.4** Both parties accept the term before goods transfer (hub approval gate)
- [x] **3.5** Expiry notices at 14 / 7 / 3 / 0 days, idempotent
- [x] **3.6** All five notice actions available (extend / return / reduce price / continue open-ended / end)
- [x] **3.7** No auto-renewal without prior agreement
- [x] **3.8** Unsold goods enter Return-Pending; never auto-kept
- [x] **3.9** Return responsibility, window (7–14 d), storage fee, and abandonment cutoff all recorded
- [x] **3.10** Pricing controls: discount / bundle / offers / minimum authorized price
- [x] **3.11** Terms snapshotted at checkout so mid-term drift cannot re-price a live consignment
- [x] **3.12** Custom end date accepted — P-10, §35.2
- [x] **3.13** Automatic renewal, opt-in per product, announced 3 days out and cancellable by either party — M-13, §39
- [x] **3.14** Termination notice periods 3 / 7 / 14–30 days, scheduled and completed by the sweep — M-6, §37
- [x] **3.15** **Either party** can terminate; the product owner can recall their goods — F-2, §37
- [x] **3.16** Commission change offered at term end (hub-set, forward-only) — M-14, §36

---

## 4 · Rent-to-Own — §42–§53

### Reachability

- [x] **4.1** A customer can view an RTO listing — `/rto` + `/rto/offers/[id]`
- [x] **4.2** A customer can see the §44 disclosure and accept — built; **acceptance gated closed until 1.3 lands**
- [x] **4.3** A seller can create an RTO listing — `/vendor/rto`; listings are now the source of every term
- [x] **4.4** An admin can approve/revoke an RTO seller, open cities, and open categories — `/admin/rto`
- [x] **4.5** A customer can view an active agreement's dashboard — `RtoDashboard`

### Terms and disclosure

- [x] **4.6** Cash price, initial payment, installment amount and count, frequency, total-to-own, cost-over-cash all disclosed
- [x] **4.7** The customer is told plainly that RTO may cost more than buying outright — §47
- [x] **4.8** Rental vs ownership credit split per installment
- [x] **4.9** Six payment frequencies — §45
- [x] **4.10** Grace periods 3 / 5 / 7 days by frequency — §49
- [x] **4.11** Terms bounded; no unlimited RTO — §46
- [x] **4.12** Maintenance, damage, return-rights, and cancellation terms — structured fields, set by the seller on the listing and rendered in full on the offer screen — A-6, §44

### Lifecycle

- [x] **4.13** Hourly installment charge + delinquency escalation
- [x] **4.14** Ownership transfers only on completion; proof-of-ownership issued — §53
- [x] **4.15** Early payoff available; the formula is frozen at acceptance and cannot be changed by the seller — §48
- [x] **4.16** Dashboard shows next due, amount, balance, counts, total paid, ownership progress — §45
- [x] **4.17** All nine declared statuses are reachable — **F-3 closed**
- [x] **4.18** Seven seller remedies on a missed payment — M-4, §50
- [x] **4.19** Voluntary return with full disclosure of refundability, restocking, transport, condition, reinstatement, ownership credit — M-3, §51
- [x] **4.20** Customer is never told prior payments create ownership unless the agreement grants credit — §51 (asserted in `rto.returnPolicy` tests)
- [x] **4.21** All five reminder stages fire — P-25, §49
- [x] **4.22** Completion requests customer feedback — §53 step 9 *(carried on the completion notice with the transaction the review attaches to)*

### Condition documentation — §52

- [x] **4.23** Delivery report captures photos and serial
- [x] **4.24** Delivery report captures video, existing damage, accessories, estimated value, transfer date
- [x] **4.25** **Both parties acknowledge** the delivery report — two timestamps; `agreed` is derived
- [x] **4.26** Return condition report is captured — **F-4 closed**

---

## 5 · Consignment Rent-to-Own — §54–§56

- [x] **5.1** Three-party model: owner, managing business, customer
- [x] **5.2** Payment split across owner / managing business / platform / processor
- [x] **5.3** Each party receives an electronic statement
- [x] **5.4** Statement rows are immutable and idempotency-keyed
- [x] **5.5** Payouts may be delayed until funds clear — `funding_source` + `payout-retry`
- [x] **5.6** A consignment-RTO listing can be created — declared on the listing, not at acceptance — P-5
- [x] **5.7** All ten §54 responsibilities are structured terms, **required** at creation and restated in plain language on every party's copy — A-6
- [x] **5.8** Tax, delivery, refund, and remaining-balance legs are split, each its own statement line — M-45, §56.1

---

## 6 · Defects

- [x] **6.1** F-1 · Refund reports real retained processing fees — split into processor-retained vs customer-borne
- [x] **6.1a** F-1a · Post-fulfilment refund no longer returns the service and processing fees
- [x] **6.1b** F-1b · Marketplace fee no longer charged on top of the platform/processor fees
- [x] **6.1c** F-1c · Removing a line no longer wipes the fees off a charged order
- [x] **6.2** F-2 · Product owner can end a consignment (`checkout:end`, seller **or** hub owner)
- [x] **6.3** F-3 · No unreachable RTO statuses
- [x] **6.4** F-4 · `condition_return` is written
- [x] **6.5** F-5 · Travel fee snapshotted at request, charged once, disclosed pre-confirmation
- [x] **6.6** F-6 · Backend suite green — **368/368**; the `phase5` failure triaged (solvency guard, stale fixture)
- [x] **6.7** F-7 · Subscriptions asserts all six plans — and the two missing plans added to the client

---

## 7 · Part A features

### Verified complete

- [x] Consignment marketplace · Digital gift cards · Monthly Pro accounts · Transaction fees
- [x] Wave Down · Live GPS tracking · Favorites · Proximity push · QR ordering · Live inventory
- [x] Sales analytics · Tax reports · Inventory management · AI recommendations
- [x] Events calendar · Online booking

### Outstanding

- [x] **7.1** Featured map placement — UI shipped; `AdSlot` on the map sheet — M-11/M-12
- [x] **7.2** Advertising dashboard at `/vendor/ads`, with real delivery numbers — M-11
- [x] **7.3** Local banner ads — all three placement renderers, each carrying the label — M-12
- [x] **7.4** Placement serving extended to the nearby list, map sheet, and earn hub — P-18
- [x] **7.5** Verified badge renders where purchased — pin, list, and profile — P-19
- [x] **7.6** Reviews with photos, with moderation that hides photos and never the review — P-13
- [x] **7.7** ETA countdown on live sessions — P-11
- [x] **7.8** Route alerts — P-12 *(corridor alerts; built Phase 7, ticked in the 8.1 pass)*
- [x] **7.9** Wish lists — M-16
- [x] **7.10** Loyalty rewards — M-17
- [x] **7.11** Referral rewards — M-20
- [x] **7.12** Scheduled pickup for goods — P-14
- [x] **7.13** Flash sales — P-15 *(on A-7's contest; never stacked)*
- [x] **7.14** Storefront model decided — A-8 *(ADR-001: a storefront is presentation, not a data model)*
- [x] **7.15** Business tools: crew, expenses, mileage, invoices — M-21..M-25 *(ADR-002: engagements, not employment. CRM (M-26) not built.)*
- [ ] **7.16** Community: festivals, meetups, charity, mentorship, voting, roadside — P-21, M-34..M-38
- [x] **7.17** Explicit decisions recorded for video ads, insurance marketplace, loan marketplace, and processing revenue share — [ADR-003](ADR-003-revenue-decisions.md) *(all four declined as proposed; referrals and processor rebates accepted)*

---

## 8 · Architecture and debt

- [x] **8.1** Reachability gate in CI — A-1 *(client script in `verify`; server route-coverage test)*
- [x] **8.2** Unreachable-enum test — A-2 *(found 15; 2 fixed, 13 recorded with what each needs)*
- [x] **8.3** Redis fee cache — A-3 *(L1 memory / L2 Redis / L3 Mongo, pub/sub invalidation)*
- [x] **8.4** Both access gates covered by tests — A-4, S-1, S-2 *(the messaging transaction gate had NO test asserting its 403 — found in the 8.1 pass, now four tests)*
- [x] **8.5** Shared money primitives — A-5 *(landed AFTER §56.1, not before; a retrofit, no inconsistency shipped)*
- [x] **8.6** Discount model unified **before** flash sales — A-7
- [x] **8.7** Outbound email/SMS carrying contractual notices — A-9 *(delivery recorded immutably; in-app alone is not counted as delivered)*
- [x] **8.8** Demo fixtures typed, not cast — A-10
- [ ] **8.9** Node on PATH; `npm run verify` runs clean — D-10
- [x] **8.11** Audit-log retention implemented and reads audited — 6.4
- [x] **8.12** Secret-management review — 6.2 (`SECRET_MANAGEMENT_REVIEW.md`)
- [x] **8.10** Documentation index marking current / superseded / historical — D-12 *(`DOCS_INDEX.md`, both repos)*

---

## 9 · Production readiness

- [x] **9.1** Helmet, CORS allowlist, HSTS, body cap
- [x] **9.2** Webhooks mounted before the JSON parser
- [x] **9.3** Tiered rate limiting with a distinct money tier
- [x] **9.4** RBAC centralized; idempotency on money routes
- [x] **9.5** Immutable settlements and ledgers
- [x] **9.6** Audit logging on privileged actions
- [x] **9.7** Reconciliation, ledger-integrity, and balance-monitor jobs scheduled
- [x] **9.8** Geospatial and compound indexes matched to query shapes
- [x] **9.9** Bundle budgets and Lighthouse configured, and **running in CI** *(the Lighthouse config asserted on four audits removed in LH 12 — three of them error-level; fixed)*
- [x] **9.10** a11y, PWA, and offline e2e suites exist
- [x] **9.11** Both repos typecheck clean, **both repos lint clean**
- [x] **9.12** Frontend tests green — 44 files, **223 tests**
- [x] **9.13** Backend tests green — **611/611** across 50 files
- [x] **9.14** Lighthouse and bundle budgets executed and recorded — `PERFORMANCE_BASELINE.md`. Accessibility ✅; performance 0.45–0.51 and best-practices 0.70–0.74 are below target (warnings); the map route sits at 95% of its bundle budget.
- [ ] **9.15** Load test at projected launch volume — *volume model + scenario harness done (`LOAD_TEST_PLAN.md`); the RUN needs a production-like environment* — *sweeps are load-MODELLED (`SWEEP_LOAD_MODEL.md`) and instrumented; an actual load test is still outstanding*
- [x] **9.16** Dependency CVE scanning in CI — production tree only, reviewed exceptions with **expiry dates**. Next moved 14.2.15 → 14.2.35 (clears the critical middleware auth-bypass); backend prod deps clean. 9 Next/Clerk advisories accepted until 2026-11-01, each with why it does or does not reach this app.
- [ ] **9.17** Penetration test of the money paths — *19 adversarial tests exist (`moneyPathAttacks.test.ts` + RTO attacks); a third-party engagement is still outstanding and this box stays open until one happens*
- [ ] **9.18** Runbooks rehearsed — *references verified automatically (`runbookRehearsal.test.ts`); the DRILL still needs a person*
- [x] **9.19** Alerting verified against a seeded failure — `integrityAlerts.test.ts` *(the alert decision was extracted from the worker so it can be run, not just read)*
- [x] **9.20** `allow_static_qr` phased out for grandfathered hubs — dated sunset (`STATIC_QR_SUNSET_AT`) + per-hub deadlines + usage telemetry; a missing deadline fails closed
- [x] **9.21** Support runbooks for RTO delinquency, consignment termination, and disputes — `SUPPORT_RUNBOOKS.md`

---

## Launch gate

**Do not launch rent-to-own or consignment rent-to-own until:** 1.1–1.4, 1.7, 4.1–4.4, 4.17–4.21, 4.26, 6.3, 6.4.

**Customer-facing processing fee:** unblocked — 2.14 / 6.1 are done, along with F-1a/b/c, the three further fee defects found alongside them. Enable behind the existing `PROCESSING_FEE_ENABLED` flag.

**Safe to launch now:** core marketplace, consignment, live map, Wave Down, queues, bookings, messaging, reviews, disputes, ledger, tax statements, subscriptions, academy, shelter program.
