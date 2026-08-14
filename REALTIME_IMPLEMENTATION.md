# StreetServe — Realtime Implementation (Frontend)

> How the Next.js client consumes Socket.IO: connection lifecycle, namespace/room management, the geohash-cell map subscription, event → cache reconciliation, reconnection + catch-up, and delivery fallbacks.
> Mirrors the backend contract in `BACKEND/REALTIME_ARCHITECTURE.md` exactly — namespaces, rooms, events, and auth are defined there; this is the client side.
> Companion: [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) §6, [SCREEN_TO_API_MAPPING.md](SCREEN_TO_API_MAPPING.md) §10, [PWA_IMPLEMENTATION.md](PWA_IMPLEMENTATION.md).

---

## 1. Why a persistent server (recap)

Socket.IO connects to the **standalone Express server**, NOT Next.js. Next.js serverless functions cannot hold WebSockets (`NEXTJS_ARCHITECTURE §1`, `docs/07`). The client points at `NEXT_PUBLIC_SOCKET_URL` (the Render/Railway/Fly backend), which runs Socket.IO with the Redis adapter behind a sticky-session LB.

---

## 2. Connection lifecycle (`lib/socket/`)

- **One Socket.IO client instance** (`io.ts` singleton), created **only when authenticated**, torn down on sign-out.
- **Handshake auth:** the Clerk access JWT in `auth.token` (same token as REST — `AUTHENTICATION_IMPLEMENTATION §2`). The server verifies JWKS, loads the Principal, **rejects suspended accounts**, and authorizes every room join.
- **`SocketProvider`** (in the provider tree, gated on auth) exposes the connection + namespace handles via context; connects on login, disconnects + nulls on logout.
- **Token refresh:** on `connect_error` with an auth reason, fetch a fresh token and reconnect (Socket.IO `auth` can be a callback returning the current token).

```ts
// lib/socket/io.ts
export const makeSocket = (getToken: () => Promise<string>) =>
  io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket'],            // fall back to polling only if WS blocked
    auth: async (cb) => cb({ token: await getToken() }),
  });
```

---

## 3. Namespaces & rooms (client join policy)

Per `BACKEND/REALTIME_ARCHITECTURE.md §2`, and the subscription matrix in `SCREEN_TO_API_MAPPING §10`:

| Namespace | Room | Client joins when | Managed by |
|---|---|---|---|
| `/live` | `cell:<geohash>` per visible cell | map screen mounts / viewport pans | `features/livemap/socket.ts` + `mapViewport.store` |
| `/queue` | `queue:<ownerId>` | customer on C-19/C-20; vendor on V-03/V-04 | `features/queue/socket.ts` |
| `/notifications` | `user:<userId>` | **once, globally**, on connect | `features/notifications/socket.ts` |
| `/messages` | `thread:<threadId>` | a thread is open (C-33/V-08) | `features/messaging/socket.ts` |

`useNamespace(ns, room)` hook: joins on mount, **leaves on unmount**, re-joins on reconnect. Room authorization is re-checked server-side on every join (participant/owner/self) — an unauthorized join is rejected and surfaced as an error state.

---

## 4. The geohash-cell map subscription (scalability keystone)

The map does **not** subscribe to a global firehose. It subscribes only to the geohash cells its viewport currently covers (+ neighbor cells for edge continuity), exactly matching the backend's bounded fan-out (`REALTIME_ARCHITECTURE.md §2`, enables 10k concurrent sessions/metro).

```
mapViewport.store (center/zoom/bbox)
   → lib/geo.ts: bbox → visibleCells[] (same geohash precision as backend)
   → diff vs currently-joined cells
   → socket.emit('live:subscribe', { cells: added })   / leave removed
   → on 'pin:update'/'pin:remove'/'block_party' → patch keys.mapNearby cache
```

- **Debounced** on viewport settle (not every pan frame).
- **Precision must match the backend's geohash cell size** — `lib/geo.ts` is the single place that computes cells; document the precision constant so both sides agree.
- Pin motion is **interpolated** between ticks for smoothness; **snaps** under `prefers-reduced-motion` (`docs/13 C-10`).

