# StreetServe — Frontend Implementation Roadmap

> The build plan: the per-HTML-file screen map (design → route → components → APIs → priority), the phased milestone sequence with dependencies and complexity, and the traceability chain from Product Requirement → Design → Backend API → Frontend.
> This is the master index; it references every other frontend planning doc.
> Companion: [FRONTEND_FEATURE_INVENTORY.md](FRONTEND_FEATURE_INVENTORY.md), [SCREEN_TO_COMPONENT_MAPPING.md](SCREEN_TO_COMPONENT_MAPPING.md), [SCREEN_TO_API_MAPPING.md](SCREEN_TO_API_MAPPING.md), [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md).

---

## 0. The planning-doc map (single source of truth set)

| # | Document | Answers |
|---|---|---|
| 1 | [NEXTJS_ARCHITECTURE.md](NEXTJS_ARCHITECTURE.md) | app shell, RSC/client boundary, providers, deploy |
| 2 | [ROUTING_STRUCTURE.md](ROUTING_STRUCTURE.md) | 77 screens → routes/guards/layouts |
| 3 | [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md) | src tree, layering, conventions |
| 4 | [FRONTEND_FEATURE_INVENTORY.md](FRONTEND_FEATURE_INVENTORY.md) | features + tiers + backend trace + gaps |
| 5 | [SCREEN_TO_API_MAPPING.md](SCREEN_TO_API_MAPPING.md) | screen → REST/socket/keys |
| 6 | [SCREEN_TO_COMPONENT_MAPPING.md](SCREEN_TO_COMPONENT_MAPPING.md) | screen → template/components/state |
| 7 | [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md) | primitives, templates, domain components |
| 8 | [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) | Query/Zustand/socket ownership |
| 9 | [DATA_FETCHING_STRATEGY.md](DATA_FETCHING_STRATEGY.md) | API client, errors, pagination, uploads |
| 10 | [AUTHENTICATION_IMPLEMENTATION.md](AUTHENTICATION_IMPLEMENTATION.md) | Clerk, roles, tiers, guards |
| 11 | [REALTIME_IMPLEMENTATION.md](REALTIME_IMPLEMENTATION.md) | socket lifecycle, cells, reconcile |
| 12 | [PAYMENTS_IMPLEMENTATION.md](PAYMENTS_IMPLEMENTATION.md) | Stripe, idempotency, payouts |
| 13 | [PWA_IMPLEMENTATION.md](PWA_IMPLEMENTATION.md) | Serwist, offline, push, queued actions |
| 14 | [RESPONSIVE_STRATEGY.md](RESPONSIVE_STRATEGY.md) | breakpoints, per-template adaptation |
| 15 | **this file** | build order + per-HTML map + traceability |
| 16 | [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) | actionable ticked task list |

---

## 1. Per-HTML-file screen map (design source of truth → implementation)

Each row is one file in `docs/design/`. Screens per file follow the ID ranges in `docs/12`. Priority: **P0** = pilot-critical path, **P1** = pilot MVP, **P2** = V1.x.

### `index.html` — Interactive Design System gallery
- **Route:** n/a (design reference) → becomes the **Storybook/Ladle** catalog basis.
- **Implements:** the token theme + primitive/template kit (`COMPONENT_LIBRARY §1–3`).
- **APIs:** none. **Priority:** **P0** (build the kit first).

### `c-01-09-onboarding-auth.html` — C-01…C-09 Onboarding & Auth
- **Route:** `(auth)/welcome`, Clerk `/sign-in|/sign-up`, `(auth)/onboarding/*`, `/map?tour=1`
- **Pages/components:** `WizardFlow`, Clerk components, Input, SegmentedControl, Avatar+PhotoCapture, coach-mark overlay
- **APIs:** Clerk, `PATCH /users/me`, `POST /auth/roles`, `POST /users/me/push-tokens`⚠️(GAP-4)
- **Priority:** **P0** (gate to everything)

