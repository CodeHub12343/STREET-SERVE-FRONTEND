'use client';

/**
 * The vendor's own view of their business record (GET /businesses/:id) — notably `canGoLive`,
 * which is false while a regulated category has no approved licence. The vendor home reads it to
 * explain the block up front instead of firing a "Go live" that is guaranteed to 422
 * (LICENSE_REQUIRED) — docs/06 §1: never a dead end.
 *
 * Deliberately separate from features/business `useBusiness`, which caches a customer-shaped
 * normalized profile (no canGoLive) under the `business(id)` key.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { findDemoBusiness } from '@/lib/demo';

export interface VendorBusinessDetail {
  id: string;
  name: string;
  categoryId: string;
  status: string;
  isHub: boolean;
  logoUrl?: string | null;
  /** BP-3 made these real — registration used to discard the area entirely. */
  hours?: { day: number; open: string; close: string }[];
  serviceArea?: [number, number] | null;
  serviceRadiusM?: number | null;
  travelFeeCents?: number | null;
  payoutAccountLinked: boolean;
  /** False when the category requires a licence and none is approved yet. */
  canGoLive: boolean;
}

export function useVendorBusinessDetail(businessId: string | undefined) {
  return useQuery<VendorBusinessDetail>({
    queryKey: keys.vendorBusiness(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () => {
      if (isMapDemo) {
        const b = findDemoBusiness(businessId!);
        return Promise.resolve({
          id: businessId!,
          name: b?.name ?? 'Your business',
          categoryId: b?.category ?? 'food',
          status: 'active',
          isHub: false,
          logoUrl: b?.logoUrl ?? null,
          hours: [{ day: 1, open: '09:00', close: '17:00' }],
          serviceArea: b?.lngLat ?? null,
          serviceRadiusM: 5000,
          travelFeeCents: null,
          payoutAccountLinked: true,
          canGoLive: true, // demo never blocks the flow
        });
      }
      return api.get<VendorBusinessDetail>(endpoints.business(businessId!).root);
    },
    staleTime: 30_000,
  });
}
