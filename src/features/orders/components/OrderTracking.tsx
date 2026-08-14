'use client';

/**
 * C-23 Order Tracking (docs/13 C-23) — order-ahead only. A vertical tracker mapped to order status
 * with a plain-language ETA readout so the user knows what to do next without parsing the stepper.
 * Cancellation replaces the tracker with a specific reason + no-charge statement, never a frozen
 * stepper. Cancel stays a normal (secondary) action while not yet accepted.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import dynamic from 'next/dynamic';
import { Tracker } from '@/components/primitives/Tracker';
/**
 * DAN-6. Lazy, and gated on the order actually having a delivery: an order-ahead pickup is the
 * common case and should not pay for the delivery tracker's bundle.
 */
const DeliveryTracking = dynamic(
  () => import('@/features/delivery').then((m) => m.DeliveryTracking),
  { ssr: false },
);
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatCents } from '@/lib/money';
import { useState } from 'react';
import { useCancelOrder, useOrder, useRefundPreview } from '../hooks/useOrders';
import type { OrderStatus } from '../types';

const STEPS = [
  { key: 'paid', label: 'Order placed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready for pickup' },
  { key: 'completed', label: 'Picked up' },
];
const INDEX: Record<OrderStatus, number> = {
  pending_payment: 0,
  paid: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  completed: 4,
  cancelled: 0,
};
const ETA: Partial<Record<OrderStatus, string>> = {
  paid: 'Sit tight — sending your order',
  accepted: 'Accepted — they’re starting soon',
  preparing: 'Preparing your order',
  ready: 'Ready — head to the window',
  completed: 'All done — enjoy!',
};

export function OrderTracking({ id }: { id: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: txn, isLoading, isError } = useOrder(id);
  const cancel = useCancelOrder(id);
  // Two-step cancel (U6): the first tap reveals exactly what's refunded (R13) before it's committed.
  const [confirming, setConfirming] = useState(false);
  const { data: refund } = useRefundPreview(id, confirming);

  if (isLoading) {
    return <Screen><Skeleton $h="240px" $radius={16} /></Screen>;
  }
  if (isError || !txn) {
    return <Screen><ErrorState title="Order not found" /></Screen>;
  }

  if (txn.status === 'cancelled') {
    return (
      <Screen>
        <Banner tone="danger" title="Order cancelled">
          {txn.cancelReason ?? 'This order was cancelled.'} Nothing was charged for the cancelled items.
        </Banner>
        <Button fullWidth variant="secondary" onClick={() => router.replace('/orders')}>
          Back to orders
        </Button>
      </Screen>
    );
  }

  const isCompleted = txn.status === 'completed';
  const isReady = txn.status === 'ready';

  return (
    <Screen>
      <Eta>{ETA[txn.status] ?? 'In progress'}</Eta>
      {txn.deliveryId ? <DeliveryTracking deliveryId={txn.deliveryId} /> : null}
      <Card>
        <Tracker steps={STEPS} activeIndex={INDEX[txn.status]} />
      </Card>
      {isCompleted ? (
        <>
          {/* Review is only meaningful — and only accepted server-side — once the order is done. */}
          {txn.transactionId ? (
            <Button
              fullWidth
              onClick={() =>
                router.push(
                  `/business/${txn.businessId}/reviews?transactionId=${encodeURIComponent(txn.transactionId!)}`,
                )
              }
            >
              Leave a review
            </Button>
          ) : null}
          <Button variant="secondary" fullWidth onClick={() => router.push(`/order/${id}/receipt`)}>
            View receipt
          </Button>
        </>
      ) : isReady ? (
        <Button fullWidth onClick={() => router.push(`/order/${id}/receipt`)}>
          View receipt
        </Button>
      ) : confirming ? (
        <>
          {/* Disclosure (U6): the exact refund, computed server-side, before the customer commits. */}
          <Banner tone="warning" title="Cancel this order?">
            {refund ? refund.disclosure : 'Checking what you’ll get back…'}
          </Banner>
          <Button
            variant="destructive"
            fullWidth
            loading={cancel.isPending}
            onClick={() =>
              cancel.mutate('Cancelled by customer', {
                onSuccess: () => show('Order cancelled — your refund is on the way', 'default'),
              })
            }
          >
            {refund && refund.refundedCents > 0
              ? `Confirm cancellation · refund ${formatCents(refund.refundedCents)}`
              : 'Confirm cancellation'}
          </Button>
          <Button variant="tertiary" fullWidth disabled={cancel.isPending} onClick={() => setConfirming(false)}>
            Keep my order
          </Button>
        </>
      ) : (
        <Button variant="secondary" fullWidth onClick={() => setConfirming(true)}>
          Cancel order
        </Button>
      )}
    </Screen>
  );
}

const Screen = styled.div`
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px;
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  align-content: start;
`;
const Eta = styled.h1`
  font-size: 24px;
`;
const Card = styled.div`
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
