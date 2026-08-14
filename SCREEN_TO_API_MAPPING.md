# StreetServe — Screen → API Mapping

> For every screen: the REST endpoints it calls, the Socket.IO events it subscribes to, the TanStack Query keys / mutations it uses, and any money/idempotency concerns.
> Endpoints verified against the **real backend routes** (`src/modules/*/*.routes.ts`, `src/app.ts` mounts) — not only `API_SPECIFICATION.md`. Base = `/api/v1`. 💳 = idempotency-key required. ⚡ = socket-driven.
> Companion: [FRONTEND_FEATURE_INVENTORY.md](FRONTEND_FEATURE_INVENTORY.md), [SCREEN_TO_COMPONENT_MAPPING.md](SCREEN_TO_COMPONENT_MAPPING.md), [REALTIME_IMPLEMENTATION.md](REALTIME_IMPLEMENTATION.md), [DATA_FETCHING_STRATEGY.md](DATA_FETCHING_STRATEGY.md).

---

## 0. Conventions

- **REST** column lists method + path. All authed calls carry `Authorization: Bearer <clerk jwt>`.
- **Socket** column lists namespace → event (server→client) the screen listens for.
- **Query key** references the central registry (`lib/query/keys.ts`) — see [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md).
- ⚠️ marks a dependency on an **open backend gap** (GAP-n in `FRONTEND_FEATURE_INVENTORY.md §N`).

---

## 1. Onboarding & Auth (C-01…C-09, S-02, V-01, H-01)

| Screen | REST | Socket | Mutations / notes |
|---|---|---|---|
| C-02 Welcome | — | — | static |
| C-03/04 Sign-in/OTP | *(Clerk-hosted)* → then `GET /users/me` | — | Clerk owns OTP; JIT user upsert server-side |
| C-05 Profile basics | `PATCH /users/me` | — | `keys.me` invalidate on success |
| C-06 Role intent | `POST /auth/roles` | — | additive; refetch `keys.me` |
| C-07 Location primer | — (then browser geolocation) | — | precision pref → `PATCH /users/me` |
| C-08 Notif primer | ⚠️`POST /users/me/push-tokens` (GAP-4) | — | register FCM token after grant |
| S-02 Seller verify | `POST /verification/id-document`, `POST /verification/selfie-liveness`, `POST /verification/bank-account`, `GET /verification/status` | `/notifications` → `notify` (tier change) | provider-hosted redirects; async status |
| V-01 Vendor register | `POST /businesses`, `POST /businesses/:id/license-documents`, `POST /businesses/:id/payouts/onboard`, `GET /catalog/categories` | — | Stripe Connect hosted onboarding link |
| H-01 Hub register | `POST /businesses/:id/register-hub` | — | extends V-01 |

## 2. Map & Discovery (C-10…C-17)

| Screen | REST | Socket | Notes |
|---|---|---|---|
| C-10 Map Home | `GET /map/nearby?lat&lng&radius&category&search&cursor` · `GET /catalog/categories` | ⚡`/live` → `pin:update`, `pin:remove`, `block_party` | subscribe geohash cells for viewport; `keys.mapNearby(bbox,cat)` |
| C-11 Search results | `GET /map/nearby?search=` | ⚡`/live` | recent searches from local storage |
| C-12 List view | `GET /map/nearby` (same data, list render) | ⚡`/live` | a11y parity; sort client-side by distance/status |
| C-13 Category More | `GET /catalog/categories` | — | full taxonomy |
| C-14 Business profile | `GET /businesses/:id` · `GET /trust-scores/business/:id` · `GET /businesses/:id/reviews` (summary) | ⚡`/live` pin status for this business | public read; `POST /businesses/:id/follow`, `POST /businesses/:id/notify-me` |
| C-15 Menu | `GET /businesses/:id/menu` | — | Today's Special flag on items |
| C-16 Reviews + composer | `GET /businesses/:id/reviews` · `POST /reviews` | — | composer gated to a completed `transactionId` |
| C-17 Block Party | `GET /map/nearby?event=` | ⚡`/live` → `block_party` | V1.x |

