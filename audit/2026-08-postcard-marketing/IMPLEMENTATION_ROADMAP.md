# Implementation Roadmap

Eight phases, ordered by dependency. Durations are engineering effort for one focused developer, and assume PC-17-A has landed — before that they are ranges, not commitments (TD-10).

**Phase 0 is not an engineering phase and is not optional.** Attempting to parallelise past its blocking items risks discarding the work.

---

## Phase 0 — Unblock (business, not engineering)

> **Live status: `PHASE_0_TRACKER.md`.** Partially executed 2026-08-08 — 0.1's engineering half is done and verified, and every remaining item now has a ready-to-send artifact. Discovery added three items (0.5–0.7).

**Exit criteria:**

| # | Action | Owner | State |
|---|---|---|---|
| 0.1a | Credential plumbing + boot guard against a dev box hitting the live print queue | Eng | ✅ Done |
| 0.1b | PCM production key rotated | Ops | 🔴 **Today** |
| 0.2 | Written answer: Stripe Connect split, or wholesale billing? | Business | 🟡 Brief ready |
| 0.3 | Merchant of record decided; tax scoped with an accountant | Business | 🟡 Brief ready |
| 0.4 | Partnership signed; per-piece cost, SKUs, minimum order quantity in hand | Business | 🟡 Brief ready |
| 0.5 | Evaluate PostcardMania's white-label storefront | Product | 🟡 Brief ready |
| 0.6 | Legal review: consumer PII, if mail is list-based | Legal | 🔴 Not started |
| 0.7 | Confirm what "one side" means | James | 🟡 One question |

**0.2 is still the decision the whole architecture turns on** — but discovery has moved the expected answer. PostcardMania's published partner model is wholesale-and-markup, so **plan for Topology B** (~3 weeks in Phase 5, not ~1.5) and confirm in writing. See `PCM_DISCOVERY_FINDINGS.md` Finding 2 and `ADR-007` §4.

**0.5 could change this entire roadmap.** Their white-label storefront already covers much of PC-1 through PC-10, including the design tool deferred as XL. Evaluate before building.

**Engineering runs in parallel on topology-independent work:** content policy drafting, order state machine implementation (ADR-007 §2 is decided), wizard UX, extracting the shared fulfilment module from Boost, upload hardening research.

**Do not start:** anything in the payment path.

---

## Phase 1 — Discovery and adapter · ~1.5 weeks

> **Status 2026-08-08: COMPLETE (pending one credential).** Topology decided (**B, wholesale resale** — ADR-007 §4). The OpenAPI spec was obtained, and `integrations/print` is now written against the **real** DirectMail v3 contract: login/token lifecycle, list-count targeting, published-price-break costing, `extRefNbr` idempotency, polling, cancellation, retainer balance. 21 contract tests, all green; harness at `npm run probe:print`.
>
> **The spec corrected three things that reached past `wire.ts`,** so the earlier claim that only that file would change was wrong: auth is a login exchange needing a key **and secret** (not a static header), there is **no quote endpoint** (prices are computed from published breaks and are not binding), and there are **no status webhooks** (status is polled). Those changed the domain interface too.
>
> **Blocked only on the API *secret*** — the vendor's `/auth/login` takes a key + secret pair and we hold one value. The endpoint is live-verified (400 on empty body, 401 on bad credentials), so `--real` runs the moment the pair is complete.

**1.1 · PC-17-A discovery spike — 2–3 days.** Authenticate to sandbox. Document in writing: auth scheme; targeting taxonomy (and whether "neighborhood" exists at all as a postal unit); artwork spec — trim, bleed, DPI, colour profile, accepted formats; SKU catalogue and whether one-sided is a SKU or a flag; pricing model, quote binding and expiry; minimum order quantity; webhook events and signature scheme; **idempotency support** (F-6); rate limits; sandbox fidelity.

> **Re-estimate the entire feature matrix after this.** Every downstream number currently rests on assumptions.

**1.2 · `integrations/print` adapter — 4–6 days.** Domain-shaped interface (`listAudiences`, `quote`, `submitOrder`, `getStatus`, `parseWebhook`), never PCM-shaped. Vaulted credential. Contract tests against sandbox. Sanity bounds on returned quotes (`ARCHITECTURAL_IMPROVEMENTS.md` §5).

