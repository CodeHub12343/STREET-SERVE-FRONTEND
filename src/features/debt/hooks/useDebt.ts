'use client';

/**
 * Seller balance (Phase 3 cash rail). What the seller owes from cash sales, and how much stock
 * their trust tier lets them hold.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type { CreditStatus, MyDebts } from '../types';

export function useMyDebts() {
  return useQuery<MyDebts>({
    queryKey: keys.myDebts,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({ totalOutstandingCents: 0, debts: [] })
        : api.get<MyDebts>(endpoints.myDebts),
    staleTime: 15_000,
  });
}

/** Powers "how much stock can I take?" — the same numbers the server enforces at checkout. */
export function useCreditStatus() {
  return useQuery<CreditStatus>({
    queryKey: keys.myCredit,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({
            tier: 'bronze',
            maxInventoryValueCents: 20_000,
            currentInventoryValueCents: 5_000,
            availableInventoryCents: 15_000,
            maxCashDebtCents: 10_000,
            outstandingDebtCents: 0,
            availableDebtCents: 10_000,
            overDebtLimit: false,
          })
        : api.get<CreditStatus>(endpoints.myCredit),
    staleTime: 30_000,
  });
}

export function useRepayDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amountCents }: { id: string; amountCents: number }) =>
      isMapDemo
        ? Promise.resolve()
        : api.post(endpoints.repayDebt(id), { amountCents }, { idempotencyKey: `repay_${id}_${amountCents}` }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.myDebts });
      void qc.invalidateQueries({ queryKey: keys.myCredit });
    },
  });
}
