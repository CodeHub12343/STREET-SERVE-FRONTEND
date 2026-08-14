'use client';

/**
 * Vendor queue management data layer (V-04). The owner-gated GET /businesses/:id/queue carries the
 * live line WITH customer names (the public queue read never does), the discount schedule, and the
 * active session id for Pop-Up. Setting the line-up discount and triggering a Pop-Up live here too.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { findDemoBusiness } from '@/lib/demo';

export interface QueueEntry {
  position: number;
  customerName: string;
  discountPercent: number;
  joinedAt: string;
}
export interface DiscountTier {
  position: number;
  percent: number;
}
export interface VendorQueue {
  count: number;
  entries: QueueEntry[];
  tiers: DiscountTier[];
  capPercent: number;
  activeSessionId: string | null;
}

interface RawManageView {
  count: number;
  entries: { position: number; customerName: string; discountPercent: number; joinedAt: string }[];
  schedule: { tiers: { position?: number | null; discount_percent?: number | null }[]; capPercent: number };
  activeSessionId: string | null;
}

function demoQueue(businessId: string): VendorQueue {
  const q = findDemoBusiness(businessId)?.queue ?? { count: 0, cap: 0, schedule: [] };
  return {
    count: q.count,
    entries: Array.from({ length: q.count }, (_, i) => ({
      position: i + 1,
      customerName: ['Ada', 'Grace', 'Katherine', 'Dorothy'][i] ?? 'Customer',
      discountPercent: q.schedule.find((s) => s.position === i + 1)?.percent ?? 0,
      joinedAt: new Date(Date.now() - (q.count - i) * 6e4).toISOString(),
    })),
    tiers: q.schedule.map((s) => ({ position: s.position, percent: s.percent })),
    capPercent: q.schedule.at(-1)?.percent ?? 0,
    activeSessionId: 'demo_session',
  };
}

export function useVendorQueue(businessId: string) {
  return useQuery<VendorQueue>({
    queryKey: [...keys.queue(businessId), 'manage'],
    enabled: Boolean(businessId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoQueue(businessId))
        : api.get<RawManageView>(endpoints.business(businessId).queue).then((v) => ({
            count: v.count,
            entries: v.entries,
            tiers: v.schedule.tiers.map((t) => ({ position: t.position ?? 0, percent: t.discount_percent ?? 0 })),
            capPercent: v.schedule.capPercent,
            activeSessionId: v.activeSessionId,
          })),
    // The line moves as people join/leave — keep it fresh.
    staleTime: isMapDemo ? Infinity : 5_000,
    refetchInterval: isMapDemo ? false : 8_000,
  });
}

export function useSetDiscountSchedule(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { tiers: DiscountTier[]; capPercent: number }) =>
      isMapDemo
        ? Promise.resolve()
        : api.put(endpoints.queue(businessId).discountSchedule, {
            tiers: input.tiers.map((t) => ({ position: t.position, discount_percent: t.percent })),
            capPercent: input.capPercent,
          }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [...keys.queue(businessId), 'manage'] }),
  });
}

export function useTriggerPopUp(businessId: string) {
  return useMutation({
    mutationFn: (sessionId: string) =>
      isMapDemo ? Promise.resolve() : api.post(endpoints.liveSessions.popUp(sessionId)),
    // Do not invalidate the queue — a Pop-Up changes nothing about positions or discounts.
    meta: { businessId },
  });
}

/** Serve the front of the line — the customer is removed and everyone behind advances. */
export function useServeNext(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<{ servedCustomerName: string; remaining: number }> =>
      isMapDemo
        ? Promise.resolve({ servedCustomerName: 'A customer', remaining: 0 })
        : api.post<{ servedCustomerName: string; remaining: number }>(
            endpoints.business(businessId).queueServeNext,
          ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [...keys.queue(businessId), 'manage'] }),
  });
}
