# StreetServe — Next.js Frontend Architecture

> The application shell: App Router topology, Server/Client component boundaries, the provider tree, middleware, route-group app modes, and the deploy topology.
> **Functional source of truth:** the implemented backend (`STREET-SERVE-APPLICATION-BACKEND`). **Stack source of truth:** `docs/07-technical-architecture-and-stack.md`. **Visual source of truth:** `docs/06-ux-and-design-system.md` + `docs/design/*.html`.
> Companion: [ROUTING_STRUCTURE.md](ROUTING_STRUCTURE.md), [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md), [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md).

---

## 0. Platform reconciliation (read first)

`docs/12-screen-inventory-and-sitemap.md` labels the Customer and Street-Seller surfaces "**React Native (mobile)**." That label is **stale**. The chosen stack (`docs/07`, and the stack handed to this planning phase) is a **single Next.js App Router web application, delivered as an installable PWA** (Serwist). This document — and every frontend planning doc — treats that as settled and resolves the label as follows:

| Doc-12 label | This architecture |
|---|---|
| Customer App "mobile / React Native" | Mobile-**viewport** routes in the Next.js PWA (`(customer)` route group), installable "Add to Home Screen" |
| Street Seller "mobile" | Mobile-**viewport** routes in the Next.js PWA (`(seller)` route group) |
| Vendor/Hub "web" | Desktop-first dashboard routes (`(dashboard)` route group), responsive down to mobile per §2.6i |
| Admin "web · internal" | Desktop-first internal console (`(admin)` route group) |

**One codebase, one design system, five surfaces, responsive breakpoints — not two native apps.** The consequence everywhere: no `react-native` primitives, no Expo, no native navigation. "Mobile" means a ≤640px viewport served the same React tree. Camera/QR (S-06, S-09) and geolocation use **web** APIs (`getUserMedia`, `navigator.geolocation`), which is exactly what `docs/07` specifies (`html5-qrcode`, Web Geolocation).

> If the client actually wants a *native* app later, the recommended path is Capacitor-wrapping this PWA or a separate React Native client against the same REST/Socket API — **not** a rewrite. That decision is out of scope for the pilot; the pilot ships the PWA.

---

## 1. The one-sentence architecture

> A single **Next.js 14+ App Router + React 18 + TypeScript (strict)** application that renders public marketing/SEO pages on the server, hydrates every authenticated product surface as interactive client components, and talks to a **separate long-lived Node/Express + Socket.IO + BullMQ backend** over REST (TanStack Query) and WebSockets (Socket.IO client) — never embedding API, realtime, or job logic in Next itself.

The single most important boundary in this whole system, restated from `docs/07`:

> **The API, Socket.IO server, and BullMQ workers live on the standalone Express backend. Next.js is the web/SSR/frontend layer only. Do NOT run WebSockets inside Next serverless functions.**

Everything below serves that boundary.

---

## 2. Server vs Client component strategy

Next.js App Router defaults every component to a **React Server Component (RSC)**. StreetServe's product is overwhelmingly interactive, realtime, map-driven, and styled with styled-components (which requires the client). So the practical rule is:

### 2.1 The boundary rule

| Layer | Rendering | Why |
|---|---|---|
| **Marketing / pre-register / legal** (`(marketing)`) | **RSC + SSR**, minimal/no client JS | Real SEO + fast first paint; `docs/07` explicitly calls out that a plain SPA can't do this. These are the *only* screens that benefit from server rendering. |
| **Root layout, route-group layouts, metadata, fonts** | **RSC** (server) | Layouts stay server components; they render a Client `Providers` boundary as a child. Keeps `<head>`, metadata, and font loading on the server. |
| **Every authenticated product screen** (customer/seller/dashboard/admin) | **Client (`"use client"`)** | Map, realtime pins, Stripe Elements, camera, drag-and-drop kanban, optimistic mutations, Zustand, styled-components — all client-only. Auth token is held client-side (Clerk). There is no SEO value in a logged-in queue screen. |
| **Shared UI primitives** (Button, Sheet, MapPin…) | **Client** | styled-components components must be `"use client"` (`docs/07` caveat). |
| **Route handlers** (`app/api/*`) | Server (Node runtime) | Thin BFF only — see §6. Not the system-of-record API. |

### 2.2 Why not "server-first" fetching for product screens

A tempting App-Router pattern is fetching data in server components. We deliberately **do not** do that for authenticated screens, because:

