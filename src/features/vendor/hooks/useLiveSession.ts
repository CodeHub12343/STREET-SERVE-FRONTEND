'use client';

/**
 * Live session control (docs/13 V-02, SCREEN_TO_API_MAPPING.md §7). Go live → a session with a
 * 3-state status (driving/parked/away_closed); location ticks flow over the /live socket. Starting
 * is blocked with 422 LICENSE_REQUIRED if the category needs an unmet license. Session state lives
 * in the query cache keyed by businessId. Demo mode keeps it entirely client-side.
 */
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { requestPosition } from '@/lib/geo';
import type { LiveSession, LiveStatus } from '../types';

// Ping cadence for the dashboard keep-alive. Comfortably inside the server's 60s stale-session TTL,
// so a single dropped ping doesn't drop the vendor, but a closed tab stops pings and is reaped.
const HEARTBEAT_MS = 25_000;

/**
 * A fix looser than this is treated as coarse (IP/network, not GPS) and never moves the pin.
 *
 * This is the guard that matters most here. An IP fix resolves to a carrier's city centre, so
 * without it a vendor parked in one place can be teleported tens of kilometres onto the map — and
 * every customer nearby stops seeing them. Matches `ServeNearMeFab`'s threshold, for the same
 * reason and with the same number.
 */
const MAX_ACCURACY_M = 1500;

/** Don't spend a request on GPS jitter — a stationary phone drifts several metres constantly. */
const MIN_MOVE_M = 25;

/**
 * Push at least this often even when stationary, so the pin's freshness (and `last_ping_at`) keeps
 * up. Sits inside the same 60s TTL the heartbeat respects.
 */
const MAX_SILENCE_MS = 25_000;

/** Metres between two lng/lat points. Equirectangular — accurate enough at these distances. */
function distanceM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const x = toRad(b[0] - a[0]) * Math.cos(toRad((a[1] + b[1]) / 2));
  const y = toRad(b[1] - a[1]);
  return Math.sqrt(x * x + y * y) * R;
}

/**
 * Resolve the vendor's current position for the backend's StartSessionBody (requires lng/lat).
 *
 * Every failure used to be reported as "location permission is needed", which was wrong far more
 * often than it was right: the request asked for a FRESH high-accuracy fix inside 10 seconds
 * (`maximumAge` defaults to 0, refusing any position the device already had), and a phone indoors
 * routinely cannot deliver that. Vendors with permission fully granted were told to grant it, and
 * "enable it and try again" is unfollowable advice when it is already enabled.
 *
 * A 60s cache window rather than the helper's 5-minute default: this pins the seller's live map pin
 * to where they are standing, and a five-minute-old fix can be several blocks from the pitch. Live
 * tracking corrects it immediately afterwards, so a slightly stale start is recoverable — a failed
 * start is not.
 */
