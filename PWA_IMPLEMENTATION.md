# StreetServe — PWA Implementation

> Serwist service worker, web manifest, install experience, offline shell, background/queued actions, and web push — the capabilities that make the Next.js app an installable, resilient product rather than a website.
> Companion: [REALTIME_IMPLEMENTATION.md](REALTIME_IMPLEMENTATION.md) §7, [DATA_FETCHING_STRATEGY.md](DATA_FETCHING_STRATEGY.md) §6, [NEXTJS_ARCHITECTURE.md](NEXTJS_ARCHITECTURE.md).

---

## 1. Stack

- **Serwist** — the maintained `next-pwa` successor (`docs/07`) — provides the service worker, precache manifest, runtime caching, and web-push plumbing for the App Router.
- `app/manifest.ts` (typed Next metadata route) → the web manifest.
- `app/sw.ts` → the service-worker source, compiled by Serwist.
- Scope covers all five surfaces (one app); dashboards are installable too (`NEXTJS_ARCHITECTURE §11 Q-A3`).

---

## 2. Install experience ("Add to Home Screen")

- **Manifest**: name/short_name, theme + background from design tokens (dark default), maskable icons (business-neutral StreetServe mark), `display: standalone`, `start_url: /map?source=pwa`, orientation portrait for mobile surfaces.
- **Custom install prompt**: capture `beforeinstallprompt`, surface a tasteful "Add StreetServe to your home screen" affordance at a natural moment (e.g. after first successful wave/order), not on first paint.
- **iOS**: no `beforeinstallprompt` — show an "Add to Home Screen via Share" hint on iOS Safari. Installed iOS PWAs unlock web push (only when installed) — this is exactly why the **SMS bridge** exists for background-blocked events (`docs/07`, `REALTIME_IMPLEMENTATION §7`).

---

## 3. Caching strategy (Serwist runtime rules)

| Asset class | Strategy | Notes |
|---|---|---|
| App shell (HTML/JS/CSS, fonts) | **Precache** + stale-while-revalidate | instant cold open of the installed app |
| Map tiles (Mapbox) | **CacheFirst**, capped + TTL | last-viewed area works offline; respect Mapbox ToS on tile caching |
| Business logos / covers / menu images | **StaleWhileRevalidate**, size-capped | pins + profiles render offline |
| **API GET responses** | **NetworkFirst** w/ short timeout → cache fallback | powers the offline shell; pairs with TanStack Query persistence |
| API POST / money / auth | **NetworkOnly** | never cache mutations or authed-sensitive writes |
| Stripe.js / Clerk / Mapbox SDK | NetworkFirst / their own caching | third-party; don't aggressively cache |

- **TanStack Query persistence** (`persistQueryClient`, `DATA_FETCHING §6`) complements SW caching: `keys.me`, `keys.favorites`, last `keys.mapNearby` persist to storage so a cold PWA open shows last-known data instantly, then revalidates.

---

## 4. Offline shell (`docs/12 §6`, `docs/13 C-10`)

Every screen has an offline state; the notable ones:

| Screen | Offline behavior |
|---|---|
| C-10 Map | cached last-known pins at **60% opacity** + "as of X min ago" banner ("may be stale") |
| C-25 Orders / C-14 Profile / C-31 Favorites | last cached lists, read-only, "reconnect to refresh" banner |
| C-22 Payment & all 💳 | **blocked offline** with a clear "you're offline — connect to pay" state (never queue a charge) |
| S-06/S-08 Seller QR | **queued** offline actions (§5) |
| Global | offline banner; actions that require the network are disabled with explanation, not silent failures |

On reconnect: the socket re-establishes + REST refetches authoritative state (`REALTIME_IMPLEMENTATION §6`).

---

## 5. Queued/background actions (seller offline tolerance — G12, V1.x → design now)

Sellers work on the street with flaky connectivity. **QR checkout (S-06) and log-sale (S-08) tolerate offline** by queuing:

```
action offline → offlineQueue.store (persisted) with its Idempotency-Key
   → Background Sync (SW) registers a sync tag
   → on connectivity → replay POST with the SAME idempotency key (no double effect)
   → on success → remove from queue, update UI; on 409 oversell → surface conflict to seller
```

- **Idempotency keys make replay safe** — the same key means a replayed checkout/sale can't double-charge or double-decrement inventory (`PAYMENTS_IMPLEMENTATION §3`).
- Condition photos captured offline are stored (IndexedDB/Cache) and uploaded via the presign flow on reconnect (`DATA_FETCHING §7`).
- The UI shows each queued action's state (queued / syncing / synced / conflict).
- **Money-creating actions that can't be reconciled safely stay online-only** (card payments C-22) — only inventory actions with server-side oversell guards queue.

> This is scoped V1.x in the backend inventory (G12) but the **client architecture accommodates it from day one** (the store + idempotency + SW sync), so enabling it later isn't a rewrite.

---

## 6. Web push (needs GAP-4 endpoint)

- Request notification permission **after** the C-08 primer (not on load), then subscribe via the Push API and register the token: **`POST /users/me/push-tokens`** (GAP-4 — backend must add).
- Push handles the four background-blocked interactions (proximity, Block Party, geofence check-in, vendor-pin-while-locked) on capable platforms; **SMS bridge** covers the rest (`REALTIME_IMPLEMENTATION §7`).
- Push payloads carry a `deeplink` → `resolveDeeplink()` opens the right route on tap (`ROUTING_STRUCTURE §9`).
- Safety-critical categories (payout, dispute, verification) always also arrive via push/email server-side; un-mutable in preferences (C-37).
- On sign-out, unsubscribe + delete the token.

---

## 7. App-update lifecycle

- Serwist SW updates: on new version, show a non-intrusive "Update available — refresh" toast; apply on next safe navigation (don't hot-swap mid-payment).
- Skip-waiting only on explicit user action to avoid disrupting an in-flight flow.

---

## 8. Testing & budgets

- Lighthouse PWA audit in CI (installable, offline-capable, best-practices).
- Playwright offline-mode tests: cold PWA open shows cached map; queued seller sale replays with idempotency on reconnect; payment is correctly blocked offline.
- Performance budgets: app-shell JS budget enforced in CI; map/Stripe/QR bundles lazy and excluded from the shell.
```
