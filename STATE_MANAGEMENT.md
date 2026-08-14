# StreetServe — State Management

> The division of labor between **TanStack Query** (server state), **Zustand** (client state), **Socket.IO** (realtime push), and **React local state** — plus the query-key registry, cache-invalidation rules, optimistic-update policy, and how realtime reconciles with the cache.
> Companion: [DATA_FETCHING_STRATEGY.md](DATA_FETCHING_STRATEGY.md), [REALTIME_IMPLEMENTATION.md](REALTIME_IMPLEMENTATION.md), [NEXTJS_ARCHITECTURE.md](NEXTJS_ARCHITECTURE.md).

---

## 1. The one rule: state has exactly one owner

| Kind of state | Owner | Never lives in |
|---|---|---|
| **Server data** (anything the backend is the source of truth for: pins, queue, orders, profile, menu, settlements…) | **TanStack Query** | Zustand, React state |
| **Realtime push** (socket events) | Socket handler → **writes into the Query cache** | its own parallel store |
| **Client-only UI state** (map viewport, active filters, active role/mode, theme override, offline scan queue, wizard step) | **Zustand** | Query |
| **Ephemeral component state** (input value, sheet snap index, hover) | **React `useState`** | global stores |
| **Identity/session** | **Clerk** (source) + `keys.me` (app profile) | duplicated stores |
| **URL-derivable state** (current business id, thread id, filter deep-links) | **URL / route params** | duplicated stores |

> The failure mode this prevents: two copies of the queue position (one from a fetch, one from a socket, one in Zustand) drifting apart. Server data has **one** cache — TanStack Query — and the socket *updates that cache*, it does not fork it (§6).

---

## 2. TanStack Query — server state

### 2.1 Client defaults (`lib/query/queryClient.ts`)
```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,            // most data; realtime screens override to Infinity + socket
      gcTime: 5 * 60_000,
      retry: (n, e) => e.status >= 500 && n < 2,   // never retry 4xx (validation/auth)
      refetchOnWindowFocus: true,   // cheap reads; disabled on money/mutation-heavy screens
      throwOnError: false,          // handled by ErrorState components
    },
    mutations: { retry: 0 },        // money mutations never auto-retry (idempotency handles intent)
  },
})
```

### 2.2 Per-domain staleTime policy
| Data | staleTime | Why |
|---|---|---|
| Map pins, queue position, order status, messages | **`Infinity`** (socket-driven) | never poll; the socket invalidates (§6) |
| Business profile, menu, categories | 60s–5min | changes rarely |
| Wallet, earnings, settlements, receipts | 30s | financial, want fresh but not realtime |
| Trust score | 5min | recomputed nightly + on events |
| Admin queues (disputes, fraud, users) | 15s + manual refetch | ops immediacy without hammering |

---

## 3. Query-key registry (`lib/query/keys.ts`)

A **single central registry** — no ad-hoc key arrays scattered in components. Factory functions keep keys typed and invalidation surgical.

```ts
export const keys = {
  me:                 ['me'] as const,
  verification:       ['verification','status'] as const,
  notificationPrefs:  ['me','notification-prefs'] as const,

  mapNearby: (bbox: string, cat?: string, q?: string) => ['map','nearby',bbox,cat ?? 'all',q ?? ''] as const,
  categories:         ['catalog','categories'] as const,

  business:  (id: string) => ['business',id] as const,
  menu:      (id: string) => ['business',id,'menu'] as const,
  reviews:   (id: string) => ['business',id,'reviews'] as const,
  dashboard: (id: string) => ['business',id,'dashboard'] as const,

  queue:     (ownerId: string) => ['queue',ownerId] as const,
  wave:      (id: string) => ['wave',id] as const,

  order:     (id: string) => ['order',id] as const,
  ordersMine:        ['orders','mine'] as const,
  transaction:(id: string) => ['transaction',id] as const,
  transactionsMine:  ['transactions','mine'] as const,
  bookings:          ['bookings'] as const,
  booking:   (id: string) => ['booking',id] as const,
  availability:(id: string) => ['business',id,'availability'] as const,

  favorites:         ['favorites'] as const,
  threadsMine:       ['message-threads','mine'] as const,
  thread:    (id: string) => ['message-threads',id] as const,

  productsNearby:(bbox: string, cat?: string) => ['products','nearby',bbox,cat ?? 'all'] as const,
  product:   (id: string) => ['product',id] as const,
  checkoutsMine:     ['checkouts','mine'] as const,
  settlement:(id: string) => ['checkout',id,'settlement'] as const,
  hubProducts:(id: string) => ['hub',id,'products'] as const,

  trust:     (type: string, id: string) => ['trust',type,id] as const,
  dispute:   (id: string) => ['dispute',id] as const,
  aiRecs:            ['ai','recommendations'] as const,
  pingsMine:         ['pings','mine'] as const,
  spotMe:            ['spot-me'] as const,
  jobsNearby:        ['jobs','nearby'] as const,

  // admin
  adminDisputes:     ['admin','disputes'] as const,
  adminUsers:        ['admin','users'] as const,
  fraudFlags:        ['admin','fraud-flags'] as const,
  auditLogs:         ['admin','audit-logs'] as const,
  sponsors:          ['admin','sponsors'] as const,
};
```

