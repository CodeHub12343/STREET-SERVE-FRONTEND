'use client';

/**
 * C-27 Booking detail (docs/13 C-27) — the appointment with reschedule/cancel (cutoff-checked) and
 * the reminders that will fire (24h + 1h).
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { CalendarClock, Bell, MessageCircle } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { StatusChip } from '@/components/primitives/StatusChip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Banner } from '@/components/feedback/Banner';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { useStartThread } from '@/features/messaging';
import { useBooking, useCancelBooking } from '../hooks/useScheduling';

export function BookingDetail({ id }: { id: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: booking, isLoading, isError } = useBooking(id);
  const cancel = useCancelBooking(id);
  const startThread = useStartThread();

  // The back link belongs on these states MOST of all: a booking that fails to load otherwise
  // leaves the user on an error screen with no way out of it.
  if (isLoading)
    return (
      <TabPage title="Booking" backHref="/orders" backLabel="Back to orders">
        <Skeleton $h="220px" $radius={16} />
      </TabPage>
    );
  if (isError || !booking)
    return (
      <TabPage title="Booking" backHref="/orders" backLabel="Back to orders">
        <ErrorState title="Booking not found" />
      </TabPage>
    );

  const cancelled = booking.status === 'cancelled';

  /**
   * The booking IS the relationship that unlocks messaging, so this is where the customer reaches
   * the business to settle the details. Offered on any non-cancelled booking — including completed
   * ones, so a follow-up question after the job doesn't dead-end.
   */
  const message = () =>
    startThread.mutate(
      { businessId: booking.businessId },
      {
        onSuccess: ({ id: threadId }) => router.push(`/messages/${threadId}`),
        onError: () => show('Couldn’t open the conversation.', 'danger'),
      },
    );

  /**
   * Cancelling had NO error handling: a rejected request (already cancelled, past the cutoff, or
   * offline) resolved to nothing at all on screen, so the button read as simply broken. Every
   * outcome now says something.
   */
  const cancelBooking = () =>
    cancel.mutate(undefined, {
      onSuccess: () => show('Booking cancelled', 'default'),
      onError: (e) => {
        if (e instanceof AppApiError) {
          show(
            e.code === 'INVALID_STATE_TRANSITION'
              ? 'This booking is no longer active — it may already be cancelled.'
              : e.message,
            'danger',
          );
          return;
        }
        show('Couldn’t cancel — check your connection and try again.', 'danger');
      },
    });

  return (
    <TabPage title="Booking" backHref="/orders" backLabel="Back to orders">
      {cancelled ? <Banner tone="danger" title="Cancelled">This booking was cancelled — no charge.</Banner> : null}
      <Card>
        <Head>
          <CalendarClock size={24} aria-hidden />
          <div>
            <Biz>{booking.businessName}</Biz>
            <Service>{booking.service}</Service>
          </div>
          <StatusChip status={booking.status === 'confirmed' ? 'parked' : booking.status === 'proposed' ? 'popup' : 'away'} label={booking.status} size="sm" />
        </Head>
        <When>{formatDateTime(booking.startAt)}</When>
        <Price className="tnum">{formatCents(booking.priceCents)}</Price>
        <Reminders>
          <Bell size={14} aria-hidden /> Reminders 24h and 1h before
        </Reminders>
      </Card>

      {!cancelled ? (
        <Actions>
          <Button fullWidth loading={startThread.isPending} onClick={message}>
            <MessageCircle size={16} /> Message {booking.businessName}
          </Button>
          <Button variant="secondary" onClick={() => router.push(`/business/${booking.businessId}/book`)}>Reschedule</Button>
          <Button variant="tertiary" loading={cancel.isPending} onClick={cancelBooking}>
            Cancel booking
          </Button>
        </Actions>
      ) : (
        <Button fullWidth variant="secondary" onClick={() => router.replace('/orders')}>Back to orders</Button>
      )}
    </TabPage>
  );
}

const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin: ${({ theme }) => theme.space[4]}px 0;
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  color: ${({ theme }) => theme.color.accentSecondary};
`;
const Biz = styled.p`
  font-weight: 700;
  font-size: 17px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Service = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const When = styled.p`
  font-size: 16px;
  font-weight: 700;
`;
const Price = styled.p`
  font-size: 20px;
  font-weight: 800;
`;
const Reminders = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Actions = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