1. **The access token is a Clerk client-side/short-lived JWT** sent as `Authorization: Bearer` to the *Express* API. Server components would need to forward it, adding a token-relay hop for zero benefit on non-SEO screens.
2. **The data is realtime.** A server-rendered queue position is stale on arrival; these screens live on TanStack Query + Socket.IO, not RSC data fetches.
3. **The backend is the single API.** Duplicating fetch logic into RSC + client would fork the data layer. We keep one client data layer (TanStack Query) — see [DATA_FETCHING_STRATEGY.md](DATA_FETCHING_STRATEGY.md).

**Net:** RSC earns its keep on marketing/SEO and on the layout/metadata shell. Product screens are a well-structured client SPA *inside* the App Router, getting App Router's routing, code-splitting, streaming, and PWA story for free.

### 2.3 The `"use client"` seam

Put the directive as **low as possible** but at the top of each product page. Pattern: a server `page.tsx` (for metadata/params) can render a client `*.screen.tsx`. In practice most product pages are themselves `"use client"` because they need `useParams`/hooks immediately — that's fine and idiomatic here.

---

## 3. Route-group app modes

The App Router `(group)` syntax partitions the app into surfaces that share a layout/shell **without** adding a URL segment. This is how we get five distinct "apps" in one project. Full route tables live in [ROUTING_STRUCTURE.md](ROUTING_STRUCTURE.md); the shells:

```
app/
├── (marketing)/        → public SSR site: landing, pre-register, legal      [MapShell? no — static]
├── (auth)/             → Clerk-hosted + our OTP/role/verification wizards    [WizardFlow]
├── (customer)/         → mobile-viewport PWA: map, wave, queue, orders…      [MapShell/SheetStack/TabPage]
├── (seller)/           → mobile-viewport: discover inventory, checkout…      [MapShell/WizardFlow/TabPage]
├── (dashboard)/        → vendor + hub desktop-first dashboards               [DashboardShell]
└── (admin)/            → internal Trust & Safety console                     [DashboardShell]
```

Each group owns a `layout.tsx` that installs the correct **layout template** from `docs/12 §1` (MapShell, SheetStack, TabPage, WizardFlow, DashboardShell, SettingsList, ConversationView). See [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md) for those templates.

**Role-switching (not separate logins):** `docs/06 §3` mandates one account with an additive role switcher. The groups are *surfaces*, not accounts. A single logged-in user with `customer + seller + vendor` roles can move between `(customer)`, `(seller)`, and `(dashboard)` via the in-app role switcher; a Zustand `activeMode` store + the route group they navigate to reflect the current surface. Guarding is by **role membership** (from `/users/me`), enforced in middleware + layout — see §5 and [AUTHENTICATION_IMPLEMENTATION.md](AUTHENTICATION_IMPLEMENTATION.md).

---

## 4. The provider tree

A single Client `Providers` component, mounted once by the root layout, composes every cross-cutting context. Order matters (outer → inner):

```tsx
// app/providers.tsx  ("use client")
<ClerkProvider>                     {/* identity — must wrap everything that reads auth */}
  <StyledComponentsRegistry>        {/* SSR style injection (useServerInsertedStyleSheet) */}
    <ThemeProvider theme={theme}>   {/* styled-components theme from design tokens (docs/06) */}
      <QueryClientProvider>         {/* TanStack Query — one client per browser session */}
        <SocketProvider>            {/* Socket.IO connection lifecycle, gated on auth */}
          <ToastProvider>           {/* app-wide toast/snackbar (docs/06 §2.6d) */}
            {children}
          </ToastProvider>
        </SocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StyledComponentsRegistry>
</ClerkProvider>
```

Notes:
- **Zustand needs no provider** — stores are module singletons imported where needed (map viewport, active filters, activeMode). See [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md).
- **Stripe `<Elements>` is NOT global.** It wraps only the payment surfaces (C-22, C-21→24, booking pay, checkout pay) with a per-transaction `clientSecret`. Global mounting would fetch a PaymentIntent no one needs. See [PAYMENTS_IMPLEMENTATION.md](PAYMENTS_IMPLEMENTATION.md).
- **`SocketProvider` connects only when authenticated** and disconnects on logout; it lazily joins namespaces/rooms per screen (map cells, a queue, a thread). See [REALTIME_IMPLEMENTATION.md](REALTIME_IMPLEMENTATION.md).
- **Theme:** `theme` is a typed object generated from the exact CSS variables in `docs/design/index.html` (`--orange`, `--blue`, `--green`, surfaces, ink, motion, radius). Dark is default; light + system via `data-theme` on `<html>`, following `docs/06 §2.7`.

