'use client';

/**
 * Phase E data layer — Income Coach, events, reallocation advice.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { AppApiError } from '@/lib/api/errors';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { useDeviceLocation } from '@/features/jobs/hooks/useJobs';
import { demoCoachPlan, demoEvents, demoReallocation } from '../demo';
import type { AiQuota, CoachPlan, NearbyEvent, ReallocationAdvice } from '../types';

/**
 * E-9. A mutation rather than a query: a plan is generated for a goal the seller just chose, and
 * caching it across goal changes would show someone a plan for a number they've since abandoned.
 */
export function useCoachPlan() {
  const { data: coords } = useDeviceLocation();
  const qc = useQueryClient();
  return useMutation<CoachPlan, AppApiError, number>({
    mutationFn: (goalCents) =>
      isMapDemo
        ? demoCoachPlan(goalCents)
        : api.post<CoachPlan>(endpoints.coachPlan, {
            goalCents,
            ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
          }),
    /**
     * A plan spends one of the month's free suggestions, so the displayed allowance is stale the
     * moment it succeeds. On `settled` rather than `success`: a refusal is exactly when the count
     * matters most, and a failure the server refunded would otherwise leave the UI understating
     * what the seller still has.
     */
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.aiQuota }),
  });
}

/**
 * Free AI suggestions left this month.
 *
 * Read up front so the seller can see the allowance running down while they use it. A limit that
 * only appears at the moment of refusal reads as the product breaking rather than as something they
 * were told about — and it gives them no reason to consider the plan until it is already annoying.
 *
 * Refetched after every plan, since each one spends an allowance.
 */
export function useAiQuota() {
  return useQuery<AiQuota>({
    queryKey: keys.aiQuota,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({ unlimited: false, used: 1, limit: 5, remaining: 4, period: '2026-08' })
        : api.get<AiQuota>(endpoints.aiQuota),
    staleTime: 60_000,
  });
}

/** E-4/E-5 — events near the seller, for the map layer and the "what's on" strip. */
export function useNearbyEvents(withinHours = 72) {
  const { data: coords } = useDeviceLocation();
  const key = coords ? `${coords.lng.toFixed(2)},${coords.lat.toFixed(2)}` : 'none';

  return useQuery<NearbyEvent[]>({
    queryKey: keys.eventsNearby(`${key}:${withinHours}`),
    enabled: Boolean(coords) || isMapDemo,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoEvents())
        : api.get<NearbyEvent[]>(endpoints.eventsNearby, {
            query: { lat: coords!.lat, lng: coords!.lng, withinHours },
          }),
    staleTime: isMapDemo ? Infinity : 300_000,
  });
}

/** E-10 — where a hub's stock would sell better than it does here. */
export function useReallocationAdvice(hubId: string | undefined) {
  return useQuery<ReallocationAdvice[]>({
    queryKey: keys.hubReallocation(hubId ?? 'none'),
    enabled: Boolean(hubId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoReallocation())
        : api.get<ReallocationAdvice[]>(endpoints.hubReallocation(hubId!)),
    staleTime: isMapDemo ? Infinity : 300_000,
  });
}