**Invalidation is prefix-based:** `invalidateQueries({ queryKey: ['business', id] })` refreshes profile+menu+reviews+dashboard for that business in one call.

---

## 4. Mutation & invalidation rules

| Mutation | Invalidates | Optimistic? |
|---|---|---|
| `PATCH /users/me` | `keys.me` | ✅ (profile edits feel instant) |
| Follow / unfollow | `keys.favorites`, `keys.business(id)` | ✅ (toggle) |
| Join / leave queue | `keys.queue(ownerId)` | ⚠️ optimistic position only if server confirms fast; else pending |
| Place order / transaction 💳 | `keys.ordersMine`, `keys.order(id)`, `keys.queue` | ❌ **never optimistic on money** — show pending, wait for server |
| Log sale 💳 | `keys.checkoutsMine`, `keys.settlement` | ❌ (oversell must be server-checked) |
| Menu CRUD (vendor) | `keys.menu(id)`, `keys.dashboard(id)` | ✅ |
| Send message | `keys.thread(id)` | ✅ (append with `pending` flag; reconcile on `message:new`) |
| Review submit | `keys.reviews(id)`, `keys.business(id)` | ❌ (gated + moderated) |
| Notification read | `keys...notifications` (GAP-3) | ✅ |

### 4.1 Optimistic-update policy
- **Allowed** for reversible, non-financial, low-conflict toggles (follow, message send, profile edit, menu availability, notification read).
- **Forbidden** for anything touching money, inventory counts, or discount tiers — these are server-authoritative and conflict-prone (oversell 409, discount lock). Show a **pending** state and reconcile from the server/socket. This mirrors the backend's "never trust the client for authoritative state" rule.
- Every optimistic mutation implements `onMutate` (snapshot + apply), `onError` (rollback + toast), `onSettled` (invalidate).

---

## 5. Zustand — client-only state (`stores/`)

Small, module-singleton stores. No server data. No provider (`NEXTJS_ARCHITECTURE §4`).

| Store | Holds | Consumers |
|---|---|---|
| `mapViewport.store` | `center`, `zoom`, `bbox`, `visibleCells[]` | `Map`, socket cell subscription, `keys.mapNearby` |
| `filters.store` | active category tab, search text (persisted) | C-10/11/13, S-03 |
| `mode.store` | `activeMode` (customer/seller/vendor/hub/admin) | `RoleSwitcher`, shells |
| `theme.store` | `'system'|'dark'|'light'` (persisted) | `data-theme`, ThemeProvider |
| `offlineQueue.store` | queued seller QR scans + sync status (persisted) | S-06/08, service worker sync ([PWA_IMPLEMENTATION.md](PWA_IMPLEMENTATION.md)) |
| `toast.store` (or context) | active toast queue | `ToastProvider` |

Persistence via `zustand/middleware persist` (localStorage) for `filters`, `theme`, `offlineQueue`, `mode`.

---

## 6. Realtime ↔ cache reconciliation (the critical seam)

Socket events **write into the TanStack Query cache** — they never maintain a parallel store. Pattern:

```ts
// features/queue/socket.ts
socket.on('queue:update', ({ position, discountPercent, aheadCount }) => {
  queryClient.setQueryData(keys.queue(ownerId), (prev) => ({ ...prev, position, discountPercent, aheadCount }));
});
socket.on('pin:update', (pin) => updatePinInMapCache(queryClient, pin));   // patch within keys.mapNearby
socket.on('pin:remove', ({ sessionId }) => removePinFromMapCache(queryClient, sessionId));
socket.on('message:new', ({ threadId, message }) => appendToThread(queryClient, threadId, message));
```

Rules:
1. **Socket patches the cache directly** for high-frequency data (pins, queue) — `setQueryData`, not `invalidateQueries` (avoid refetch storms).
2. **`invalidateQueries`** is used for low-frequency "something changed, refetch when convenient" signals (e.g. a `notify` that a settlement posted → invalidate `keys.settlement`).
3. **On reconnect**, invalidate the screen's authoritative keys so REST re-establishes truth (`REALTIME_ARCHITECTURE.md §7`): pins, open queue, unread threads, verification status.
4. **Screens with socket data set `staleTime: Infinity`** so Query never double-fetches what the socket owns; the socket is the updater, REST is the initial load + catch-up.

---

## 7. Server state that isn't fetched: derived & computed

- **Money display** is derived at render from integer cents via `lib/money.ts` — never stored as a formatted string, never floated.
- **Countdowns** (SLA, ETA, hold) are derived from a **server deadline timestamp** held in the query cache; the component ticks a local `Date.now()` display but the source of truth is the server value (`docs/13 C-19`). On reconnect the deadline refreshes.
- **Merged lists** (C-25 unified orders+waves+bookings, C-35 wallet) are computed with `useMemo`/`select` from multiple queries, not persisted as a third list.

---

## 8. What NOT to do (anti-patterns this doc forbids)

- ❌ Copying fetched data into Zustand "to share it" — share the query key instead.
- ❌ A `useEffect` that fetches and `setState`s — use a query hook.
- ❌ Optimistic money mutations.
- ❌ Client-authoritative timers as source of truth.
- ❌ Global Redux for server cache (Zustand + Query cover it; `docs/07` allows Redux Toolkit only if the dev already prefers it — not needed here).
- ❌ Polling anything the socket already pushes.
```
