# StreetServe — Frontend Folder Structure

> The feature-cohesive `src/` layout for the Next.js App Router app, plus layering rules and naming conventions. Intentionally mirrors the backend's "feature modules over technical layers" discipline (`BACKEND/PROJECT_STRUCTURE.md`) so a full-stack change stays legible on both sides.
> Companion: [NEXTJS_ARCHITECTURE.md](NEXTJS_ARCHITECTURE.md), [ROUTING_STRUCTURE.md](ROUTING_STRUCTURE.md), [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md).

---

## 1. Layering rules (enforced by convention + lint)

```
app/ (routing only)  →  features/<domain>/  →  lib/api (typed client)  →  Express /api/v1
        │                     │                      │
        │                     ├→ components/ (shared UI primitives, dumb)
        │                     ├→ lib/socket (realtime)
        │                     └→ stores/ (Zustand, client-only state)
```

- **`app/` is routing only.** A `page.tsx` wires params/metadata and renders a screen component from `features/`. No data logic, no styled-components definitions, no business rules in `app/`. This keeps the route tree (`ROUTING_STRUCTURE.md`) a thin index of the product.
- **`features/<domain>/` owns a vertical slice**: its screens, its domain-specific components, its TanStack Query hooks, its Zod types, its socket subscriptions. A change to "queue" touches `features/queue/`, not five technical folders — the same rule the backend follows.
- **`components/` is the shared, domain-agnostic UI kit** (Button, Sheet, MapPin, StatusChip…). Dumb, reusable, styled-components. It never imports from `features/`.
- **`lib/` is cross-cutting plumbing**: the typed API client, the socket client, Stripe/Mapbox wrappers, the query client, formatters. It never imports from `features/` or `components/`.
- **Dependency direction is strictly downward:** `app → features → {components, lib, stores}`. A feature may import another feature's **public barrel** (`features/orders` may use `features/payments`' `usePayment`), never its internals — the frontend echo of "call a module's service, not its repository."

---

## 2. Directory layout

