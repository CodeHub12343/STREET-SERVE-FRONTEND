# StreetServe — Frontend

Next.js App Router + React 18 + TypeScript **PWA**. The web UI + SSR marketing for StreetServe.
The API, Socket.IO realtime server, and BullMQ workers live in the **separate backend**
(`STREET-SERVE-APPLICATION-BACKEND`) — this app talks to them over REST + WebSockets.

> 📑 **[DOCS_INDEX.md](DOCS_INDEX.md) labels every document in this repo current / superseded /
> historical.** Start there if you are looking for something.
>
> **Status:** milestones M0–M10 are delivered; the frontend roadmap that describes them is now
> historical. The active plan is
> [audit/2026-08-marketplace-spec/IMPLEMENTATION_ROADMAP.md](audit/2026-08-marketplace-spec/IMPLEMENTATION_ROADMAP.md)
> — Phases 1–6 complete, 7–8 open. The one launch blocker is M-1: the four §60 agreement bodies are
> placeholder text pending attorney review.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in as needed; the shell boots even with blanks
npm run dev                        # http://localhost:3000
```

Open `/` for the foundation home (theme toggle + a live "Foundation status" panel proving the
Query + Socket plumbing). Navigate into each surface: `/map`, `/seller`, `/vendor`, `/hub`, `/admin`.

Without Clerk keys the app runs in **dev-auth-off** mode: auth guards no-op and the socket stays
idle so you can browse the shells. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` to
activate real sign-in, route protection, and the authenticated socket.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (incl. layering-boundary rules) |
| `npm run test` | Vitest (unit + component) |
| `npm run storybook` | Component catalog on :6006 (dark + light) |

## Architecture (the short version)

- **One responsive PWA, five surfaces** as App Router route groups: `(marketing)` (SSR),
  `(auth)`, `(customer)`, `(seller)`, `(dashboard)` (vendor+hub), `(admin)`.
- **Server components** for marketing/SEO + the layout shell; **client components** for every
  interactive product screen. See [NEXTJS_ARCHITECTURE.md](NEXTJS_ARCHITECTURE.md).
- **State:** TanStack Query (server) + Zustand (client-only); the socket patches the Query cache.
  See [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md).
- **Styling:** styled-components on a token-driven theme (dark default + light), SSR registry.
  See [COMPONENT_LIBRARY.md](COMPONENT_LIBRARY.md).
- **Layering:** `app → features → { components, lib, stores }`, enforced by ESLint
  `import/no-restricted-paths`. See [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md).

## Environment

See `.env.local.example`. Only `NEXT_PUBLIC_*` reaches the browser; never commit secrets.

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend REST base (`/api/v1`) |
| `NEXT_PUBLIC_SOCKET_URL` | Backend Socket.IO origin |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Managed auth (optional in dev) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js (publishable only) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox GL JS |
| `ENABLE_PWA` | Turns on the Serwist service worker (Milestone 9) |

## Planning docs

The 16 frontend blueprint documents live at the repo root (`NEXTJS_ARCHITECTURE.md`,
`ROUTING_STRUCTURE.md`, `FOLDER_STRUCTURE.md`, …, `IMPLEMENTATION_CHECKLIST.md`). They are the
single source of truth for what gets built and in what order.