### 4.1 styled-components + App Router SSR (mandatory setup)

Per `docs/07`, styled-components in the App Router requires a registry using `useServerInsertedStyleSheet`, or first paint flashes unstyled. `StyledComponentsRegistry` (a `"use client"` component) collects the server-side style sheet and injects it. `next.config.js` sets `compiler: { styledComponents: true }`. This is non-negotiable boilerplate — captured in [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md) (`lib/registry.tsx`).

---

## 5. Middleware & route protection

Two enforcement layers on the client side, backing the **authoritative** server-side RBAC (which the backend enforces on every route regardless — `AUTHENTICATION_AND_AUTHORIZATION.md`). Client guards are UX, not security.

### 5.1 `middleware.ts` (edge)
- Clerk middleware (`clerkMiddleware`) runs on all non-public matchers.
- **Public matchers:** `(marketing)` routes, `/api/webhooks/*` (if any BFF webhooks), static assets, the PWA manifest/service worker, and public map read (`/map` unauthenticated browse is allowed per API `🔓`).
- **Protected matchers:** everything in `(customer)/(seller)/(dashboard)/(admin)`. Unauthenticated → redirect to `(auth)` sign-in with a return URL.
- Middleware does **coarse** auth only (is there a session?). It does **not** know app-roles — roles come from our DB (`/users/me`), not the Clerk token (`AUTHENTICATION_AND_AUTHORIZATION.md §1`).

### 5.2 Role/tier gating at the layout level
- Each protected group layout calls a `useRequireRole('vendor')` (or `requireAnyRole`) guard hook that reads the cached `/users/me` principal (roles + `verificationTier` + `status`).
- Missing role → redirect to the add-role flow (`POST /auth/roles`, additive model) or the customer home, not a hard 403 screen.
- **Verification-tier gates** (e.g. checkout requires ≥ bronze) are enforced at the action, surfaced as the design's tier-progress prompts (C-36 Verification center), never as a dead end — matches `docs/06 §1` "friction scales with money movement."
- **Suspended accounts** (`status: 'suspended'`) are bounced to a support screen; the backend also rejects them at Principal load and on the socket handshake.

> The frontend mirrors the backend's guard order — `authenticate → role → ownership → tier` — as *progressive disclosure*, but never assumes it replaces server enforcement. Every gated action still round-trips and handles a `403/422` gracefully.

---

## 6. Route handlers (BFF) — deliberately thin

`docs/07` says Next *can* host "light BFF-style route handlers if convenient." We use them for exactly three narrow jobs and nothing else:

| Use | Why it lives in Next, not the client |
|---|---|
| **Mapbox token / config proxy** (optional) | Keep a restricted Mapbox token out of the bundle if using a server-scoped token; otherwise a URL-restricted public token is fine and this handler is skipped. |
| **`/api/health` for the platform** | Lets Vercel/uptime ping the frontend independently of the backend. |
| **OG-image / metadata helpers** for marketing share cards | Server-only rendering of dynamic share images. |

**Explicitly NOT in Next route handlers:** the domain API, auth token minting (Clerk owns it), Socket.IO (impossible in serverless — the core trap), BullMQ, Stripe PaymentIntents (backend, with idempotency keys + webhooks), file uploads to R2 (backend issues presigned URLs). Everything money/realtime/inventory goes straight to the Express API from the client with the bearer token.

---

## 7. Loading, error & not-found conventions

App Router file conventions, applied per route group so each surface degrades in its own visual language (`docs/06 §2.6e`, `docs/12 §6`):

| File | Behavior |
|---|---|
| `loading.tsx` | **Skeleton** matching target geometry — never a centered spinner for content (`docs/06 §2.6e`). Map shell shows a skeleton map + skeleton pins; dashboards show skeleton stat grids. |
| `error.tsx` | Client error boundary per group: human-readable message + **Retry** (re-invokes the query/segment). Money screens get the "failure-with-no-double-charge" copy (`docs/12 §6`). |
| `not-found.tsx` | Branded 404 in the surface's shell (e.g. a "no business here" empty-state map). |
| `global-error.tsx` | Root fatal boundary (rare). |
| Suspense boundaries | Wrap async client subtrees so a slow query streams a skeleton, not a blank screen. |

Empty states are **components, not files** — every list/map screen renders an actionable empty state ("No vendors near you yet → widen radius / pre-register / check Jobs"), per the `docs/06 §1` "empty state as a sales tool" rule. Catalogued in [SCREEN_TO_COMPONENT_MAPPING.md](SCREEN_TO_COMPONENT_MAPPING.md).

