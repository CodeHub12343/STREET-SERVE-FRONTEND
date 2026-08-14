# StreetServe — Frontend Feature Inventory

> Complete inventory of **frontend-owned** features, grouped by module, tiered MVP / V1.x / Future, traced to the backend capability that powers each one and the screen(s) that surface it.
> **Rule:** every frontend feature here maps to an implemented backend capability (`BACKEND/BACKEND_FEATURE_INVENTORY.md`) and a designed screen (`docs/12`). Gaps are called out explicitly in §N.
> Companion: [SCREEN_TO_API_MAPPING.md](SCREEN_TO_API_MAPPING.md), [FRONTEND_IMPLEMENTATION_ROADMAP.md](FRONTEND_IMPLEMENTATION_ROADMAP.md).

Legend — Tier: **MVP** pilot (Modesto) · **V1.x** post-pilot · **FUT** future. BE = backend feature id (`BACKEND_FEATURE_INVENTORY.md`).

---

## A. Identity, Roles & Verification  (`features/identity`, `features/verification`)

| # | Frontend feature | Tier | Screens | BE |
|---|---|---|---|---|
| FA1 | Clerk-hosted sign-up/in + OTP UI embedding | MVP | C-03, C-04 | A1 |
| FA2 | Profile basics capture (name/photo/city) | MVP | C-05 | A1 |
| FA3 | Role-intent selector + in-app **role switcher** (additive) | MVP | C-06, C-34 | A2, A3 |
| FA4 | Verification Center: tier ladder Bronze→Gold, pending/rejected states | MVP | C-36 | A4 |
| FA5 | KYC launch (ID + selfie liveness) via provider-hosted redirect | MVP | S-02, C-36 | A5 |
| FA6 | Bank link via Stripe Connect hosted onboarding redirect | MVP | S-02, V-01 | A6 |
| FA7 | Vendor/business registration + category-license upload gating | MVP | V-01, H-01 | A8 |
| FA8 | Async verification status (socket/poll) + tier-change surfacing | MVP | C-36 | A4, A5 |
| FA9 | Shelter-cosign alternate verification path UI | V1.x | S-02 | A9 |
| FA10 | Suspended-account handling (bounce to support) | MVP | global | A10 |

## B. Live Map & Location  (`features/livemap`, `features/business`, `features/favorites`)

| # | Frontend feature | Tier | Screens | BE |
|---|---|---|---|---|
| FB1 | Map Home: logo pins + Driving/Parked/Away status rings | MVP | C-10 | B1, B3 |
| FB2 | Geohash-cell socket subscription tied to map viewport (join/leave on pan) | MVP | C-10 | B4 |
| FB3 | Category tabs (All/Food/Coffee/Services/Shopping/More) + free-text search | MVP | C-10, C-11, C-13 | B3 |
| FB4 | Serve-Near-Me FAB (recenter/refresh on geolocation) | MVP | C-10 | B3 |
| FB5 | **List view** map parity (a11y-mandated, sort by distance/status) | MVP | C-12 | B3 |
| FB6 | Business profile sheet (3 snap points, status-driven) | MVP | C-14 | B1 |
| FB7 | Follow / unfollow + Favorites live-status board | MVP | C-14, C-31 | B6 |
| FB8 | Notify-Me one-off next-time-nearby | MVP | C-14, C-31 | B7 |
| FB9 | Proximity alerts (opt-in, throttled) surfaced as notifications | MVP | notif | B5 |
| FB10 | Pop-Up delay banner on pins/profile (driving→parked event) | MVP | C-10, C-14, C-19/20 | B8 |
| FB11 | Location-precision control (fuzzing) in settings + primer | MVP | C-07, C-37 | B9 |
| FB12 | Offline last-known pins ("may be stale") | MVP | C-10 | B2, M6 |
| FB13 | Block Party cluster view + alert | V1.x | C-17 | B10 |

## C. Wave Down & Queue  (`features/wave`, `features/queue`)

| # | Frontend feature | Tier | Screens | BE |
|---|---|---|---|---|
| FC1 | Wave-down request (pin confirm + note) + SLA countdown | MVP | C-18 | C1 |
| FC2 | Wave-down active: live ETA/tracking, accept/decline/expire states | MVP | C-19 | C1, C2 |
| FC3 | Queue status: position, **locked discount tier**, hold timer, leave | MVP | C-20 | C3, C4, C5 |
| FC4 | Live queue reflow via `/queue` socket (`queue:update`) | MVP | C-20 | C3, C5 |
| FC5 | Geofence-leave hold surfacing (default 15m) | MVP | C-20 | C6 |