**1.3 · Write ADR-007 — 0.5 day.** Topology, merchant of record, sibling-not-variant, saturation-only, point of no return, margin-vs-fee. Reasoning, not just outcomes.

**Exit:** a sandbox order can be quoted and submitted from a test harness.

---

## Phase 2 — Revive Boost · ~1 day

> **Status 2026-08-08: DONE.** Boost is live. `GET /boost/estimate` returns real numbers for the first time, from a **live vendor rate of 103¢/piece** (6×8.5 Standard), and `campaign_service` is priced at 10% per ADR-007 §4.
>
> **Built differently from the plan, deliberately.** The bullet said "set `BOOST_POSTCARD_UNIT_COST_CENTS` to the contracted rate". The vendor publishes live per-piece pricing, so hardcoding it would have replaced "no number" with a worse problem: a number that was true the day someone edited it, silently stale afterwards, on the screen where contributors decide how much to give. The rate is now **read from the vendor and cached** (`boost/mailingRate.ts`); the constant survives only as an override and stays at `0`. The honesty property is intact — vendor unreachable ⇒ `postcards: null` ⇒ the UI shows nothing.
>
> **Three things the plan did not anticipate, found by doing it:**
> 1. **The estimate had to become fee-aware.** `campaign_service` is deducted from the raised total on funding, so pricing it at 10% without changing the estimate would have told contributors their money buys ~11% more postcards than it does. It now divides `mailableCents`, not the gross.
> 2. **The disclosure promise was unkept.** The contribution sheet's fine print says a service fee is *"shown on the campaign page"* — vacuous at 0%, a real ADR-006 §6 obligation at 10%. Nothing showed it, and `serviceFeeCents` is 0 until funding, so `serviceFeeBps` is now exposed and the card discloses the rate before anyone gives.
> 3. **`BOOST_MIN_GOAL_CENTS` is mis-calibrated.** $100 was set as "below this a mailing is not worth printing" assuming ~20¢/piece. At the real 103¢ it buys ~87 postcards, not ~500. Left unchanged — that is a product judgement, not an arithmetic fix — but recorded in the constant.
>
> Also fixed: `printVendor()` would have silently returned the **fake** in production if credentials were missing, quoting invented prices. Production now gets the real gateway, which fails loudly instead.

**Highest value per hour in the plan.** Independent of everything after it; run it as soon as Phase 0.4 gives a real rate.

- Set `BOOST_POSTCARD_UNIT_COST_CENTS` to the contracted per-piece rate
- Set `campaign_service.rate_bps` per the ADR-007 decision
- Verify `GET /boost/estimate` returns real numbers and the UI renders them correctly with a non-null value for the first time
- Verify goal validation still behaves at the new rate (`BOOST_MIN_GOAL_CENTS = 10_000` was chosen as "below this a mailing is not worth printing" — check that still holds)
- Update tests

**Exit:** a vendor creating a Boost campaign is told what their money buys. A shipped feature stops being inert (TD-1).

---

## Phase 3 — Core domain · ~2.5 weeks

> **Status 2026-08-08: DONE.** `modules/postcards` ships the catalogue, audiences, pricing, and the order state machine. 24 tests; all three CI gates green; backend suite **794/794**.
>
> **Verified against the live vendor, not just the fake:** ZIP 95350 → **20,898 deliverable addresses** → 103¢/piece wholesale → **$23,916.60** to the buyer, with vendor cost + margin adding up exactly. Exit criterion met.
>
> **Three deliberate departures from the plan:**
> 1. **The product registry is configuration, not a `postcard_products` collection.** The vendor's catalogue is the real source of truth — sizes, availability and pricing all come from their API and vary by account — so a table would be a second copy of someone else's data, free to drift, needing a migration and admin CRUD for three rows. A test asserts every configured SKU is one the vendor actually sells.
> 2. **The status enum stops at `cancelled`** (`draft → quoted → cancelled`). `enumReachability.test.ts` forbids declaring states the service cannot write — the F-3 defect caught as a test — so `paid` and the fulfilment states arrive with their phases rather than sitting dead in every consumer that switches on the field.
> 3. **`neighborhood` targeting is not implemented.** It is not a postal unit and the vendor has no such targeting; offering it would mean inventing a mapping onto carrier routes. PC-6 stays out.
>
> **Margin basis needed a decision and is now explicit:** `retail`, so `total = wholesale / (1 - rate)` — a 10% margin on a $500 order is $50 to us. That reads the brief's own worked example. The `cost` basis would yield ~9.1% on the same order; the two differ by about a point, so the basis is named in config rather than left implicit in a multiplication.
>
> Also caught: the probe script targeted size `69` (no designs on our account) and picked `types[0]` for the list type, which is a niche list — it reported **349** deliverable for a whole ZIP where the general resident list returns **20,898**. Both fixed.

