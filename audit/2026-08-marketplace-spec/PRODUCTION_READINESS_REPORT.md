# Production Readiness Report

> **This is the AUDIT's assessment (2026-08-01), not the current state.** It describes the platform
> as it was found, across the six dimensions the audit brief specifies, and it is kept because the
> reasoning is still the reference for *why* each verdict was reached.
>
> For **what is true now**, read [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) — the Phase 8
> result. Most of the gaps below have since been closed; the legal blocker has not.


Assessed across the six dimensions the audit brief specifies. Each carries a verdict, the evidence behind it, and what would change the verdict.

**Overall:** the core marketplace and consignment products are close to launch-ready. **Rent-to-own, consignment rent-to-own, and paid placements are not** — and the reasons are legal and frontend-completeness, not backend quality.

| Dimension | Verdict | Confidence |
|---|---|---|
| Security | **Good** — strong posture, two gaps | High |
| Scalability | **Good** — one known limit | High |
| Maintainability | **Fair** — good code, weakened gates | High |
| Performance | **Good** — budgets enforced | Medium |
| Usability | **Fair** — complete where built, three products unreachable | High |
| Architecture | **Strong** | High |
| **Legal / compliance** | **Blocking** | High |

---

## 1. Security — Good

**Verified in place:**

- **Helmet with a deliberate JSON-API posture** ([app.ts:100](../../../STREET-SERVE-APPLICATION-BACKEND/src/app.ts#L100)): CSP `default-src 'none'`, `frame-ancestors 'none'`, HSTS 180 days with `includeSubDomains`, `no-referrer`, `same-site` CORP. The comment records why — the API serves JSON only, and browser surfaces live on a separate origin with their own CSP. That is the right separation.
- **CORS allowlist** from `env.CORS_ORIGINS`, not a wildcard.
- **Webhooks mounted before the JSON parser** ([app.ts:114](../../../STREET-SERVE-APPLICATION-BACKEND/src/app.ts#L114)) so Stripe/auth/KYC signature verification sees the raw body. This is a common and expensive thing to get wrong; it is right here.
- **Tiered, Redis-backed rate limiting** keyed per account when authenticated and per IP otherwise, with a distinct `money` tier applied to order placement and payment routes.
- **Consistent write-path middleware order:** `rateLimit` → `authenticate` → `requirePermission` → `idempotency` → `validate` (e.g. [orders.routes.ts:22](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/orders/orders.routes.ts#L22)). Zod validation on params and bodies, `.strict()` where seen.
- **Centralized RBAC** in `shared/permissions.ts` with role sets and ownership requirements, rather than per-route ad hoc checks.
- **1 MB JSON body cap.**
- **Rotating HMAC QR tokens** ([hubQr.ts](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/hubQr.ts)) replacing static secrets, with `allow_static_qr` defaulting to `false` for new hubs — closing the "photograph the poster once, reserve stock forever" hole, with explicit grandfathering.
- **Idempotency keys** on money routes and unique-indexed on ledger rows, so a retried charge cannot double-post.
- **Audit logging** (`writeAudit`) on privileged actions, with an admin audit-log endpoint.
- **Immutable financial history** via `immutablePlugin` on settlements, RTO ledger, and RTO statements.
- **Structured logging with correlation IDs**, health and metrics endpoints excluded from access logs.

**Gaps:**

- **S-1 · The messaging transaction gate has no test.** `startThread` was hardened so a customer can only open a thread with a business they have a live booking or order with — closing a real hole (*"there was no check at all, so every business was reachable by anyone"*, [messaging.service.ts:100](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/messaging/messaging.service.ts#L100)). The three tests that touch this path assert the *old* permissive behaviour and now fail with 403. **The fix is correct and completely uncovered.** A future refactor that removes it would turn three tests green and look like progress.
- **S-2 · `requireModule` is effectively untested.** Its one test expects 422 before enabling a module and receives 200, because that module is now on by default for the archetype. Module gating is real access control — the source is explicit that *"the dashboard hiding a tab is presentation, not access control — this is the enforcement."* It currently has no working test.
- **S-3 · No RTO product-category gating** (M-9). §43 requires excluding illegal, unsafe, and heavily regulated products, and **explicitly excludes vehicles** from the standard RTO system. Seller-level and city-level gating exist; category-level does not. A seller approved for furniture is equally approved for a motorcycle.

**Not assessed:** penetration testing, dependency CVE scanning, and secret-management practice were out of scope. `SECURITY_GUIDELINES.md` exists and is referenced throughout the source, which is a good sign but was not independently verified.

---

## 2. Scalability — Good

**In place:**

- **Geospatial indexes** on hubs and placements (`2dsphere`); geohash bucketing for live-session subscriptions; the source notes explicitly that "inventory near me" must be an indexed query, not a full scan.
- **Compound indexes matched to actual query shapes** — `{seller_id, status}`, `{hub_id, status}`, `{expected_return_at, status}` for the overdue sweep, `{expires_at, status}` for the expiry sweep, `{status, next_due_at}` for RTO installments.
- **Atomic conditional `$inc`** for `quantity_sold`, avoiding read-modify-write races on inventory.
- **Work is off the request path.** 20 BullMQ repeatable jobs, deduped by `jobId` so multiple workers are safe. Separate `server.ts` and `worker.ts` entry points allow independent scaling.
- **Batched ad impressions** (`unbilled_impressions`) rather than a write per impression.
- **Prepaid ad budgets**, chosen deliberately over post-pay.
- **Bounded sweeps** — the expiry sweep takes 500 rows per pass rather than the full set.

**Limit:**

- **SC-1 · In-process fee cache** (D-5). 30-second in-memory TTL means N instances can price differently for up to 30 seconds after a schedule change. Harmless single-instance; a live pricing inconsistency the moment the API scales horizontally. Already flagged in-source as the P1 follow-up. Redis is already a dependency.

**Not assessed:** load testing, connection-pool sizing, and Mongo sharding strategy. Sweep cadences (30 s for wave-down SLA, 60 s for stale sessions and proximity) look reasonable but have not been load-modelled.

---

## 3. Maintainability — Fair

**Strong:**

- **Consistent module shape** — `model / repository / service / controller / routes / schema` across 37 backend modules. A developer who learns one learns all.
- **The comments explain *why*, not *what*.** [consignment.model.ts:165](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/consignment/consignment.model.ts#L165) explains why the Trust band is snapshotted; [constants.ts:618](../../../STREET-SERVE-APPLICATION-BACKEND/src/config/constants.ts#L618) explains why "insurance" is a forbidden word; [ads.model.ts:16](../../../STREET-SERVE-APPLICATION-BACKEND/src/modules/ads/ads.model.ts#L16) explains why paid placement is a boost and never a filter. This is unusually good, and it is the main reason this audit could be thorough.
- **Clean typecheck on both repos.**
- **Feature-sliced frontend** (`features/<domain>/{components,hooks,types}`) with route groups mirroring personas.
- **Config over code** for fees and modules.

**Weak:**

- **M-1 · The backend regression gate is down.** 8 of 351 tests fail. Seven are stale; one is unexplained. A normally-red suite stops being read.
- **M-2 · No reachability signal.** Three complete backends have no callers, and nothing surfaced that. See [ARCHITECTURAL_IMPROVEMENTS.md](ARCHITECTURAL_IMPROVEMENTS.md) A-1.
- **M-3 · Schema promises exceed implementation.** Five RTO statuses with no writers; `condition_return` with no writer; `travel_fee_cents` with no reader.
- **M-4 · Money math duplicated across four modules**, about to be stressed by §56.1's four additional split legs.
- **M-5 · Documentation sprawl** — 40 root markdown files on the frontend, 22 on the backend, plus `docs/` and `audit/`, with three overlapping roadmaps and an earlier audit sharing five filenames with this one.

---

## 4. Performance — Good

**In place:**

- **Enforced bundle budgets.** `scripts/check-bundle-budgets.mjs` measures gzipped first-load JS per route from Next's build manifest and fails the build on regression — the same numbers `next build` prints, made enforceable. The script's own note that budgets should *"never [be] loosen[ed] silently"* is the right posture.
- **Lighthouse CI** configured (`lighthouserc.json`).
- **PWA verification script** (`check:pwa`) plus a service worker and offline e2e coverage.
- **A single `verify` script** chaining typecheck → lint → test → build → budgets → PWA check.
- Server-side pagination helpers; bounded query limits.

**Caveats:**

- **P-1 · `npm run verify` does not run in this environment** — Node is not on `PATH` (`'"node"' is not recognized`). Every check must be run manually with the path prepended. Low severity, constant friction, and it is why an initial test run reported failure with no output.
- **P-2 · Lighthouse and bundle budgets were not executed** during this audit (they require a full production build). Their configuration was verified; their current pass/fail state was **not confirmed**.
- **P-3 · Backend test duration is ~5 minutes** with `mongodb-memory-server`. Acceptable for CI, slow enough to discourage local runs — which contributes to D-2.

---

## 5. Usability — Fair

**Strong where built:**

- 108 frontend routes across five persona groups, with dedicated onboarding (role → profile → location → notifications).
- Accessibility is treated as a first-class concern: an `a11y.spec.ts` Playwright suite, `vitest-axe` in unit tests, and a brand palette deepened for AA contrast.
- Offline and PWA behaviour have dedicated e2e coverage.
- Frontend tests all pass (38 files, 182 tests) with a clean typecheck.
- The transparency work is genuinely user-serving: the fee calculator computes from the *same server math as the real payout*, the refund preview shares one function with the actual refund, and the RTO disclosure states plainly that rent-to-own may cost more than buying outright. That last one is a product choosing honesty over conversion.

**Weak:**

- **U-1 · Three products are unreachable.** A customer cannot enter an RTO agreement. A business cannot buy a promotion or see an ad dashboard. Nobody can create a consignment-RTO listing. From a user's perspective these features do not exist.
- **U-2 · Missing customer-protection flows in a product that will ship anyway.** RTO has no voluntary return (§51) and no seller remedies for a missed payment (§50). Delinquency is the only outcome, in direct tension with §50's *"encourage communication before cancellation."*
- **U-3 · Settings that silently do nothing.** A vendor can set a travel fee and never be paid it (F-5).
- **U-4 · The business back office is half-built** — four of ten tools. Users experience a back office as one surface; half of one reads as none, which undercuts the Pro subscription's perceived value.
- **U-5 · A paid badge that may not render.** `verified_badge` at $9.99/mo is purchasable; no component was found that renders it (P-19). **Could not confirm either way.**

---

## 6. Architecture — Strong

Covered in [ARCHITECTURAL_IMPROVEMENTS.md](ARCHITECTURAL_IMPROVEMENTS.md). In short: server-authoritative money, immutability where history matters, snapshotted terms, funding-source-aware payouts, config-driven fees, and a disclosed-boost-never-filter constraint on paid placement. The recommendations are refinements, not corrections.

---

## 7. Launch gate

### Hard blockers — must clear before RTO / consignment-RTO ship

| # | Blocker | Owner | Ref |
|---|---|---|---|
| B-1 | Attorney-reviewed text for all four agreements | Legal | M-1, §60 |
| B-2 | RTO disclosure + acceptance UI — or RTO feature-flagged off | Frontend | M-2 |
| B-3 | RTO voluntary return (§51) and seller remedies (§50) | Backend + FE | M-3, M-4 |
| B-4 | RTO category gating excluding vehicles and regulated goods | Backend | M-9, §43 |

### Hard blockers — before enabling any customer-facing processing fee

| # | Blocker | Ref |
|---|---|---|
| B-5 | `processingRetainedCents` must report real retained fees | F-1 |

### Should clear before general launch

| # | Item | Ref |
|---|---|---|
| B-6 | Green backend suite; cover the messaging and module gates | F-6, S-1, S-2 |
| B-7 | Product owner can terminate a consignment | F-2, §37 |
| B-8 | Travel fee charged, or removed from settings | F-5 |
| B-9 | Run and record Lighthouse + bundle budgets | P-2 |
| B-10 | Outbound email/SMS for contractual notices | A-9 |

### Safe to launch as-is

Core marketplace (orders, quotes, refunds, payouts), consignment (the full chain of custody, settlement, and Trust system), live map and Wave Down, queues, bookings, messaging, reviews, disputes, the ledger, tax statements, subscriptions, academy, and the shelter program. These are the most-tested and most-complete parts of the system.

---

## What would change the verdict

**To move Security from Good to Strong:** cover the two untested gates (S-1, S-2) and add RTO category gating (S-3).

**To move Maintainability from Fair to Good:** green the suite and add the reachability gate. Both are days, not weeks — this rating is held down by process gaps, not by code quality.

**To move Usability from Fair to Good:** ship the three missing frontends. The rating reflects unreachable products, not poor design of what exists.