## D. Orders, Menu & Scheduling  (`features/orders`, `features/business`, `features/scheduling`)

| # | Frontend feature | Tier | Screens | BE |
|---|---|---|---|---|
| FD1 | Public menu view + Today's Special pinned | MVP | C-15 | D1 |
| FD2 | Order review (cart) with discount line + total | MVP | C-21 | D2, E1 |
| FD3 | Order tracking pending→accepted→ready + cancel/refund | MVP | C-23 | D2, D3 |
| FD4 | Receipt detail (itemized base/discount/tip/fees) | MVP | C-24 | E4 |
| FD5 | Unified Orders history (orders + wave-downs + bookings, filter chips) | MVP | C-25 | D2, D4 |
| FD6 | Booking flow (service→slot→confirm) + availability | MVP | C-26 | D4 |
| FD7 | Booking detail: reschedule/cancel (cutoff), reminders shown | MVP | C-27 | D4, D5 |
| FD8 | Vendor menu manager CRUD + Today's Special picker | MVP | V-06 | D1 |
| FD9 | Vendor order kanban accept→preparing→ready | MVP | V-05 | D2, D3 |
| FD10 | Vendor bookings calendar (accept/propose/decline) | MVP | V-07 | D4 |

## E. Payments, Tips, Gifting, Spot Me  (`features/payments`, `features/gifting`)

| # | Frontend feature | Tier | Screens | BE |
|---|---|---|---|---|
| FE1 | Stripe Elements payment sheet + **idempotency key** on submit | MVP | C-22 | E1, E5 |
| FE2 | Round-up tip prompt (100% to vendor) | MVP | C-22 | E2 |
| FE3 | Pending-confirmation + failure-without-double-charge states | MVP | C-22, C-23 | E5 |
| FE4 | Wallet: payment methods, Spot-Me obligations, ping-tip balance | MVP (tips V1.x) | C-35 | E1, E10, F2 |
| FE5 | Payout-timing display per tier (Bronze 3d/Silver next-day/Gold instant) | MVP | C-24, S-10, V-12 | E3 |
| FE6 | Gifting flow + share code + redemption | V1.x | C-28, C-29 | E8 |
| FE7 | Giveaway claim (daily cap, no payment) | V1.x | C-14/17 | E9 |
| FE8 | Spot Me request + counterparty trust-context view + repay | V1.x | C-30 | E10 |

## F. Ping-to-Ping Growth  (`features/growth`)

| # | Frontend feature | Tier | Screens | BE |
|---|---|---|---|---|
| FF1 | Vendor ping-budget fund/reload/pause + tip adjust | V1.x | V-09 | F1 |
| FF2 | Share/forward action + earned-tip surfacing (ping history) | V1.x | C-14, C-35 | F2, F6 |
| FF3 | Daily-cap + duplicate-recipient UX feedback | V1.x | V-09 | F3, F4, F5 |
| FF4 | Giveaways manager (item, daily cap, claimed count) | V1.x | V-10 | E9 |

## G. Consignment Lifecycle  (`features/consignment`, `features/hub`)

| # | Frontend feature | Tier | Screens | BE |
|---|---|---|---|---|
| FG1 | Discover inventory (seller-facing nearby feed, map) | MVP | S-03 | G2 |
| FG2 | Product/consignment detail + **Seller Agreement clickwrap gate** | MVP | S-04 | G10 |
| FG3 | Reservation confirm (qty, pickup window, hub directions) | MVP | S-05 | G2 |
| FG4 | **QR checkout** (camera scan + condition photo capture) | MVP | S-06 | G3 |
| FG5 | My Inventory: active checkouts + return-deadline urgency states | MVP | S-07 | G5 |
| FG6 | Log a sale (qty + method) with **oversell block (409)** | MVP | S-08 | G4, G6 |
| FG7 | Return flow (QR scan-in + condition photos + reconcile preview) | MVP | S-09 | G7 |
| FG8 | Settlement breakdown (gross−fee−hub=net, payout timing, Trust delta) | MVP | S-10 | G8 |
| FG9 | Missed-return grace reminder surfacing | MVP | S-07 | G9 |
| FG10 | Hub product catalog manager (CRUD, terms, quantities) | MVP | H-02 | G1 |
| FG11 | Hub checkout approvals (auto-approve by trust tier) | MVP | H-03 | G2 |
| FG12 | Hub live inventory map (who holds what/where) + recall | MVP | H-04 | G5, G11 |
| FG13 | Hub settlements reconciliation | MVP | H-05 | G8 |
| FG14 | Offline-tolerant seller QR checkout (queue + sync) | V1.x | S-06 | G12 |