**3.1 · Product registry (PC-3) — 2 days.** `postcard_products` with SKU, `sides`, trim, stock, postage class, min/max quantity. Seeded with the one-sided MVP SKU. Configuration, never a literal.

**3.2 · Audience model and targeting (PC-4/5/7) — 6–8 days.** `postcard_audiences`. Counts and prices resolved **by PCM**, never computed in-house (F-9). Map-based selection with running count and cost. PC-6 (neighborhood) only if the spike confirmed it exists.

**3.3 · Quote endpoint (PC-9) — 3 days.** Quantity → price. Line-itemised. **Expiry** (F-8). Margin applied per ADR-007. Boost's existing money→quantity helper stays untouched.

**3.4 · Quantity selection (PC-8) — 1 day.** Enforce vendor min/max; live recalculation.

**3.5 · Order model and state machine (PC-10) — 4 days.** `draft → quoted → paid → submitted → printing → mailed`, plus `cancelled`/`failed`. **`submitted` is the point of no return, enforced in the service** (F-4). Follow `modules/rto`'s pattern.

**Exit:** an order can be built and quoted end to end. No money moves yet.

---

## Phase 4 — Artwork · ~1.5 weeks

> **Status 2026-08-09: BUILT.** `postcard_assets`, header-level pre-press, moderation queue, acceptable-use agreement, artwork-spec endpoint. 43 new tests.
>
> **Three decisions worth knowing about:**
> - **No image library.** Pre-press reads JPEG/PNG/PDF headers directly (`prepress.ts`, ~200 lines). `sharp` is a ~30 MB native dependency with its own toolchain, to read a few dozen header bytes — the trade wasn't close. Format comes from **magic bytes**, never the declared content type.
> - **Two thresholds, not one.** Below 200 effective DPI is blocked; 200–300 warns. A warn-only rule wouldn't stop bad files, and rejecting at 299 would block artwork that prints fine. Effective DPI (pixels ÷ printed size) is used throughout — the *embedded* DPI tag is nearly meaningless.
> - **Nothing auto-approves.** The "automated first pass" can only raise suspicion; every asset reaches a human. Real content screening needs vision inference, and a screener returning "clean" would manufacture an approval nobody performed. `ContentScreener` is the seam; Gemini is the obvious implementation.
>
> **4.4 delivered as numbers, not files.** `GET /postcards/products/:sku/artwork-spec` returns exact trim, bleed, safe area and required pixels, plus a link to PostcardMania's own press-ready templates. Shipping our own templates would encode a bleed we have not confirmed with them — artwork built to a template that disagrees with the press is worse than artwork built to none.

**4.1 · Upload and asset model (PC-1) — 3 days.** `postcard_assets`. Hardened upload: type and size limits, malware scan, no user-controlled paths.

**4.2 · Pre-press validation (NF-2) — 3 days.** DPI at trim, aspect ratio, bleed, colour space, format. **Runs before checkout, not after** (`ARCHITECTURAL_IMPROVEMENTS.md` §7). Preview with trim and safe-area overlays. Errors in plain language — "this will print blurry at postcard size," not "insufficient DPI."

