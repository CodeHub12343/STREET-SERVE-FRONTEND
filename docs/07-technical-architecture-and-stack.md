# StreetServe — Technical Architecture & Tech Stack Recommendation

Baseline assumption: you (the developer) are MERN-native. Recommendations below default to MERN wherever it's genuinely sufficient, and only deviate where the deviation buys a concrete, explainable advantage — each deviation includes the trade-off so you can override it.

---

## 0. Web-First Build Stack (Phase 1 — the active decision)

**Decision (2026-07):** StreetServe is being built **web-first**. The three dashboards (Vendor, Hub, Admin) are genuinely web-native and lose nothing on web; the customer app ships as an installable **PWA** for the pilot, with a native customer app planned as a fast-follow (Phase 2) once demand is validated. See §12 "Web Pilot vs. Native — Feature Parity" for exactly what this does and doesn't cover, and why it's sufficient for a single-city pilot. Sections 1–11 below describe the fuller/eventual architecture this grows into; this section is what to actually build now.

This stack keeps you in your MERN strength for velocity, with one deliberate data-layer decision called out explicitly.

### Frontend (web + customer PWA)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + React 18 + TypeScript** | Batteries-included React framework with file-based routing; the public marketing / pre-register pages get real SSR/SEO (a plain SPA can't). TypeScript strongly recommended, especially on money/inventory/discount code. **Topology note:** Next.js is the web/SSR/frontend layer only — the **API, Socket.IO, and BullMQ live on the standalone Node/Express backend** (below). Do **not** run WebSockets inside Next serverless functions — they don't work in that model; the persistent realtime server is separate. |
| Routing | **Next.js App Router (built-in file-based routing)** | No separate router library needed — replaces React Router, which isn't used with Next. |
| Server state / data fetching | **TanStack Query** | Removes hand-rolled loading/error/cache state around every REST call; huge time saver for a solo dev. Works fine with Next (client components). |
| Client state | **Zustand** | Small footprint for the little genuinely-client state (map viewport, active filters). Use Redux Toolkit instead only if you already prefer its conventions. |
| Styling | **styled-components** with a `ThemeProvider` seeded from the design tokens in [06-ux-and-design-system.md](06-ux-and-design-system.md) | Developer preference. The design system's tokens (color, spacing, radius, motion) map directly to a styled-components theme object. **Two caveats:** (1) needs the App Router registry setup (`useServerInsertedStyleSheet`) for correct SSR style injection, and styled files must be `"use client"` (no React Server Components); (2) styled-components entered maintenance mode in early 2025 — stable and fine for the pilot, just not actively developed. |
| Maps | **Mapbox GL JS** (or **MapLibre GL JS** for a fully open-source path) | Custom real-time pin layers + clustering at the density this needs; dark/light map styles per §2.6h. Client-only — render inside a `"use client"` component. |
| Realtime | **Socket.IO client** | Live pins, queue updates, order status, messages — connects to the standalone Socket.IO server (not Next). |
| Payments UI | **Stripe.js + Stripe Elements / Payment Element** | No raw card data touches your servers; Apple Pay / Google Pay work in-browser via the Payment Request API (not a native-only capability). |
| PWA | **Serwist** (the maintained `next-pwa` successor) | Service worker + web manifest, installable "Add to Home Screen," offline shell, and web push where the platform allows it (Android solid; iOS only when installed — hence the SMS bridge below). |
| QR + camera (seller checkout, FR-8.2) | **`getUserMedia` + a JS QR library** (e.g. `html5-qrcode`) | Camera scanning and condition-photo capture work in mobile browsers on both Android and iPhone. |

> **Frontend/backend topology with Next.js:** Next.js serves the web UI, SSR marketing pages, and can host light BFF-style route handlers if convenient — but the **system of record API, the Socket.IO realtime server, and BullMQ workers run as a separate long-lived Node/Express service** (§0 Backend). Typical deploy: Next.js on Vercel/Netlify + the Express/Socket.IO/BullMQ backend on Render/Railway/Fly. Keeping the persistent backend separate is what avoids the "WebSockets don't run in serverless" trap.

