'use client';

/**
 * Resolves the business the current vendor operates.
 *
 * Real mode reads the vendor's own businesses from `GET /businesses/mine` and uses the first one.
 * A vendor who hasn't registered a business yet resolves to `null` — callers must send them to
 * /vendor/register rather than calling business-scoped endpoints (VendorBusinessGate does this).
 * Demo mode short-circuits to the sample business so the dashboard runs with no backend.
 *
 * Never fall back to the demo id in real mode: the backend validates ids as 24-char ObjectIds,
 * so a fake id like 'biz_taco' makes every business-scoped call 400.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { DEMO_VENDOR_BUSINESS_ID } from '@/lib/demo';

export interface MyBusiness {
  id: string;
  name: string;
  categoryId: string;
  logoUrl?: string | null;
  isHub: boolean;
  status: string;
}

export interface VendorBusinessState {
  /** The active business id, or null when the vendor hasn't registered one yet. */
  businessId: string | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useVendorBusiness(): VendorBusinessState {
  const query = useQuery<MyBusiness[]>({
    queryKey: keys.myBusinesses,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve([
            {
              id: DEMO_VENDOR_BUSINESS_ID,
              name: 'Taco Loco',
              categoryId: 'food',
              isHub: false,
              status: 'active',
            },
          ])
        : api.get<MyBusiness[]>(endpoints.businessesMine),
    staleTime: isMapDemo ? Infinity : 60_000,
  });

  return {
    businessId: query.data?.[0]?.id ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}
