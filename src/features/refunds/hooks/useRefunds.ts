'use client';

/**
 * Refunds (Phase 4). Either party to a sale may issue one; a customer may only REQUEST one from
 * their receipt, because anyone holding that link could otherwise drain a seller.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type { Refund, RefundReason, RefundResult } from '../types';

export function useHubRefunds(hubId: string) {
  return useQuery<Refund[]>({
    queryKey: keys.hubRefunds(hubId),
    queryFn: () =>
      isMapDemo ? Promise.resolve([]) : api.get<Refund[]>(endpoints.hubRefunds(hubId)),
    staleTime: 15_000,
  });
}

export function useIssueRefund(hubId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      salePaymentId: string;
      amountCents?: number;
      reason: RefundReason;
      restock?: boolean;
    }): Promise<RefundResult> => {
      const { salePaymentId, ...body } = input;
      return api.post<RefundResult>(endpoints.refundSale(salePaymentId), body, {
        idempotencyKey: `refund_${salePaymentId}_${body.amountCents ?? 'full'}`,
      });
    },
    onSuccess: () => {
      if (hubId) {
        void qc.invalidateQueries({ queryKey: keys.hubRefunds(hubId) });
        void qc.invalidateQueries({ queryKey: keys.hubSettlements(hubId) });
      }
    },
  });
}

/** Public — the customer has no account, so this is unauthenticated and only files a request. */
export function useRequestRefund(token: string) {
  return useMutation({
    mutationFn: (reason: RefundReason) =>
      api.post<{ requested: boolean; amountCents: number }>(endpoints.requestRefund(token), {
        reason,
      }),
  });
}
