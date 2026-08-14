'use client';

/**
 * Licence documents for the vendor's own business (V-01b). A business in a `requires_license`
 * category cannot go live until one of these is approved by an admin — this is the screen that
 * makes that state visible and actionable instead of a silent 422.
 *
 * Submitting invalidates the business record too, because `canGoLive` is derived server-side and
 * the vendor home reads it to enable "Go live".
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';

export type LicenseStatus = 'pending' | 'approved' | 'rejected';

export interface LicenseDocument {
  id: string;
  businessId: string;
  categoryId: string;
  categoryName: string;
  documentUrl: string;
  status: LicenseStatus;
  reviewedAt?: string | null;
  createdAt?: string;
}

export function useLicenseDocuments(businessId: string | undefined) {
  return useQuery<LicenseDocument[]>({
    queryKey: keys.licenseDocuments(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve([])
        : api.get<LicenseDocument[]>(endpoints.business(businessId!).licenseDocuments),
    staleTime: 15_000,
  });
}

export function useSubmitLicense(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { categoryId: string; documentUrl: string }) =>
      isMapDemo
        ? Promise.resolve({ id: 'lic_demo', status: 'pending' as LicenseStatus })
        : api.post<{ id: string; status: LicenseStatus }>(
            endpoints.business(businessId).licenseDocuments,
            input,
          ),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.licenseDocuments(businessId) }),
        // canGoLive is server-derived — refresh it so the home screen unlocks on approval.
        qc.invalidateQueries({ queryKey: keys.vendorBusiness(businessId) }),
      ]);
    },
  });
}