**4.3 · Moderation gate (F-7) — 3 days.** Acceptable-use terms via `modules/agreements`. Automated first pass. Human review queue before submission. Clean rejection-and-refund path — rejection precedes the point of no return, so it composes with 3.5.

**4.4 · Template pack (3.8) — 1 day.** Downloadable Canva / Illustrator / PDF templates at PCM's exact spec. **Cheapest high-value item in the plan** and the reason PC-2 can be deferred.

**Exit:** artwork can be uploaded, validated, previewed, and approved.

---

## Phase 5 — Money · ~1.5 weeks (Topology A) / ~3 weeks (Topology B)

> **Status 2026-08-09: BUILT, Topology B.** Platform charge, `vendor_payable` ledger account, `postcard_payables`, weekly settlement close, ops confirmation, refunds, exposure reporting. 24 new tests.
>
> **The capture books three obligations, not one.** Under wholesale resale the buyer's *entire* payment lands in our cash and only the margin is income:
>
> ```
> cash                DEBIT   everything the buyer paid
> ├─ vendor_payable  CREDIT   wholesale cost — a debt to the printer
> ├─ fee_revenue     CREDIT   our margin — the only part that is ours
> └─ tax_payable     CREDIT   sales tax, if charged — never ours
> ```
>
> `vendor_payable` is a **new account type**, not the existing `payable`: that one means *owed to a seller* and is consumed by payout logic, so a supplier debt booked there would be paid out to a vendor who never earned it. Same reasoning `community_fund_payable` already documents.
>
> **Where the automation honestly stops.** Closing a period, totalling the debt, and naming the orders it covers are automatic. **Paying the vendor is not** — their API has no endpoint that accepts money, they bill against a prepaid retainer topped up out of band, and a cron that wires funds to an external account unattended is a bad idea regardless of counterparty. A settlement closes weekly; an authorised person confirms it with an external reference, and *that* is when the ledger discharges the debt. Still "no manual accounting" — nobody totals invoices — but not "money leaves unattended".
>
> **5.5 (tax) is wired and OFF.** `POSTCARD_TAX_ENABLED=false` pending ADR-007 §5. Turning it on without Stripe Tax fails loudly rather than inventing a rate — charging tax we should not collect and failing to collect tax we owe are both real harms.
>
> **Also carried over:** the credit exposure Topology B accepted is now measurable (`GET /settlements/exposure`) and alerts past a $25k threshold.

### The decision (superseded framing below)

**Shape determined entirely by Phase 0.2** — answered: **Topology B**.

### Topology A — destination charge

**5.1 — 1 day.** Onboard PCM via existing `POST /payments/connect/onboard`; verify `charges_enabled` and `payouts_enabled`.

**5.2 · Checkout (PC-11–14) — 4 days.** `createDestinationCharge({ destinationAccountId, applicationFeeCents, transferGroup: orderId, idempotencyKey })`. `Idempotency-Key` middleware, `rateLimit('money')`. **Order advances only on the Stripe webhook** — never on the client's word, matching the Boost contribution pattern.

**5.3 · Ledger (PC-15, F-10) — 2 days.** Double-entry both legs at capture. Postcard orders added to nightly Stripe reconciliation.

**5.4 · Refunds (F-4) — 2 days.** Full refund before `submitted`; refused after, in the service. Rule added to `refundPolicy.ts`. Transfer reversal handled.

**5.5 · Tax (F-13) — 2 days.** Stripe Tax wired per the merchant-of-record decision.

### Topology B — invoiced settlement

Replaces 5.1–5.2 with: platform charge; `postcard_payables` tracking; scheduled settlement job; invoice reconciliation; float and credit risk accepted explicitly. Add ~1.5 weeks.

**Exit:** money moves correctly, is fully ledgered, and reconciles.

---

## Phase 6 — Fulfilment · ~1 week

