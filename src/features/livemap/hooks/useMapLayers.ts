'use client';

/**
 * Phase C data layers, all viewport-scoped.
 *
 * Each is `enabled` on its own store toggle so a layer nobody has switched on costs zero requests —
 * the demand layer in particular is a relatively expensive aggregate and defaults off.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { bboxKey } from '@/lib/geo';
import { isMapDemo } from '@/lib/env';
import { useViewportStore } from '@/stores/mapViewport.store';
import { useFiltersStore } from '@/stores/filters.store';
import { useMapLayersStore } from '@/stores/mapLayers.store';
import { demoDemandTiles, demoHubPins, demoHubInventoryMap } from '../demo.layers';
import type { DemandTile, HubInventoryMap, HubPinData } from '../types';

/** The bbox query params every Phase C layer shares. */
function useBBox() {
  const bounds = useViewportStore((s) => s.bounds);
  return {
    key: bboxKey(bounds.sw, bounds.ne),
    query: {
      swLng: bounds.sw[0],
      swLat: bounds.sw[1],
      neLng: bounds.ne[0],
      neLat: bounds.ne[1],
    },
  };
}

/**
 * C-1/C-2 — hubs in view. The category filter is passed to the SERVER rather than applied to the
 * result, because the server drops hubs with nothing matching entirely: a hub pin that can't
 * satisfy the active filter is a wasted trip, not a dimmed result.
 */
export function useMapHubs() {
  const { key, query } = useBBox();
  const category = useFiltersStore((s) => s.category);
  const enabled = useMapLayersStore((s) => s.hubs);
  // 'all' is the store's sentinel for no filter — never send it as a category.
  const cat = category && category !== 'all' ? category : undefined;

  return useQuery<HubPinData[]>({
    queryKey: keys.mapHubs(key, cat),
    enabled,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoHubPins(cat))
        : api.get<HubPinData[]>(endpoints.mapHubs, {
            query: { ...query, ...(cat ? { category: cat } : {}) },
          }),
    // Hubs are shopfronts — they don't move. Long stale time; the counts are what drift.
    staleTime: isMapDemo ? Infinity : 120_000,
  });
}

/** C-3 — demand tiles. Off by default (see the store), so this usually issues no request at all. */
export function useDemandTiles() {
  const { key, query } = useBBox();
  const enabled = useMapLayersStore((s) => s.demand);

  return useQuery<DemandTile[]>({
    queryKey: keys.mapDemand(key),
    enabled,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoDemandTiles())
        : api.get<DemandTile[]>(endpoints.mapDemand, { query }),
    // "Where people want something NOW" — a stale heat map is worse than none.
    staleTime: isMapDemo ? Infinity : 60_000,
    refetchInterval: isMapDemo ? false : 120_000,
  });
}

/** C-5 — where a hub's stock physically is. Owner-only; the server asserts ownership. */
export function useHubInventoryMap(hubId: string | undefined) {
  return useQuery<HubInventoryMap>({
    queryKey: keys.hubInventoryMap(hubId ?? 'none'),
    enabled: Boolean(hubId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoHubInventoryMap(hubId!))
        : api.get<HubInventoryMap>(endpoints.hubInventoryMap(hubId!)),
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}
