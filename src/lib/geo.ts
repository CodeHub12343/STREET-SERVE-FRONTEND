/**
 * Geo helpers. GeoJSON order is [lng, lat] to match the backend (FOLDER_STRUCTURE.md §4).
 * The geohash precision here MUST match the backend's live-cell precision so the map's
 * socket subscriptions line up with server fan-out (REALTIME_IMPLEMENTATION.md §4).
 */
import type { LngLat } from '@/types';

/** Backend live-cell geohash precision. Keep in sync with the server constant. */
export const LIVE_CELL_GEOHASH_PRECISION = 6;

/**
 * One-shot position request for "where am I, roughly" — onboarding, service area, near-me.
 *
 * ## Why this exists
 *
 * Most call sites passed `{ enableHighAccuracy: true, timeout: 10_000 }` and no `maximumAge`.
 * `maximumAge` defaults to **0**, which means "refuse any position the device already has and
 * acquire a fresh one". On a phone indoors, or on a cold GPS, that routinely takes longer than ten
 * seconds — so the request times out and the user is told to try again, which fails identically.
 *
 * Nothing in these flows needs metre accuracy: they are choosing a city, a service-area centre, or
 * a search origin. A fix from a few minutes ago is indistinguishable for that purpose and usually
 * returns instantly.
 *
 * ## Strategy
 *
 * 1. **Fast pass** — accept a cached fix up to 5 minutes old, coarse accuracy, short timeout. This
 *    is the path that succeeds immediately on a phone that has been outdoors or used a map recently.
 * 2. **Patient pass** — only if the fast pass could not produce anything, ask for a real fix with a
 *    timeout long enough for a cold GPS to actually respond.
 *
 * A denied permission short-circuits: it will not become allowed by asking again, and the browser
 * will not re-prompt, so retrying only delays the honest error.
 */
export function requestPosition(): Promise<GeolocationPosition> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(
      Object.assign(new Error('Geolocation is unavailable on this device.'), { code: 2 }),
    );
  }

  const get = (options: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, options),
    );

  return get({ enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 }).catch(
    (first: GeolocationPositionError) => {
      // Asking a second time cannot turn a denial into a grant — surface it now.
      if (first.code === 1) throw first;
      return get({ enableHighAccuracy: true, timeout: 25_000, maximumAge: 60_000 });
    },
  );
}

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Encode a coordinate to a geohash of the given precision. */
export function geohashEncode(
  [lng, lat]: LngLat,
  precision = LIVE_CELL_GEOHASH_PRECISION,
): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let hash = '';
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        idx = idx * 2 + 1;
        lngMin = mid;
      } else {
        idx *= 2;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx *= 2;
        latMax = mid;
      }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      hash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}

/** Haversine distance in metres between two [lng,lat] points. */
export function distanceMeters([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** A stable bbox key for query keys: "minLng,minLat,maxLng,maxLat" rounded. */
export function bboxKey(sw: LngLat, ne: LngLat, dp = 3): string {
  const r = (n: number) => n.toFixed(dp);
  return `${r(sw[0])},${r(sw[1])},${r(ne[0])},${r(ne[1])}`;
}

/**
 * The geohash cells covering a bounding box, for the /live subscription (bounded fan-out). Samples
 * a grid across the box and returns the unique cells; capped so a zoomed-out viewport can't request
 * an unbounded set (REALTIME_IMPLEMENTATION.md §4).
 */
export function coverCells(
  sw: LngLat,
  ne: LngLat,
  precision = LIVE_CELL_GEOHASH_PRECISION,
  steps = 6,
): string[] {
  const cells = new Set<string>();
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const lng = sw[0] + ((ne[0] - sw[0]) * i) / steps;
      const lat = sw[1] + ((ne[1] - sw[1]) * j) / steps;
      cells.add(geohashEncode([lng, lat], precision));
      if (cells.size >= 64) return [...cells]; // hard cap
    }
  }
  return [...cells];
}
