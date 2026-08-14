/**
 * Geo helpers. GeoJSON order is [lng, lat] to match the backend (FOLDER_STRUCTURE.md §4).
 * The geohash precision here MUST match the backend's live-cell precision so the map's
 * socket subscriptions line up with server fan-out (REALTIME_IMPLEMENTATION.md §4).
 */
import type { LngLat } from '@/types';

/** Backend live-cell geohash precision. Keep in sync with the server constant. */
export const LIVE_CELL_GEOHASH_PRECISION = 6;

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
