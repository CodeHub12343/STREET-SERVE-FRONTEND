'use client';

/**
 * Ping budget data layer (V-09). Funding is a REAL prepayment: POST returns a Stripe client secret
 * that the vendor must confirm, and the balance is credited server-side only when that charge
 * settles (webhook). So the mutation does not optimistically raise the balance — it hands back a
 * secret for the payment sheet, and the screen polls until the credit lands.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isMapDemo } from '@/lib/env';
import { demoPingBudget } from '@/lib/demo';
import type { Cents } from '@/types';

export interface PingBudget {
  businessId: string;
  balanceCents: Cents;
  fundedCents: Cents;
  spentCents: Cents;
  perShareTipCents: Cents;
  status: 'active' | 'paused';
  shares: number;
  conversions: number;
}

interface FundResponse {
  balanceCents: Cents;
  perShareTipCents: Cents;
  status: 'active' | 'paused';
  clientSecret: string | null;
  topupId: string | null;
}

const key = (businessId: string) => ['ping-budget', businessId] as const;

export function usePingBudget(businessId: string | undefined) {
  return useQuery<PingBudget>({
    queryKey: key(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () => {
      if (isMapDemo) {
        const d = demoPingBudget();
        return Promise.resolve({
          businessId: businessId!,
          balanceCents: d.fundedCents - d.spentCents,
          fundedCents: d.fundedCents,
          spentCents: d.spentCents,
          perShareTipCents: 50,
          status: 'active' as const,
          shares: d.shares,
          conversions: d.conversions,
        });
      }
      return api.get<PingBudget>(endpoints.pingBudget(businessId!));
    },
    staleTime: 15_000,
  });
}

/** Opens the top-up charge. The balance moves only after the returned secret is confirmed. */
export function useFundPingBudget(businessId: string | undefined) {
  return useMutation({
    mutationFn: (input: { reloadCents: number; perShareTipCents: number }) =>
      isMapDemo
        ? Promise.resolve({ balanceCents: 0, perShareTipCents: input.perShareTipCents, status: 'active' as const, clientSecret: 'demo', topupId: 'demo' })
        : api.post<FundResponse>(endpoints.pingBudget(businessId!), input),
  });
}

export function useSetBudgetStatus(businessId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: 'active' | 'paused') =>
      isMapDemo ? Promise.resolve() : api.patch(endpoints.pingBudget(businessId!), { status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key(businessId ?? 'none') }),
  });
}

/** Refetch after a confirmed top-up — the webhook credits asynchronously. */
export function useRefreshBudget(businessId: string | undefined) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: key(businessId ?? 'none') });
}