---

## 8. Rendering & performance posture

- **Code-splitting by route group** is automatic; additionally lazy-load the heavy, rarely-first-paint bundles: **Mapbox GL JS**, **Stripe.js**, **html5-qrcode**, and the charting lib (analytics). `next/dynamic` with `ssr: false` for anything touching `window`/`navigator` (map, camera, Stripe).
- **Marketing pages** target near-zero client JS; product shells accept a larger interactive bundle but split per-surface so a customer never downloads the admin console.
- **Fonts** (Inter + Inter Tight / General Sans per `docs/06 §2.3`) via `next/font` (self-hosted, no layout shift, tabular-nums for money/countdowns).
- **Images**: `next/image` for marketing + business covers/menu/gallery at the ratios in `docs/06 §2.6g`; map logo-pins go through the moderation/format pipeline (square, size-limited) the backend enforces.
- **Realtime coalescing**: cap pin re-renders to ~1/sec/client (matches backend backpressure note, `REALTIME_ARCHITECTURE.md §8`) so the map stays smooth at 10k sessions.
- **Reduced motion**: all motion collapses to ≤100ms opacity under `prefers-reduced-motion` (`docs/06 §2.6c`).

---

## 9. Deploy topology

Per `docs/07`, kept literally:

```
┌─────────────────────────────┐        ┌──────────────────────────────────────┐
│  Next.js (Vercel / Netlify) │  HTTPS │  Express API + Socket.IO + BullMQ     │
│  • marketing SSR            │───────▶│  (Render / Railway / Fly)             │
│  • customer/seller PWA      │  WSS   │  • /api/v1 REST (system of record)    │
│  • vendor/hub/admin dash    │◀──────▶│  • Socket.IO (/live /queue /notif …)  │
└─────────────────────────────┘        │  • BullMQ workers (separate dyno)     │
        │                              └───────────────┬──────────────────────┘
        │ 3rd-party JS (browser)                       │
        ▼                                              ▼
  Clerk · Stripe.js · Mapbox            Mongo (replica set) · Redis · Stripe · Clerk · Twilio · FCM · R2
```

- **CORS + WS origin allow-list** on the backend must include the Next deploy origins.
- **Sticky sessions** at the backend LB for the WS upgrade (`REALTIME_ARCHITECTURE.md §1`) — a frontend concern only insofar as we assume one stable `SOCKET_URL`.
- **Env split**: `NEXT_PUBLIC_*` for anything the browser needs (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_STRIPE_PK`, Clerk publishable key). Secrets never leave the backend.

---

## 10. Global cross-cutting requirements (apply to every screen)

Baked into the shell so no screen re-implements them (`docs/12 §6`, `docs/06 §2.8`):

1. **Every screen ships loading + empty + error** states; money screens add **pending-confirmation** + **failure-without-double-charge**.
2. **Offline shell** (Serwist): cached last-known map pins ("may be stale"), queued QR scans for sellers — see [PWA_IMPLEMENTATION.md](PWA_IMPLEMENTATION.md).
3. **WCAG 2.1 AA**: 44×44px targets, 2px `--blue` focus ring on every interactive element (never removed), color never the sole signal, the **list view (C-12)** as full map parity, `prefers-reduced-motion` respected.
4. **Theme-aware**: dark default, light first-class, system-following with in-app override.
5. **i18n-ready**: copy externalized (multi-language is a roadmap item; structure now, translate later).
6. **Reconnect-and-catch-up**: on socket reconnect, refetch authoritative state over REST (`REALTIME_ARCHITECTURE.md §7`).

---

## 11. Open architecture questions (for the checkpoint)

| # | Question | Recommendation |
|---|---|---|
| Q-A1 | One Next app for all five surfaces, or split admin into its own deploy? | **One app, route groups** for the pilot (shared design system, shared auth, simplest ops). Split admin later only if bundle/security isolation demands it. |
| Q-A2 | Mapbox GL JS vs MapLibre GL JS? | **Mapbox** for the pilot (managed custom dark/light styles per `docs/06 §2.6h`, less setup). MapLibre is the open-source exit if Mapbox pricing bites — the map is isolated behind one `<Map>` component either way. |
| Q-A3 | Should vendor/hub dashboards also be installable PWAs? | Yes, same manifest scope; they're desktop-first but a vendor on a phone benefits from install + push. Low cost since it's one app. |
| Q-A4 | `next/font` self-host of General Sans (not on Google Fonts)? | Self-host the licensed file; fall back to Inter Tight if licensing is unresolved at pilot. |
```
