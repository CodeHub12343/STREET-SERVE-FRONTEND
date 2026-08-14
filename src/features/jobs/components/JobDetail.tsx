'use client';

/**
 * S-14 Jobs detail + check-in/out (docs/13 § S-14). This is where the gig lifecycle lives: claim →
 * geofenced check-in → check-out → same-day payout.
 *
 * Two rules from the spec drive the design here:
 *  - Check-in is geofence-confirmed, never a manual "I'm here" toggle. The device position is
 *    resolved and pre-checked against the posting's radius before the POST, and the server checks
 *    it again — the client guard is a courtesy, not the boundary.
 *  - A gig cancelled after acceptance is stated plainly, rather than leaving the check-in screen
 *    silently stale (Flow 9's failure state).
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useState } from 'react';
import { ArrowLeft, MapPin, Clock, Wallet, CheckCircle2, Navigation, QrCode } from 'lucide-react';
import { QRScanner } from '@/components/media/QRScanner';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { usePayoutStatus } from '@/features/consignment/hooks/useConsignment';
import { useApplyToJob, useCheckInToJob, useCheckOutOfJob, useJob } from '../hooks/useJobs';
import {
  LIFECYCLE_STEPS,
  applicationPresentation,
  estimatedTotalCents,
  formatDistance,
  formatPay,
  formatSchedule,
  lifecycleIndex,
} from '../presentation';

export function JobDetail({ id }: { id: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: job, isLoading, error, refetch } = useJob(id);

  const apply = useApplyToJob(id);
  const checkIn = useCheckInToJob(job);
  const [scanning, setScanning] = useState(false);
  const checkOut = useCheckOutOfJob(id);
  const payouts = usePayoutStatus();

  if (isLoading) {
    return (
      <Wrap>
        <Skeleton $h="180px" $radius={16} />
        <Skeleton $h="120px" $radius={16} />
      </Wrap>
    );
  }
  if (error || !job) {
    return (
      <Wrap>
        <ErrorState
          title="Gig unavailable"
          message={error instanceof Error ? error.message : 'This gig could not be loaded.'}
          onRetry={() => void refetch()}
        />
      </Wrap>
    );
  }

  const app = job.application;
  const state = app ? applicationPresentation(app.status) : null;
  const step = lifecycleIndex(app?.status);
  const distance = formatDistance(job.distanceM);
  const schedule = formatSchedule(job);
  const estimate = estimatedTotalCents(job);

  const onError = (e: unknown) =>
    show(e instanceof AppApiError || e instanceof Error ? e.message : 'That didn’t work', 'danger');

  const handleApply = () =>
    apply.mutate(undefined, {
      onSuccess: () => show('Gig claimed — check in when you arrive', 'success'),
      // 409 JOB_UNAVAILABLE: somebody else claimed it first. Refetch so the screen stops
      // offering a button that can no longer work.
      onError: (e) => {
        onError(e);
        if (e instanceof AppApiError && e.status === 409) void refetch();
      },
    });

  const handleCheckIn = () =>
    checkIn.mutate(undefined, {
      onSuccess: () => show('Checked in — you’re on the clock', 'success'),
      onError,
    });

  /** QR fallback: proves presence when GPS can't (indoors, loading bays, under awnings). */
  const handleScanCheckIn = (qrToken: string) =>
    checkIn.mutate(
      { qrToken },
      {
        onSuccess: () => {
          setScanning(false);
          show('Checked in — you’re on the clock', 'success');
        },
        onError,
      },
    );

  const handleCheckOut = () =>
    checkOut.mutate(undefined, {
      onSuccess: (result) =>
        show(
          result.paid
            ? `Checked out — ${formatCents(result.payoutCents)} is on its way`
            : `Checked out — ${formatCents(result.payoutCents)} is recorded, add a payout method to receive it`,
          result.paid ? 'success' : 'warning',
        ),
      onError,
    });

  return (
    <Wrap>
      <TopBar>
        <BackButton onClick={() => router.back()} aria-label="Back to jobs">
          <ArrowLeft size={20} aria-hidden />
        </BackButton>
        {state ? <Badge tone={state.tone}>{state.label}</Badge> : null}
      </TopBar>

      <Header>
        <h1>{job.title}</h1>
        <Employer>{job.employerName}</Employer>
        <PayRow>
          <Pay className="tnum">{formatPay(job)}</Pay>
          {estimate ? <Estimate className="tnum">≈ {formatCents(estimate)} for the shift</Estimate> : null}
        </PayRow>
      </Header>

      <Meta>
        {schedule ? (
          <span>
            <Clock size={14} aria-hidden /> {schedule}
          </span>
        ) : null}
        {distance ? (
          <span>
            <MapPin size={14} aria-hidden /> {distance} away
          </span>
        ) : null}
      </Meta>

      {job.description ? <Description>{job.description}</Description> : null}

      {/* Flow 9 failure state — say it outright, don't let the check-in UI go stale. */}
      {app?.status === 'cancelled' || job.status === 'cancelled' ? (
        <Banner tone="danger" title="This gig was cancelled">
          {app?.cancelledReason ??
            job.cancelledReason ??
            'The employer pulled this gig. You won’t be marked down for it, and any compensation follows the no-show policy.'}
        </Banner>
      ) : null}

      {app ? <Lifecycle step={step} /> : null}

      {app?.status === 'completed' ? (
        <PayoutCard>
          <PayoutHead>
            <CheckCircle2 size={18} aria-hidden /> Gig complete
          </PayoutHead>
          <Line>
            <span>Earned</span>
            <b className="tnum">{formatCents(app.payoutCents)}</b>
          </Line>
          {app.checkedInAt && app.checkedOutAt ? (
            <Line>
              <span>On site</span>
              <span>
                {formatDateTime(app.checkedInAt)} → {formatDateTime(app.checkedOutAt)}
              </span>
            </Line>
          ) : null}
          <Line>
            <span>Payout</span>
            <span>{app.payoutRef ? 'Sent — shows in Earnings' : 'Pending a payout method'}</span>
          </Line>
        </PayoutCard>
      ) : null}

      {/* Payout readiness matters before the work, not after it: without a connected account the
          check-out records the money but transfers nothing. */}
      {app && ['accepted', 'checked_in'].includes(app.status) && payouts.data && !payouts.data.payoutsEnabled ? (
        <Banner
          tone="warning"
          title="Add a payout method"
          action={
            <Button size="compact" onClick={() => router.push('/profile/wallet')}>
              Set up
            </Button>
          }
        >
          You can still work this gig, but same-day payout needs a connected account.
        </Banner>
      ) : null}

      <Actions>{renderAction()}</Actions>
    </Wrap>
  );

  function renderAction() {
    if (!job) return null;

    // Cancelled by the employer — the only useful action left is finding another gig.
    if (app?.status === 'cancelled' || job.status === 'cancelled') {
      return (
        <Button fullWidth variant="secondary" onClick={() => router.push('/seller/jobs')}>
          Find another gig
        </Button>
      );
    }

    if (!app) {
      if (job.status !== 'open') {
        return (
          <Button fullWidth disabled>
            No longer available
          </Button>
        );
      }
      return (
        <Button fullWidth loading={apply.isPending} onClick={handleApply}>
          Apply for this gig
        </Button>
      );
    }

    switch (app.status) {
      case 'applied':
      case 'accepted':
        return (
          <>
            <Button fullWidth loading={checkIn.isPending} onClick={handleCheckIn}>
              <Navigation size={16} aria-hidden /> Check in on site
            </Button>
            {scanning ? (
              <QRScanner onScan={handleScanCheckIn} expectedCode="SS-JOB-DEMO" />
            ) : (
              <Button fullWidth variant="secondary" onClick={() => setScanning(true)}>
                <QrCode size={16} aria-hidden /> Scan the site code instead
              </Button>
            )}
            <FootNote>
              Check-in confirms you’re within {job.checkInRadiusM}m of the site. If your phone can’t
              get a location, ask the employer for the on-site code and scan it.
            </FootNote>
          </>
        );
      case 'checked_in':
        return (
          <>
            <Button fullWidth loading={checkOut.isPending} onClick={handleCheckOut}>
              <Wallet size={16} aria-hidden /> Check out & get paid
            </Button>
            <FootNote>Checking out completes the gig and releases your payout.</FootNote>
          </>
        );
      case 'completed':
        return (
          <Button fullWidth variant="secondary" onClick={() => router.push('/seller/earnings')}>
            View earnings
          </Button>
        );
      case 'no_show':
        return (
          <Button fullWidth variant="secondary" onClick={() => router.push('/seller/jobs')}>
            Find another gig
          </Button>
        );
      default:
        return null;
    }
  }
}