> **Status 2026-08-09: BUILT.** 17 contract tests, all green.
>
> **Two deviations from the plan, both because the plan assumed things that are not true of this vendor:**
>
> 1. **Submission is a sweep, not a job enqueued at the payment webhook.** By the time we would enqueue, the money has already arrived — so if Redis is down for that one call, the order is paid and nothing will ever submit it. A sweep reads the order's own state, so it cannot lose work. The vendor batches at end of day anyway, so a one-minute sweep is indistinguishable from instant. Retry bookkeeping lives on the order, and the "dead letter" is a visible `submission_failed` status plus the on-call metric, rather than a row buried in Redis.
> 2. **6.3's vendor webhook is an accelerator, not the mechanism.** Their OpenAPI document defines no outbound status callbacks (their only webhook route is inbound). Status is **polled**. The callback endpoint exists and takes exactly one thing from the payload — which order to re-check — then asks the API. Because nothing in the body is trusted, a forged call can at most make us re-poll an order we already own.
>
> **6.2 found a real bug in Boost while extracting.** `advanceMailing` did an unguarded `$set`, so an admin could move a campaign from `mailed` back to `preparing` — telling everyone who funded it that their mailing had been un-sent. Now guarded by the shared `assertAdvance`. That is the argument for extracting rather than copying, in one line.

**6.1 · Submission job (PC-16, F-5/F-6) — 2 days.** BullMQ `postcard.submit` enqueued on payment confirmation. Deterministic idempotency key. Bounded retry with backoff. Dead-letter that **pages ops** — a paid, unsubmitted order must never sit silently.

**6.2 · Shared fulfilment module (PC-18, TD-6) — 2 days.** Extract Boost's status machine into `modules/fulfilment`; both features consume it. **Extract, do not copy.** Keep the rule that the pipeline stops at `mailed`.

**6.3 · Vendor webhook — 1 day.** Signature-verified, deduped by event id. Drives status transitions for both Boost and postcard orders. Payload treated as a signal to re-fetch, never as authoritative amounts.

**6.4 · Buyer timeline and notifications — 1 day.** Via `modules/notifications`.

**Exit:** a paid order submits automatically and reports status without human intervention.

---

## Phase 7 — Frontend and launch readiness · ~2 weeks

> **Status 2026-08-09: BUILT.** 18 render + axe tests green.
>
> **7.1** wizard at `features/postcards` — product → area → quantity → artwork → review & pay. **Drafts live on the server**, not in component state, so closing the tab resumes exactly where it stopped and the progress indicator can never disagree with what the server thinks exists. Artwork sits *before* review deliberately: pre-press runs on upload, so a bad file is caught while the fix is still "export it again".
>
> **The review step is the one that matters.** The irreversibility notice is `role="note"`, in plain words, immediately before the pay button — and a test asserts it comes *before* the button in reading order, not merely that the text exists. An expired price disables payment and offers a refresh rather than silently re-quoting.
>
> **7.4** moderation queue at `/admin/postcard-artwork`, plus `RUNBOOKS.md` (8 scenarios). The queue screen states the bar out loud — *may we lawfully print and post this*, not *is this a good design* — because a reviewer left to invent their own bar invents a different one each time.
>
> **7.5** four metrics: moderation queue depth **and age of the oldest item** (depth alone hides a small queue nobody is working), submission failures labelled by outcome, submissions, quote latency.
>
> **Two real defects found by the tooling, not by review:** axe caught a file input with no accessible name (visually hidden but still in the a11y tree), and the typechecker caught me comparing an order *status* to `'mailed'` — which is a fulfilment *stage*. That is the exact distinction the Phase 6 backend test pins.

**7.1 · Order wizard (PC-10, PC-12) — 6–8 days.** Product → area → quantity → artwork → review → pay. Saved drafts. Unambiguous point-of-no-return language at the final step. Responsive; accessible to the platform's existing AA standard.

**7.2 · Order history and status — 2 days.**

**7.3 · Spend authority (F-14) — 0.5 day.** `postcard:order` permission.

**7.4 · Ops tooling and runbooks — 2 days.** Moderation queue UI. Runbooks: stuck order, vendor outage, artwork rejection, refund dispute.

**7.5 · Instrumentation — 0.5 day.** Moderation queue depth and latency (TD-8); submission failure rate; quote latency.

**7.6 · E2E and accessibility tests — 2 days.** Full flow against PCM sandbox, using the existing Playwright and `vitest-axe` setup.

**Exit:** every gate in `FINAL_IMPLEMENTATION_CHECKLIST.md` passes.

