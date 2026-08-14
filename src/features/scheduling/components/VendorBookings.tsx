'use client';

/**
 * V-07 Bookings (docs/13 V-07) — the vendor's worklist for the business's appointments. Reads the
 * owner-gated /businesses/:id/bookings (it previously read the caller's own CUSTOMER bookings via
 * /bookings/mine — for a vendor that list is nearly always empty, hence the "No bookings" screen
 * right after a booking notification).
 *
 * Bookings auto-confirm server-side, so there is no accept/decline step. The real lifecycle
 * actions: Complete, No-show (only after the scheduled time), Cancel — plus Message, which opens
 * the thread with the customer.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Check, MessageCircle, UserX, X } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { StatusChip } from '@/components/primitives/StatusChip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatDateTime } from '@/lib/format';
import { formatCents } from '@/lib/money';
import { useStartThread } from '@/features/messaging';
import { useBusinessBookings, useVendorBookingAction, type BusinessBooking } from '../hooks/useScheduling';

export function VendorBookings({ businessId }: { businessId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: bookings, isLoading } = useBusinessBookings(businessId);
  const act = useVendorBookingAction(businessId);
  const startThread = useStartThread();

  const active = (bookings ?? []).filter((b) => b.status === 'confirmed');
  const done = (bookings ?? []).filter((b) => b.status !== 'confirmed');

  const run = (id: string, action: 'complete' | 'no_show' | 'cancel', doneMsg: string) =>
    act.mutate(
      { id, action },
      {
        onSuccess: () => show(doneMsg, action === 'complete' ? 'success' : 'default'),
        onError: () => show('That didn’t go through — try again.', 'danger'),
      },
    );

  const message = (b: BusinessBooking) =>
    startThread.mutate(
      { businessId, customerId: b.customerId },
      {
        onSuccess: ({ id }) => router.push(`/messages/${id}`),
        onError: () => show('Couldn’t open the conversation.', 'danger'),
      },
    );

  if (isLoading) return <Wrap><Skeleton $h="120px" $radius={16} /></Wrap>;
  if ((bookings ?? []).length === 0) {
    return <EmptyState icon="📅" title="No bookings" description="Confirmed appointments appear here." />;
  }

  return (
    <Wrap>
      {active.map((b) => {
        const started = new Date(b.startAt).getTime() <= Date.now();
        return (
          <Card key={b.id}>
            <Head>
              <div>
                <Name>{b.service}</Name>
                <When>
                  {b.customerName} · {formatDateTime(b.startAt)} · {formatCents(b.priceCents)}
                </When>
              </div>
              <StatusChip status="parked" label="confirmed" size="sm" />
            </Head>
            <Actions>
              <Button size="compact" onClick={() => run(b.id, 'complete', 'Marked completed')}>
                <Check size={15} /> Complete
              </Button>
              {started ? (
                <Button size="compact" variant="secondary" onClick={() => run(b.id, 'no_show', 'Marked as no-show')}>
                  <UserX size={15} /> No-show
                </Button>
              ) : null}
              <Button size="compact" variant="secondary" disabled={startThread.isPending} onClick={() => message(b)}>
                <MessageCircle size={15} /> Message
              </Button>
              <Button size="compact" variant="tertiary" onClick={() => run(b.id, 'cancel', 'Booking cancelled')}>
                <X size={15} /> Cancel
              </Button>
            </Actions>
          </Card>
        );
      })}

      {done.length > 0 ? (
        <>
          <SectionTitle>Past</SectionTitle>
          {done.map((b) => (
            <Card key={b.id} $muted>
              <Head>
                <div>
                  <Name>{b.service}</Name>
                  <When>
                    {b.customerName} · {formatDateTime(b.startAt)} · {formatCents(b.priceCents)}
                  </When>
                </div>
                <StatusChip status={b.status === 'completed' ? 'parked' : 'away'} label={b.status.replace('_', '-')} size="sm" />
              </Head>
              {/* A finished job still needs a channel — follow-ups, receipts, re-bookings. */}
              {b.status !== 'cancelled' ? (
                <Actions>
                  <Button size="compact" variant="secondary" disabled={startThread.isPending} onClick={() => message(b)}>
                    <MessageCircle size={15} /> Message
                  </Button>
                </Actions>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 560px;
`;
const Card = styled.div<{ $muted?: boolean }>`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  opacity: ${({ $muted }) => ($muted ? 0.7 : 1)};
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Name = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const When = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  flex-wrap: wrap;
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
