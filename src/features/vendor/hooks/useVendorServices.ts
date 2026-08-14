'use client';

/**
 * Services data layer (BP-4). `GET/POST /businesses/:id/services` shipped long ago with no UI at
 * all, so appointment and on-demand businesses could not manage the thing they actually sell.
 *
 * Delete is a soft retire server-side (bookings reference a service with no name snapshot), which
 * the caller doesn't need to know: the list simply stops returning it.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type { PublicService } from '@/features/business/hooks/useBusiness';

/** The services endpoint is public, so the read lives with the customer profile that also uses it. */
export { useServices as useVendorServices } from '@/features/business/hooks/useBusiness';
export type VendorService = PublicService;

export interface ServiceInput {
  name: string;
  durationMin: number;
  priceCents: number;
  /** `null` clears an existing photo on update; omitted leaves it untouched. */
  photoUrl?: string | null;
}

export function useCreateService(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ServiceInput) =>
      isMapDemo
        ? Promise.resolve({ ...input, id: `svc_${Date.now()}` })
        : api.post<VendorService>(endpoints.business(businessId).services, input),
    // The setup checklist derives from this list, so it must re-read — not be told.
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.vendorServices(businessId) }),
  });
}

export function useUpdateService(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<ServiceInput> & { id: string }) =>
      isMapDemo
        ? Promise.resolve()
        : api.patch(endpoints.business(businessId).service(id), patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.vendorServices(businessId) }),
  });
}

export function useDeleteService(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      isMapDemo ? Promise.resolve() : api.del(endpoints.business(businessId).service(id)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.vendorServices(businessId) }),
  });
}