### Backend

| Concern | Choice | Why |
|---|---|---|
| Runtime + framework | **Node.js + Express + TypeScript** | Stays fully in MERN. Express is the right call for a solo dev who knows it. (NestJS is worth it *only* if you want its built-in structure for the 9-role RBAC — optional, not required; don't let it slow your first ship.) |
| Realtime server | **Socket.IO + its Redis adapter** | Redis adapter is **not optional** the moment you run more than one server instance (which you will, for uptime) — bake it in from day one rather than retrofitting. Namespaces: `/live`, `/queue/:id`, `/notifications/:userId`, `/messages/:threadId`. |
| Background jobs | **BullMQ** (Redis-backed) | Settlement reconciliation, Trust Score recalculation, notification fan-out, ping-fraud checks. |
| **Primary database** | **PostgreSQL + PostGIS** *(recommended)* — **MongoDB acceptable fallback** | See the decision box below. This is the one deliberate deviation from the "M" in MERN, and it's about the data's nature (money + inventory + geo), not the platform. |
| Cache / hot path | **Redis** | Live-location state (short TTL), rate-limit counters (ping/wave abuse), session cache, hot reads (active vendors per geohash cell). Never hammer the primary DB with per-second location writes. |
| ORM / query layer | **Prisma** (if Postgres) / **Mongoose** (if Mongo) | Prisma gives typed queries + migrations that pair well with the TypeScript money paths; Mongoose if you go Mongo. |
| Auth | **Clerk or Auth0 (managed)** for the pilot | Building compliant auth (OTP, sessions, brute-force protection) for 9 roles is a distraction at pilot stage; managed gets you there fast. Revisit self-hosted only if cost bites at scale. |
| Identity verification (KYC) | **Stripe Identity or Persona** (web flow) | ID + selfie liveness for the seller tiers; both have hosted web flows, and StreetServe stores only a reference, never the raw documents (Security §2). |

### Non-negotiables regardless of the above
1. **Stripe Connect** for all marketplace money movement — do **not** build a custom ledger/escrow (money-transmission regulatory surface). Open a **fresh** Stripe account with an **accurate marketplace business category** (closes the loophole flagged in the excluded "Honest Need" chat, Executive Summary §2), and layer in **Stripe Tax**.
2. **Socket.IO + Redis** from day one (above) — single-instance assumptions break the moment you scale past one process.
3. **Twilio SMS** as the reliable alert bridge for the four background-dependent interactions the web/PWA can't do while the phone is asleep (proximity alerts, Block Party, passive geofence check-in, and vendor-pin-while-locked) — see §12. SMS doesn't care whether the app is open, which is exactly why it's the correct pilot tool, not a hack.

### The one real decision: Postgres/PostGIS vs. MongoDB

> **Recommended: PostgreSQL + PostGIS** as the system of record for anything touching money, inventory, identity, or trust — because settlement splits, the oversell guard (FR-8.3), Spot Me, and the Block Party "≥2 vendors within X m for Y min" query (FR-4.2) are exactly the transactional + geospatial workload Postgres is built for and MongoDB fights against. MongoDB can still earn a place as a *secondary* store for genuinely document-shaped, high-write log data (raw location-ping history, chat, AI recommendation logs).
>
> **Acceptable: full MongoDB** (staying 100% MERN) **if — and only if — learning Postgres would delay your launch by more than ~2 weeks.** A shipped pilot on Mongo beats a stalled one on Postgres. Mongo has `2dsphere` geo indexes and multi-document transactions, and a one-city pilot won't stress it. If you go this route, budget discipline for the two places it bites: (a) enforce the no-oversell / settlement-integrity rules at the application transaction layer, and (b) expect to compute Block Party detection in application code rather than a single elegant query.
>
> **Don't** try to learn both at once. Decide on the single question above and move.

### Deployment (pilot scale)
- **Frontend/PWA (Next.js):** Vercel (first-class for Next) or Netlify.
- **Backend (Express + Socket.IO + BullMQ — the persistent realtime server):** Render, Railway, or Fly.io (containerized, long-lived — this is deliberately *not* serverless, so WebSockets stay up). Avoid Kubernetes for a one-city pilot — it's complexity you don't need yet.
- **Managed data:** Postgres via Neon/Supabase/Render (or Mongo Atlas); Redis via Upstash. Managed over self-hosted — operational-risk reduction beats the marginal cost at this stage.
- **Object storage:** Cloudflare R2 (no egress fees — worth it given how many photos this flow generates) or AWS S3, behind a CDN.
- **CI/CD:** GitHub Actions; staging environment mirrors prod for the payment + geospatial paths specifically; Stripe in test mode in dev/staging.

---

## 1. High-Level Architecture

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│   Customer App (React Native)│     │  Vendor/Hub Web+Mobile Dash  │
│   iOS / Android              │     │  (React / React Native)      │
└──────────────┬───────────────┘     └───────────────┬─────────────┘
               │  HTTPS (REST) + WebSocket (live location, queue, chat)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway / BFF                        │
│                (Node.js / Express or NestJS)                     │
└───────┬───────────────┬───────────────┬───────────────┬─────────┘
        │               │               │               │
        ▼               ▼               ▼               ▼
 ┌────────────┐  ┌──────────────┐ ┌───────────────┐ ┌───────────────┐
 │ Core Domain │  │ Realtime/Geo │ │ Payments Svc  │ │ AI/Recs Svc   │
 │ Service     │  │ Service      │ │ (Stripe       │ │ (recommend,   │
 │ (users,     │  │ (location    │ │  Connect)     │ │ pricing,      │
 │ vendors,    │  │ pub/sub,     │ │               │ │ demand,       │
 │ consignment,│  │ geofencing,  │ │               │ │ coaching)     │
 │ trust, jobs)│  │ proximity)   │ │               │ │               │
 └──────┬──────┘  └──────┬───────┘ └──────┬────────┘ └──────┬────────┘
        │                │                │                 │
        ▼                ▼                ▼                 ▼
 ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐
 │ PostgreSQL  │  │ Redis +     │  │ Postgres     │  │ Vector store  │
 │ + PostGIS   │  │ Geo pub/sub │  │ (ledger) +   │  │ (pgvector) +  │
 │ (system of  │  │ (live pins) │  │ Stripe as    │  │ event/queue   │
 │  record)    │  │             │  │ system of    │  │ (BullMQ)      │
 │             │  │             │  │ truth for $) │  │               │
 └─────────────┘  └─────────────┘  └──────────────┘  └───────────────┘