/** The three stages a worker moves through, so "what happens next" is never a guess. */
function Lifecycle({ step }: { step: number }) {
  return (
    <Steps aria-label="Gig progress">
      {LIFECYCLE_STEPS.map((s, i) => (
        <Step key={s.status} $done={i <= step}>
          <Dot $done={i <= step} aria-hidden />
          {s.label}
        </Step>
      ))}
    </Steps>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[5]}px;
`;
const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;
const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Header = styled.header`
  display: grid;
  gap: 4px;
  h1 {
    font-size: 22px;
  }
`;
const Employer = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const PayRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
const Pay = styled.span`
  font-weight: 800;
  font-size: 28px;
  color: ${({ theme }) => theme.color.statusLive};
`;
const Estimate = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]}px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
`;
const Description = styled.p`
  font-size: 14px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Steps = styled.ol`
  display: flex;
  gap: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  list-style: none;
`;
const Step = styled.li<{ $done: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: ${({ $done }) => ($done ? 700 : 500)};
  color: ${({ theme, $done }) => ($done ? theme.color.textPrimary : theme.color.textTertiary)};
`;
const Dot = styled.span<{ $done: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme, $done }) => ($done ? theme.color.statusLive : theme.color.line2)};
`;
const PayoutCard = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const PayoutHead = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
  color: ${({ theme }) => theme.color.statusLive};
`;
const Line = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Actions = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const FootNote = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  text-align: center;
`;
