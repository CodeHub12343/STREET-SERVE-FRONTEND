# StreetServe — Performance & Scalability Recommendations

> Scalability considerations for the new spec's surfaces, plus observed hotspots. `[Observed]` grounded in source; `[Verify]`/`[Design]` forward-looking. Impact: 🔴 hot-path · 🟠 moderate · 🟡 minor.

---

## Observed

**P1 · 🟠 [Observed] — Per-charge fee lookup queries the DB.**
`payments.service.platformFeeBps()` runs `FeeScheduleModel.findOne().sort({version:-1})` on **every** charge. Fee schedule changes rarely.
**Recommend:** cache the effective fee schedule in Redis (already a dependency) with invalidation on new version; or load at startup + subscribe to change events. Low effort, removes a DB hit from the money hot-path.

**P2 · 🟡 [Observed] — Reconciliation pulls a fixed page of balance transactions.**
`reconcile()` uses `listBalanceTransactions({limit:100})` — fine now, but won't scale to full-day volume.
**Recommend:** paginate/cursor through balance transactions and reconcile by window; run in BullMQ off the request path (it already is a job-shaped task).

## Real-time (highest scale risk)

**P3 · 🟠 [Observed/Design] — Live map fan-out.**
`GEOHASH_PRECISION=6` bucketing + `LIVE_SESSION_TTL_SEC=60` + 10s snapshots is a sound design. At scale the risks are Socket.IO room fan-out and Redis pub/sub volume.
**Recommend:** confirm the Redis adapter is used for multi-instance Socket.IO; subscribe clients to geohash *cells* (already the design) not global; batch location broadcasts at the snapshot interval rather than per-ping; load-test presence with N vendors/M viewers. **[Verify]**

**P4 · 🟠 [Design] — Wave-Down + Queue notification storms.**
Pop-up events and block-party broadcasts (`BLOCK_PARTY_BROADCAST_RADIUS_M ~1mi`) can fan out widely.
**Recommend:** the throttles exist (`PROXIMITY_ALERT_THROTTLE_SEC=7200`, `PING_DAILY_CAP`) — ensure they're enforced server-side before enqueueing pushes; coalesce notifications; push via BullMQ with rate control.

## New commerce surfaces (design for scale up front)

**P5 · 🟠 [Design] — RTO installment scheduler.**
RTO (R21) implies many scheduled installment charges + reminders (14/7/3-day notices for consignment too, R15).
**Recommend:** use BullMQ **repeatable/delayed jobs** keyed by due date, not a polling sweep over all agreements; idempotent charge per (agreement, installment#); dead-letter for failed charges → missed-payment state machine. Index installment ledgers on `(agreement_id, due_at, status)`.

**P6 · 🟡 [Design] — Consignment expiry sweeps.**
`InventoryCheckout` already indexes `expected_return_at, status` for overdue sweeps — reuse this pattern for consignment-term expiry (R14/R15) rather than full scans.

**P7 · 🟡 [Design] — Fee calculator / earnings aggregation.**
Seller earnings + calculator (R12) should read pre-aggregated settlement totals, not aggregate raw transactions on each load.
**Recommend:** maintain rolling daily/weekly aggregates (a job) or use covered indexes on `Settlement`; the immutable ledger makes safe incremental aggregation easy.

## Frontend

**P8 · 🟡 [Verify] — PWA/map bundle weight.**
Mapbox 3D hero + live map are heavy. `next.config.mjs` + existing perf work (Lighthouse CI `lighthouserc.json`) suggest this is tracked.
**Recommend:** confirm map libs are dynamically imported/route-split; keep the marketing hero and the functional map on separate bundles.

---

## Priority
| # | Rec | Impact | Effort | When |
|---|---|---|---|---|
| P1 | Cache fee schedule (Redis) | 🟠 hot-path | S | Now (cheap) |
| P3 | Verify Socket.IO Redis adapter + load test | 🟠 | M | Before scale |
| P5 | RTO scheduler on BullMQ delayed jobs | 🟠 | M | At RTO design |
| P4 | Enforce notification throttles server-side | 🟠 | S | Before wide launch |
| P2 | Paginate reconciliation | 🟡 | S | Before volume |
| P6/P7 | Index-driven sweeps + aggregates | 🟡 | S–M | At consignment/earnings build |
| P8 | Confirm map bundle splitting | 🟡 | S | Now [NV] |

**Overall:** no current 🔴 hot-path problem; the design already reflects scale-awareness (geohash bucketing, TTLs, throttles, immutable ledgers, BullMQ). The main forward work is **caching the fee lookup** and **designing RTO/consignment scheduling on delayed jobs** rather than sweeps.
