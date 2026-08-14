'use client';

/**
 * The driver's screen while a delivery is live: where to go, what to do next, and how to get help.
 *
 * ## Three things this screen is careful about
 *
 * **The address appears only now.** Before accepting, the driver saw an area (A-15). Here they get
 * the line, the access notes, and a phone number — and only until the delivery ends, after which the
 * server stops returning it.
 *
 * **Position reporting is silent.** The browser's geolocation watcher pushes to the server, which
 * applies its own interval ceiling and drops anything too frequent. A rejected ping is never
 * surfaced: a red toast on somebody's phone while they are cycling is worse than a missing pin.
 *
 * **"Can't deliver" is a first-class button, not an admission.** A driver who cannot complete has
 * done the work they were asked to do and is still paid. Making that outcome hard to reach is how a
 * platform ends up with drivers abandoning jobs silently instead of reporting them.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Navigation, Phone, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Banner } from '@/components/feedback/Banner';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import {
  useCancelDelivery,
  useCompleteDelivery,
  useDelivery,
  useMarkPickedUp,
  useMarkUndeliverable,
  useReportIncident,
  useReportPosition,
} from '../hooks/useDelivery';
import { hasExactAddress } from '../types';

/**
 * Push the driver's position while the delivery is live.
 *
 * Best-effort by design: a browser that refuses geolocation, or a tab in the background, simply
 * stops sending. The customer's tracker then shows the last known point rather than breaking, which
 * is the honest degradation — the alternative is nagging somebody mid-ride for a permission they
 * already declined.
 */
function usePositionReporting(deliveryId: string, active: boolean) {
  const report = useReportPosition(deliveryId);
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => report.mutate({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      () => undefined, // declined or unavailable — degrade quietly
      { enableHighAccuracy: true, maximumAge: 5_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryId, active]);
}

export function ActiveDelivery({ deliveryId }: { deliveryId: string }) {
  const { show } = useToast();
  const { data: delivery, isLoading } = useDelivery(deliveryId, { poll: true });
  const pickUp = useMarkPickedUp(deliveryId);
  const complete = useCompleteDelivery(deliveryId);
  const undeliverable = useMarkUndeliverable(deliveryId);
  const cancel = useCancelDelivery(deliveryId);
  const incident = useReportIncident(deliveryId);

  const [code, setCode] = useState('');
  const [showTrouble, setShowTrouble] = useState(false);

  const live = delivery?.status === 'accepted' || delivery?.status === 'picked_up';
  usePositionReporting(deliveryId, Boolean(live));

  if (isLoading) return <Skeleton $h="240px" $radius={16} />;
  if (!delivery) return null;

  const fail = (e: unknown) =>
    show(e instanceof AppApiError ? e.message : 'Something went wrong', 'danger');
  const dest = delivery.destination;
  const exact = hasExactAddress(dest);

  return (
    <Wrap>
      <Header>
        <Step>{delivery.status === 'accepted' ? 'Collect the order' : 'On the way'}</Step>
        <Payout className="tnum">{formatCents(delivery.payoutCents)}</Payout>
      </Header>

      <Card>
        <CardTitle>Drop off</CardTitle>
        {exact ? (
          <>
            <Address>
              {dest.line1}
              {dest.line2 ? `, ${dest.line2}` : ''}
              <br />
              {dest.city}
              {dest.postalCode ? ` ${dest.postalCode}` : ''}
            </Address>
            {dest.notes ? <Notes>&ldquo;{dest.notes}&rdquo;</Notes> : null}
            <Links>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation size={14} aria-hidden /> Directions
              </a>
              {dest.contactPhone ? (
                <a href={`tel:${dest.contactPhone}`}>
                  <Phone size={14} aria-hidden /> Call customer
                </a>
              ) : null}
            </Links>
          </>
        ) : (
          <Quiet>Around {dest.city}</Quiet>
        )}
      </Card>

      {delivery.status === 'accepted' ? (
        <Button
          fullWidth
          loading={pickUp.isPending}
          onClick={() =>
            pickUp.mutate(undefined, {
              onSuccess: () => show('Got it — head to the drop-off', 'success'),
              onError: fail,
            })
          }
        >
          I&rsquo;ve collected the order
        </Button>
      ) : null}

      {delivery.status === 'picked_up' ? (
        <Card>
          <CardTitle>Hand it over</CardTitle>
          {/*
            DAN-12. The customer reads the code out — the driver never sees it, so knowing it is
            proof they actually met. Stated plainly so a driver doesn't hunt for it in the app.
          */}
          <Quiet>Ask the customer for their six-digit code. It&rsquo;s on their order screen.</Quiet>
          <Input
            label="Code from the customer"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <Button
            disabled={code.length !== 6}
            loading={complete.isPending}
            onClick={() =>
              complete.mutate(code, {
                onSuccess: () => show('Delivered — you’ll be paid shortly', 'success'),
                onError: fail,
              })
            }
          >
            Complete delivery
          </Button>
        </Card>
      ) : null}

      <TroubleToggle onClick={() => setShowTrouble((v) => !v)} aria-expanded={showTrouble}>
        Something&rsquo;s wrong
      </TroubleToggle>

      {showTrouble ? (
        <Card>
          <Banner tone="info">
            You&rsquo;ll still be paid for a delivery you couldn&rsquo;t complete. Tell us what
            happened.
          </Banner>
          <Button
            variant="secondary"
            loading={undeliverable.isPending}
            onClick={() =>
              undeliverable.mutate('Could not hand over', {
                onSuccess: () => show('Recorded — you’ll still be paid', 'success'),
                onError: fail,
              })
            }
          >
            I can&rsquo;t deliver this
          </Button>
          <Button
            variant="tertiary"
            loading={cancel.isPending}
            onClick={() =>
              cancel.mutate('driver_cancelled', {
                onSuccess: () => show('Delivery released', 'success'),
                onError: fail,
              })
            }
          >
            I need to drop this delivery
          </Button>
          <Danger
            onClick={() =>
              incident.mutate(
                { kind: 'safety' },
                { onSuccess: () => show('Reported — we’ll be in touch', 'success'), onError: fail },
              )
            }
          >
            <ShieldAlert size={16} aria-hidden /> Report a safety problem
          </Danger>
        </Card>
      ) : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 560px;
`;
const Header = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;
const Step = styled.h2`
  font-size: 18px;
  font-weight: 800;
`;
const Payout = styled.span`
  font-size: 18px;
  font-weight: 800;
`;
const Card = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const CardTitle = styled.h3`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Address = styled.p`
  font-size: 15px;
  line-height: 1.5;
  font-weight: 600;
`;
const Notes = styled.p`
  font-size: 13px;
  font-style: italic;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Quiet = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Links = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[4]}px;
  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.accentPrimary};
  }
`;
const TroubleToggle = styled.button`
  background: none;
  border: none;
  padding: ${({ theme }) => theme.space[2]}px;
  font-size: 13px;
  text-align: left;
  text-decoration: underline;
  color: ${({ theme }) => theme.color.textSecondary};
  cursor: pointer;
`;
const Danger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.statusDanger};
  background: none;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.statusDanger};
  cursor: pointer;
`;
