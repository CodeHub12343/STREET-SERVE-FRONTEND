'use client';

/**
 * DAN-5 — the driver's offer list, and the delivery they are currently on.
 *
 * ## Declining has to be *visibly* free
 *
 * ADR-004 prohibits acceptance-rate pressure, and this is the screen where that either shows or does
 * not. So: there is **no decline button**. An offer you do not want is one you leave alone, and it
 * expires. A decline control would need a handler, a handler would need an endpoint, and an endpoint
 * is one product meeting away from a counter.
 *
 * There is also no streak, no completion rate, no "you're close to Gold", and no countdown ring
 * pressuring a decision. The offer shows a price and a distance and gets out of the way.
 *
 * ## What a driver sees before accepting
 *
 * The pickup exactly — they need to know how far away it is — and the drop-off only as an area
 * (A-15). Every driver in range receives this, and almost none of them will take the job; sending a
 * stranger's home address to all of them would be a disclosure with no purpose.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Package, MapPin } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Banner } from '@/components/feedback/Banner';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { useAcceptDelivery, useDeliveryEligibleOffers } from '../hooks/useDeliveryOffers';
import { ActiveDelivery } from './ActiveDelivery';

function DriverOfferRow({ offer }: { offer: { deliveryId: string; payoutCents: number } }) {
  const { show } = useToast();
  const accept = useAcceptDelivery(offer.deliveryId);
  return (
    <Button
      size="compact"
      loading={accept.isPending}
      onClick={() =>
        accept.mutate(undefined, {
          onSuccess: () => show('It’s yours — head to the pickup', 'success'),
          onError: (e) =>
            show(
              e instanceof AppApiError ? e.message : 'Could not take this delivery',
              'danger',
            ),
        })
      }
    >
      Take it · {formatCents(offer.payoutCents)}
    </Button>
  );
}

export function DriverOffers() {
  const { offers, isLoading, eligibility, activeId } = useDeliveryEligibleOffers();
  const [dismissed, setDismissed] = useState<string[]>([]);

  if (activeId) return <ActiveDelivery deliveryId={activeId} />;

  if (!eligibility?.eligible) {
    return (
      <EmptyState
        icon="🪪"
        title="You can’t take deliveries yet"
        description="Check your driver account — there’s something outstanding."
      />
    );
  }

  if (isLoading) return <Skeleton $h="160px" $radius={16} />;

  const visible = offers.filter((o) => !dismissed.includes(o.deliveryId));

  if (visible.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="Nothing right now"
        // No "stay online to maximise earnings". The platform does not control how much work exists,
        // and implying otherwise is the shape of a guarantee (CR-5).
        description="You’ll get a notification when a vendor nearby needs a hand."
      />
    );
  }

  return (
    <Wrap>
      <Banner tone="info">
        Take the ones you want. Skipping an offer doesn’t affect anything — we don’t track it.
      </Banner>

      {visible.map((offer) => (
        <Card key={offer.deliveryId}>
          <Head>
            <Icon aria-hidden>
              <Package size={18} />
            </Icon>
            <Payout className="tnum">{formatCents(offer.payoutCents)}</Payout>
          </Head>

          <Leg>
            <MapPin size={14} aria-hidden />
            <span>Collect from the vendor’s pitch</span>
          </Leg>
          <Leg>
            <MapPin size={14} aria-hidden />
            {/* A-15 — an area, not an address. The exact one arrives only if they accept. */}
            <span>Drop off around {offer.dropOffArea.city}</span>
          </Leg>
          <Quiet>You’ll get the full address once you take it.</Quiet>

          <Actions>
            <DriverOfferRow offer={offer} />
            {/*
              NOT a decline. This hides the card on this device and sends nothing — the offer simply
              expires like any other. There is deliberately no server-side notion of declining.
            */}
            <Button
              size="compact"
              variant="tertiary"
              onClick={() => setDismissed((d) => [...d, offer.deliveryId])}
            >
              Not this one
            </Button>
          </Actions>
        </Card>
      ))}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 560px;
`;
const Card = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Icon = styled.span`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 50%;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.accentPrimary} 14%, transparent)`};
  color: ${({ theme }) => theme.color.accentPrimary};
`;
const Payout = styled.p`
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;
const Leg = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Quiet = styled.p`
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
