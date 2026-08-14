'use client';

/**
 * Jobs data layer (S-14, SCREEN_TO_API_MAPPING.md §6). The full gig lifecycle: ranked nearby feed →
 * claim → geofenced check-in → check-out (💳, idempotent) → same-day payout into the S-13 earnings
 * feed. Demo mode runs the same lifecycle against the in-memory store in lib/demo.jobs.
 *
 * The nearby feed and check-in both need the device's position, so location is its own query —
 * cached, shared, and separately recoverable when the user denies the permission prompt.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { AppApiError } from '@/lib/api/errors';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { distanceMeters } from '@/lib/geo';
import { newIdempotencyKey } from '@/lib/idempotency';
import {
  demoApplyToJob,
  demoCheckInJob,
  demoCheckOutJob,
  demoJob,
  demoJobsNearby,
  demoMyJobs,
} from '../demo';
import type {
  Job,
  JobApplication,
  JobCheckOutResult,
  JobCoords,
  JobType,
  JobTypeOption,
} from '../types';

/** Demo mode has no real device position — anchor on the fixtures' own neighbourhood. */
const DEMO_COORDS: JobCoords = { lng: -120.9969, lat: 37.6391 };

/** Mirrors the backend `JOB_TYPES` for demo mode only — the real list is served. */
const DEMO_JOB_TYPES: JobTypeOption[] = [
  { key: 'sell', label: 'Selling' },
  { key: 'signage', label: 'Sign holding' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'sampling', label: 'Product sampling' },
  { key: 'promotion', label: 'Promotion' },
  { key: 'event_staffing', label: 'Event staffing' },
];

/** Matches the backend's JOBS_DEFAULT_RADIUS_M. */
const DEFAULT_RADIUS_M = 8000;

/**
 * Why a geolocation attempt failed, in the user's terms.
 *
 * The browser distinguishes three cases and this used to collapse all of them into "Location
 * permission is needed" — so someone with location switched ON and working was told to grant a
 * permission they had already granted, with no way to discover the real problem. Same shape as the
 * payment sheet reporting every failure as a decline.
 *
 * The three need genuinely different actions: grant the permission, wait/move somewhere with a
 * signal, or nothing-you-can-do-try-again.
 */
export type LocationFailureKind = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

/** An Error that still says WHICH failure it was, so the UI can title it correctly. */
export interface LocationError extends Error {
  kind: LocationFailureKind;
}

function locationError(kind: LocationFailureKind, message: string): LocationError {
  return Object.assign(new Error(message), { kind });
}

function describeGeolocationError(err: GeolocationPositionError): LocationError {
  if (err.code === err.PERMISSION_DENIED) {
    return locationError(
      'denied',
      'Location is blocked for this site. Allow it in your browser — the padlock in the address ' +
        'bar — then try again.',
    );
  }
  if (err.code === err.POSITION_UNAVAILABLE) {
    return locationError(
      'unavailable',
      'Your device could not work out where it is. That is common indoors or on a desktop with no ' +
        'GPS. Try again, or move somewhere with a clearer signal.',
    );
  }
  // TIMEOUT: permission is fine, the fix just did not arrive in time.
  return locationError('timeout', 'Finding your location took too long. Try again.');
}

/** Reads the `kind` off an error if it is one of ours; `null` for anything else. */
export function locationFailureKind(err: unknown): LocationFailureKind | null {
  const k = (err as Partial<LocationError> | null)?.kind;
  return k === 'denied' || k === 'unavailable' || k === 'timeout' || k === 'unsupported' ? k : null;
}

/**
 * `precise: true` is for CHECK-IN, which enforces a real distance to the site, so it is worth
 * waiting for a GPS-grade fix and refusing a stale one.
 *
 * Everything else — ranking gigs by how near they are, the coach, the academy — only needs a rough
 * position, and demanding high accuracy there is what produced the timeouts: `enableHighAccuracy`
 * with no `maximumAge` forces a fresh satellite-grade fix on every call, which a laptop frequently
 * cannot deliver inside ten seconds. A minute-old fix accurate to a few hundred metres ranks a list
 * of nearby gigs exactly as well.
 */