```
streetserve-frontend/
├── src/
│   ├── app/                              # App Router — routing only (see ROUTING_STRUCTURE.md)
│   │   ├── layout.tsx                    # root RSC: <html>, next/font, <Providers>, metadata
│   │   ├── providers.tsx                 # "use client" provider tree (NEXTJS_ARCHITECTURE §4)
│   │   ├── manifest.ts                   # PWA web manifest
│   │   ├── sw.ts                         # Serwist service worker source
│   │   ├── (marketing)/                  # SSR public site
│   │   ├── (auth)/                       # onboarding + verification wizards
│   │   ├── (customer)/                   # mobile-viewport PWA
│   │   ├── (seller)/                     # mobile-viewport seller mode
│   │   ├── (dashboard)/                  # vendor + hub desktop dashboards
│   │   ├── (admin)/                       # internal T&S console
│   │   ├── api/health/route.ts           # thin BFF (NEXTJS_ARCHITECTURE §6)
│   │   ├── loading.tsx / error.tsx / not-found.tsx / global-error.tsx
│   │
│   ├── features/                         # vertical domain slices (mirror backend modules)
│   │   ├── identity/                     # auth session, roles, /users/me, principal
│   │   ├── verification/                 # KYC tiers, bank link, status polling  (C-36, S-02)
│   │   ├── livemap/                      # map, pins, geohash cell subscriptions  (C-10..13, S-03)
│   │   ├── business/                     # profile sheet, menu, follow, notify-me (C-14..16)
│   │   ├── wave/                         # wave-down request/active               (C-18, C-19)
│   │   ├── queue/                        # queue position, discount, hold timer   (C-20)
│   │   ├── orders/                       # cart, order lifecycle, tracking, receipt(C-21..25)
│   │   ├── scheduling/                   # bookings                                (C-26, C-27)
│   │   ├── payments/                     # Stripe Elements, round-up, wallet       (C-22, C-35)
│   │   ├── gifting/                      # gift + redemption + Spot Me   [V1.x]    (C-28..30)
│   │   ├── messaging/                    # threads, composer                       (C-32, C-33)
│   │   ├── favorites/                    # follows + notify-me list                (C-31)
│   │   ├── consignment/                  # discover, product, reserve, checkout, sale, return, settlement (S-03..10)
│   │   ├── ai/                           # recommendation feed, coaching           (S-11, S-12)
│   │   ├── earnings/                     # seller earnings + payout history        (S-13)
│   │   ├── jobs/                         # gig board + check-in/out   [V1.x]        (S-14)
│   │   ├── vendor/                       # live-status control, dashboards         (V-01..12)
│   │   ├── hub/                          # hub dashboards                          (H-01..06)
│   │   ├── growth/                       # ping budget, giveaways     [V1.x]        (V-09, V-10)
│   │   ├── trust/                        # trust score badge, reviews, disputes    (C-16, C-38, S-10)
│   │   ├── notifications/                # in-app notification center + prefs      (C-37)
│   │   ├── admin/                        # ops, disputes, categories, fraud, users, shelters, sponsors (A-01..07)
│   │   └── shelter/                       # shelter partner   [V1.x]                (A-06)
│   │       └── <feature>/                # shape of each feature:
│   │           ├── components/           # domain components (e.g. QueuePositionCard)
│   │           ├── hooks/                # useQueue(), useJoinQueue() — TanStack Query
│   │           ├── screens/              # C-20.screen.tsx etc. (composed page bodies)
│   │           ├── socket.ts             # this feature's realtime subscriptions
│   │           ├── types.ts             # Zod schemas + inferred TS types (match API contract)
│   │           └── index.ts             # public barrel (what other features may import)
│   │
│   ├── components/                       # shared design-system UI kit (COMPONENT_LIBRARY.md)
│   │   ├── primitives/                   # Button, Input, Chip, Badge, Avatar, Skeleton…
│   │   ├── layout/                       # MapShell, SheetStack, TabPage, WizardFlow,
│   │   │                                 #   DashboardShell, SettingsList, ConversationView
│   │   ├── map/                          # <Map>, <MapPin>, <StatusRing>, clustering
│   │   ├── feedback/                     # Toast, Banner, EmptyState, ErrorState, states
│   │   ├── money/                        # ReceiptCard, PriceLine, DiscountBadge, FeeSplit
│   │   └── data/                         # DataTable, StatTile, TrustScoreBadge, Tracker
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                 # fetch wrapper: base URL, bearer token, envelope unwrap, error map
│   │   │   ├── endpoints.ts              # typed path builders (/api/v1/…)
│   │   │   └── errors.ts                 # maps backend {error:{code}} → typed AppApiError
│   │   ├── socket/
│   │   │   ├── io.ts                     # Socket.IO client singleton (auth handshake)
│   │   │   ├── SocketProvider.tsx        # connect/disconnect on auth; expose namespaces
│   │   │   └── useNamespace.ts           # join/leave rooms with cleanup
│   │   ├── query/
│   │   │   ├── queryClient.ts            # TanStack QueryClient (defaults, retry, staleTime)
│   │   │   └── keys.ts                   # central query-key registry (STATE_MANAGEMENT.md)
│   │   ├── stripe/loadStripe.ts          # memoized Stripe.js loader
│   │   ├── map/mapbox.ts                 # Mapbox init, dark/light styles (docs/06 §2.6h)
│   │   ├── auth/                         # Clerk helpers, useRequireRole, resolvePrincipal
│   │   ├── geo.ts                        # geohash (match backend), distance, viewport→cells
│   │   ├── money.ts                      # cents↔display, never floats (matches backend)
│   │   ├── deeplink.ts                   # resolveDeeplink() (ROUTING_STRUCTURE §9)
│   │   ├── format.ts                     # dates (ISO-8601 UTC), tabular numbers, i18n
│   │   └── registry.tsx                  # styled-components SSR registry (NEXTJS_ARCHITECTURE §4.1)
│   │
│   ├── stores/                           # Zustand — client-only state (STATE_MANAGEMENT.md)
│   │   ├── mapViewport.store.ts          # center/zoom/visible cells
│   │   ├── filters.store.ts              # active category tab + search
│   │   ├── mode.store.ts                 # activeMode (customer/seller/vendor/hub/admin)
│   │   ├── theme.store.ts                # theme override (system/dark/light)
│   │   └── offlineQueue.store.ts         # queued seller QR scans (PWA_IMPLEMENTATION.md)
│   │
│   ├── styles/
│   │   ├── theme.ts                      # styled-components theme from docs/06 tokens
│   │   ├── tokens.ts                     # raw token values (color/space/radius/motion/type)
│   │   ├── GlobalStyle.ts                # reset, focus ring, tabular-nums, reduced-motion
│   │   └── styled.d.ts                   # DefaultTheme augmentation (typed theme)
│   │
│   └── types/                            # app-wide shared types (Principal, Role, Tier, Money)
│
├── public/                               # icons, PWA assets, static images
├── e2e/                                  # Playwright (auth, wave→queue→pay, seller checkout)
├── .env.local.example                    # NEXT_PUBLIC_* (API/SOCKET/MAPBOX/STRIPE/CLERK)
├── next.config.js                        # compiler.styledComponents, Serwist, images
├── tsconfig.json                         # strict: true, paths @/* → src/*
├── package.json
└── README.md
```

