'use client';

/**
 * Order/transaction data layer (PAYMENTS_IMPLEMENTATION.md §2,§3). Creating a transaction opens a
 * PaymentIntent (💳, with a caller-supplied Idempotency-Key reused across retries). The webhook/
 * socket is the authoritative settle; in demo mode the order lifecycle is simulated so the tracker
 * and receipt complete offline.
 */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type { PayForwardOffer } from '@/features/payforward/types';
import { formatCents } from '@/lib/money';
import { demoReceipt, demoOrderHistory, type DemoHistoryItem } from '@/lib/demo';
import { mapServerBreakdown, type Breakdown, type ServerBreakdown } from '../breakdown';
import type { CreateTransactionInput, OrderItem, OrderStatus, OrderTxn, RefundQuote } from '../types';

/** The backend order shape (orders.service.view + payment) returned by POST /orders and /orders/mine. */
interface BackendOrder {
  id: string;
  businessId: string;
  businessName?: string; // present on /orders/mine (enriched)
  status: string; // 'pending' | 'accepted' | 'ready' | 'completed' | 'cancelled'
  items: Array<{
    menuItemId?: string | null;
    name?: string | null;
    quantity?: number | null;
    unitPriceCents?: number | null;
  }>;
  subtotalCents: number;
  tipCents?: number | null;
  totalCents: number;
  /** Server-authoritative itemization (R9) — authoritative over any client estimate. */
  breakdown?: ServerBreakdown;
  transactionId?: string | null;
  /** What the community fund covered, and what is still owed. See the note on `Order`. */
  payItForwardCents?: number | null;
  amountDueCents?: number | null;
  createdAt?: string | null;
  payment?: { clientSecret?: string | null; status?: string | null; transactionId?: string | null };
}

/**
 * Server-authoritative price preview (R9): the customer sees the exact lines they'll be charged
 * BEFORE confirming. A client estimate (`demoBreakdown`) shows instantly and is replaced by the
 * server's breakdown; in demo mode the estimate is the answer. Keyed on the cart + tip so it
 * re-quotes as they change.
 */
export function useOrderQuote(args: {
  businessId: string;
  items: { menuItemId: string; quantity: number }[];
  tipCents: number;
  demoBreakdown: Breakdown;
  enabled?: boolean;
}) {
  return useQuery<Breakdown>({
    queryKey: keys.orderQuote(args.businessId, args.items, args.tipCents),
    enabled: (args.enabled ?? true) && args.items.length > 0,
    queryFn: async () => {
      if (isMapDemo) return args.demoBreakdown;
      const res = await api.post<{ breakdown: ServerBreakdown; payItForward?: PayForwardOffer }>(
        endpoints.ordersQuote,
        { businessId: args.businessId, items: args.items, tipCents: args.tipCents },
      );
      // Carried alongside the breakdown rather than folded into it: the fund is not a discount, and
      // the total on the receipt must stay what the meal actually cost.
      return { ...mapServerBreakdown(res.breakdown), payItForward: res.payItForward ?? null };
    },
    // Instant client estimate, then the server value replaces it — the confirm CTA waits for neither.
    placeholderData: args.demoBreakdown,
    staleTime: isMapDemo ? Infinity : 0,
  });
}

/** Backend order status → the UI's richer OrderStatus. */
function mapOrderStatus(s: string): OrderStatus {
  switch (s) {
    case 'pending':
      return 'pending_payment';
    case 'accepted':
      return 'accepted';
    case 'ready':
      return 'ready';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending_payment';
  }
}

function backendItems(o: BackendOrder): OrderItem[] {
  return o.items.map((li) => ({
    name: li.name ?? '',
    qty: li.quantity ?? 0,
    priceCents: li.unitPriceCents ?? 0,
  }));
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, idempotencyKey }: { input: CreateTransactionInput; idempotencyKey: string }): Promise<OrderTxn> => {
      const items = input.lines.map((l) => ({ name: l.name, qty: l.qty, priceCents: l.priceCents }));
      if (isMapDemo) {
        return {
          id: `txn_${Date.now()}`,
          businessId: input.businessId,
          businessName: input.businessName,
          context: input.context,
          status: 'pending_payment',
          clientSecret: 'demo',
          breakdown: input.breakdown,
          items,
          createdAt: new Date().toISOString(),
          payoutTiming: 'Bronze — payout held 3 days',
          transactionId: `demo_txn_${Date.now()}`,
        };
      }
      // Backend PlaceOrderBody: { businessId, items:[{menuItemId,quantity}], tipCents?, roundUpCents? }.
      // Discount is derived server-side from the queue, so it isn't sent. The response omits UI
      // display fields (businessName/context/breakdown), so merge those from the local input.
      const res = await api.post<BackendOrder>(
        endpoints.orders,
        {
          businessId: input.businessId,
          items: input.lines.map((l) => ({ menuItemId: l.itemId, quantity: l.qty })),
          tipCents: input.breakdown.tipCents,
          ...(input.usePayItForward ? { usePayItForward: true } : {}),
        },
        { idempotencyKey },
      );
      return {
        id: res.id,
        businessId: res.businessId,
        businessName: input.businessName,
        context: input.context,
        status: mapOrderStatus(res.status),
        clientSecret: res.payment?.clientSecret ?? undefined,
        // The charged breakdown is authoritative over the client estimate (R9: preview == charge).
        breakdown: res.breakdown ? mapServerBreakdown(res.breakdown) : input.breakdown,
        items: backendItems(res).length ? backendItems(res) : items,
        createdAt: new Date().toISOString(),
        payoutTiming: 'Payout timing is set by your trust tier',
        transactionId: res.transactionId ?? res.payment?.transactionId ?? undefined,
        // The server's own answer to "is anything still owed?" — a fully covered order returns 0
        // and must never be routed to a payment screen.
        payItForwardCents: res.payItForwardCents ?? 0,
        amountDueCents: res.amountDueCents ?? undefined,
      };
    },
    onSuccess: (txn) => qc.setQueryData(keys.order(txn.id), txn),
  });
}