export function getCurrentCoords(opts: { precise?: boolean } = {}): Promise<JobCoords> {
  if (isMapDemo) return Promise.resolve(DEMO_COORDS);
  const precise = opts.precise ?? false;
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(
        locationError(
          'unsupported',
          'This device has no location services, which gigs need to verify you.',
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(describeGeolocationError(err)),
      /**
       * `maximumAge: 0` on the precise path is deliberate and stays: this backs the geofenced
       * check-in, and accepting a cached fix would let a worker claim presence at a site they had
       * merely been near earlier. That is the one place a stale position is a correctness problem
       * rather than a convenience, so it is NOT routed through `requestPosition`.
       *
       * The timeout is the part that was wrong. Forbidding the cache means waiting for a real
       * acquisition, and a cold GPS indoors regularly needs longer than 15s — so the strictness the
       * check-in depends on was also what made it time out. 30s asks for the same guarantee with
       * enough patience to actually get it.
       */
      precise
        ? { enableHighAccuracy: true, timeout: 30_000, maximumAge: 0 }
        : { enableHighAccuracy: false, timeout: 15_000, maximumAge: 120_000 },
    );
  });
}

/**
 * The device's position, for ranking things by distance.
 *
 * Rough on purpose (see `getCurrentCoords`) — this feeds nearby lists, not the check-in radius.
 *
 * Still `retry: false`: a denied permission is a decision, not a transient failure, and retrying
 * only re-prompts. A timeout IS transient, but the user retries explicitly via the banner, which is
 * better than a silent loop that keeps waking the GPS.
 */
export function useDeviceLocation() {
  return useQuery<JobCoords>({
    queryKey: keys.deviceLocation,
    queryFn: () => getCurrentCoords(),
    staleTime: 60_000,
    retry: false,
  });
}

/**
 * A-5: the filter vocabulary, fetched rather than hardcoded. A client shipping its own copy of this
 * list silently stops offering a type the day one is added server-side. Effectively static, so it's
 * cached for the session.
 */
export function useJobTypes() {
  return useQuery<JobTypeOption[]>({
    queryKey: keys.jobTypes,
    queryFn: () =>
      isMapDemo ? Promise.resolve(DEMO_JOB_TYPES) : api.get<JobTypeOption[]>(endpoints.jobTypes),
    staleTime: Infinity,
  });
}

/**
 * Ranked open gigs near the worker. Waits for coords — the endpoint requires lat/lng.
 *
 * A-5: `types` narrows to particular kinds of work. Filtering happens SERVER-side (it's part of the
 * query key) rather than by filtering the returned array — the feed is capped at a limit, so
 * client-side filtering would quietly hide matching gigs that fell outside the first page.
 */
export function useJobsNearby(types: JobType[] = []) {
  const location = useDeviceLocation();
  const coords = location.data;

  const query = useQuery<Job[]>({
    queryKey: keys.jobsNearby(coords?.lng, coords?.lat, types),
    enabled: Boolean(coords),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(
            // Demo has no server to filter, so mirror the same narrowing locally.
            types.length ? demoJobsNearby().filter((j) => types.includes(j.jobType)) : demoJobsNearby(),
          )
        : api.get<Job[]>(endpoints.jobsNearby, {
            query: {
              lat: coords!.lat,
              lng: coords!.lng,
              radius: DEFAULT_RADIUS_M,
              ...(types.length ? { jobType: types.join(',') } : {}),
            },
          }),
    staleTime: isMapDemo ? Infinity : 30_000,
  });

  return { ...query, coords, locationError: location.error, isLocating: location.isLoading };
}

/**
 * The worker's own gigs. This is what makes the lifecycle reachable at all: claiming a gig flips
 * the posting to `filled`, which removes it from the nearby feed, so without this list there is no
 * surface left to check in or out from.
 */
export function useMyJobs() {
  const { data: coords } = useDeviceLocation();
  return useQuery<Job[]>({
    queryKey: keys.jobsMine,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoMyJobs())
        : api.get<Job[]>(endpoints.jobsMine, {
            query: coords ? { lat: coords.lat, lng: coords.lng } : undefined,
          }),
    staleTime: isMapDemo ? Infinity : 15_000,
  });
}