### `c-10-map-home.html` — C-10 Map Home
- **Route:** `(customer)/map`
- **Pages/components:** `MapShell`, `Map`, `MapPin`+`StatusRing`, `ClusterPin`, Tabs, search Input, FAB, `BusinessProfileSheet`(peek)
- **APIs:** `GET /map/nearby`, `GET /catalog/categories`; `/live` cells
- **Priority:** **P0** (product center of gravity)

### `c-14-business-profile.html` (+ `c-14-business-profile-1.html` duplicate) — C-14 Business Profile
- **Route:** `(customer)/business/[id]` (sheet over map)
- **Pages/components:** `SheetStack`, `BusinessProfileSheet` (5-surface status selector), StatusChip, `TrustScoreBadge`, `QueuePositionCard`, MenuListItem preview, gallery, review cards, action row
- **APIs:** `GET /businesses/:id`, `GET /businesses/:id/menu`, `GET /trust-scores/business/:id`, `GET /queues/:id`, follow/notify-me
- **Priority:** **P0** (transaction hub). *Note: two near-identical files — treat `c-14-business-profile.html` as canonical, dedupe.*

### `c-18-20-wave-queue.html` — C-18…C-20 Wave Down & Queue
- **Route:** `(customer)/business/[id]/wave`, `/wave/[id]`, `/queue/[ownerId]`
- **Pages/components:** `SheetStack`, `WaveStatusCard`, `Countdown`(server deadline), `QueuePositionCard`, `DiscountLadder`, Pop-Up `Banner`
- **APIs:** `POST /wave-downs`, `GET /wave-downs/:id`, `/queues/:id` join/leave; `/queue` `wave:accepted`,`queue:update`,`popup:delay`
- **Priority:** **P0** (core differentiator, realtime)

### `c-21-24-order-payment-receipt.html` — C-21…C-24 Order, Payment, Receipt
- **Route:** `(customer)/business/[id]/order`, `/order/[id]/pay`, `/order/[id]`, `/order/[id]/receipt`
- **Pages/components:** `SheetStack`, MenuListItem+Stepper, `PriceLine`/`DiscountBadge`, `PaymentSheet`(Elements), `Spinner`, `OrderTracker`, `ReceiptCard`/`FeeSplit`
- **APIs:** `POST /transactions|/orders` 💳, `POST /transactions/:id/round-up` 💳, `GET /orders/:id`; `/notifications`
- **Priority:** **P0** (money path)

### `c-26-27-scheduling.html` — C-26, C-27 Booking
- **Route:** `(customer)/business/[id]/book`, `/booking/[id]`
- **Pages/components:** `WizardFlow`, slot picker, `PaymentSheet`, booking card, reminder rows
- **APIs:** `GET /businesses/:id/availability`, `POST /bookings` 💳, `PATCH/DELETE /bookings/:id`
- **Priority:** **P1**

### `c-31-33-favorites-messages.html` — C-31…C-33 Favorites & Messages
- **Route:** `(customer)/favorites`, `/messages`, `/messages/[threadId]`
- **Pages/components:** `TabPage`, followed rows + StatusChip, `ThreadListItem`, `ConversationView`, `MessageBubble`, composer
- **APIs:** `GET /users/me/favorites`, follow/notify-me, `GET /message-threads/mine`, thread messages; `/live`,`/messages`
- **Priority:** **P1**

### `c-34-38-profile-account.html` — C-34…C-38 Profile & Account
- **Route:** `(customer)/profile`, `/profile/wallet`, `/profile/verification`, `/settings`, `/help`
- **Pages/components:** `TabPage`/`SettingsList`, `RoleSwitcher`, `VerificationTierLadder`, wallet rows, `DisputeCaseTracker`, PhotoCapture
- **APIs:** `GET /users/me`, `GET /verification/status`, notification-prefs, `/transactions/mine`+`/pings/mine`+`/spot-me` (wallet), `POST /disputes`
- **Priority:** **P1** (verification center is P0 for money unlock)