function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
  return requestPosition({ maxCachedAgeMs: 60_000 }).then(
    (pos) => ({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    (err: GeolocationPositionError | undefined) => {
      // 1 PERMISSION_DENIED · 2 POSITION_UNAVAILABLE · 3 TIMEOUT.
      if (err?.code === 1) {
        throw new Error('Location permission is needed to go live. Enable it and try again.');
      }
      if (err?.code === 3) {
        throw new Error(
          'Couldn’t get a location fix to go live — this usually means no GPS signal indoors. Step outside or near a window and try again.',
        );
      }
      throw new Error('Couldn’t determine your location, so you can’t go live yet. Try again.');
    },
  );
}

/**
 * ═══ WHO is broadcasting. ═══
 *
 * Every one of these hooks hardcoded `actorType: 'business'`, and the only screen that mounted them
 * was the vendor dashboard — so a STREET SELLER could never start a live session at all. The
 * backend has always supported `actor_type: 'seller'` (including the fuzzed-precision path built
 * for exactly that case), and the hub's inventory map queries for seller sessions specifically,
 * which is why that map was structurally incapable of ever showing a pin: nothing in the product
 * could create the row it reads.
 *
 * Defaulted to `business` so every existing vendor call site is unchanged.
 */
export type LiveActorType = 'business' | 'seller';

export function useLiveSession(businessId: string, actorType: LiveActorType = 'business') {
  const qc = useQueryClient();
  return useQuery<LiveSession | null>({
    queryKey: keys.liveSession(businessId),
    // Rehydrate from the server so the dashboard's live/offline state survives a reload. Without
    // this the session existed only in this cache — a refresh showed "offline" while the backend
    // session (and everyone else's map pin) was still live. Demo mode stays purely client-side.
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(qc.getQueryData<LiveSession | null>(keys.liveSession(businessId)) ?? null)
        : api
            .get<LiveSession | null>(endpoints.liveSessions.current, {
              query: { actorType, actorId: businessId },
            })
            .then((s) => s ?? null),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Keep the live session alive while the dashboard tab is open.
 *
 * A pure keep-alive: it refreshes `last_ping_at` and nothing else. It is the FALLBACK for when
 * location tracking cannot run (permission denied, no geolocation, only coarse fixes available) —
 * `lastLocationPushAt` lets the caller tell us tracking is already keeping the clock fresh, since
 * the backend's location update refreshes `last_ping_at` too and a second request would be pure
 * duplication.
 */
export function useSessionHeartbeat(
  sessionId: string | undefined,
  lastLocationPushAt?: { current: number },
) {
  useEffect(() => {
    if (!sessionId || isMapDemo) return;
    const ping = () => {
      // Tracking already pinged us recently; a heartbeat would say the same thing twice.
      const since = lastLocationPushAt ? Date.now() - lastLocationPushAt.current : Infinity;
      if (since < HEARTBEAT_MS) return;
      void api.post(endpoints.liveSessions.heartbeat(sessionId)).catch(() => {});
    };
    ping(); // one immediately so a just-restored session refreshes its clock
    const t = setInterval(ping, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [sessionId, lastLocationPushAt]);
}

/**
 * Keep the vendor's PIN where the vendor actually is.
 *
 * ## The bug this fixes
 *
 * The backend has always had `PATCH /live-sessions/:id/location` — it moves the pin, re-buckets the
 * geohash, appends the trail, refreshes the Redis live store and emits a realtime `pinUpdate`. It
 * was fully built and **nothing in the app ever called it.** The dashboard only sent heartbeats, so
 * a session's `current_location` was frozen at whatever single fix was taken the moment the vendor
 * tapped "Go live" — permanently, and including while the status literally says `driving`.
 *
 * The visible symptom is a vendor who is live and confident, and customers standing near them who
 * see "0 nearby", because the pin is wherever that first fix happened to land. If that first fix was
 * coarse, it landed in the wrong city entirely.
 *
 * ## Why it is throttled rather than streamed
 *
 * `watchPosition` fires continuously and a phone at rest jitters by metres. Posting every event
 * would drain a vendor's battery all day and write a ping trail of noise. So an update goes out only
 * when the vendor has genuinely moved, or when the pin has been silent long enough that its
 * freshness matters — whichever comes first.
 *
 * Returns the timestamp ref so the heartbeat can stand down while this is working.
 */
export function useLiveLocationTracking(
  sessionId: string | undefined,
  status: LiveStatus | undefined,
): { current: number } {
  const lastPushAt = useRef(0);
  const lastCoords = useRef<[number, number] | null>(null);

  useEffect(() => {
    // `away_closed` is not on the map, so there is nothing to keep in the right place.
    const shouldTrack = Boolean(sessionId) && status !== 'away_closed';
    if (!shouldTrack || isMapDemo) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        /**
         * Refuse coarse fixes outright. This is the guard whose absence lets a pin jump to a
         * carrier's city centre — the difference between "a customer 200m away sees me" and
         * "nobody sees me".
         */
        if (pos.coords.accuracy > MAX_ACCURACY_M) return;

        const next: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        const movedM = lastCoords.current ? distanceM(lastCoords.current, next) : Infinity;
        const silentMs = Date.now() - lastPushAt.current;
        if (movedM < MIN_MOVE_M && silentMs < MAX_SILENCE_MS) return;

        // Optimistic: record before the request so a slow network cannot queue a burst of pushes.
        lastCoords.current = next;
        lastPushAt.current = Date.now();

        // PATCH, matching the backend route; the client takes the body as a positional argument.
        void api
          .patch(endpoints.liveSessions.location(sessionId!), { lng: next[0], lat: next[1] })
          .catch(() => {
            // Let the next tick retry rather than surfacing a toast; a dropped location update is
            // not something a vendor can act on, and the heartbeat still holds the session open.
            lastPushAt.current = 0;
          });
      },
      () => {
        /* Denied or unavailable — the heartbeat keeps the session alive at its last known pin. */
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [sessionId, status]);

  return lastPushAt;
}

export function useStartSession(businessId: string, actorType: LiveActorType = 'business') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<LiveSession> => {
      if (isMapDemo) {
        return {
          id: `sess_${Date.now()}`,
          businessId,
          status: 'parked',
          startedAt: new Date().toISOString(),
        };
      }
      // Backend StartSessionBody requires actorType/actorId + the live coordinates.
      const { lat, lng } = await getCurrentCoords();
      return api.post<LiveSession>(endpoints.liveSessions.start, {
        actorType,
        actorId: businessId,
        lat,
        lng,
      });
    },
    onSuccess: (session) => qc.setQueryData(keys.liveSession(businessId), session),
  });
}

export function useSetStatus(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: string; status: LiveStatus }) =>
      isMapDemo ? Promise.resolve() : api.patch(endpoints.liveSessions.status(sessionId), { status }),
    onMutate: ({ status }) => {
      const prev = qc.getQueryData<LiveSession | null>(keys.liveSession(businessId));
      if (prev) qc.setQueryData(keys.liveSession(businessId), { ...prev, status });
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(keys.liveSession(businessId), ctx?.prev),
  });
}

export function useStopSession(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      isMapDemo ? Promise.resolve() : api.post(endpoints.liveSessions.stop(sessionId)),
    onSuccess: () => qc.setQueryData(keys.liveSession(businessId), null),
  });
}
