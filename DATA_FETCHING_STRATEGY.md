# StreetServe — Data Fetching Strategy

> How the client talks to the Express API: the typed API client, the bearer-token flow, response-envelope handling, error mapping, pagination, caching, and the SSR-vs-CSR fetch decision.
> Companion: [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md), [AUTHENTICATION_IMPLEMENTATION.md](AUTHENTICATION_IMPLEMENTATION.md), [SCREEN_TO_API_MAPPING.md](SCREEN_TO_API_MAPPING.md).

---

## 1. Where fetching happens (SSR vs CSR)

| Surface | Fetch mode | Mechanism |
|---|---|---|
| `(marketing)` public pages | **Server (RSC)** | `fetch()` in server components against **public** endpoints (`GET /platform/launch`, `GET /sponsors`), cached/ISR — real SEO |
| Public business profile `GET /businesses/:id` metadata | **Server** (metadata only) | `generateMetadata` for share/SEO; body hydrates client-side |
| **All authenticated product screens** | **Client (TanStack Query)** | bearer token + socket; no RSC data fetch (`NEXTJS_ARCHITECTURE §2.2`) |

Rationale recap: authenticated data is realtime and token-bound; one client data layer beats forking fetch logic into RSC + client.

---

## 2. The typed API client (`lib/api/client.ts`)

A thin `fetch` wrapper — **not** axios (keep the bundle lean; `fetch` is universal). Responsibilities:

```ts
async function apiFetch<T>(path: string, opts: ApiOpts = {}): Promise<T> {
  const token = await getToken();                      // Clerk (client) — AUTHENTICATION §2
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(opts.idempotencyKey && { 'Idempotency-Key': opts.idempotencyKey }),
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw toAppApiError(res.status, json);  // maps { error:{code,message,details} }
  return (json?.data ?? json) as T;                    // unwraps { data, meta } envelope
}
```

Handles the backend's contract from `API_SPECIFICATION §0`:
- **Success envelope** `{ data, meta }` → unwrap `data`; expose `meta` (pagination) via a `apiFetchWithMeta` variant.
- **Error envelope** `{ error: { code, message, details } }` → `AppApiError` with typed `code` (`lib/api/errors.ts`).
- **Bearer token** injected from Clerk; refresh is transparent (`AUTHENTICATION §3`).
- **Idempotency-Key** header on 💳 calls.
- **All money is integer cents; all timestamps ISO-8601 UTC** — parsed at the boundary, never re-serialized with float math.

`lib/api/endpoints.ts` holds typed path builders so no raw strings float around: `endpoints.business(id).menu` → `/businesses/${id}/menu`.

---

## 3. Error mapping (`lib/api/errors.ts`)

Backend status codes (`API_SPECIFICATION §0`) → UX (matches the state components in `COMPONENT_LIBRARY §5`):

| Status | `code` examples | Client handling |
|---|---|---|
| 400 | `VALIDATION_ERROR` | inline field errors (Zod details) — `docs/06 §2.6b` |
| 401 | `UNAUTHENTICATED` | transparent refresh → retry once; else redirect to sign-in |
| 403 | `FORBIDDEN_ROLE` | role/tier prompt (add-role or verify), not a dead 403 |
| 404 | `NOT_FOUND` | `not-found` / empty state |
| 409 | `OVERSELL`, `STATE_CONFLICT` | **specific** copy (S-08 oversell block) — never generic |
| 422 | `LICENSE_REQUIRED`, `SPOT_ME_INELIGIBLE` | business-rule prompt with the exact reason |
| 429 | `RATE_LIMITED` | back-off + "slow down" toast; disable action briefly |
| 500 | `INTERNAL` | `ErrorState` + Retry; log to observability |

`toAppApiError` never throws away the `code` — screens branch on `code`, not on message strings.

---

## 4. Query hooks (per feature)

Each feature exposes typed hooks (`features/<x>/hooks/`) wrapping the client + keys:

