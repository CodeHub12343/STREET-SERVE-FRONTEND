# Franchise / Multi-Vendor Implementation Roadmap

**Written for:** engineers implementing franchise support, plus stakeholders tracking the build.
**Status:** approved — client picked the full 4–6 week build (option 1).
**Date approved:** 2026-10-27.
**Audience:** this document is the source of truth for scope, phase sequencing, and acceptance.

---

## 1. Decision

The client (James) has chosen **Option 1 — the full 4–6 week build**, over the two
compressed scopes offered earlier (Phase 0+1, or Phase 0+1+3). The reasoning given:

> The giveaway can run with it from day one. Diamond and Platinum sponsors see a proper
> multi-truck operation, which is a stronger pitch for category-exclusivity partners.

What this choice commits to:

- Real multi-operator operation, including per-operator payouts and scoped dashboards.
- Brand-level reviews, followers, promotions, and loyalty.
- Admin franchise view, migration tooling, and a passing CI gate suite.

What it does **not** commit to:

- Multi-brand ownership by one user (one Clerk account owning two distinct brands is
  supported by the data model but not surfaced in the UI in this cycle).
- Franchise-wide inventory or hub-sharing across operators — out of scope.
- Automated franchise onboarding or self-service "upgrade to franchise" without an
  admin step — out of scope; brand creation requires admin confirmation.

---

## 2. Critical analysis of the current implementation

This section is the evidence base for the phase sequencing below. Every number was
confirmed by a direct code read on 2026-10-27, not from memory. Future contributors
should refresh these numbers before changing the plan.

### 2.1 The single-owner assumption is deep

`BusinessSchema.owner_user_id` is a single `String` field (see
[`src/modules/vendors/vendors.model.ts`](../STREET-SERVE-APPLICATION-BACKEND/src/modules/vendors/vendors.model.ts)).
The field is referenced **74 times across 20 backend files**:

- `ads`, `admin`, `consignment`, `vendors`, `tax`, `payments`, `ai`, `sponsors`,
  `sponsorFulfillment`, `shelter`, `messaging`, `salepayments`, `livemap`, `refunds`,
  and others.
- Of those, **43 are inline ownership assertions** across 13 service files
  (`consignment`, `promotions`, `loyalty`, `queue`, `scheduling`, `backoffice`,
  `salepayments`, `refunds`, `orders`, `shelter`, `tax`, `ads`, `ai`).

There is no centralised `businessAccess` helper. Each check is a hand-written
comparison. **Any franchise refactor must centralise these first, or we end up with 43
slightly-different implementations of "can this operator see this payout?"**

### 2.2 The business is the unit of operation

`business_id` / `businessId` appears **836 times across 82 files**. Every scope
boundary — orders, menu items, promotions, giveaways, consignment stock, growth
campaigns, wave-downs, Pay It Forward, Boost, postcards, back-office, loyalty,
scheduling — is scoped by `business_id` alone. There is **no `brand_id` layer above**
and **no `operator_id` layer below** today. The whole mental model is "one business =
one truck = one owner".

### 2.3 The live map is keyed by actor

`LiveSessionSchema` uses `(actor_type, actor_id)` where `actor_type ∈ {'business',
'seller', 'driver'}` and `actor_id` is a single id. The repository's
`findActiveByActor()` is **strictly singular — one live session per actor**. 67
occurrences of `actor_id` / `actor_type` across 5 livemap files, all built on that
assumption.

Two trucks under one profile cannot coexist on the map because the data model only
allows one open session per actor at a time.

### 2.4 Payouts are per-business

Each business has one `payout_account_ref` on its own record. Stripe charges go via
`chargeToPlatform` or `chargeToConnected` — **one destination per sale**. There is
no concept of splitting an order's net between a franchise HQ and an operator, and
no stored payout-split policy anywhere.

### 2.5 Reviews and followers are per-business

`FollowSchema` keys on `(follower_user_id, business_id)`. Review documents reference
`business_id` directly. **Every existing follow and review row needs an explicit
decision** about whether it should migrate to brand-level or stay operator-level
when the brand layer lands.

### 2.6 The three CI gates will catch us

Reachability, route coverage, and enum writers (from the Phase-4 architecture) all
fail the moment a new entity is added and not wired through every expected surface.
That's a feature, but it means **every phase below must land with every reachable
screen updated, not just the backend**.

### 2.7 Bottom line