---

## 5. Event catalog (server → client) and what each does

Straight from `REALTIME_ARCHITECTURE.md §5`; client action per event:

| Namespace | Event | Client action |
|---|---|---|
| `/live` | `pin:update` | `setQueryData` patch pin in `keys.mapNearby`; animate marker |
| `/live` | `pin:remove` | remove marker (stop/stale sweep) |
| `/live` | `block_party` | show C-17 cluster alert (opted-in) |
| `/queue` | `queue:update` | patch `keys.queue(ownerId)` (position/discount/ahead) |
| `/queue` | `wave:accepted` | transition C-19 → Accepted; ETA/tracking |
| `/queue` | `popup:delay` | Pop-Up banner on C-20 (delay + reassurance in one message) |
| `/notifications` | `notify` | toast/banner + notification center; **`resolveDeeplink()`** routes on tap (`ROUTING_STRUCTURE §9`) |
| `/messages` | `message:new` | append to `keys.thread(id)`; bump unread on `keys.threadsMine` |
| `/messages` | `message:read` | update read receipt |

**Client → server (minimal, all authz-checked):** `live:subscribe {cells[]}`, `live:tick {lat,lng}` (vendor owner only — V-02 broadcast), `queue:subscribe {ownerId}`, `messages:typing`.

> **The socket is a delivery channel, not an authority.** Queue position, discounts, ETAs, money are **server-computed and pushed**; the client renders them, never computes them. Location ticks from a vendor are validated server-side before broadcast.

---

## 6. Reconnection & catch-up (never trust liveness alone)

Socket.IO is **best-effort**. On reconnect (`REALTIME_ARCHITECTURE.md §7`):
1. Re-join all rooms the current screens need (viewport cells, open queue, open thread, `user:<id>`).
2. **Refetch authoritative REST state** — invalidate `keys.queue`, `keys.mapNearby`, `keys.thread`, `keys.threadsMine`, `keys.verification`, and (GAP-3) the notifications log. REST is the source of truth for catch-up; the socket is only for liveness.
3. Show a transient "Reconnecting…" banner; **pause server-deadline countdowns** and resume from server truth (don't let a local timer drift — `docs/13 C-19`).

If Redis/socket is briefly down, the map shows **last-known Mongo pins flagged "may be stale"** (graceful degradation) — the offline shell renders cached `keys.mapNearby` at reduced opacity.

---

## 7. Delivery fallbacks (background-blocked interactions)

The PWA can't receive socket events while the phone sleeps. For the **four background-blocked interactions** (proximity alert, Block Party, geofence job check-in, vendor-pin-while-locked), the backend's notifications module **also** dispatches **FCM push** and **Twilio SMS** (`REALTIME_ARCHITECTURE.md §7`, `docs/07`). Frontend obligations:
- Register for **Web Push** when installed (Android reliable; iOS only when installed → hence the SMS bridge). Requires the push-token endpoint (**GAP-4**).
- **Safety-critical** notifications (payout, dispute, verification) are never socket-only — the backend also sends push/email; the client must handle them arriving via any channel and deep-linking correctly.
- Notification **preferences** (C-37) are per-category; safety-critical categories are un-mutable (enforced server-side).

---

## 8. Performance & backpressure

- **Coalesce pin renders** to ~1 update/sec/client (matches backend backpressure cap, `REALTIME_ARCHITECTURE.md §8`) — batch `setQueryData` patches with a short rAF/throttle window so the map stays smooth at high pin density.
- Leave cells promptly on pan-away to keep fan-out bounded.
- One socket connection total (multiplexed namespaces), not one per feature.
- Unsubscribe/`off` every listener on unmount to avoid leaks and duplicate handlers.

---

## 9. Testing realtime

- Mock the socket in unit tests; assert cache patches (`setQueryData`) on each event.
- Playwright e2e for the money-critical live flows: wave→accept→queue reflow→your-turn (`/queue`), and live pin appear/move/remove (`/live`).
- Chaos test reconnect: drop the socket mid-queue, assert catch-up refetch restores correct position.
```
