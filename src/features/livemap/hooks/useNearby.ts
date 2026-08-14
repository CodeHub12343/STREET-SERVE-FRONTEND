'use client';

/**
 * GET /map/nearby (SCREEN_TO_API_MAPPING.md §2) — the periodic re-baseline of nearby pins for the
 * current viewport + filters. Live position/status deltas arrive over the socket (useLiveCells) and
 * patch this same cache entry (STATE_MANAGEMENT.md §6). In demo mode the pins come from the local
 * dataset so the map works with no backend.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { bboxKey } from '@/lib/geo';
import { isMapDemo } from '@/lib/env';
import { DEMO_BUSINESSES } from '@/lib/demo';
import { demoModulesFor } from '@/features/business/hooks/useBusinessModules';
import type { LngLat } from '@/types';
import type { CategoryTab } from '@/stores/filters.store';
import type { PinStatus } from '@/components/map/MapPin';
import type { MapPinData } from '../types';

/** The backend GET /map/nearby pin shape (livemap.service). Differs from the UI's MapPinData. */
interface RawPin {
  sessionId: string;
  actorType: string;
  actorId: string;
  name: string;
  logoUrl?: string | null;
  categoryId?: string | null;
  modules?: string[] | null;
  status: 'driving' | 'parked' | 'away_closed';
  /** P-11 — a live arrival estimate, only present while the vendor is actually driving. */
  etaMinutes?: number | null;
  /** P-19 — the paid Verified Badge. */
  verified?: boolean;
  location: { type: string; coordinates: LngLat };
}

/**
 * Backend GET /map/nearby caps radiusM at NEARBY_MAX_RADIUS_M (20km) and 400s anything larger
 * (livemap.schema.ts). A zoomed-out viewport computes a much bigger radius, so clamp before
 * sending — beyond 20km the backend can't serve more pins anyway.
 */
const MAX_NEARBY_RADIUS_M = 20_000;

/** Backend live status → the UI's PinStatus ('away_closed' is shown as 'away'). */
function toPinStatus(s: RawPin['status']): PinStatus {
  return s === 'away_closed' ? 'away' : s;
}

function toPin(p: RawPin): MapPinData {
  return {
    sessionId: p.sessionId,
    businessId: p.actorId,
    name: p.name,
    category: p.categoryId ?? 'all',
    logoUrl: p.logoUrl ?? undefined,
    lngLat: p.location.coordinates,
    status: toPinStatus(p.status),
    modules: (p.modules as MapPinData['modules']) ?? undefined,
    etaMin: p.etaMinutes ?? undefined,
    verified: p.verified ?? false,
  };
}

export interface NearbyArgs {
  center: LngLat;
  bounds: { sw: LngLat; ne: LngLat };
  radiusMeters: number;
  category: CategoryTab;
  search: string;
}

function demoPins(category: CategoryTab, search: string): MapPinData[] {
  const q = search.trim().toLowerCase();
  return DEMO_BUSINESSES.filter(
    (b) =>
      (category === 'all' || b.category === category) &&
      (!q || b.name.toLowerCase().includes(q) || b.category.includes(q)),
  ).map((b) => ({
    sessionId: b.sessionId,
    businessId: b.id,
    name: b.name,
    category: b.category,
    logoUrl: b.logoUrl,
    lngLat: b.lngLat,
    status: b.status,
    etaMin: b.etaMin,
    rating: b.rating,
    modules: demoModulesFor(b.category).enabled,
  }));
}

export function useNearby(args: NearbyArgs) {
  const { center, bounds, radiusMeters, category, search } = args;
  const queryKey = keys.mapNearby(bboxKey(bounds.sw, bounds.ne), category, search);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<MapPinData[]> => {
      if (isMapDemo) return demoPins(category, search);
      // Backend NearbyQuery is .strict() and expects `radiusM` (not `radius`); the pin shape uses
      // actorId/categoryId/location.coordinates, so map it to MapPinData.
      const raw = await api.get<RawPin[]>(endpoints.mapNearby, {
        query: {
          lat: center[1],
          lng: center[0],
          radiusM: Math.min(Math.round(radiusMeters), MAX_NEARBY_RADIUS_M),
          category: category === 'all' ? undefined : category,
          search: search.trim() || undefined,
        },
      });
      return raw.map(toPin);
    },
    // Socket owns live deltas; keep this as the periodic baseline.
    staleTime: isMapDemo ? Infinity : 15_000,
    placeholderData: (prev) => prev, // keep pins while panning/filtering (no flash)
  });

  return {
    pins: query.data ?? [],
    queryKey,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