### `c-11-30-discovery-gifting.html` — C-11…C-30 Discovery, Content & Gifting
- **Route:** `(customer)` various: `/map` search/list/more, `/business/[id]/menu`/`/reviews`, `/map?event=`, `/orders`, `/business/[id]/gift`, `/gift/[code]`, `/business/[id]/spot-me`
- **Pages/components:** search overlay, list view (C-12 a11y), category grid, MenuListItem, review composer, Block Party cluster, unified orders list, gift/Spot-Me `WizardFlow`
- **APIs:** `GET /map/nearby`, `GET /catalog/categories`, menu, `POST /reviews`, `GET /orders/mine`+`/transactions/mine`+`/bookings`, `POST /gifts`+redeem, `POST /spot-me`
- **Priority:** **P1** (C-12 list view is **P0** for a11y; gifting/Spot-Me/Block-Party **P2**)

### `s-01-06-seller-onboarding-checkout.html` — S-01…S-06 Seller Onboarding & Checkout
- **Route:** `(seller)/start`, `(auth)/onboarding/seller-verify`, `(seller)`, `/seller/product/[id]`, `.../reserve`, `/seller/checkout/[id]`
- **Pages/components:** `WizardFlow`, `VerificationTierLadder`, `Map`, product cards, Seller-Agreement clickwrap, `QRScanner`, `PhotoCapture`
- **APIs:** `/verification/*`, `GET /products/nearby`, `POST /seller-agreement`, `POST /checkouts` 💳, `POST /storage/upload-url`
- **Priority:** **P1** (consignment core; verification path P0)

### `s-07-10-inventory-sale-return-settlement.html` — S-07…S-10
- **Route:** `(seller)/inventory`, `/seller/checkout/[id]/sale|return|settlement`
- **Pages/components:** `TabPage`, checkout rows w/ urgency, Stepper, oversell error, `QRScanner`, reconcile preview, `ReceiptCard`, `TrustScoreBadge`
- **APIs:** `GET /checkouts/mine`, `POST /checkouts/:id/sales` 💳 (409 oversell), `POST /checkouts/:id/return`, `GET /checkouts/:id/settlement`
- **Priority:** **P1**

### `s-11-14-ai-coaching-earnings-jobs.html` — S-11…S-14
- **Route:** `(seller)/ai`, `/seller/ai/coaching`, `/seller/earnings`, `/seller/jobs`
- **Pages/components:** `AIRecommendationCard`, `ConversationView`, `StatTile`/`Chart`, gig cards, `QRScanner`(check-in)
- **APIs:** `GET /ai/recommendations/*`, `POST /ai/sales-coaching`, earnings(compose GAP-6), `/jobs/*`
- **Priority:** **P1** (AI feed) / **P2** (coaching, jobs)

### `v-01-06-vendor-dashboard-part1.html` — V-01,02,04,05,06 (core operating loop)
- **Route:** `(dashboard)/vendor/register`, `/vendor`, `/vendor/queue`, `/vendor/orders`, `/vendor/menu`
- **Pages/components:** `WizardFlow`, `DashboardShell`, `LiveStatusToggle`, `QueuePositionCard`, `OrderTracker` kanban, MenuListItem editable
- **APIs:** `POST /businesses`+license+connect, `/live-sessions/*`, `GET /queues/:id`, `/businesses/:id/orders`+lifecycle, menu CRUD; `/live`,`/queue`,`/notifications`
- **Priority:** **P0** (vendors must operate for the pilot to function)

### `v-07-12-vendor-dashboard-part2.html` — V-03,07…12 (growth, comms, money)
- **Route:** `(dashboard)/vendor/wave-downs`, `/vendor/bookings`, `/vendor/messages`, `/vendor/ping-budget`, `/vendor/giveaways`, `/vendor/analytics`, `/vendor/payouts`
- **Pages/components:** wave inbox rows+`Countdown`, calendar, `ConversationView`, budget card+`PaymentSheet`, `StatTile`/`Chart`, `DataTable`
- **APIs:** wave accept/decline, availability, threads, `/ping-budgets/*`💳, `/giveaways`, `GET /businesses/:id/dashboard`, `/transactions/mine`
- **Priority:** **P1** (wave inbox V-03 is **P0**; ping/giveaways **P2**)

