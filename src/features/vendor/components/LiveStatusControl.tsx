'use client';

/**
 * V-02 Live Status Control — the vendor home (docs/13 V-02). Go live / go offline, the
 * Driving/Parked/Away-Closed toggle, and the queue + wave-down + order counts at a glance, each a
 * shortcut into its screen. When offline, a single prominent "Go live" CTA; once live, the status
 * toggle plus live counts.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Navigation, ParkingSquare, Moon, Radio, Users, Hand, Receipt } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import {
  useLiveLocationTracking,
  useLiveSession,
  useSessionHeartbeat,
  useSetStatus,
  useStartSession,
  useStopSession,
} from '../hooks/useLiveSession';
import { useVendorBusinessDetail } from '../hooks/useVendorBusinessDetail';
import { useVendorDashboard } from '../hooks/useVendorData';
import { useAgreement, useAcceptAgreement } from '../hooks/useAgreement';
import type { LiveStatus } from '../types';

const STATUSES: { value: LiveStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'driving', label: 'Driving', icon: <Navigation size={18} /> },
  { value: 'parked', label: 'Parked', icon: <ParkingSquare size={18} /> },
  { value: 'away_closed', label: 'Away', icon: <Moon size={18} /> },
];

export function LiveStatusControl({ businessId }: { businessId: string }) {
  const router = useRouter();
  const { data: session } = useLiveSession(businessId);
  const { data: dash, isLoading } = useVendorDashboard(businessId);
  const { data: business } = useVendorBusinessDetail(businessId);
  const start = useStartSession(businessId);
  const setStatus = useSetStatus(businessId);
  const stop = useStopSession(businessId);
  /** Why the last "Go live" failed. Shown inline — a console error is not a user-facing answer. */
  const [startError, setStartError] = useState<string | null>(null);
  // R28: go-live requires the Terms of Sale once. On AGREEMENT_REQUIRED we surface the clickwrap.
  const [needsAgreement, setNeedsAgreement] = useState(false);
  const agreement = useAgreement('regular_sale', needsAgreement);
  const acceptAgreement = useAcceptAgreement('regular_sale');

  const live = Boolean(session);
  /**
   * Keep the pin where the vendor actually is. Until this existed, `current_location` was frozen at
   * the single fix taken when they tapped "Go live" — so a moving vendor (status: `driving`) sat
   * still on everyone's map, and customers beside them saw "0 nearby".
   */
  const lastLocationPushAt = useLiveLocationTracking(
    live ? session?.id : undefined,
    session?.status,
  );
  // Keep the session alive while this dashboard is open; a closed tab stops pinging and is reaped.
  // Stands down while tracking is pushing, since a location update refreshes the same clock.
  useSessionHeartbeat(live ? session?.id : undefined, lastLocationPushAt);
  // The backend blocks live ops for a regulated category with no approved licence (422
  // LICENSE_REQUIRED). Know that before the click rather than failing into it.
  const licenceBlocked = business ? !business.canGoLive : false;

  const goLive = () => {
    setStartError(null);
    start.mutate(undefined, {
      onError: (e) => {
        if (e instanceof AppApiError) {
          // Terms of Sale not yet accepted → open the clickwrap instead of a dead-end error.
          if (e.code === 'AGREEMENT_REQUIRED') {
            setNeedsAgreement(true);
            return;
          }
          setStartError(
            e.code === 'LICENSE_REQUIRED'
              ? 'This category needs an approved license before you can go live.'
              : e.message,
          );
          return;
        }
        // Non-API failures reach here as Error — chiefly the geolocation refusal from
        // useStartSession, whose message already explains what to do.
        setStartError(e instanceof Error ? e.message : 'Could not go live. Please try again.');
      },
    });
  };

  // Accept the Terms of Sale (attesting the exact version + hash shown), then continue going live.
  const acceptAndGoLive = () => {
    const a = agreement.data;
    acceptAgreement.mutate(a ? { version: a.version, contentHash: a.contentHash } : undefined, {
      onSuccess: () => {
        setNeedsAgreement(false);
        goLive();
      },
    });
  };

  return (
    <Wrap>
      <TopCard $live={live}>
        <div>
          <Kicker>{live ? 'You’re live' : 'You’re offline'}</Kicker>
          <h1>{dash?.businessName ?? business?.name ?? 'Your business'}</h1>
        </div>
        {live ? (
          <Button variant="secondary" size="compact" loading={stop.isPending} onClick={() => session && stop.mutate(session.id)}>
            Go offline
          </Button>
        ) : (
          <Button loading={start.isPending} disabled={licenceBlocked} onClick={goLive}>
            <Radio size={16} /> Go live
          </Button>
        )}
      </TopCard>

      {!live && licenceBlocked ? (
        <Banner
          tone="warning"
          title="License required before you can go live"
          action={
            <Button size="compact" variant="secondary" onClick={() => router.push('/vendor/license')}>
              Upload license
            </Button>
          }
        >
          Your category is regulated, so we need an approved license on file first. Everything else
          on your dashboard works meanwhile.
        </Banner>
      ) : null}

      {!live && needsAgreement ? (
        <Agreement>
          <AgreementTitle>{agreement.data?.title ?? 'Seller Terms of Sale'}</AgreementTitle>
          <AgreementBody>
            {agreement.isLoading ? 'Loading the current terms…' : agreement.data?.body}
          </AgreementBody>
          <AgreementActions>
            <Button size="compact" variant="secondary" onClick={() => setNeedsAgreement(false)}>
              Not now
            </Button>
            <Button
              size="compact"
              loading={acceptAgreement.isPending || agreement.isLoading}
              onClick={acceptAndGoLive}
            >
              Accept &amp; go live
            </Button>
          </AgreementActions>
        </Agreement>
      ) : null}

      {!live && startError && !licenceBlocked ? (
        <Banner
          tone="danger"
          title="Couldn’t go live"
          action={
            <Button size="compact" variant="secondary" onClick={goLive}>
              Try again
            </Button>
          }
        >
          {startError}
        </Banner>
      ) : null}

      {live && session ? (
        <StatusToggle role="radiogroup" aria-label="Live status">
          {STATUSES.map((s) => (
            <StatusButton
              key={s.value}
              role="radio"
              aria-checked={session.status === s.value}
              $active={session.status === s.value}
              $status={s.value}
              onClick={() => setStatus.mutate({ sessionId: session.id, status: s.value })}
            >
              {s.icon}
              {s.label}
            </StatusButton>
          ))}
        </StatusToggle>
      ) : (
        <Hint>Go live to appear on the map and start taking wave-downs and orders.</Hint>
      )}

      <Grid>
        {isLoading ? (
          <>
            <Skeleton $h="96px" $radius={16} />
            <Skeleton $h="96px" $radius={16} />
            <Skeleton $h="96px" $radius={16} />
          </>
        ) : (
          <>
            <Stat onClick={() => router.push('/vendor/wave-downs')}>
              <Hand size={18} aria-hidden />
              <b className="tnum">{dash?.waveCount ?? 0}</b>
              <span>Wave-downs</span>
            </Stat>
            <Stat onClick={() => router.push('/vendor/queue')}>
              <Users size={18} aria-hidden />
              <b className="tnum">{dash?.queueCount ?? 0}</b>
              <span>In line</span>
            </Stat>
            <Stat onClick={() => router.push('/vendor/orders')}>
              <Receipt size={18} aria-hidden />
              <b className="tnum">{dash?.orderCount ?? 0}</b>
              <span>Open orders</span>
            </Stat>
          </>
        )}
      </Grid>

      <Sales>
        Today’s sales <b className="tnum">{formatCents(dash?.todaySalesCents ?? 0)}</b>
      </Sales>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 720px;
`;
const TopCard = styled.div<{ $live: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme, $live }) => ($live ? theme.color.statusLive : theme.color.line2)};
  h1 {
    font-size: 24px;
  }
`;
const Kicker = styled.p`
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Agreement = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const AgreementTitle = styled.h2`
  font-size: 15px;
`;
const AgreementBody = styled.p`
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-line;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const AgreementActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const StatusToggle = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
`;
const StatusButton = styled.button<{ $active: boolean; $status: LiveStatus }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  color: ${({ theme, $active, $status }) =>
    !$active
      ? theme.color.textSecondary
      : $status === 'driving'
        ? theme.color.statusDriving
        : $status === 'parked'
          ? theme.color.statusParked
          : theme.color.statusAway};
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1.5px solid
    ${({ theme, $active, $status }) =>
      !$active
        ? theme.color.line2
        : $status === 'driving'
          ? theme.color.statusDriving
          : $status === 'parked'
            ? theme.color.statusParked
            : theme.color.statusAway};
`;
const Hint = styled.p`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Stat = styled.button`
  display: grid;
  justify-items: start;
  gap: 4px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  cursor: pointer;
  text-align: left;
  color: ${({ theme }) => theme.color.accentSecondary};
  b {
    font-size: 28px;
    color: ${({ theme }) => theme.color.textPrimary};
  }
  span {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const Sales = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    color: ${({ theme }) => theme.color.textPrimary};
    font-size: 18px;
    margin-left: 6px;
  }
`;