## 3. Wave Down, Queue & Orders (C-18…C-27)

| Screen | REST | Socket | Notes |
|---|---|---|---|
| C-18 Wave confirm | `POST /wave-downs` | — | server-timestamped; starts SLA countdown |
| C-19 Wave active | `GET /wave-downs/:id` (catch-up) | ⚡`/queue` → `wave:accepted`, (decline/expire via `notify`) | live ETA/tracking |
| C-20 Queue status | `GET /queues/:ownerId` · `POST /queues/:ownerId/join` · `DELETE /queues/:ownerId/leave` | ⚡`/queue` → `queue:update`, `popup:delay` | locked discount at join; hold timer |
| C-21 Order review | `GET /businesses/:id/menu` (cart build) | — | discount line computed server-side on transaction |
| C-22 Payment 💳 | `POST /transactions` (or `POST /orders`) · `POST /transactions/:id/round-up` | ⚡`/notifications` payment result | Stripe Elements + `Idempotency-Key`; **[Elements]** |
| C-23 Order tracking | `GET /orders/:id` | ⚡`/notifications` → order status; `/queue` if window | pending→accepted→ready; `POST /orders/:id/cancel` |
| C-24 Receipt | `GET /orders/:id` / `GET /transactions/:id` | — | itemized fee split |
| C-25 Orders history | `GET /orders/mine` · `GET /transactions/mine` · `GET /bookings` | — | unified + filter chips; merge client-side |
| C-26 Booking 💳 | `GET /businesses/:id/availability` · `POST /bookings` | — | pay step **[Elements]**; cutoff-checked |
| C-27 Booking detail | `GET /bookings/:id` · `PATCH /bookings/:id` · `DELETE /bookings/:id` | ⚡`/notifications` reminders | reschedule/cancel |

## 4. Gifting & Spot Me (C-28…C-30) — V1.x

| Screen | REST | Socket | Notes |
|---|---|---|---|
| C-28 Gift flow 💳 | `POST /gifts` | — | returns redemption code |
| C-29 Gift redeem | `POST /gifts/:code/redeem` | — | recipient may be guest |
| C-30 Spot Me | `POST /spot-me` · `POST /spot-me/:id/decide` · `POST /spot-me/:id/repay` | ⚡`/notifications` | 422 if <30d/<bronze — show gate, not dead end |

## 5. Favorites, Messages, Profile (C-31…C-38)

| Screen | REST | Socket | Notes |
|---|---|---|---|
| C-31 Favorites | `GET /users/me/favorites` · `POST/DELETE /businesses/:id/follow` · `POST /businesses/:id/notify-me` | ⚡`/live` (status of followed) | live status chips |
| C-32 Messages | `GET /message-threads/mine` | ⚡`/messages` → `message:new` (unread badges) | thread list |
| C-33 Message thread | `GET /message-threads/:id/messages` · `POST /message-threads/:id/messages` | ⚡`/messages` → `message:new`, `message:read`, `messages:typing` | ConversationView; rate-limited send |
| C-34 Profile | `GET /users/me` | — | tier chip, entry points |
| C-35 Wallet | `GET /transactions/mine` · `GET /pings/mine` · `GET /spot-me` (obligations) ⚠️(GAP-5 compose) | — | payment methods via Stripe; tips V1.x |
| C-36 Verification center | `GET /verification/status` | ⚡`/notifications` tier change | tier ladder; pending/rejected |
| C-37 Settings | `GET/PATCH /users/me/notification-preferences` · `PATCH /users/me` (precision, theme) | — | safety-critical categories un-mutable |
| C-38 Help & support | `POST /disputes` · `GET /disputes/:id` · `POST /disputes/:id/evidence` | ⚡`/notifications` dispute updates | dispute entry point |

## 6. Seller mode (S-01…S-14)

