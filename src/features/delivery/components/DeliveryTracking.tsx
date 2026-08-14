'use client';

/**
 * DAN-6 — the customer's view of their delivery.
 *
 * ## The two things this screen has to get right
 *
 * **The code is the customer's.** It is shown here and nowhere else — the driver never sees it, which
 * is what makes knowing it proof they actually met. So it is large, legible, and explained, because
 * it gets read aloud at a door with someone waiting.
 *
 * **"Nobody accepted" is a real outcome, and the most likely one.** It gets a plain explanation and
 * the fact that matters most — nobody was charged — rather than an error state. A customer who sees
 * a red failure and does not know whether their money is gone will contact support; one who is told
 * the charge never happened will not.
 */
import styled from 'styled-components';
import { Tracker } from '@/components/primitives/Tracker';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Banner } from '@/components/feedback/Banner';
import { formatCents } from '@/lib/money';
import { useDelivery } from '../hooks/useDelivery';
import type { DeliveryStatus } from '../types';

const STEPS = [
  { key: 'finding', label: 'Finding a driver' },
  { key: 'collect', label: 'On the way to collect' },
  { key: 'out', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
];
const INDEX: Partial<Record<DeliveryStatus, number>> = {
  broadcasting: 0,
  accepted: 1,
  picked_up: 2,
  delivered: 3,
};

/** Ended states get an explanation, never a bare status. */
const ENDED: Partial<Record<DeliveryStatus, { tone: 'info' | 'warning'; copy: string }>> = {
  expired: {
    tone: 'warning',
    // The likely outcome. Lead with the money, because that is the actual question.
    copy: 'No driver was free, so this wasn’t delivered. You haven’t been charged for delivery — the business will be in touch about your order.',
  },
  cancelled: {
    tone: 'warning',
    copy: 'This delivery was cancelled. Anything you were charged for it has been refunded.',
  },
  undeliverable: {
    tone: 'warning',
    copy: 'The driver couldn’t complete the delivery. The business is sorting it out with you.',
  },
};

export function DeliveryTracking({ deliveryId }: { deliveryId: string }) {
  const { data: delivery, isLoading } = useDelivery(deliveryId, { poll: true });

  if (isLoading) return <Skeleton $h="200px" $radius={16} />;
  if (!delivery) return null;

  const ended = ENDED[delivery.status];
  const step = INDEX[delivery.status];

  return (
    <Wrap>
      {ended ? <Banner tone={ended.tone}>{ended.copy}</Banner> : null}

      {step !== undefined ? (
        <>
          <Tracker steps={STEPS} activeIndex={step} />
          {delivery.status === 'broadcasting' ? (
            <Quiet>
              We&rsquo;re asking drivers nearby. If nobody&rsquo;s free you won&rsquo;t be charged
              for delivery.
            </Quiet>
          ) : null}
        </>
      ) : null}

      {delivery.proofCode && delivery.status !== 'delivered' && !ended ? (
        <CodeCard>
          <CodeLabel>Give the driver this code</CodeLabel>
          {/* Read aloud at a door. Spaced and large enough to be read off a phone at arm's length. */}
          <Code className="tnum" aria-label={delivery.proofCode.split('').join(' ')}>
            {delivery.proofCode}
          </Code>
          <Quiet>They can&rsquo;t see it — it&rsquo;s how we know the order reached you.</Quiet>
        </CodeCard>
      ) : null}

      {delivery.customerTotalCents > 0 ? (
        <Line>
          <span>Delivery</span>
          <span className="tnum">{formatCents(delivery.customerTotalCents)}</span>
        </Line>
      ) : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Quiet = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const CodeCard = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  text-align: center;
`;
const CodeLabel = styled.p`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Code = styled.p`
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0.18em;
`;
const Line = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
