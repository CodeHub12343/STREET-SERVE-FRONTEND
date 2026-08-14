'use client';

/**
 * Vendor dashboard + wave inbox + order queue data (docs/13 V-02/V-03/V-05, SCREEN_TO_API_MAPPING
 * §7). Accepting a wave emits wave:accepted to the customer; order transitions push over
 * /notifications. Demo mode seeds incoming waves/orders and simulates the counts so the vendor loop
 * runs offline.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { demoIncomingWaves, demoVendorOrders, findDemoBusiness } from '@/lib/demo';
import type { VendorDashboard, VendorOrder, VendorOrderStatus, WaveRequest } from '../types';

/**
 * Raw GET /businesses/:id/dashboard shape (dashboardService.getVendorDashboard). It's a composed
 * read model — the counts the home shows have to be *derived* from it, not read off flat fields
 * (there is no queueCount/orderCount/todaySalesCents on the wire). Incoming wave-downs aren't part
 * of this model at all, so the wave count comes from the separate wave-downs endpoint.
 */
interface RawVendorDashboard {
  businessId: string;
  queue?: { entries?: unknown[] } | null;
  orders?: { pending?: unknown[]; accepted?: unknown[]; ready?: unknown[] } | null;
  salesSummary?: { count?: number; grossCents?: number } | null;
}

// ---- Dashboard (at-a-glance counts) ----
export function useVendorDashboard(businessId: string) {
  const qc = useQueryClient();
  return useQuery<VendorDashboard>({
    queryKey: keys.dashboard(businessId),
    queryFn: async () => {
      if (isMapDemo) {
        const biz = findDemoBusiness(businessId);
        const waves = qc.getQueryData<WaveRequest[]>(keys.waveInbox(businessId)) ?? demoIncomingWaves();
        const orders = qc.getQueryData<VendorOrder[]>(keys.businessOrders(businessId)) ?? demoVendorOrders();
        return {
          businessId,
          businessName: biz?.name ?? 'Your business',
          queueCount: biz?.queue.count ?? 0,
          waveCount: waves.length,
          orderCount: orders.filter((o) => o.status !== 'completed').length,
          todaySalesCents: 48200,
        };
      }
      // The dashboard read model carries queue/orders/sales but not incoming wave-downs; fetch those
      // alongside so the home's three counts all reflect live server truth.
      const [raw, waves] = await Promise.all([
        api.get<RawVendorDashboard>(endpoints.business(businessId).dashboard),
        api
          .get<unknown[]>(endpoints.business(businessId).root + '/wave-downs')
          .catch(() => [] as unknown[]),
      ]);
      const orders = raw.orders ?? {};
      return {
        businessId,
        // Left undefined so the home falls back to the business detail name.
        queueCount: raw.queue?.entries?.length ?? 0,
        waveCount: waves.length,
        orderCount:
          (orders.pending?.length ?? 0) +
          (orders.accepted?.length ?? 0) +
          (orders.ready?.length ?? 0),
        todaySalesCents: raw.salesSummary?.grossCents ?? 0,
      };
    },
    enabled: businessId !== '',
    staleTime: isMapDemo ? Infinity : 10_000,
    // The counts change as customers wave, join the line, and place orders — keep the home live
    // without a manual refresh (mirrors useVendorQueue's polling). Paused when the tab is hidden.
    refetchInterval: isMapDemo ? false : 12_000,
  });
}

// ---- Wave inbox (V-03) ----
export function useWaveInbox(businessId: string) {
  return useQuery<WaveRequest[]>({
    queryKey: keys.waveInbox(businessId),
    queryFn: () => (isMapDemo ? Promise.resolve(demoIncomingWaves()) : api.get<WaveRequest[]>(endpoints.business(businessId).root + '/wave-downs')),
    staleTime: isMapDemo ? Infinity : 8_000,
    // New wave-downs arrive from customers at any moment — poll so they surface without a reload.
    refetchInterval: isMapDemo ? false : 10_000,
  });
}

export function useRespondWave(businessId: string) {
  const qc = useQueryClient();
  const remove = (id: string) =>
    qc.setQueryData<WaveRequest[]>(keys.waveInbox(businessId), (prev) => (prev ?? []).filter((w) => w.id !== id));

  const accept = useMutation({
    mutationFn: (id: string) => (isMapDemo ? Promise.resolve() : api.post(endpoints.waveAccept(id))),
    onSuccess: (_r, id) => {
      remove(id);
      void qc.invalidateQueries({ queryKey: keys.dashboard(businessId) });
    },
  });
  const decline = useMutation({
    mutationFn: (id: string) => (isMapDemo ? Promise.resolve() : api.post(endpoints.waveDecline(id))),
    onSuccess: (_r, id) => remove(id),
  });
  return { accept, decline };
}

// ---- Order queue (V-05) ----
/** Raw GET /businesses/:id/orders shape (ordersService.view + listForBusiness). */
interface RawVendorOrder {
  id: string;
  customerName?: string;
  status: string;
  items: { name?: string | null; quantity?: number | null }[];
  totalCents: number;
  createdAt?: string | null;
}

/**
 * The server's order lifecycle is pending → accepted → ready → completed; the board's middle
 * column is "preparing". Mapping `accepted → preparing` here is what keeps an accepted ticket on
 * the board — without it the order matched no column and vanished the moment the query refetched.
 */
export function toVendorOrder(o: RawVendorOrder): VendorOrder {
  const status: VendorOrderStatus =
    o.status === 'accepted' ? 'preparing' : (o.status as VendorOrderStatus);
  return {
    id: o.id,
    customerName: o.customerName || 'A customer',
    items: o.items.map((it) => ({ name: it.name ?? 'Item', qty: it.quantity ?? 1 })),
    totalCents: o.totalCents,
    status,
    placedAt: o.createdAt ?? '',
  };
}

export function useVendorOrders(businessId: string) {
  return useQuery<VendorOrder[]>({
    queryKey: keys.businessOrders(businessId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoVendorOrders())
        : api.get<RawVendorOrder[]>(endpoints.business(businessId).orders).then((rows) => rows.map(toVendorOrder)),
    staleTime: isMapDemo ? Infinity : 8_000,
    // New orders land on the board without the vendor doing anything — poll to pull them in.
    refetchInterval: isMapDemo ? false : 10_000,
  });
}

const NEXT_STATUS: Partial<Record<VendorOrderStatus, VendorOrderStatus>> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

export function useAdvanceOrder(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: VendorOrderStatus }) => {
      const next = NEXT_STATUS[status];
      if (isMapDemo || !next) return Promise.resolve();
      const path =
        next === 'preparing' ? endpoints.orderAccept(id) : next === 'ready' ? endpoints.orderReady(id) : endpoints.orderComplete(id);
      return api.post(path);
    },
    onMutate: ({ id, status }) => {
      const next = NEXT_STATUS[status];
      if (next) {
        qc.setQueryData<VendorOrder[]>(keys.businessOrders(businessId), (prev) =>
          (prev ?? []).map((o) => (o.id === id ? { ...o, status: next } : o)),
        );
      }
    },
    onSettled: () => {
      // Refetch the board (server truth: 'accepted' → mapped to 'preparing') and the dashboard.
      void qc.invalidateQueries({ queryKey: keys.businessOrders(businessId) });
      void qc.invalidateQueries({ queryKey: keys.dashboard(businessId) });
    },
  });
}