| Screen | REST | Socket | Notes |
|---|---|---|---|
| S-01 Intro | — | — | static pitch |
| S-03 Discover inventory | `GET /products/nearby?lat&lng&radius&category` | ⚡`/live` (hub pins) | MapShell variant; `keys.productsNearby` |
| S-04 Product detail | `GET /hubs/:id/products/:productId` (or product detail) · `POST /seller-agreement` (clickwrap) | — | Seller Agreement gate before reserve |
| S-05 Reservation confirm | `POST /checkouts` (reserve) | — | qty, pickup window |
| S-06 QR checkout 💳 | `POST /storage/upload-url` (condition photo) → PUT → `POST /checkouts` finalize | ⚡`/notifications` | camera + QR; `Idempotency-Key`; offline-queue V1.x |
| S-07 My Inventory | `GET /checkouts/mine` | ⚡`/notifications` return reminders | urgency states from return deadline |
| S-08 Log a sale 💳 | `POST /checkouts/:id/sales` | ⚡`/notifications` | **409 oversell block**; `Idempotency-Key` |
| S-09 Return flow | `POST /storage/upload-url` (photos) → `POST /checkouts/:id/return` | — | reconcile preview |
| S-10 Settlement | `GET /checkouts/:id/settlement` · `GET /trust-scores/seller/:id` | ⚡`/notifications` payout | gross−fee−hub=net; Trust delta |
| S-11 AI Assistant | `GET /ai/recommendations/products` · `GET /ai/recommendations/locations` · `GET /ai/pricing-suggestion` | — | one card at a time |
| S-12 Sales coaching | `POST /ai/sales-coaching` | — | V1.x; objection→script |
| S-13 Earnings | `GET /checkouts/earnings` (settlements **+ `jobPayouts`** — gig pay merges into the same feed) | — | daily/weekly totals |
| S-14 Jobs | `GET /jobs/nearby` · `GET /jobs/mine` · `POST /jobs/:id/apply` · `POST /jobs/:id/check-in` (coords **or** `qrToken`) · `POST /jobs/:id/check-out` 💳 | ⚡`/notifications` | geofence + QR fallback |
| S-15 Seller analytics | `GET /checkouts/analytics` | — | sell-through, velocity, credit headroom |
| V-13 Employer gigs | `POST /jobs` · `GET /jobs/posted` · `GET /jobs/:id/applicants` · `GET /jobs/:id/qr` · `POST /jobs/:id/no-show` · `POST /jobs/:id/cancel` | ⚡`/notifications` | employer half of S-14 |
| H-08 Hub analytics | `GET /hubs/:id/analytics` | — | consignment performance |
| V-11 Vendor analytics | `GET /businesses/:id/analytics` | — | sales, orders, queue |

## 7. Vendor dashboard (V-02…V-12)

| Screen | REST | Socket | Notes |
|---|---|---|---|
| V-02 Live status | `POST /live-sessions/start` · `PATCH /live-sessions/:id/status` · `POST /live-sessions/:id/stop` · `GET /businesses/:id/dashboard` | ⚡`/live` (own pin), `/queue`, `/notifications` | 422 LICENSE_REQUIRED handling; location ticks via socket `live:tick` |
| V-03 Wave inbox | `POST /wave-downs/:id/accept` · `POST /wave-downs/:id/decline` | ⚡`/queue` → new wave-downs | SLA countdown per request |
| V-04 Queue mgmt | `GET /queues/:ownerId` · `POST /live-sessions/:id/pop-up` | ⚡`/queue` → `queue:update`, `popup:delay` | discount tiers consumed |
| V-05 Order queue | `GET /businesses/:id/orders` · `POST /orders/:id/accept` · `POST /orders/:id/ready` · `POST /orders/:id/complete` | ⚡`/notifications` new orders | kanban; ready blocked if away_closed |
| V-06 Menu manager | `GET /businesses/:id/menu` · `POST /businesses/:id/menu` · `PATCH /businesses/:id/menu/:itemId` | — | Today's Special picker |
| V-07 Bookings | `GET /businesses/:id/availability` · `PATCH /bookings/:id` | ⚡`/notifications` | accept/propose/decline |
| V-08 Messages | `GET /message-threads/mine` · thread endpoints | ⚡`/messages` | customer threads |
| V-09 Ping budget 💳 | `POST /ping-budgets/:businessId` · `PATCH /ping-budgets/:businessId` · `GET /pings/mine` | — | V1.x; **[Elements]** |
| V-10 Giveaways | `POST /giveaways` (create) · claimed counts | ⚡`/notifications` claims | V1.x |
| V-11 Analytics | `GET /businesses/:id/dashboard` (analytics section) | — | sales, queue conversion, benchmark |
| V-12 Payouts | `GET /transactions/mine` · `POST /payments/connect/onboard` (status) | ⚡`/notifications` payout | Stripe account status |

