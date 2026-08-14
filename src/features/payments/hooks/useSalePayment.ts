'use client';

/**
 * Digital rail (Phase 2). The seller opens a payment for a customer to pay by card; the amount is
 * priced server-side from the checkout's snapshotted terms, never by this client.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type { PayPageView, SalePaymentIntent, SalePaymentStatus } from '../types';

export function useCreateSalePayment() {
  return useMutation({
    mutationFn: (input: {
      checkoutId: string;
      quantity: number;
      unitPriceCents?: number;
      customerEmail?: string;
      idempotencyKey: string;
    }): Promise<SalePaymentIntent> => {
      if (isMapDemo) {
        const amount = (input.unitPriceCents ?? 1000) * input.quantity;
        return Promise.resolve({
          id: `sp_${Date.now()}`,
          payToken: 'demo-token',
          payUrl: `${window.location.origin}/pay/demo-token`,
          amountCents: amount,
          currency: 'USD',
          quantity: input.quantity,
          unitPriceCents: input.unitPriceCents ?? 1000,
          status: 'pending',
          clientSecret: null,
          expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        });
      }
      const { idempotencyKey, ...body } = input;
      return api.post<SalePaymentIntent>(endpoints.salePaymentIntent, body, { idempotencyKey });
    },
  });
}

/**
 * Polled while the customer pays. Payment is confirmed by the Stripe webhook server-side — this
 * only observes the result, it never decides it.
 */
export function useSalePaymentStatus(id: string | undefined, enabled: boolean) {
  return useQuery<SalePaymentStatus>({
    queryKey: keys.salePayment(id ?? 'none'),
    enabled: Boolean(id) && enabled,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({ id: id!, status: 'succeeded', amountCents: 0, paidAt: new Date().toISOString(), expiresAt: new Date().toISOString() })
        : api.get<SalePaymentStatus>(endpoints.salePaymentStatus(id!)),
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 3000 : false),
    staleTime: 0,
  });
}

export function useCancelSalePayment() {
  return useMutation({
    mutationFn: (id: string) =>
      isMapDemo ? Promise.resolve() : api.post(endpoints.saleCancelPayment(id)),
  });
}

/** Public payment page — the customer has no account, so this hook is unauthenticated. */
export function usePayPage(token: string, opts?: { poll?: boolean }) {
  return useQuery<PayPageView>({
    queryKey: keys.payPublic(token),
    queryFn: () => api.get<PayPageView>(endpoints.payPublic(token)),
    staleTime: 0,
    retry: false,
    // After the customer confirms with Stripe, poll until the webhook flips status to succeeded
    // (stop once it's no longer pending).
    refetchInterval: (q) => (opts?.poll && q.state.data?.status === 'pending' ? 3000 : false),
  });
}