## H. Trust, Reviews & Disputes  (`features/trust`)

| # | Frontend feature | Tier | Screens | BE |
|---|---|---|---|---|
| FH1 | Trust/Reputation score badge with **tap-to-explain "why"** | MVP | C-14, S-10, H-03 | H1 |
| FH2 | Review composer gated to completed transaction | MVP | C-16 | H3 |
| FH3 | Dispute open + evidence upload + case status tracker | MVP | C-38 | H4, H5 |
| FH4 | Admin dispute queue + evidence viewer + resolution actions | MVP | A-02 | H4, H5, H6 |

## I. AI / Recommendations  (`features/ai`)

| # | Frontend feature | Tier | Screens | BE |
|---|---|---|---|---|
| FI1 | AI Assistant feed: **one recommendation card at a time** + "why" | MVP (rule-based) | S-11 | I1 |
| FI2 | Pricing/bundle suggestion (advisory) surfacing | V1.x | S-11 | I2 |
| FI3 | Sales-coaching (objection picker → scripted response) | V1.x | S-12 | I3 |
| FI4 | Hub AI business dashboard (forecasts, reallocation) | V1.x | H-06 | I4 |

## J. Jobs & Shelter  (`features/jobs`, `features/shelter`)

| # | Frontend feature | Tier | Screens | BE |
|---|---|---|---|---|
| FJ1 | Jobs list + detail + geofence/QR check-in-out | V1.x | S-14 | J1, J2 |
| FJ2 | Shelter partner management (admin) | V1.x | A-06 | J3, J4, J5 |

## K. Notifications & Messaging  (`features/notifications`, `features/messaging`)

| # | Frontend feature | Tier | Screens | BE |
|---|---|---|---|---|
| FK1 | In-app notification delivery (socket `/notifications`) + deeplink routing | MVP | global | K1 |
| FK2 | Push registration (FCM) + **SMS-bridge awareness** for background-blocked events | MVP | C-08, C-37 | K1, K2 |
| FK3 | Per-category notification preferences (safety-critical un-mutable) | MVP | C-37 | K3 |
| FK4 | Scoped customer↔business messaging (threads, composer, live delivery + read receipts) | MVP | C-32, C-33, V-08 | K4 |

## L. Admin, Ops & Platform  (`features/admin`)

| # | Frontend feature | Tier | Screens | BE |
|---|---|---|---|---|
| FL1 | Ops overview (city health metrics) | MVP | A-01 | — (dashboard agg) |
| FL2 | Category/license review queue | MVP | A-03 | L1 |
| FL3 | Dispute arbitration console | MVP | A-02 | L2 |
| FL4 | User management: search, suspend, verification override | MVP | A-05 | L3 |
| FL5 | Fraud-flag review queue | MVP-lite | A-04 | L4 |
| FL6 | Sponsor records (manual pilot) | MVP-lite | A-07 | L6 |

## M. Cross-cutting frontend platform  (`components/*`, `lib/*`, shell)

| # | Frontend feature | Tier | Where | BE/Ref |
|---|---|---|---|---|
| FM1 | Design-token theme (dark default + light + system) styled-components | MVP | `styles/` | docs/06 §2.7 |
| FM2 | Layout templates (MapShell/SheetStack/TabPage/WizardFlow/DashboardShell/SettingsList/ConversationView) | MVP | `components/layout` | docs/12 §1 |
| FM3 | Universal loading (skeleton) / empty (actionable) / error (retry) states | MVP | `components/feedback` | docs/12 §6 |
| FM4 | Money states: pending-confirmation, failure-no-double-charge | MVP | `components/money` | docs/12 §6 |
| FM5 | PWA install + offline shell + queued scans (Serwist) | MVP | `app/sw.ts` | M6, docs/07 |
| FM6 | Reconnect-and-catch-up (refetch authoritative state over REST) | MVP | `lib/socket` | RT §7 |
| FM7 | WCAG 2.1 AA: focus ring, 44px targets, color+icon, reduced-motion, list-view parity | MVP | global | docs/06 §2.8 |
| FM8 | i18n scaffolding (copy externalized) | MVP-struct/V1.x-translate | `lib/format` | docs/06 §2.3 |
| FM9 | Idempotency-key generation on all 💳 POSTs | MVP | `lib/api` | E5, API §18 |