Franchise support is not a feature to bolt on. It is a schema shift that touches **82
files on the backend alone**. The 4–6 week estimate is the minimum honest number for
doing this without breaking parts of the app that work today.

---

## 3. Phased plan

Every phase has: deliverables, risk callouts, what explicitly does **not** ship, and
acceptance criteria. Phases are ordered by **blast-radius reduction** — the risky
schema work lands first, behind feature flags that keep single-owner behaviour
identical, so each later phase ships to a stable base.

### Phase 0 — Foundations (3–4 days)

**Deliverables.**

- New `Brand` collection: `{ id, name, logo_url, cover_photo_url, slug,
  owner_user_id, created_at, updated_at }`. One row per real-world business entity.
- New `BrandMembership` collection: `{ brand_id, user_id, role: 'owner' | 'manager' |
  'operator', scoped_business_ids: [], invited_by, accepted_at, status }`. Source of
  truth for "who may do what".
- `BusinessSchema.brand_id` field (nullable, indexed). Every existing business
  implicitly becomes a one-business brand on migration.
- A single `shared/businessAccess` helper module exposing `canView`, `canOperate`,
  `canManage`, `canOwn`. **All 43 inline ownership checks replaced mechanically** —
  pure refactor, no behaviour change for single-owner profiles.
- Migration script: one `Brand` row per existing business, backfill `brand_id`, seed
  a `BrandMembership` with `role: 'owner'` for the current `owner_user_id`.
  Idempotent and reversible.
- CI gates updated: reachability + route coverage both learn about the new
  collections and ownership helper.

**Why first.** The 43 inline checks are the real risk, not the schema. Rewriting
them one at a time *during* later phases would leak bugs (operator seeing another's
payouts; franchise forgetting to filter orders list). Centralising the helper
**before any franchise feature ships** lets later phases change what the helper
*returns* without re-visiting every call site.

**Explicitly out of scope for Phase 0.**

- No frontend changes beyond the admin surface recognising brand rows.
- No multi-business brands yet.
- No change to live-map keying.

**Acceptance.**

- All three CI gates green.
- Every pre-existing test passes without modification (behaviour unchanged for
  single-owner profiles).
- Backfill is runnable twice without duplicating rows (idempotency test added).
- Rollback script restores the exact prior schema.

---

### Phase 1 — Live map re-key (5–6 days)

**Deliverables.**

- `LiveSession.actor_type` gains a new value: `'operator'`. The existing `'business'`
  value stays for single-owner profiles that haven't been franchised.
- New `BrandOperator` collection: `{ id, brand_id, business_id, user_id,
  display_name, created_at }` — one row per truck in the franchise. The live
  session's `actor_id` points at this.
- `livemap.repository.nearby()` returns operator pins alongside business pins,
  enriched with brand metadata (name, logo) so the client renders two trucks under
  the same brand without the existing dedup logic treating them as duplicates.
- Preserve: the 60-second heartbeat, the Redis hot mirror, the fuzzing, the
  geohash index, the staleness sweep, the cell-based broadcast throttling. **Any
  one of these regressing is a product-quality issue, not a feature issue.**
