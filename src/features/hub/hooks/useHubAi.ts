'use client';

/**
 * H-06 hub AI dashboard data layer.
 *
 * Replaces a `queryFn` that returned hardcoded sample data on BOTH branches of an `isMapDemo`
 * ternary — so every hub operator, in every environment, saw the same three invented products and
 * the same invented "move stock to Graceada" suggestion. The endpoints below already existed and
 * were simply never called.
 *
 * That matters more here than on a cosmetic screen: a hub operator physically moves inventory on
 * the strength of this page.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { demoHubForecast } from '@/lib/demo';

/** One product's recent performance at this hub. Mirrors the backend's `hubDashboard` shape. */
export interface HubAiProduct {
  productId: string;
  name: string;
  quantityAvailable: number;
  recentUnits: number;
  /** 0–1, over the backend's rolling window. Units sold ÷ (sold + still on shelf). */
  sellThrough: number;
  /** The backend's own words, or null when it has nothing worth saying. Never invented here. */
  suggestion: string | null;
}

export interface HubAiDashboardData {
  hubId: string;
  windowDays: number;
  recentRevenueCents: number;
  recentUnits: number;
  products: HubAiProduct[];
  /**
   * The backend sets this. It is surfaced in the UI rather than dropped: these are rule-based
   * observations over a short window, not predictions, and presenting them as instructions would
   * overstate what the platform actually knows.
   */
  advisoryOnly: boolean;
}

export function useHubAiDashboard(hubId: string | undefined) {
  return useQuery<HubAiDashboardData>({
    queryKey: keys.hubAiDashboard(hubId ?? 'none'),
    enabled: Boolean(hubId),
    queryFn: () => {
      if (isMapDemo) {
        /**
         * Demo mode alone gets the sample data, and it is reshaped into the REAL contract rather
         * than a parallel one — so the component has a single shape to render and demo mode cannot
         * drift away from what production actually returns. That drift is what let the old bug hide.
         */
        const demo = demoHubForecast();
        return Promise.resolve({
          hubId: hubId!,
          windowDays: 30,
          recentRevenueCents: 0,
          recentUnits: 0,
          advisoryOnly: true,
          products: demo.topMovers.map((m, i) => ({
            productId: `demo-${i}`,
            name: m.name,
            quantityAvailable: 0,
            recentUnits: 0,
            sellThrough: m.sellRate,
            suggestion: m.restock ? 'Restock — selling faster than current stock covers.' : null,
          })),
        });
      }
      return api.get<HubAiDashboardData>(endpoints.hubAiDashboard(hubId!));
    },
    staleTime: 300_000,
  });
}