## 8. Hub dashboard (H-02…H-06)

| Screen | REST | Socket | Notes |
|---|---|---|---|
| H-02 Product catalog | `POST /hubs/:id/products` · `PATCH /hubs/:id/products/:productId` · `GET /hubs/:id/products` | — | consignment terms, quantities |
| H-03 Approvals | `GET /checkouts` (pending for hub) · approve action · `GET /trust-scores/seller/:id` | ⚡`/notifications` new reservations | auto-approve by trust tier |
| H-04 Live inventory | `GET /hubs/:id/products` (+ live holders) | ⚡`/live` seller pins | recall action |
| H-05 Settlements | `GET /checkouts/:id/settlement` | ⚡`/notifications` | per-checkout reconciliation |
| H-06 AI dashboard | `GET /ai/*` (forecasts) | — | V1.x |

## 9. Admin (A-01…A-07)

| Screen | REST | Socket | Notes |
|---|---|---|---|
| A-01 Ops overview | ⚠️`GET /admin/overview` (GAP-2) or compose | — | city health metrics |
| A-02 Disputes | `GET /admin/disputes` · `GET /disputes/:id` · `POST /disputes/:id/resolve` | ⚡`/notifications` | SLA timers, evidence viewer |
| A-03 Category/license | `GET /catalog/categories` · `POST /category-suggestions/:id/review` · `POST /businesses/:id/license-documents/:docId/review` | — | taxonomy CRUD |
| A-04 Fraud flags | `GET /admin/fraud-flags` | ⚡`/notifications` | ping/oversell/device dups |
| A-05 User mgmt | `GET /admin/users` · `POST /admin/users/:id/suspend` · `GET /admin/audit-logs` | — | search, suspend, verification override |
| A-06 Shelter mgmt | `POST /shelter-partners` · `GET /shelter-partners/:id/reporting` | — | V1.x |
| A-07 Sponsors | `GET/POST /admin/sponsors` · `GET /sponsors` | — | manual pilot |

---

## 10. Socket subscription matrix (which screens join which room)

| Namespace / room | Screens that join |
|---|---|
| `/live` cell rooms (viewport) | C-10, C-11, C-12, C-14, C-17, S-03, H-04, V-02 (own pin) |
| `/queue:<ownerId>` | C-19, C-20 (customer) · V-03, V-04 (vendor) |
| `/notifications:user:<id>` | **every authenticated screen** (global provider joins once) |
| `/messages:thread:<id>` | C-33, V-08 (open thread only) |

Join/leave is lifecycle-managed by `lib/socket/useNamespace.ts`; the map join/leaves cells as the viewport pans (`REALTIME_IMPLEMENTATION.md`). On reconnect, each screen refetches its REST source of truth (RT §7).

## 11. Idempotency & money-safety checklist (💳 screens)

Every 💳 screen (C-22, C-26 pay, C-28, S-06, S-08, S-14 check-out, V-09) must:
1. Generate a client `Idempotency-Key` (UUID) **once per user intent**, reused across retries.
2. Render **pending-confirmation** state on submit (spinner allowed here only — `docs/06 §2.6e`).
3. Handle `409` (oversell/state conflict) and `422` (business rule) with specific copy, never a generic error.
4. Never double-submit: disable/lock the button width during flight.
5. Treat the socket/webhook result as authoritative confirmation; the POST response is the receipt, the `notify` is the settle. See [PAYMENTS_IMPLEMENTATION.md](PAYMENTS_IMPLEMENTATION.md).
```