---

## Phase 8 — Pilot, then scale

> **Status 2026-08-09: engineering ready, pilot NOT RUN.** See `PILOT_PLAYBOOK.md`. 14 tests green.
>
> **The pilot itself is not implementable.** Nobody can write a test proving a postcard looked right in someone's hand, that a vendor's invoice matched their quote, or that an owner understood what they bought. That needs a person, real money, and about two weeks of attention. What was built is everything that makes running it *safe and measurable*:
>
> - **A pilot gate** (`pilot.service.ts`) — ops-managed allowlist, default-deny, `POSTCARD_ACCESS_MODE = 'pilot'`. Deliberately **not** the module system: modules are owner-toggleable, and a gate a participant can let themselves through is not a gate. Also not a city feature flag, which would open it to every business in Modesto at once.
> - **A per-order ceiling** of $1,000 while piloting — a guard against *our* arithmetic, since quantity flows from a vendor count we do not compute and a bug there is a five-figure charge on a real card.
> - **8.2 as code** (`pilotReview.service.ts`, `npm run pilot:review`) — cost variance, realised margin, moderation wait times, failure-mode counts. Its central rule: **`costVariance` is `null` until a payable has SETTLED**, because before settlement the "actual" cost is still our own estimate, and comparing an assumption to itself is not verification. The audit's biggest open question was the unverified unit economics; a report that quietly defaulted that to zero would leave the assumption in place while looking like evidence.
> - **`RUNBOOKS.md`** (8 scenarios) and **`PILOT_PLAYBOOK.md`** (who to pick, what to watch, when it is safe to go general).
>
> Going general is one constant. **Do not flip it** until the review answers the five questions in the playbook §5.

**8.1 · Pilot: 5–10 real orders** with known, cooperative businesses. Ops watches each end to end. **At least one physical card in hand before the next batch.**

**Justification:** this is the platform's first feature producing an irreversible physical artifact, paid with real money, fulfilled by a newly integrated third party. A bug here is not a rollback — it is paper in mailboxes. The pilot is also the only realistic validation of unit economics, which remain unverified.

**8.2 · Review:** actual vs. quoted cost; margin realised; moderation time per order; failure modes hit.

**8.3 · Then:** general availability, and Tier 4 work (neighborhood targeting, marketing hub, reorder, analytics).

---

## Timeline

| Phase | Effort | Cumulative |
|---|---|---|
| 0 — Unblock | *business-dependent* | — |
| 1 — Discovery + adapter | 1.5 wk | 1.5 wk |
| 2 — Revive Boost | 1 d | 1.7 wk |
| 3 — Core domain | 2.5 wk | 4.2 wk |
| 4 — Artwork | 1.5 wk | 5.7 wk |
| 5 — Money (A / B) | 1.5 / 3 wk | 7.2 / 8.7 wk |
| 6 — Fulfilment | 1 wk | 8.2 / 9.7 wk |
| 7 — Frontend + readiness | 2 wk | **10.2 / 11.7 wk** |
| 8 — Pilot | 2–3 wk elapsed | — |

**≈ 10–12 weeks of engineering after Phase 0 clears**, one developer, excluding the deferred design tool (PC-2, XL on its own).

Phase 0 is unbounded and outside engineering control. **Do not commit a launch date until 0.2 and 0.4 have landed** — and say so plainly rather than letting a date harden around a guess. The transcript already contains a pattern of dates being affirmed before the work behind them was scoped; this roadmap should not add to it.

---

## Explicitly out of scope

- **PC-2 on-platform design tool** — deferred. Phase 4.4's template pack covers most of the need at ~2% of the cost. Revisit only if upload abandonment data justifies it.
- **Two-sided postcards** — MVP is one side. Cheap to add later *because* 3.1 is a product registry.
- **Targeted-list mail** — recommended against; saturation-only avoids consumer PII obligations for scope never requested.
- **Influencer Share** — confirm whether it belongs to StreetServe or HonestNeed before scoping. Independent of postcards; not bundled.
- **HonestNeed, Sarah's Foundation, Sphere of Kings** — different products.