### `h-01-06-hub-dashboard.html` — H-01…H-06 Hub Dashboard
- **Route:** `(dashboard)/hub/register`, `/hub/products`, `/hub/approvals`, `/hub`, `/hub/settlements`, `/hub/ai`
- **Pages/components:** `WizardFlow`, `DataTable`, approval rows+`TrustScoreBadge`, `Map`+seller pins, `ReceiptCard`, `Chart`
- **APIs:** `POST /businesses/:id/register-hub`, `/hubs/:id/products`, `/checkouts` (hub view), `/checkouts/:id/settlement`, `/ai/*`
- **Priority:** **P1** (consignment supply side; H-06 AI **P2**)

### `a-01-07-admin-dashboard.html` — A-01…A-07 Admin / Trust & Safety
- **Route:** `(admin)/*`
- **Pages/components:** `DashboardShell`, `StatTile`/`Chart`, `DisputeCaseTracker`, evidence viewer, taxonomy `DataTable`, fraud rows, user mgmt
- **APIs:** `GET /admin/overview`⚠️(GAP-2), `/admin/disputes`+resolve, categories/license review, `/admin/fraud-flags`, `/admin/users`+suspend+audit-logs, shelter, sponsors
- **Priority:** **P1** (dispute + license review are pilot-necessary safety; A-06/A-07 **P2**)

> **De-dup note:** `c-14-business-profile.html` and `c-14-business-profile-1.html` are duplicates — reconcile to one canonical mockup before implementation.

---

## 2. Phased build order (milestones)

Dependency-ordered. Complexity: ◍ small · ◍◍ medium · ◍◍◍ large.

### Milestone 0 — Foundation (P0, no screens yet) ◍◍
Scaffolding that everything else needs.
- Next.js App Router project, TS strict, ESLint/Prettier/import-boundaries, path alias.
- Design **theme + tokens + GlobalStyle** + styled-components SSR registry; **Storybook** in both themes.
- Provider tree (Clerk, Query, Socket, Theme, Toast); `lib/api/client`, `lib/query`, `lib/socket` skeletons.
- `middleware.ts`, route-group shells (empty layouts), loading/error/not-found conventions.
- CI: typecheck/lint/test/bundle-budget; env wiring (`NEXT_PUBLIC_*`).
- **Exit:** a themed empty app boots, auth redirects work, a sample query + socket connect succeed.

### Milestone 1 — Primitive & template kit (P0) ◍◍◍
`COMPONENT_LIBRARY §2–3` in Storybook: Button/Input/Chip/StatusChip/Skeleton/Toast/Banner/Sheet/Tabs/EmptyState/ErrorState/Countdown + all 7 layout templates + `Map`/`MapPin`. **Blocks all screen work.**

### Milestone 2 — Auth & onboarding (P0) ◍◍
`c-01-09` + verification center (C-36). Clerk flows, `/users/me` principal, role switcher, tier ladder. **Exit:** a user can sign up, pick a role, and reach an empty map.

### Milestone 3 — The live map (P0) ◍◍◍
`c-10` + C-12 list view + C-14 profile sheet. Mapbox, geohash-cell socket subscription, pins, status-driven profile. **Highest technical risk** (realtime + map perf) — do early. **Exit:** live pins move; profile sheet opens with real data.

### Milestone 4 — Wave → Queue → Pay (P0) ◍◍◍
`c-18-20` + `c-21-24`. The core commitment escalator + money path: realtime queue, server-authoritative countdowns, Stripe Elements, idempotency, receipts. **Exit:** end-to-end wave→accept→queue→pay→receipt works against the backend.

### Milestone 5 — Vendor operating loop (P0) ◍◍◍
`v-01-06` + wave inbox (V-03). Vendors go live, manage queue/orders/menu, accept waves. **Exit:** a vendor can operate a full customer transaction from the other side. *(Pilot is now demoable end-to-end.)*