const HISTORY_STATUS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function toHistoryItem(o: BackendOrder): DemoHistoryItem {
  const summary = o.items
    .map((it) => `${it.quantity ?? 1}× ${it.name ?? 'Item'}`)
    .join(', ');
  return {
    id: o.id,
    kind: 'order',
    title: o.businessName || 'Order',
    subtitle: summary || 'Order',
    amountCents: o.totalCents,
    at: o.createdAt ?? new Date().toISOString(),
    status: HISTORY_STATUS[o.status] ?? o.status,
    // A finished order opens its receipt; a live one opens the tracker.
    deeplink: o.status === 'completed' ? `/order/${o.id}/receipt` : `/order/${o.id}`,
  };
}

/** Raw GET /wave-downs/mine row (queueService.listMyWaveDowns). */
interface RawWaveDown {
  id: string;
  businessName: string;
  status: string;
  note?: string | null;
  requestedAt: string;
}
const WAVE_STATUS: Record<string, string> = {
  pending: 'Waiting',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'No response',
  cancelled: 'Cancelled',
};
export function toWaveHistoryItem(w: RawWaveDown): DemoHistoryItem {
  return {
    id: w.id,
    kind: 'wave',
    title: w.businessName,
    subtitle: w.note ? `Wave-down · “${w.note}”` : 'Wave-down',
    amountCents: 0, // a wave itself isn't a payment; the row shows its status instead
    at: w.requestedAt,
    status: WAVE_STATUS[w.status] ?? w.status,
    deeplink: `/wave/${w.id}`,
  };
}

/** Raw GET /bookings/mine row (schedulingService.listMyBookings, enriched). */
interface RawBooking {
  id: string;
  businessName: string;
  serviceName: string;
  scheduledAt: string;
  status: string;
}
const BOOKING_STATUS: Record<string, string> = {
  booked: 'Booked',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};
export function toBookingHistoryItem(b: RawBooking): DemoHistoryItem {
  return {
    id: b.id,
    kind: 'booking',
    title: b.businessName,
    subtitle: b.serviceName,
    amountCents: 0,
    at: b.scheduledAt,
    status: BOOKING_STATUS[b.status] ?? b.status,
    deeplink: `/booking/${b.id}`,
  };
}

/**
 * The customer's unified history (C-25): direct orders + wave-downs + bookings, newest first. Was a
 * stub returning [] in real mode; each source is fetched independently so one failing (or empty)
 * never blanks the others.
 */
