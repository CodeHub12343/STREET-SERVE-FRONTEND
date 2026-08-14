# StreetServe — API Specification & Authentication Flow

Convention: REST over HTTPS, JSON bodies, `Authorization: Bearer <jwt>` on all authenticated routes. Real-time channels (location, queue updates, notifications) run over Socket.IO namespaces alongside this REST surface, not as a replacement for it.

## 1. Authentication Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create account (email/phone, triggers OTP) |
| POST | `/auth/verify-otp` | Confirm OTP, issue access + refresh token |
| POST | `/auth/login` | Password or passwordless login (magic link/OTP) |
| POST | `/auth/refresh` | Exchange refresh token for new access token |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/roles` | Add a role to the current account (e.g., customer → seller) |
| POST | `/verification/id-document` | Submit ID document for Tier 1 (proxies to KYC provider) |
| POST | `/verification/selfie-liveness` | Submit liveness check |
| POST | `/verification/bank-account` | Link payout account (proxies to Stripe Connect onboarding) |
| GET | `/verification/status` | Current tier + pending requirements |

**Error responses (applies platform-wide):** standard envelope `{ "error": { "code": "STRING_CODE", "message": "human readable", "details": {...} } }`, HTTP status matches semantic (400 validation, 401 unauthenticated, 403 unauthorized-for-role, 404 not found, 409 conflict e.g. oversell, 422 business-rule violation e.g. Spot Me blocked under 30 days, 429 rate-limited, 500 unexpected).

## 2. Users, Roles & Profiles

| Method | Path | Purpose |
|---|---|---|
| GET | `/users/me` | Current profile + roles + verification tier |
| PATCH | `/users/me` | Update profile (name, photo, home area) |
| GET | `/users/:id/public-profile` | Public-facing profile (reviews, trust score summary) |

## 3. Live Map & Location

| Method | Path | Purpose |
|---|---|---|
| POST | `/live-sessions/start` | Business/seller goes live (creates session, opens Socket.IO channel) |
| PATCH | `/live-sessions/:id/location` | Location tick (also mirrored via socket for lower latency) |
| POST | `/live-sessions/:id/pop-up` | Toggle Pop-Up Mode |
| POST | `/live-sessions/:id/stop` | Go offline |
| GET | `/map/nearby?lat&lng&radius&category&search` | Fetch current pins within radius, filterable by top-level category tab and free-text search (per client map-screen reference — [03-user-flows.md](03-user-flows.md) §2) |
| PATCH | `/live-sessions/:id/status` | Set status to `driving` / `parked` / `away_closed` (replaces the earlier `live`/`pop_up`/`offline` model — see Database doc) |

**Socket.IO namespaces:** `/live` (subscribe to pin updates for a bounding box), `/queue/:queueId` (position/discount updates), `/notifications/:userId`, `/messages/:threadId` (live message delivery).

## 4. Wave Down & Queue

| Method | Path | Purpose |
|---|---|---|
| POST | `/wave-downs` | Create a wave-down request |
| POST | `/wave-downs/:id/accept` | Vendor accepts |
| POST | `/wave-downs/:id/decline` | Vendor declines (reason optional) |
| GET | `/queues/:businessId` | Current queue state + discount schedule |
| POST | `/queues/:businessId/join` | Join queue (server timestamps) |
| DELETE | `/queues/:businessId/leave` | Leave/cancel queue spot |

## 4a. Follow, Notify Me & Messaging

*New per client UI reference — see [03-user-flows.md](03-user-flows.md) §2a–2c.*

| Method | Path | Purpose |
|---|---|---|
| POST | `/businesses/:id/follow` | Follow a business (adds to Favorites, ongoing status/proximity alerts) |
| DELETE | `/businesses/:id/follow` | Unfollow |
| GET | `/users/me/favorites` | List followed businesses + current status |
| POST | `/businesses/:id/notify-me` | Register a one-off "alert me next time nearby" request (does not follow) |
| POST | `/message-threads` | Start a thread with a business (from a profile sheet) |
| GET | `/message-threads/mine` | List threads (customer or business side) |
| GET | `/message-threads/:id/messages` | Thread history |
| POST | `/message-threads/:id/messages` | Send a message |

## 4b. Menu & Direct Orders

*New per client UI reference — see [03-user-flows.md](03-user-flows.md) §2d.*

| Method | Path | Purpose |
|---|---|---|
| GET | `/businesses/:id/menu` | Public menu listing (includes Today's Special flag) |
| POST | `/businesses/:id/menu` | Add a menu item (vendor) |
| PATCH | `/businesses/:id/menu/:itemId` | Update item (price, availability, mark/unmark Today's Special) |
| POST | `/orders` | Place a direct order (pickup-now or linked to a `bookingId` for scheduled) |
| GET | `/orders/mine` | Customer order history |
| GET | `/businesses/:id/orders` | Vendor-facing order queue |
| POST | `/orders/:id/accept` | Vendor accepts |
| POST | `/orders/:id/ready` | Vendor marks ready for pickup (blocked if business status is `away_closed` — see Database doc validation rules) |
| POST | `/orders/:id/cancel` | Cancel (either party, reason required) |

## 5. Transactions, Gifting, Spot Me, Round-Up

| Method | Path | Purpose |
|---|---|---|
| POST | `/transactions` | Create transaction (applies active discount tier server-side) |
| POST | `/transactions/:id/round-up` | Add round-up tip |
| POST | `/gifts` | Create a gift purchase + redemption code |
| POST | `/gifts/:code/redeem` | Recipient redeems |
| POST | `/giveaways/:id/claim` | Claim a free giveaway unit (subject to daily cap) |
| POST | `/spot-me` | Request Spot Me credit |
| POST | `/spot-me/:id/decide` | Counterparty accepts/declines |
| POST | `/spot-me/:id/repay` | Mark repaid |

## 6. Scheduling

| Method | Path | Purpose |
|---|---|---|
| GET | `/businesses/:id/availability` | Open slots |
| POST | `/bookings` | Create booking |
| PATCH | `/bookings/:id` | Reschedule |
| DELETE | `/bookings/:id` | Cancel |

## 7. Ping Sharing

| Method | Path | Purpose |
|---|---|---|
| POST | `/ping-budgets/:businessId` | Fund/reload paid-sharing balance |
| PATCH | `/ping-budgets/:businessId` | Pause/resume, adjust per-share tip |
| POST | `/pings` | Log a forward/share event |
| GET | `/pings/mine` | Sharer's ping history + earned tips |

## 8. Consignment — Hubs & Products

| Method | Path | Purpose |
|---|---|---|
| POST | `/hubs` | Register a business as a Consignment Hub |
| POST | `/hubs/:id/products` | List a product for consignment |
| PATCH | `/hubs/:id/products/:productId` | Update terms/quantity |
| GET | `/products/nearby?lat&lng&radius&category` | Seller-facing discovery feed |

## 9. Consignment — Seller Lifecycle

| Method | Path | Purpose |
|---|---|---|
| POST | `/checkouts` | Reserve + QR check-out inventory (requires condition photo) |
| GET | `/checkouts/mine` | Seller's active/past checkouts |
| POST | `/checkouts/:id/sales` | Log a sale against a checkout (blocked if exceeds available qty — FR-8.3) |
| POST | `/checkouts/:id/return` | QR check-in unsold inventory |
| GET | `/checkouts/:id/settlement` | Settlement breakdown once processed |

## 10. Trust, Reviews & Disputes

| Method | Path | Purpose |
|---|---|---|
| GET | `/trust-scores/:subjectType/:subjectId` | Current score + formula version |
| POST | `/reviews` | Leave a review tied to a transaction |
| POST | `/disputes` | Open a dispute against a checkout/transaction/spot-me |
| GET | `/disputes/:id` | Case status |
| POST | `/disputes/:id/evidence` | Upload evidence (photo, note) |
| POST | `/disputes/:id/resolve` | Admin-only resolution |

## 11. Jobs

| Method | Path | Purpose |
|---|---|---|
| GET | `/jobs/nearby` | Ranked nearby gig postings |
| POST | `/jobs` | Post a gig (business or platform) |
| POST | `/jobs/:id/apply` | Apply/accept |
| POST | `/jobs/:id/check-in` | Geofence/QR check-in |
| POST | `/jobs/:id/check-out` | Complete + trigger payout |

## 12. Shelter Partner Program

| Method | Path | Purpose |
|---|---|---|
| POST | `/shelter-partners` | Register organization (admin-approved) |
| POST | `/shelter-partners/:id/enrollments` | Co-sign a resident enrollment |
| GET | `/shelter-partners/:id/reporting` | Aggregate, privacy-preserving outcome report |

## 13. AI / Recommendations

| Method | Path | Purpose |
|---|---|---|
| GET | `/ai/recommendations/products?sellerId` | Product suggestions + reason summary |
| GET | `/ai/recommendations/locations?sellerId` | Location suggestions |
| GET | `/ai/pricing-suggestion?productId` | Suggested price/bundle |
| POST | `/ai/sales-coaching` | Submit logged objection type, get scripted response |

## 14. Admin / Platform Ops

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/categories` | Manage category taxonomy + `requires_license` metadata |
| POST | `/admin/categories/:id/license-documents/:docId/review` | Approve/reject license proof |
| GET | `/admin/disputes` | Full dispute queue |
| POST | `/admin/users/:id/suspend` | Suspend account |
| GET | `/admin/fraud-flags` | Ping/sharing/oversell anomalies surfaced for review |

