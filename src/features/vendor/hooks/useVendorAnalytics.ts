'use client';

/**
 * V-11 analytics — real figures from GET /businesses/:id/analytics.
 *
 * The screen previously called `demoVendorAnalytics()` in BOTH branches of its demo ternary, so a
 * vendor with no sales at all still saw "$482 today · 37 orders · +18% vs category". Those are
 * numbers someone might staff or price against.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { demoVendorAnalytics } from '@/lib/demo';
import type { Cents } from '@/types';

export interface VendorAnalytics {
  salesTodayCents: Cents;
  ordersToday: number;
  salesWeekCents: Cents;
  /** Oldest → newest, one bucket per day, ending today. */
  weekSeries: Cents[];
  weekStart: string;
  queueConversion: number;
  queueJoined: number;
  avgWaitMin: number;
}

export function useVendorAnalytics(businessId: string | undefined) {
  return useQuery<VendorAnalytics>({
    queryKey: [...keys.dashboard(businessId ?? 'none'), 'analytics'],
    enabled: Boolean(businessId),
    queryFn: () => {
      if (isMapDemo) {
        const d = demoVendorAnalytics();
        const start = new Date();
        start.setDate(start.getDate() - 6);
        return Promise.resolve({
          salesTodayCents: d.salesTodayCents,
          ordersToday: d.ordersToday,
          salesWeekCents: d.salesWeekCents,
          weekSeries: d.weekSeries,
          weekStart: start.toISOString(),
          queueConversion: d.queueConversion,
          queueJoined: 0,
          avgWaitMin: d.avgWaitMin,
        });
      }
      return api.get<VendorAnalytics>(endpoints.business(businessId!).analytics);
    },
    staleTime: 60_000,
  });
}