export function useOrderHistory() {
  return useQuery<DemoHistoryItem[]>({
    queryKey: keys.ordersMine,
    queryFn: async () => {
      if (isMapDemo) return demoOrderHistory();
      const [orders, waves, bookings] = await Promise.all([
        api.get<BackendOrder[]>(endpoints.ordersMine).catch(() => []),
        api.get<RawWaveDown[]>(endpoints.waveDownsMine).catch(() => []),
        api.get<RawBooking[]>(endpoints.bookingsMine).catch(() => []),
      ]);
      return [
        ...orders.map(toHistoryItem),
        ...waves.map(toWaveHistoryItem),
        ...bookings.map(toBookingHistoryItem),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    },
    staleTime: isMapDemo ? Infinity : 15_000,
  });
}

export function useOrder(id: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: keys.order(id ?? 'none'),
    enabled: Boolean(id),
    // There is no GET /orders/:id — read the customer's orders and find this one. The server is
    // authoritative for status/items; keep the richer display fields (businessName/context/
    // breakdown) from the cached create result when present.
    queryFn: async (): Promise<OrderTxn | undefined> => {
      const cached = qc.getQueryData<OrderTxn>(keys.order(id!));
      // Demo: prefer a cached create-result; otherwise synthesize a receipt so history deeplinks
      // (e.g. /order/txn_demo/receipt) resolve on direct navigation with no prior session state.
      if (isMapDemo) return cached ?? demoReceipt(id!);
      const mine = await api.get<BackendOrder[]>(endpoints.ordersMine);
      const found = mine.find((o) => o.id === id);
      if (!found) return cached;
      const base: OrderTxn =
        cached ??
        {
          id: found.id,
          businessId: found.businessId,
          businessName: found.businessName ?? '',
          context: 'ahead',
          status: 'pending_payment',
          // Prefer the server's authoritative breakdown; fall back to a minimal one for older rows.
          breakdown: found.breakdown
            ? mapServerBreakdown(found.breakdown)
            : {
                subtotalCents: found.subtotalCents,
                discountCents: Math.max(0, found.subtotalCents + (found.tipCents ?? 0) - found.totalCents),
                tipCents: found.tipCents ?? 0,
                platformFeeCents: 0,
                totalCents: found.totalCents,
                discountPercent: 0,
              },
          items: backendItems(found),
          createdAt: new Date().toISOString(),
          payoutTiming: 'Payout timing is set by your trust tier',
          transactionId: found.transactionId ?? undefined,
        };
      return {
        ...base,
        // Keep a real business name if the enriched list has one, over an empty seeded value.
        businessName: found.businessName || base.businessName,
        status: mapOrderStatus(found.status),
        items: backendItems(found),
        transactionId: found.transactionId ?? base.transactionId,
        /**
         * From the SERVER, always — never the cached create-result. A refresh on the payment URL of
         * a fully covered order must be able to tell "nothing is owed" from "your session died",
         * and only the server knows.
         */
        payItForwardCents: found.payItForwardCents ?? base.payItForwardCents ?? 0,
        amountDueCents: found.amountDueCents ?? base.amountDueCents,
      };
    },
    initialData: () => qc.getQueryData<OrderTxn>(keys.order(id ?? 'none')),
    staleTime: isMapDemo ? Infinity : 5_000,
    // Poll while the order is live so the tracker follows the vendor's accept → ready → complete
    // in real time (there is no order socket). Stop once it reaches a terminal state.
    refetchInterval: (q) => {
      if (isMapDemo) return false;
      const s = q.state.data?.status;
      return s && s !== 'completed' && s !== 'cancelled' ? 5_000 : false;
    },
  });
  const data = query.data;

  // Demo order-ahead tracker: paid → accepted → preparing → ready.
  useEffect(() => {
    if (!isMapDemo || !id || !data || data.context !== 'ahead') return;
    const next: Partial<Record<OrderStatus, OrderStatus>> = {
      paid: 'accepted',
      accepted: 'preparing',
      preparing: 'ready',
    };
    const upcoming = next[data.status];
    if (!upcoming) return;
    const t = setTimeout(() => {
      qc.setQueryData<OrderTxn>(keys.order(id), (p) => (p ? { ...p, status: upcoming } : p));
    }, 4000);
    return () => clearTimeout(t);
    // Re-schedule only when status/context change — not on every cache patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status, data?.context, id, qc]);

  return query;
}

/**
 * Refund disclosure (R13/U6): what the customer gets back if they cancel now. Server-computed so
 * the number shown matches the number refunded. Demo derives a full pre-fulfillment quote from the
 * cached order so the confirm dialog still discloses offline.
 */
export function useRefundPreview(id: string, enabled: boolean) {
  const qc = useQueryClient();
  return useQuery<RefundQuote>({
    queryKey: keys.refundPreview(id),
    enabled,
    queryFn: () => {
      if (isMapDemo) {
        const o = qc.getQueryData<OrderTxn>(keys.order(id));
        const b = o?.breakdown;
        const refunded = b?.totalCents ?? 0;
        const tip = b?.tipCents ?? 0;
        return Promise.resolve<RefundQuote>({
          scenario: 'full_pre_fulfillment',
          refundedCents: refunded,
          goodsCents: refunded - tip,
          tipCents: tip,
          marketplaceFeeReturnedCents: b?.platformFeeCents ?? 0,
          processingRetainedCents: 0,
          reverseTransfer: true,
          refundApplicationFee: true,
          disclosure:
            refunded > 0
              ? `Full refund of ${formatCents(refunded)}${tip > 0 ? ` (including your ${formatCents(tip)} tip)` : ''}. You're charged nothing.`
              : 'Nothing has been charged yet — cancelling costs you nothing.',
        });
      }
      return api.get<RefundQuote>(endpoints.orderRefundPreview(id));
    },
    staleTime: isMapDemo ? Infinity : 10_000,
  });
}

export function useMarkPaid(id: string) {
  const qc = useQueryClient();
  return () =>
    qc.setQueryData<OrderTxn>(keys.order(id), (p) =>
      p ? { ...p, status: p.context === 'window' ? 'completed' : 'paid' } : p,
    );
}

export function useCancelOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      isMapDemo ? Promise.resolve() : api.post(endpoints.order(id) + '/cancel', { reason }),
    onSuccess: (_r, reason) =>
      qc.setQueryData<OrderTxn>(keys.order(id), (p) => (p ? { ...p, status: 'cancelled', cancelReason: reason } : p)),
  });
}