```

Shared cross-cutting: message queue/event bus (e.g., Redis Streams or SQS) for settlement events, notifications, Trust Score recalculation, and AI job triggers; object storage (S3-compatible) for verification photos/condition images; CDN for static/media.

## 2. Frontend

| Layer | Recommendation | Why |
|---|---|---|
| Mobile app (Customer, Seller, Vendor) | **React Native (Expo)** | Stays in your existing React skill set, one codebase for iOS/Android, and Expo's managed workflow gets background-location permissions, push notifications, and camera/QR scanning (needed for FR-8.2) working fast without native module maintenance overhead. |
| Web dashboards (Hub/Vendor/Admin) | **React (Vite) + TypeScript** | Same component/mental model as the mobile app; TypeScript specifically recommended here (see below) because dashboards are where money-movement logic surfaces in the UI and type safety materially reduces a class of bugs in that surface. |
| State/data fetching | **TanStack Query + Zustand (or Redux Toolkit if you prefer conventions you already know)** | TanStack Query removes a huge amount of hand-rolled loading/error/cache state around REST calls; Zustand/RTK for the small amount of true client state (map viewport, active filters). |
| Maps | **Mapbox GL (or MapLibre GL for a fully open-source path)** | Both support custom real-time pin layers and clustering at the density this product needs; Google Maps is the fallback if brand familiarity matters more than cost — flagged as a client decision (see open questions). |

**Trade-off called out:** React Native adds a learning curve narrower than "new framework" (still React/JS) but wider than "just web" — background geolocation and native permission flows are the main new surface area versus your current MERN web experience. If a faster pilot matters more than app-store presence, a PWA-first customer experience is viable for MVP and buys you time to build the RN app in parallel — but push notifications and reliable background location are meaningfully worse on iOS PWAs, and background location is core to the live-map value prop, so **recommend native (React Native) from day one** rather than PWA-first.

## 3. Backend

| Layer | Recommendation | Why |
|---|---|---|
| API runtime | **Node.js + TypeScript**, framework: **NestJS** over plain Express | You keep Node/JS. NestJS adds structure (modules, DI, guards) that pays off specifically because this system has many cross-cutting concerns (RBAC across 9 roles, audit logging, tiered verification gates) that get messy fast in unopinionated Express at this scope. If you'd rather stay closest to what you know, Express + a disciplined folder structure is a legitimate fallback — the NestJS recommendation is about long-term maintainability, not a hard requirement. |
| Realtime | **Socket.IO** (Node-native, fits MERN) backed by **Redis** for pub/sub fan-out across server instances | Node/Socket.IO keeps you in-stack; Redis pub/sub is required the moment you run more than one API instance (which you will, for uptime), so it's not optional infrastructure — bake it in from the start rather than retrofitting. |
| Background jobs | **BullMQ** (Redis-backed) | Settlement reconciliation, Trust Score recalculation, notification fan-out, and AI recommendation refresh are all async jobs; BullMQ is the standard Node-ecosystem choice and integrates cleanly with the same Redis instance used for realtime. |
| AI / recommendation service | Start **rule-based** (category affinity + proximity + time-of-day heuristics) for MVP; introduce a Python microservice (FastAPI) only once you have enough first-party transaction data to train real demand models | This is the one place a second language is worth considering — Python's ML ecosystem (scikit-learn/PyTorch, pandas) is materially better for the demand-prediction/pricing work than anything in the Node ecosystem. Keep it as an isolated internal service behind the API gateway so the rest of the stack stays MERN; don't introduce it until FR-9's rule-based v1 has been outgrown by actual usage data — this avoids building ML infrastructure before there's data to justify it. |

## 4. Database — the one deliberate deviation from MERN

**Recommendation: PostgreSQL (with PostGIS) as the system of record, not MongoDB, for the core domain (users, vendors, consignment inventory, transactions, Trust Score, disputes).**

Why this is worth deviating from the "M" in MERN:
- **Money and inventory are inherently relational and require transactional integrity.** FR-8.3/FR-8.4 (inventory can't be oversold; settlement math must be atomic and auditable) and FR-11 (escrow/payout splits) are exactly the workload relational databases with real ACID transactions and foreign-key constraints are built for. MongoDB's multi-document transactions exist but are bolted on top of a document model that isn't naturally shaped for this data — you'd be fighting the database to get guarantees Postgres gives you by default.
- **PostGIS is the industry-standard geospatial engine.** Proximity queries, radius search, and the "≥2 vendors within Xm for Y minutes" Block Party detection (FR-4.2) are well-trodden PostGIS query patterns; MongoDB's geospatial indexes are usable but noticeably less capable for the compound geo+time+relational queries this feature needs.
- **Trust/dispute/audit trails benefit from strong schema + constraints.** An immutable, auditable ledger (FR-10, NFR Auditability) is easier to guarantee correct with a strongly-typed relational schema than with a flexible document store, where a missing field or type drift is a runtime bug instead of a migration-time error.

**Where MongoDB still earns its place:** genuinely document-shaped, high-write, low-relational data — e.g., raw location-ping history (if you want a longer trail than Redis's ephemeral pub/sub keeps), chat/messages, AI recommendation logs, activity feeds. **Recommend a polyglot-persistence split:** Postgres for anything touching money, inventory, identity, or trust; MongoDB (or a time-series store) for high-volume, low-stakes event/log data. This isn't "abandon MERN" — it's "use Mongo for what Mongo is genuinely best at, and Postgres for the 20% of the schema that is the financial and trust core of the whole product."

If you'd strongly prefer to stay 100% MongoDB for team-familiarity reasons, it's workable — just budget extra engineering time for transaction discipline (multi-document transactions, application-level oversell guards) and plan to bolt on a geospatial query layer carefully. Flagged as a real option, not dismissed, but the trade-off above is why Postgres is the primary recommendation.

## 5. Authentication
- **Recommendation: Auth0 or Clerk (managed) for MVP**, migrating to self-hosted (e.g., Ory or a custom JWT/refresh-token service) only if managed-auth cost becomes material at scale.
- Why managed first: this product has 9 roles, tiered verification, and KYC-adjacent identity requirements (FR-1b) — building compliant auth (password reset, OTP, session management, brute-force protection) from scratch is a distraction from the actual product in the pilot phase. Managed auth providers also typically bundle SOC 2 compliance you'd otherwise have to build toward independently.
- Identity verification (ID + selfie liveness, tied to Tier 1/2/3) is a distinct concern from login auth — recommend a dedicated KYC provider (e.g., Persona, Stripe Identity) rather than building document verification in-house; this is a solved, heavily regulated problem not worth reinventing.

## 6. Storage
- **Media (condition photos, product photos, profile images):** S3-compatible object storage (AWS S3 or Cloudflare R2 — R2 has no egress fees, worth considering given how many photos this flow generates) behind a CDN.
- **Structured data:** Postgres (primary) + MongoDB (secondary, event/log data) as above.
- **Cache/session/realtime state:** Redis.

## 7. Payments
- **Stripe Connect (Express or Custom accounts)** for all marketplace money movement — vendor/seller payouts, consignment settlement splits, Spot Me tracking, tips. Directly satisfies FR-11's escrow requirement and the tiered-payout-timing rule, since Stripe Connect natively supports delayed payouts, split transfers, and KYC collection per connected account.
- **Open a fresh Stripe Connect account under an accurate marketplace/platform business category** — never a renamed or repurposed legacy account carrying different business history. This is the confirmed default from [11-roadmap-and-open-questions.md](11-roadmap-and-open-questions.md) Q5, and the direct, correct alternative to the red-flagged pattern noted in the Executive Summary (misrepresenting business category to bypass processor review).
- **Stripe Tax**, layered on top of Connect, for marketplace-facilitator sales tax collection/remittance on consignment sales — StreetServe (as facilitator) handles this centrally rather than pushing tax obligations onto individual hubs or sellers, per Q3's recommended default. Pending final confirmation from counsel on money-transmission scope (Q3), but this is the architecture to build toward.
- **Do not build a custom ledger/escrow system from scratch** — this is a regulatory and security surface area (money transmission licensing) that a payments processor absorbs on your behalf when you use their connected-accounts model correctly. This is also the direct, correct alternative to the red-flagged pattern noted in the Executive Summary (misrepresenting business category to bypass processor review) — the right path is accurate category declaration plus using the processor's built-in marketplace tooling, not working around its compliance checks.

## 8. Notifications
- **Push:** Firebase Cloud Messaging (cross-platform, free tier is generous, integrates with Expo/React Native directly).
- **SMS/OTP:** Twilio.
- **Email:** Postmark or SES (transactional-only; not a marketing ESP concern for this doc).

## 9. Caching Strategy
- Redis for: live location state (short TTL, e.g., 30–60s), session/auth token cache, rate-limiting counters (ping-share abuse, wave-down spam), hot-path reads (active vendor list per geohash cell).
- CDN edge caching for static assets and public marketing/landing content (already deployed as a static site per the source material).

## 10. Deployment Strategy
- **Containerized services (Docker) on a managed platform** — Render, Railway, or Fly.io for pilot-stage simplicity; migrate to AWS ECS/EKS only once traffic/cost justifies the added operational overhead. Avoid defaulting straight to Kubernetes for a single-city pilot — it's real complexity you don't need yet.
- **Managed Postgres** (e.g., Neon, Supabase, or RDS) and **managed Redis** (Upstash or ElastiCache) rather than self-hosting either — operational risk reduction matters more than the marginal cost savings at pilot scale.
- CI/CD: GitHub Actions → build/test/deploy pipeline; staging environment mirrors production for the payment and geospatial paths specifically, since those are the hardest to safely test only in production.
- Environment separation: dev / staging / production, with Stripe in test mode in the first two.

## 11. Summary Trade-off Table

| Decision | Chosen | Alternative considered | Why chosen |
|---|---|---|---|
| Mobile framework | React Native | Flutter | Keeps you in JS/React; Flutter is arguably smoother for pure UI polish but costs you a second language for no offsetting advantage here |
| Backend framework | NestJS | Express | Structure pays off at 9-role RBAC scale; Express remains a valid fallback if you prefer minimal abstraction |
| Primary database | PostgreSQL + PostGIS | MongoDB | Transactional integrity for money/inventory + mature geospatial querying |
| Secondary store | MongoDB | — | Genuinely document-shaped log/event data still fits Mongo well |
| Auth | Managed (Auth0/Clerk) | Custom JWT | Compliance and velocity in pilot phase; revisit at scale |
| Payments | Stripe Connect | Custom ledger + generic processor | Regulatory risk transfer, native marketplace payout support |
| AI/ML | Rule-based Node service → Python microservice later | Full ML from day one | No data to train on yet; avoid premature infrastructure |
| Deployment | Render/Railway/Fly.io → AWS later | Kubernetes from day one | Match infra complexity to pilot-stage traffic |

## 12. Web Pilot vs. Native — Feature Parity (decision record)

The Phase-1 web-first build (§0) delivers **the entire product's business logic with no features cut**. Everything that is data-, money-, or decision-shaped works identically on web and native: wave down, the queue/discount engine, payments (Apple/Google Pay included via the browser Payment Request API), scheduling, gifting, Spot Me, messaging (while the app is open), reviews, the full consignment/seller lifecycle, Trust Score, QR seller checkout (`getUserMedia` + JS), KYC selfie/ID (hosted web flow), and all three dashboards (which were web-native by design). That's the large majority of the 77 screens.

**There is exactly one root limitation, and it is an OS-level wall, not a "web is worse" quality gap:** browsers cannot reliably run code while the phone is locked and the app is closed. That surfaces in precisely four interactions:

| # | Interaction | Web/PWA status | Pilot mitigation |
|---|---|---|---|
| 1 | Proximity alerts ("a followed vendor just went Driving near you") | Blocked when app closed + phone asleep (Android web push OK if PWA installed; iOS only if "Added to Home Screen," less reliable) | **Twilio SMS** — a text fires regardless of app state |
| 2 | Pop-Up Mode / Block Party auto-broadcast | Same background-push dependency | **Twilio SMS** |
| 3 | Jobs passive geofence check-in/out | Auto/background version is native-only | Worker **opens the app and taps check in** while on-site — small UX tax, not a missing feature |
| 4 | Vendor "moving pin" while phone locked | Broadcasts fine while app open + screen on; stops when locked/backgrounded | Onboard pilot vendors to **keep the app open / phone unlocked while live** (dash mount) — a normal, honest ask for a hand-onboarded pilot |

**Why this is sufficient for the pilot:** the pilot's job is to answer "do customers show up when a nearby vendor goes live?" — and SMS-bridged web geolocation answers it without native. These four items — and only these four — are what eventually justifies the Phase-2 native customer app, once demand is proven. Nothing is left out of the product; four interactions degrade from "automatic while your phone sleeps" to "works while the app is open, or via SMS," each with a workaround good enough for a single-city, hand-onboarded pilot.

**Phase 2 (native customer app), when triggered by validated demand:** React Native (Expo) reusing the same React/TypeScript skills, same backend, same design system — see §2. It upgrades those four interactions to true background behavior; it does not add missing features.