## 15. Authentication Flow (Detail)

1. Client calls `/auth/register` with email or phone → server creates an unverified user row, sends OTP via Twilio/email.
2. Client calls `/auth/verify-otp` → server issues a short-lived access token (JWT, ~15 min) and a long-lived refresh token (rotated on use, stored httpOnly).
3. Every subsequent request carries the access token; on 401-expired, client transparently calls `/auth/refresh`.
4. Adding a role (e.g., customer → seller) is a separate authorized call (`/auth/roles`) — it does not require a new account, consistent with the additive-roles model.
5. Verification tier upgrades are asynchronous: submitting `/verification/id-document` returns `pending`, and a webhook from the KYC provider updates status server-side; the client polls or receives a push/socket notification on resolution.
6. Payment-account linking (`/verification/bank-account`) redirects to Stripe Connect's hosted onboarding (Express/Custom flow) — StreetServe never directly handles raw bank credentials.

## 16. Validation & Error Conventions

- All monetary amounts are integers in cents, never floats, across every endpoint (prevents rounding-error classes of bugs in settlement math).
- All list endpoints support cursor-based pagination (`?cursor=&limit=`), not offset pagination, given the real-time nature of the underlying data (offset pagination drifts when rows are being inserted continuously, e.g. live pins or transactions).
- Idempotency keys required on all payment-triggering POSTs (`Idempotency-Key` header) to protect against duplicate-charge retries on flaky mobile connections — a very real scenario for a location-based app used in the field.