```ts
// features/queue/hooks/useQueue.ts
export const useQueue = (ownerId: string) =>
  useQuery({
    queryKey: keys.queue(ownerId),
    queryFn: () => api.get<QueueState>(endpoints.queue(ownerId)),
    staleTime: Infinity,                 // socket-owned (STATE_MANAGEMENT §6)
  });

export const useJoinQueue = (ownerId: string) =>
  useMutation({
    mutationFn: () => api.post(endpoints.queue(ownerId).join),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.queue(ownerId) }),
  });
```

Components consume hooks, never the client directly. This keeps `keys` + endpoints + types co-located per feature and makes the OpenAPI-generated types the single contract source.

---

## 5. Pagination

Backend is **cursor-based** everywhere (`?cursor=&limit=`, `API_SPECIFICATION §18`). Use `useInfiniteQuery`:

```ts
useInfiniteQuery({
  queryKey: keys.ordersMine,
  queryFn: ({ pageParam }) => api.getWithMeta(endpoints.ordersMine, { cursor: pageParam }),
  getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
});
```

- Infinite scroll on: map results list, orders history, messages, inventory, admin queues, reviews.
- `meta.nextCursor` drives "load more" / intersection-observer auto-load.
- Never request unbounded lists — the backend rejects them.

---

## 6. Caching, prefetch & dedupe

- **Dedupe:** TanStack Query collapses concurrent identical keys — the map list and the map canvas share `keys.mapNearby` and fetch once.
- **Prefetch on intent:** hovering/pressing a pin prefetches `keys.business(id)` so the profile sheet opens with data (`queryClient.prefetchQuery`).
- **Keep-previous-data** on the map while panning/filtering so pins don't flash (smooth category switches).
- **Selective persistence:** optionally persist `keys.me`, `keys.favorites`, last `keys.mapNearby` to storage (via `persistQueryClient`) so a cold PWA open shows last-known instantly, then revalidates — feeds the offline shell ([PWA_IMPLEMENTATION.md](PWA_IMPLEMENTATION.md)).

---

## 7. Uploads (photos / documents) — presigned flow

Every image capture (condition photos S-06/S-09, business cover/logo/menu/gallery, dispute evidence, license docs) uses the backend's **presigned R2** flow (`POST /storage/upload-url`, verified in code):

```
1. client → POST /storage/upload-url { contentType, purpose }  → { uploadUrl, fileKey }
2. client → PUT uploadUrl (raw file, direct to R2)             → 200
3. client → attach fileKey to the domain resource (e.g. checkout condition photo, review)
```

- Client-side pre-validation: type/size/ratio per `docs/06 §2.6g` (cover 16:9, logo 1:1, menu 4:3) before requesting a URL.
- Progress UI + retry on the PUT; the domain attach is idempotent-safe.
- Raw files never transit the Express API — direct browser→R2 (matches backend `integrations/storage`).

---

## 8. Request lifecycle & cancellation

- Every query passes an `AbortSignal`; navigating away cancels in-flight fetches.
- Debounce search (`GET /map/nearby?search=`) ~300ms; cancel superseded requests.
- Map `nearby` refetches on **viewport settle** (debounced), not on every pan frame — pairs with socket cell subscription for live deltas so the REST call is only the periodic re-baseline.

---

## 9. Contract safety

- The backend serves **OpenAPI 3.1 at `/docs`** (non-prod, generated from Zod). **Generate the TS client types from it** so `features/*/types.ts` cannot drift from the server — a CI check fails the build on contract mismatch.
- In dev, optionally Zod-parse responses at the boundary to catch drift loudly; in prod hot paths, trust the generated types (skip runtime parse for perf).
- Money/geo/timestamp conventions asserted at the boundary: cents are integers, geo is `[lng,lat]`, timestamps ISO-8601 UTC (matches `BACKEND/PROJECT_STRUCTURE §4`).
```
