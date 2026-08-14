'use client';

/**
 * S-15 seller analytics — GET /checkouts/analytics. Real aggregates only; no demo fallback outside
 * demo mode, because a fabricated sell-through rate would have someone taking the wrong stock.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Cents, VerificationTier } from '@/types';

export interface SellerAnalyticsDay {
  date: string;
  grossCents: Cents;
}

export interface SellerLeader {
  id: string;
  name: string;
  units: number;
  grossCents: Cents;
}

export interface SellerAnalytics {
  windowDays: number;
  windowStart: string;
  earnings: {
    netTotalCents: Cents;
    netPaidCents: Cents;
    netPendingCents: Cents;
    grossCents: Cents;
  };
  movement: {
    unitsTaken: number;
    unitsSold: number;
    sellThrough: number;
    avgDaysToSell: number;
    holdingCount: number;
    holdingUnits: number;
    holdingValueCents: Cents;
  };
  rail: { cashGrossCents: Cents; digitalGrossCents: Cents; cashRatio: number };
  credit: {
    tier: VerificationTier;
    maxInventoryValueCents: Cents;
    heldValueCents: Cents;
    availableCents: Cents;
    outstandingDebtCents: Cents;
    maxCashDebtCents: Cents;
  };
  attention: {
    overdue: number;
    returnPending: number;
    pendingApproval: number;
    expiringSoon: number;
  };
  series: SellerAnalyticsDay[];
  topProducts: SellerLeader[];
  topHubs: SellerLeader[];
}

export function useSellerAnalytics(days = 30) {
  return useQuery<SellerAnalytics>({
    queryKey: ['seller', 'analytics', days],
    queryFn: () => api.get<SellerAnalytics>(endpoints.sellerAnalytics, { query: { days } }),
    staleTime: 60_000,
  });
}
