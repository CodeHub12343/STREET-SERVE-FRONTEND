'use client';

/**
 * GET /map/trending (R1b) — the discount-boosted discovery ranking. Server-scored and explainable:
 * each row carries the `factors` that put it there, so "why is this trending?" has a real answer.
 * Location is optional server-side (proximity just scores 0), but we pass the viewport centre.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { demoTrending } from '@/lib/demo';
import type { LngLat } from '@/types';
import type { TrendingItem } from '../types';

export function useTrending(center: LngLat, limit = 10) {
  const [lng, lat] = center;
  return useQuery<TrendingItem[]>({
    queryKey: keys.trending(lng, lat),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoTrending() as TrendingItem[])
        : api.get<TrendingItem[]>(endpoints.mapTrending, { query: { lat, lng, limit } }),
    staleTime: isMapDemo ? Infinity : 30_000,
    placeholderData: (prev) => prev, // keep the row stable while panning
  });
}
