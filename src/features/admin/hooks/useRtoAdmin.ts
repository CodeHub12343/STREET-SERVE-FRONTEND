'use client';

/**
 * RTO compliance controls (§43/§60.3). Three switches that decide whether rent-to-own may happen:
 * approved sellers, opened cities, eligible categories.
 *
 * Every mutation invalidates the markets read rather than patching the cache optimistically. These
 * are compliance toggles — showing a city as open before the server has confirmed it is exactly the
 * wrong kind of optimism.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';

export interface RtoMarkets {
  /** §60 — false while the agreement is still placeholder text; no customer can accept one. */
  agreementReviewed: boolean;
  agreementVersion: string;
  cities: { slug: string; name: string; state: string; status: string; rtoEnabled: boolean }[];
  categories: {
    id: string;
    slug: string;
    name: string;
    rtoEligible: boolean;
    /** Hard prohibition (vehicles, regulated goods) — cannot be opened by anyone. */
    prohibited: boolean;
  }[];
}

export interface RtoApproval {
  sellerId: string;
  approvedBy: string;
  note: string | null;
  approvedAt: string;
}

export function useRtoMarkets() {
  return useQuery<RtoMarkets>({
    queryKey: keys.rtoMarkets,
    queryFn: () => api.get<RtoMarkets>(endpoints.rtoMarkets),
    staleTime: 30_000,
  });
}

export function useRtoApprovals() {
  return useQuery<RtoApproval[]>({
    queryKey: keys.rtoApprovals,
    queryFn: () => api.get<RtoApproval[]>(endpoints.rtoApprovals),
    staleTime: 30_000,
  });
}

export function useSetCityRto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, enabled }: { slug: string; enabled: boolean }) =>
      api.patch(endpoints.rtoMarketCity(slug), { enabled }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.rtoMarkets }),
  });
}

export function useSetCategoryRto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, eligible }: { id: string; eligible: boolean }) =>
      api.patch(endpoints.admin.category(id), { rtoEligible: eligible }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.rtoMarkets }),
  });
}

/**
 * Clear a business to offer Rent-to-Own.
 *
 * The endpoint existed from the start; the admin screen only ever wired REVOKE, so approving meant
 * calling the API by hand. A control that can take a permission away but not grant it leaves the
 * happy path outside the product.
 *
 * The note is required by the UI rather than the API: "who approved this and why" is the whole
 * audit value of a manual gate, and an approval nobody can explain later is not much of a control.
 */
export function useApproveRtoSeller() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sellerId, note }: { sellerId: string; note: string }) =>
      api.post(endpoints.rtoApprovals, { sellerId, note }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.rtoApprovals }),
  });
}

export function useRevokeRtoSeller() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sellerId: string) => api.del(endpoints.rtoApproval(sellerId)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.rtoApprovals }),
  });
}