export function useJob(id: string | undefined) {
  const { data: coords } = useDeviceLocation();
  return useQuery<Job>({
    queryKey: keys.job(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoJob(id!))
        : api.get<Job>(endpoints.job(id!).root, {
            query: coords ? { lat: coords.lat, lng: coords.lng } : undefined,
          }),
    staleTime: isMapDemo ? Infinity : 10_000,
  });
}

/** Invalidate every surface a lifecycle transition can change. */
function useJobInvalidation(jobId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: keys.job(jobId) });
    void qc.invalidateQueries({ queryKey: keys.jobsMine });
    // Prefix match: the nearby key is coordinate-scoped, so drop every cached viewport.
    void qc.invalidateQueries({ queryKey: ['jobs', 'nearby'] });
  };
}

export function useApplyToJob(jobId: string) {
  const invalidate = useJobInvalidation(jobId);
  return useMutation<JobApplication, AppApiError>({
    mutationFn: () =>
      isMapDemo
        ? Promise.resolve(demoApplyToJob(jobId))
        : api.post<JobApplication>(endpoints.job(jobId).apply),
    onSuccess: invalidate,
  });
}

/**
 * Geofenced check-in. The client resolves its position and pre-checks the radius so an off-site
 * worker gets a useful message instead of a bare 422 — but the server runs the same check against
 * the posting's own coordinates and is the actual boundary.
 */
export function useCheckInToJob(job: Job | undefined) {
  const jobId = job?.id ?? '';
  const invalidate = useJobInvalidation(jobId);
  /**
   * Two ways to prove presence. A scanned code short-circuits the geofence entirely: GPS is
   * unreliable indoors, in loading bays and under market awnings — exactly where a lot of this work
   * happens — so a worker who genuinely turned up must not be stuck because their phone can't see
   * satellites.
   */
  return useMutation<JobApplication, Error, { qrToken?: string } | void>({
    mutationFn: async (input) => {
      const qrToken = input && 'qrToken' in input ? input.qrToken : undefined;
      if (qrToken) {
        return isMapDemo
          ? Promise.resolve(demoCheckInJob(jobId, { lat: 0, lng: 0 }))
          : api.post<JobApplication>(endpoints.job(jobId).checkIn, { qrToken });
      }

      // Precise: this position is checked against the site's radius, so a cached or coarse fix
      // could either wave through someone who is not there or turn away someone who is.
      const coords = await getCurrentCoords({ precise: true });
      // Demo mode simulates being on site — there's no real device position to walk to, the same
      // reason QRScanner offers "simulate scan" there. Outside demo the guard always runs.
      if (!isMapDemo && job && Array.isArray(job.location) && job.location.length === 2) {
        const away = distanceMeters([coords.lng, coords.lat], job.location as [number, number]);
        if (away > job.checkInRadiusM) {
          throw new AppApiError(422, {
            code: 'NOT_ON_SITE',
            message: `You're about ${Math.round(away)}m away. Get within ${job.checkInRadiusM}m of the site, or scan the code on site.`,
          });
        }
      }
      return isMapDemo
        ? Promise.resolve(demoCheckInJob(jobId, coords))
        : api.post<JobApplication>(endpoints.job(jobId).checkIn, coords);
    },
    onSuccess: invalidate,
  });
}

/**
 * Check-out → completion → payout (💳). One idempotency key per attempt so a retry after a network
 * blip settles the gig once rather than paying twice.
 */
export function useCheckOutOfJob(jobId: string) {
  const qc = useQueryClient();
  const invalidate = useJobInvalidation(jobId);
  return useMutation<JobCheckOutResult, AppApiError>({
    mutationFn: () =>
      isMapDemo
        ? Promise.resolve(demoCheckOutJob(jobId))
        : api.post<JobCheckOutResult>(endpoints.job(jobId).checkOut, {}, {
            idempotencyKey: newIdempotencyKey(),
          }),
    onSuccess: () => {
      invalidate();
      // The gig payout lands in the same feed as consignment settlements (S-13).
      void qc.invalidateQueries({ queryKey: keys.sellerEarnings });
    },
  });
}
