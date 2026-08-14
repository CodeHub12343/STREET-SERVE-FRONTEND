'use client';

/**
 * Order history and live status (7.2).
 *
 * ## Two different kinds of state, shown as two different things
 *
 * An order has a STATUS with us (draft, paid, submitted…) and, once it reaches the printer, a
 * physical STAGE (preparing, printing, mailed). They are deliberately separate on the server and
 * stay separate here: the order's life with us ends at `submitted`, while the paper keeps moving.
 * Merging them would leave "refunded" and "mailed" competing to describe the same row.
 *
 * ## Problems are shown, not hidden
 *
 * A paid order that never reached the printer is somebody's money with nothing to show for it. It
 * gets the loudest treatment on the card rather than being tucked behind a support email, because
 * the buyer finding out before we tell them is the worst version of that conversation.
 *
 * The timeline stops at "mailed" and says so — the postal service does not report the last step
 * back to us, and inventing a "delivered" state would be a promise the platform cannot keep.
 */
import styled from 'styled-components';
import { Banner } from '@/components/feedback/Banner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Spinner } from '@/components/feedback/Spinner';
import { Badge } from '@/components/primitives/Badge';
import { Tracker } from '@/components/primitives/Tracker';
import { formatCents } from '@/lib/money';
import { usePostcardOrders } from '../hooks/usePostcards';
import type { FulfilmentStage, PostcardOrder, PostcardOrderStatus } from '../types';

const STAGES: { key: FulfilmentStage; label: string }[] = [
  { key: 'preparing', label: 'Preparing' },
  { key: 'printing', label: 'Printing' },
  { key: 'mailed', label: 'Mailed' },
];

/**
 * Buyer-facing wording for the order's status with us.
 *
 * `submission_failed` reads "Needs attention" rather than "Failed": the buyer did nothing wrong and
 * the money is recoverable, so the word should prompt them to look rather than to panic.
 */
const STATUS_COPY: Record<
  PostcardOrderStatus,
  { label: string; tone: 'live' | 'warning' | 'danger' | 'away' }
> = {
  draft: { label: 'Draft', tone: 'away' },
  quoted: { label: 'Ready to pay', tone: 'warning' },
  paid: { label: 'Paid', tone: 'live' },
  payment_failed: { label: 'Payment failed', tone: 'danger' },
  submitted: { label: 'With the printer', tone: 'live' },
  submission_failed: { label: 'Needs attention', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'away' },
  cancelled: { label: 'Cancelled', tone: 'away' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function PostcardOrderList({
  businessId,
  onOpenOrder,
}: {
  businessId: string;
  onOpenOrder?: (orderId: string) => void;
}) {
  const orders = usePostcardOrders(businessId);

  if (orders.isLoading) {
    return (
      <Centered>
        <Spinner />
      </Centered>
    );
  }

  if (!orders.data?.length) {
    return (
      <EmptyState
        title="No postcard campaigns yet"
        description="Send a mailing to the streets you work, and see who comes back."
      />
    );
  }

  return (
    <List>
      {orders.data.map((order) => (
        <PostcardOrderCard key={order.id} order={order} onOpen={onOpenOrder} />
      ))}
    </List>
  );
}

export function PostcardOrderCard({
  order,
  onOpen,
}: {
  order: PostcardOrder;
  onOpen?: (orderId: string) => void;
}) {
  const status = STATUS_COPY[order.status];
  const stageIndex = order.fulfilment?.stage
    ? STAGES.findIndex((s) => s.key === order.fulfilment!.stage)
    : -1;

  return (
    <Card>
      <CardHead>
        <div>
          <CardTitle>
            {order.quantity ? `${order.quantity.toLocaleString()} postcards` : 'Postcard order'}
          </CardTitle>
          <CardMeta>
            Mailing {formatDate(order.mailDate)}
            {order.payment?.chargedCents
              ? ` · ${formatCents(order.payment.chargedCents)}`
              : order.price
                ? ` · ${formatCents(order.price.totalCents)}`
                : ''}
          </CardMeta>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </CardHead>

      {order.submissionProblem ? (
        <Banner tone="danger" title="This order did not reach the printer">
          {order.submissionProblem.message ??
            'Something went wrong after payment. Our team has been alerted and will be in touch.'}
        </Banner>
      ) : null}

      {order.fulfilment ? (
        <Progress>
          <Tracker
            steps={STAGES.map((s) => ({
              key: s.key,
              label: s.label,
              description:
                s.key === order.fulfilment?.stage ? order.fulfilment.description : undefined,
            }))}
            // -1 → nothing reported yet; the printer has it but has not started.
            activeIndex={stageIndex < 0 ? 0 : stageIndex}
          />
          {order.fulfilment.stage === 'mailed' ? (
            <Muted>
              The postal service does not report the final delivery back to us, so this is the last
              update you will see.
            </Muted>
          ) : null}
        </Progress>
      ) : null}

      {onOpen ? (
        <CardFoot>
          <LinkButton type="button" onClick={() => onOpen(order.id)}>
            {order.status === 'draft' || order.status === 'quoted'
              ? 'Finish this order'
              : 'View details'}
          </LinkButton>
        </CardFoot>
      ) : null}
    </Card>
  );
}

const Centered = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.space[6]}px;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const Card = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;

const CardHead = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.scale[2]}px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const CardMeta = styled.p`
  margin: 2px 0 0;
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: ${({ theme }) => theme.typography.scale[1]}px;
`;

const Progress = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const Muted = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textTertiary};
  font-size: ${({ theme }) => theme.typography.scale[0]}px;
  line-height: ${({ theme }) => theme.typography.lineBody};
`;

const CardFoot = styled.footer`
  display: flex;
`;

const LinkButton = styled.button`
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.accentPrimary};
  font-family: inherit;
  font-size: ${({ theme }) => theme.typography.scale[1]}px;
  font-weight: 600;
  cursor: pointer;
`;