---

## N. Gaps & mismatches to resolve (frontend ↔ backend ↔ design)

Verified against the **actual backend route files** (`src/modules/*/*.routes.ts` + `src/app.ts` mounts), not just `API_SPECIFICATION.md`. Several apparent gaps were resolved by the real implementation; the ones below are what genuinely remains.

### Resolved by the real backend (documentation-only gaps in the API markdown)
| Was flagged | Reality in code | Action |
|---|---|---|
| No upload endpoint | **`POST /storage/upload-url`** exists (R2 presign) | Document presign→PUT→attach contract in `PAYMENTS`/screen-api docs |
| No base business profile fetch | **`GET /businesses/:id`** exists (+ `/:id/dashboard`, `/:id/menu`, `/:id/register-hub`, `/:id/payouts/onboard`, `/:id/license-documents`) | Use for C-14 |
| Category taxonomy source | **`GET /catalog/categories`** exists (public) | Use for category tabs (C-10/13) |
| Vendor dashboard/analytics feed | **`GET /businesses/:id/dashboard`** exists (`dashboard.service.getVendorDashboard`) | Powers V-02/V-11; confirm shape covers analytics charts |
| Pre-register / launch config | **`GET /platform/launch`**, **`POST /preregistrations`**, **`GET /sponsors`** (public) exist | Marketing + pre-register |
| Payments/Connect | **`/payments/connect/onboard`**, **`/transactions`**, **`/transactions/mine`**, **`/transactions/:id/refund`** exist | Wallet, payout onboarding |
| Orders lifecycle | Also **`/orders/:id/complete`**, **`/orders/:id/remove-item`** exist beyond the spec | Order tracking / vendor kanban |

### Genuinely open (confirmed **not** in the backend routes today)
| # | Gap | Impact | Recommendation (backend action) |
|---|---|---|---|
| GAP-1 | **Doc-12 labels customer/seller as React Native**; stack is Next.js PWA | Foundational | Resolved in `NEXTJS_ARCHITECTURE.md §0`; update doc-12's platform line to "PWA (mobile viewport)". *(Docs action, not backend.)* |
| GAP-2 | **A-01 Ops overview** has no aggregate endpoint — `admin.routes.ts` only exposes `/admin/audit-logs` + `/admin/users/:id/suspend`; `/metrics` is Prometheus/internal | Admin MVP home has no JSON feed | Add `GET /admin/overview` (city health), or scope A-01 for the pilot to compose existing admin/dispute/fraud list endpoints. |
| GAP-3 | **No REST notifications inbox/history** — `notifications` module has a service but **no routes file**; delivery is socket-only. RT §7 assumes a "notification log" for reconnect catch-up | Notification center + reconnect catch-up have no source | Add `GET /users/me/notifications` (cursor) + `POST /users/me/notifications/:id/read`. |
| GAP-4 | **No push-token registration route** (no `push-token`/`fcm-token` handler anywhere in `src`) | Can't register a device for FCM push | Add `POST /users/me/push-tokens` (+ delete on logout). |
| GAP-5 | **No consolidated wallet endpoint** — `GET /pings/mine` (tips) + `GET /transactions/mine` exist but nothing aggregates balance/obligations for C-35 | Wallet must stitch 2–3 calls client-side | Acceptable for pilot: compose client-side. Consider `GET /users/me/wallet` later. |
| GAP-6 | **Seller earnings feed (S-13)** — vendor has `/businesses/:id/dashboard`; the seller-side equivalent aggregate isn't obviously present | S-13 charts need a source | Confirm a seller earnings endpoint (may live in `dashboard`/`consignment`); if absent, add `GET /users/me/earnings`. |

> GAP-1 is a docs fix (done in architecture). GAP-2/3/4 are small, real backend additions the frontend **depends on for MVP** (notifications inbox + push registration especially). GAP-5/6 are pilot-acceptable via client-side composition. [SCREEN_TO_API_MAPPING.md](SCREEN_TO_API_MAPPING.md) marks each affected screen with the exact dependency.
```
