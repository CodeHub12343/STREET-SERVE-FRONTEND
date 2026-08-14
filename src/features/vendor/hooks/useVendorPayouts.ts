'use client';

/**
 * Payouts data layer (V-12). Real connection status + Stripe balance + the earnings ledger, from
 * GET /businesses/:id/payouts. Demo mode returns a representative snapshot so the screen is walkable
 * offline. Replaces the fully hardcoded placeholder that always claimed "Stripe account active".
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';

export type PayoutTier = 'tier0' | 'bronze' | 'silver' | 'gold';

export interface PayoutEarning {
  transactionId: string;
  grossCents: number;
  netCents: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | string;
  createdAt: string;
}

export interface VendorPayoutsData {
  account: {
    connected: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    payoutTier: PayoutTier;
  };
  balance: { availableCents: number; pendingCents: number; currency: string } | null;
  earnings: PayoutEarning[];
  summary: { salesCount: number; netEarnedCents: number };
}

const DEMO: VendorPayoutsData = {
  account: {
    connected: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    detailsSubmitted: true,
    payoutTier: 'silver',
  },
  balance: { availableCents: 48200, pendingCents: 12600, currency: 'usd' },
  earnings: [
    { transactionId: 'd1', grossCents: 1500, netCents: 1425, status: 'completed', createdAt: new Date(Date.now() - 36e5).toISOString() },
    { transactionId: 'd2', grossCents: 2600, netCents: 2470, status: 'completed', createdAt: new Date(Date.now() - 9e7).toISOString() },
    { transactionId: 'd3', grossCents: 900, netCents: 855, status: 'pending', createdAt: new Date(Date.now() - 18e7).toISOString() },
  ],
  summary: { salesCount: 2, netEarnedCents: 3895 },
};

export function useVendorPayouts(businessId: string) {
  return useQuery<VendorPayoutsData>({
    queryKey: keys.payouts(businessId),
    enabled: Boolean(businessId),
    queryFn: () =>
      isMapDemo ? Promise.resolve(DEMO) : api.get<VendorPayoutsData>(endpoints.business(businessId).payouts),
    // A read-through that re-syncs Stripe status server-side — keep it a touch fresher than default.
    staleTime: 15_000,
  });
}