---

## 3. Why this shape

- **Feature slices mirror backend modules 1:1** (`livemap ↔ modules/livemap`, `consignment ↔ modules/consignment`, `queue ↔ modules/queue`…). A vendor-live-status change is one folder on each side; the seam between frontend and backend is a named contract, not a scavenger hunt.
- **`app/` stays thin** so the routing table is readable as the sitemap. Screens live in `features/*/screens` and are *imported* by pages — this also keeps `"use client"` boundaries obvious.
- **`components/` vs `features/*/components`**: shared-and-dumb vs domain-and-smart. A `QueuePositionCard` (knows queue semantics) lives in `features/queue`; a `StatusChip` (knows nothing) lives in `components/primitives`. Layout templates from `docs/12 §1` live in `components/layout` because every surface reuses them.
- **`lib/` isolates every third party** behind one module (`lib/stripe`, `lib/map/mapbox`, `lib/socket`, Clerk in `lib/auth`) — the same "swappable adapter" discipline as the backend, so Mapbox→MapLibre or Clerk-config changes are one folder.
- **`stores/` is deliberately small.** Server state lives in TanStack Query, not Zustand (`STATE_MANAGEMENT.md`); Zustand holds only genuinely-client state (viewport, filters, mode, theme, offline queue).
- **Types match the API contract.** Each feature's `types.ts` holds Zod schemas whose inferred types match the backend's response envelope — validating at the client edge the same way the backend validates at its edge, catching contract drift early.

---

## 4. Naming & convention standards

| Item | Convention |
|---|---|
| Folders | `kebab-case`, one per feature/domain |
| React components | `PascalCase.tsx` (`QueuePositionCard.tsx`); screens suffixed `.screen.tsx` |
| Hooks | `useThing.ts`, camelCase, one hook family per file |
| Zustand stores | `<name>.store.ts`, export `use<Name>Store` |
| styled-components | co-located `.styles.ts` or inline; must be in `"use client"` files (docs/07 caveat) |
| Query keys | centralized in `lib/query/keys.ts`, factory functions (`keys.queue(ownerId)`) |
| Money in UI | always integer cents in state; format at render via `lib/money.ts` (never float math) |
| Geo | `[lng, lat]` order to match backend GeoJSON; convert at the map boundary |
| Timestamps | ISO-8601 UTC from API; format for display only via `lib/format.ts` |
| Env vars | browser-exposed = `NEXT_PUBLIC_*`; nothing secret in the client |
| Path alias | `@/` → `src/` |
| Async | `async/await`, no floating promises (lint), errors mapped via `lib/api/errors.ts` |

---

## 5. Tooling & guardrails

- **Build/dev:** Next.js (App Router), `tsc` strict, Turbopack/webpack dev.
- **Lint/format:** ESLint (`@typescript-eslint`, `eslint-plugin-react-hooks`, `no-floating-promises`, import-boundary rule enforcing §1 direction) + Prettier — matching backend gates.
- **Validation:** Zod at the API boundary (parse responses in dev; type-only in prod hot paths).
- **State:** TanStack Query (server) + Zustand (client) — never duplicated.
- **Test:** Vitest + React Testing Library (components/hooks) · Playwright (`e2e/`: auth, wave→queue→pay, seller QR checkout, oversell block, admin dispute resolve) · axe for a11y assertions on core screens.
- **Contract sync:** the backend serves OpenAPI 3.1 at `/docs` (non-prod). Recommended: generate the API client types from that spec so `features/*/types.ts` cannot silently drift from the server — a build-time contract check.
- **Commit gates:** typecheck + lint + unit on pre-push; component/e2e + a11y + bundle-size budget in CI.
```
