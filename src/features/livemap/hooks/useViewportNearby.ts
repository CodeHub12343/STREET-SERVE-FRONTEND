'use client';

/**
 * Ties the shared viewport + filters to the nearby query and the /live cell subscription. Both the
 * map (C-10) and the accessibility list view (C-12) use this, so they show the same live set.
 */
import { useMemo } from 'react';
import { useViewportStore } from '@/stores/mapViewport.store';
import { useFiltersStore } from '@/stores/filters.store';
import { bboxKey, coverCells, distanceMeters } from '@/lib/geo';
import { useNearby } from './useNearby';
import { useLiveCells } from './useLiveCells';

export function useViewportNearby() {
  const center = useViewportStore((s) => s.center);
  const bounds = useViewportStore((s) => s.bounds);
  const category = useFiltersStore((s) => s.category);
  const search = useFiltersStore((s) => s.search);

  const boundsKey = bboxKey(bounds.sw, bounds.ne);
  const radiusMeters = Math.max(500, distanceMeters(center, bounds.ne));
  const cells = useMemo(() => coverCells(bounds.sw, bounds.ne), [boundsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const nearby = useNearby({ center, bounds, radiusMeters, category, search });
  useLiveCells(nearby.queryKey, cells, () => void nearby.refetch());

  return { ...nearby, center };
}
