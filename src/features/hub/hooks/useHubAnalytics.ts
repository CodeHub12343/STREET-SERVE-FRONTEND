'use client';

/**
 * H-08 hub analytics. Every figure comes from GET /hubs/:id/analytics, aggregated from the hub's
 * own consignment records — there is no demo fallback outside demo mode, because a fabricated
 * number on an operations screen is worse than an empty one.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import type { Cents } from '@/types';

export interface HubAnalyticsDay {
  date: string;
  grossCents: Cents;
  hubShareCents: Cents;
}

export interface HubLeader {
  id: string;
  name: string;
  units: number;
  grossCents: Cents;
}

export interface HubAnalytics {
  hubId: string;
  windowDays: number;
  windowStart: string;
  earnings: {
    hubShareTotalCents: Cents;
    hubSharePaidCents: Cents;
    hubShareAwaitingCents: Cents;
    grossCents: Cents;
  };
  movement: {
    unitsOut: number;
    unitsSold: number;
    sellThrough: number;
    liveCheckouts: number;
    activeSellers: number;
    valueAtRiskCents: Cents;
  };
  rail: { cashGrossCents: Cents; digitalGrossCents: Cents; cashRatio: number };
  attention: {
    pendingApproval: number;
    overdue: number;
    returnPending: number;
    owedBySellersCents: Cents;
  };
  series: HubAnalyticsDay[];
  topProducts: HubLeader[];
  topSellers: HubLeader[];
}

export function useHubAnalytics(hubId: string | undefined, days = 30) {
  return useQuery<HubAnalytics>({
    queryKey: [...keys.hubAnalytics(hubId ?? 'none'), days],
    enabled: Boolean(hubId),
    queryFn: () =>
      api.get<HubAnalytics>(endpoints.hubAnalytics(hubId!), { query: { days } }),
    staleTime: 60_000,
  });
}