### Milestone 6 — Seller consignment (P1) ◍◍◍
`s-01-06` + `s-07-10` + `s-11` AI feed + hub `h-01-06`. QR checkout, oversell-guarded sales, returns, settlement, hub approvals/inventory/settlements. **Exit:** a seller completes reserve→checkout→sell→return→settle; a hub approves and reconciles.

### Milestone 7 — Comms, history, profile, scheduling (P1) ◍◍
`c-26-27` scheduling, `c-31-33` favorites/messages, `c-34-38` profile/wallet/settings/help, vendor `v-07-12` bookings/messages/analytics/payouts. Notifications center (needs **GAP-3**), push (needs **GAP-4**).

### Milestone 8 — Trust, safety & admin (P1) ◍◍
`a-01-07`: disputes, category/license review, fraud, user mgmt. Reviews (C-16), dispute open (C-38). (Ops overview needs **GAP-2**.)

### Milestone 9 — PWA hardening & V1.x (P1→P2) ◍◍
Serwist offline shell, install prompts, queued seller QR (idempotent), web push. Then V1.x: gifting/Spot-Me (`c-11-30` tail), ping budget/giveaways (V-09/10), sales coaching (S-12), jobs (S-14), Block Party (C-17), shelter/sponsors (A-06/07), hub AI (H-06).

### Milestone 10 — Polish & launch readiness ◍◍
Full a11y audit (axe + manual SR), performance budgets, e2e suite green, cross-device matrix, empty/error/offline states verified on every screen, Lighthouse PWA pass.

---

## 3. Critical path & parallelization

```
M0 → M1 ──┬─► M2 ─► M3 ─► M4 ─► M5  ← pilot demoable (P0 complete)
          │                     └─► M6 (seller/hub) ─┐
          └────────────────────────► M7 (comms) ────┼─► M8 ─► M9 ─► M10
                                                     ┘
```
- M1 gates everything; invest in it.
- After M5 the **P0 pilot loop is complete** — customer + vendor transact live. M6–M8 broaden to the consignment/gig/safety sides in parallel tracks once the kit is stable.
- **Backend gaps to unblock before their milestone:** GAP-4 push (M2/M7), GAP-3 notifications inbox (M7), GAP-2 admin overview (M8), GAP-6 seller earnings (M6). None block M3–M5.

---

## 4. Complexity hotspots (where the risk is)

| Area | Why risky | Mitigation |
|---|---|---|
| Live map + geohash socket (M3) | perf at pin density, cell subscription correctness, cache reconciliation | prototype early; coalesce renders; match backend geohash precision exactly |
| Money path (M4) | idempotency, no double charge, webhook/socket settle timing | strict `PAYMENTS_IMPLEMENTATION` rules; e2e for decline/retry/oversell |
| Server-authoritative timers (M4) | drift, reconnection | deadline-timestamp pattern, pause on reconnect |
| Seller offline queue (M9) | replay safety | idempotency keys + background sync; conflict UI |
| styled-components SSR (M0) | flash-of-unstyled if registry wrong | do the registry setup first, verify SSR styles |
| Dashboard responsive (M5–M8) | sidebar/table→card at breakpoints | `RESPONSIVE_STRATEGY` per-template rules |

---

## 5. Traceability chain (proof of completeness)

For every feature the chain is documented end-to-end:

**Product Requirement → Design Screen → Backend API → Frontend Implementation**

Example (the flagship loop):
- **FR-2/FR-3** (wave-down + line-up discount) → **C-18/19/20** (`c-18-20-wave-queue.html`) → `POST /wave-downs`, `/queues/:id`, `/queue` socket → `features/wave` + `features/queue`, `WaveStatusCard`+`QueuePositionCard`, `keys.wave`/`keys.queue`, Milestone 4.

Every screen resolves this chain via: `FRONTEND_FEATURE_INVENTORY` (FR→feature→BE) → `SCREEN_TO_API_MAPPING` (screen→API) → `SCREEN_TO_COMPONENT_MAPPING` (screen→components) → this roadmap (→ milestone). Any feature that can't complete the chain is a gap tracked in `FRONTEND_FEATURE_INVENTORY §N`.
```