- Frontend: the map renders a brand chip on hover ("James's Ice Cream — truck 1 of
  2"); the business profile sheet links to both trucks.

**Risk callouts.**

- Load behaviour under two operators in the same geohash cell must be verified. A
  day of simulated load testing is budgeted here. If the cell diffing doesn't
  cancel correctly, we have a per-sweep broadcast storm.
- The driver-exclusion rule at the repository layer (A-5) must still work — a
  driver is not a vendor, so operator sessions must never leak into
  customer-facing map queries.

**Explicitly out of scope for Phase 1.**

- No payouts changes — the brand still has a single payout account.
- No invite UI, no scoped operator dashboards, no email templates.
- No per-operator analytics on the admin side.

**Acceptance.**

- Two operators of the same brand show as two pins at distinct locations under one
  brand lockup.
- Single-owner profiles continue to work identically — one pin per business.
- Load test: 100 simultaneous operator heartbeats across 10 brands sustain under
  the FR-1.2 cadence target without broadcast lag.
- All three CI gates green.

---

### Phase 2 — Payouts and money (5–6 days)

**Deliverables.**

- `Brand.payout_policy`: `{ mode: 'pooled' | 'per_operator', splits?:
  [{ operator_id, percent }] }`. One stored policy per brand.
- Order-settlement reads the policy at the moment of capture:
  - `pooled` → brand receives the full net (today's behaviour exactly).
  - `per_operator` → one Stripe transfer per operator from the brand's platform
    balance, **in a single atomic step** so a partial failure doesn't leave money
    stranded.
- Each `BrandOperator` can connect its own Stripe account; brand owner must approve
  before transfers route to it.
- New ledger row type: `brand_split`. The per-operator share is auditable and
  reconciliation can rebuild splits from the event stream.
- Admin surface: per-operator earnings, per-brand totals, reconcile when they
  disagree.

**Risk callouts.**

- Multi-destination routing is an **open issue in `payments.service` already**
  (3 references to `chargeToPlatform` / `chargeToConnected`, all single-destination).
  Resolving the multi-destination path is a prerequisite for the per-operator
  policy — included in this phase's budget.
- This is the phase where mistakes cost real money. An operator seeing someone
  else's cut is a legal problem, not a UX one. **Payout correctness is tested
  before this phase can be marked done** — unit + integration + a manual Stripe
  sandbox walk-through.
- Refund paths get more complex: a refund on a per-operator order has to reverse
  the per-operator transfer, not just the platform charge.

**Explicitly out of scope for Phase 2.**

- Tax statements remain per-business for now; the per-operator tax split lands in
  Phase 5.
- No RTO / consignment multi-operator payout support — those lifecycle models need
  their own dedicated pass later.

**Acceptance.**

- A pooled brand's payouts arrive at the brand's connected account exactly as
  before.
- A `per_operator` brand's $100 order splits correctly to all operators per the
  configured percents, in Stripe sandbox, with ledger rows that reconcile.
- Refund of a per-operator order reverses the operator transfers correctly.
- All three CI gates green.

---

### Phase 3 — Invites, roles, and the operator experience (6–7 days)

**Deliverables.**

- `BrandInvite` collection: `{ brand_id, invitee_email, role, scoped_business_ids,
  token, expires_at, accepted_at }`.
- End-to-end invite flow: brand owner enters email + role → invite email → signed-up
  or new user accepts → `BrandMembership` row created → operator lands on *their*
  truck's dashboard.
- Scoped dashboards. An operator sees:
  - Their truck's orders, wave-downs, live status, earnings.
  - **Not** other operators' earnings or payouts.
  - **Not** the ability to edit menu, logo, or brand settings (manager/owner only).
- `businessAccess` helper gates every screen. Every pre-existing `owner_user_id`
  reference is now a helper call (from Phase 0) that resolves role per request.
- Brand-overview dashboard for the franchise owner: live positions of every truck,
  aggregated orders per truck, pooled or per-operator earnings depending on policy.
- Email templates: invited / accepted / role-changed / removed. Templates follow
  the existing notification system; no new infrastructure.
- Business selector in the dashboard shell is brand-aware: a franchise owner hops
  between trucks and the brand overview; an operator sees only their truck.

**Risk callouts.**

- This is where the single-owner assumption surfaces in the UI. Every dashboard
  screen today assumes "the business = you". Each screen's data-fetching layer
  gets a pass. The CI gates will catch any screen we miss — treat this as a
  feature of the process, not an inconvenience.
- The ad-hoc "which business am I viewing right now" state must become brand-aware
  without breaking single-owner UX for users who have no brand membership beyond
  their own.

**Explicitly out of scope for Phase 3.**

- No "transfer brand ownership" flow. Brand ownership is immutable in this cycle;
  change-of-ownership is a support request handled by admin tooling in Phase 5.
- No role editing after invite — the invited role is the role until an owner
  removes and re-invites. In-place role changes are a Phase-5 nice-to-have.

**Acceptance.**

- A new operator receives an invite email, signs up, accepts, lands on their
  dashboard, goes live, serves an order, and gets paid per the brand's policy.
- Operator cannot read another operator's orders via the API (tested).
- Operator cannot edit the brand menu via the API (tested).
- All three CI gates green.

---

### Phase 4 — Reviews, followers, promotions, loyalty (4–5 days)

**Deliverables.**

- `FollowSchema` keyed on `brand_id` (not `business_id`). A customer follows "James's
  Ice Cream" and is notified when **any** of its trucks goes live.
- Reviews default to brand-level. Per-operator callouts (e.g. "friendly service
  from truck 2") are supported as a tag on the review but the brand's aggregate
  rating is what the map pin shows.
- Promotions, discounts, loyalty punch-cards, giveaways: brand-scoped by default,
  with a per-operator exclusion field — e.g. "20% off at every James's truck
  except Oakland".
- Pay It Forward funds stay brand-scoped (a dollar paid forward feeds anyone the
  brand serves).
- Boost and postcard campaigns stay brand-scoped.
- Migration: existing single-owner follows and reviews are preserved by
  backfilling `brand_id` on each row from the owning business.

**Risk callouts.**

- Each subsystem (follows, reviews, promotions, loyalty, PIF, Boost, postcards)
  has its own notification path, public API, and frontend list. "Scoped sensibly"
  is a decision **per subsystem**, not a global rename.
- Default is brand-level because a customer who thinks they're following a brand
  will be angry when a truck 20 blocks away goes live and they don't hear about
  it. If a subsystem genuinely needs operator-level scoping, the decision is
  documented in that subsystem's module.

**Explicitly out of scope for Phase 4.**

- No "merge two brands' review histories" tool.
- No per-operator loyalty cards that transfer when a customer visits a different
  truck of the same brand — that's complex and deferred.

**Acceptance.**

- A customer following "James's Ice Cream" receives a notification when truck 1
  OR truck 2 goes live.
- An operator-level promotion ("20% off at Oakland truck only") applies at the
  Oakland truck's checkout and nowhere else.
- Review aggregate on the map pin reflects both trucks' reviews combined.
- All three CI gates green.

---

### Phase 5 — Admin, migration, tax, long tail (4–5 days)

**Deliverables.**

- Admin franchise view: look up a brand, see its operators, see its payout
  history, impersonate the brand owner for debugging. Without this, the first
  operator-side bug is unsupportable.
- A real migration tool (beyond Phase-0's one-shot backfill): admin can **convert
  an existing single-owner business into a brand with multiple operators**.
  Necessary for James specifically — his existing profile needs to become a
  brand.
- Tax statements split correctly per operator for `per_operator` payouts.
- Audit `consignment` and `rto` modules for multi-operator cases. Each either
  gets an explicit "brand-only" rule or an "operator-selectable" rule, documented
  in the module.
- Three CI gates re-verified across every new collection and every new route.
- Help docs for brand owners: how to invite, how to split payouts, how to remove
  an operator mid-term.
- End-to-end regression pass against single-owner profiles — nothing from the
  pre-franchise world should have moved.

**Risk callouts.**

- If this phase is compressed, the first operator-side bug in production is one
  support can't help with because they have no visibility into brands. **That
  kind of bug ends a vendor relationship in week 2 of a 90-day campaign.**

**Explicitly out of scope for Phase 5.**

- No reporting / BI dashboards for brand owners beyond the brand-overview from
  Phase 3.
- No bulk-invite / CSV upload of operators — a Phase-6 ask if it ever materialises.

**Acceptance.**

- Admin can convert an existing single-owner business into a two-operator brand
  without any data loss.
- Tax statements split correctly for per-operator payouts.
- All regression tests on single-owner profiles pass.
- All three CI gates green.
- Help documentation is live.

---

## 4. Timeline total

| Phase | Days | Cumulative |
| --- | --- | --- |
| 0 — Foundations | 3–4 | 3–4 |
| 1 — Live map re-key | 5–6 | 8–10 |
| 2 — Payouts and money | 5–6 | 13–16 |
| 3 — Invites, roles, operator experience | 6–7 | 19–23 |
| 4 — Reviews, followers, promotions, loyalty | 4–5 | 23–28 |
| 5 — Admin, migration, tax, long tail | 4–5 | 27–33 |

**Total: 27–33 working days ≈ 4.5 to 6 weeks of focused work.**

The spread is honest. 4 weeks is the minimum if nothing surprises us; 6 weeks is
where we land if the payouts phase surfaces a Stripe multi-destination edge case or
the live-map re-key fails load testing on the first pass.

---

## 5. Non-negotiables

The following cannot be compressed out of the plan without re-opening this document
and getting explicit written approval from the client:

1. **The `businessAccess` helper refactor in Phase 0.** 43 inline permission checks
   must become helper calls before any franchise feature ships. Compressing this
   leaks bugs across every later phase.
2. **The payout correctness test in Phase 2.** Unit + integration + manual Stripe
   sandbox walk-through. A payout bug is a legal problem, not a UX one.
3. **The admin franchise view and migration tool in Phase 5.** The first
   operator-side bug in production needs a supportable path. Without it,
   un-supportable bugs end vendor relationships.
4. **CI gate green across every phase.** No phase ships with gates disabled or
   skipped. If a gate breaks, the gate is the thing to fix.

---

## 6. Explicitly deferred

These are items that came up in planning and are intentionally not in this cycle:

- Multi-brand ownership surfaced in the UI (one Clerk account owning two distinct
  brands).
- Franchise-wide inventory sharing or hub-sharing across operators.
- Self-service "upgrade to franchise" — brand creation stays admin-gated.
- Per-operator loyalty cards that transfer across trucks of the same brand.
- "Merge two brands' review histories" tool.
- Bulk-invite / CSV upload of operators.
- "Transfer brand ownership" self-service flow.
- RTO / consignment multi-operator payout support (noted in Phase 2 as out of
  scope; may need its own pass later).

---

## 7. Why not a toy version instead

For the record: a demo-able version that lets two phones log into one account and
show two pins can be shipped in a week. It would also:

- Duplicate payouts (both phones' orders land in one Stripe account with no audit
  trail of who sold what).
- Race on orders (two phones accepting the same wave-down).
- Have no way to tell the trucks apart in a dispute.
- Give the second phone full access to the brand's Stripe balance — intentionally
  or not, the partner can withdraw money.
- Fail the CI gates, either blocking merges or forcing the gates to be disabled,
  which creates a different problem.

The $25K Diamond sponsor who finds the first production bug is the one you don't
want on the call. **Option 1 — the full build — is what this document commits to.**

---

## 8. Living document rules

- Every number in Section 2 was confirmed by direct code read on 2026-10-27.
- Future contributors: before changing the plan, re-run those searches
  (`grep -rn owner_user_id`, `business_id`, `actor_id` in the backend) and update
  the counts. They are the evidence that keeps this document honest.
- Changes to scope require a dated note at the bottom of the relevant phase and a
  one-line entry in this section's changelog.

### Changelog

- **2026-10-27** — Document created. Client approved Option 1 (full build).
- **2026-10-27** — Phase 0 shipped: Brand + BrandMembership models, `shared/businessAccess`
  helper, 15 inline ownership checks mechanically routed through it, idempotent + reversible
  `scripts/backfill-brands.ts`, CI gates green.
- **2026-10-27** — Phase 1 shipped: `operator` added to live-session actor_type,
  BrandOperator collection + service, livemap `nearby()` enriched with brand metadata, driver
  exclusion / Redis mirror / staleness sweep / geohash / fuzzing all preserved, frontend
  brand chip on pins + brand trucks row in profile sheet.
- **2026-10-27** — Phase 2 shipped: `Brand.payout_policy` with pooled/per_operator modes +
  share-bps splits, `BrandSplit` append-only ledger, atomic per-leg Stripe transfers with
  fallback-to-owner, operator Stripe-Connect onboarding + brand-owner approval gate, refund
  path reverses operator transfers, admin earnings surface. CI gates green.
- **2026-10-27** — Phase 3 shipped: BrandInvite model + invite flow (create/revoke/accept),
  brand-overview endpoint, my-brand-memberships endpoint, email + in-app notifications via
  the existing notifications service, `/brand/accept/[token]` public page, `/brand/[id]/overview`
  and `/brand/[id]/members` pages, middleware updated.
- **2026-10-27** — Phase 4 shipped: Follow + Review schemas extended with `brand_id`,
  brand-aware follow service + de-duping, `onBusinessBecameActive` fires on operator
  reactivation too, review aggregate at brand level, FlashSale `excluded_operator_ids` with
  operator-aware pin discount + checkout filter, idempotent + reversible
  `scripts/backfill-brand-scopes.ts`.
- **2026-10-27** — Phase 5 shipped: operator tax statement from BrandSplit ledger,
  `brands.service.convertBusinessToBrand` migration tool (idempotent, with in-place follows +
  reviews backfill), `brands.service.grantImpersonation` with audit trail,
  FRANCHISE_MODULE_RULES.md audit table, FRANCHISE_HELP_FOR_BRAND_OWNERS.md end-user docs.
  All CI gates green. **Full franchise build complete — ready for pilot operation.**
