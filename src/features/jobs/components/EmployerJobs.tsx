'use client';

/**
 * V-13 Employer gigs — post a shift and manage who takes it.
 *
 * This is the half of S-14 that was never built. `POST /jobs` existed but nothing called it, so a
 * business could not create a gig at all and the worker's board was permanently empty. Posting,
 * seeing applicants, recording a no-show and cancelling all live here.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { MapPin, Plus, UserX, X } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Modal } from '@/components/primitives/Modal';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { StatusChip } from '@/components/primitives/StatusChip';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import {
  useCancelJob,
  useJobApplicants,
  useJobCheckInToken,
  useMarkNoShow,
  usePostJob,
  usePostedJobs,
  type PostedJob,
} from '../hooks/useEmployerJobs';

export function EmployerJobs({ businessId }: { businessId: string }) {
  const { show } = useToast();
  const { data: jobs, isLoading, isError, refetch } = usePostedJobs();
  const post = usePostJob();
  const cancel = useCancelJob();
  const noShow = useMarkNoShow();

  const [composing, setComposing] = useState(false);
  const [openJob, setOpenJob] = useState<PostedJob | null>(null);

  const [title, setTitle] = useState('');
  const [pay, setPay] = useState('');
  const [hours, setHours] = useState('2');
  const [startsAt, setStartsAt] = useState('');
  const [error, setError] = useState<string>();

  const submit = () => {
    const payCents = Math.round(Number(pay) * 100);
    if (!title.trim()) return setError('Give the gig a title');
    if (!Number.isFinite(payCents) || payCents <= 0) return setError('Enter what it pays');
    setError(undefined);

    // The gig is located where the business is; the worker's check-in is geofenced to it.
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      show('Location is required to post a gig — workers check in against it.', 'danger');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        post.mutate(
          {
            title: title.trim(),
            lng: pos.coords.longitude,
            lat: pos.coords.latitude,
            payCents,
            payUnit: 'flat',
            durationHrs: Number(hours) || undefined,
            startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
            businessId,
          },
          {
            onSuccess: () => {
              setComposing(false);
              setTitle('');
              setPay('');
              setStartsAt('');
              show('Gig posted — it’s live on the board', 'success');
            },
            onError: (e) =>
              show(e instanceof AppApiError ? e.message : 'Could not post the gig', 'danger'),
          },
        );
      },
      () => show('Location permission is needed to post a gig.', 'danger'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  if (isLoading) {
    return (
      <TabPage title="Gigs">
        <Skeleton $h="140px" $radius={16} />
      </TabPage>
    );
  }
  if (isError) {
    return (
      <TabPage title="Gigs">
        <ErrorState title="Couldn’t load your gigs" message="Please try again." onRetry={() => void refetch()} />
      </TabPage>
    );
  }

  const list = jobs ?? [];

  return (
    <TabPage
      title="Gigs"
      actions={
        <Button size="compact" onClick={() => setComposing(true)}>
          <Plus size={15} /> Post a gig
        </Button>
      }
    >
      {list.length === 0 ? (
        <EmptyState
          icon="🛠️"
          title="No gigs posted yet"
          description="Post a shift and nearby workers can claim it, check in on site, and get paid the same day."
          action={<Button onClick={() => setComposing(true)}>Post your first gig</Button>}
        />
      ) : (
        <List>
          {list.map((j) => (
            <Card key={j.id}>
              <Head>
                <div>
                  <Title>{j.title}</Title>
                  <Meta>
                    {formatCents(j.payCents)}
                    {j.payUnit === 'hourly' ? '/hr' : ''}
                    {j.durationHrs ? ` · ${j.durationHrs}h` : ''}
                    {j.startsAt ? ` · ${formatDateTime(j.startsAt)}` : ''}
                  </Meta>
                </div>
                <StatusChip
                  status={j.status === 'open' ? 'parked' : j.status === 'filled' ? 'popup' : 'away'}
                  label={j.status}
                  size="sm"
                />
              </Head>

              <Row>
                <Muted>
                  {j.applicantCount === 0
                    ? 'No one has claimed it yet'
                    : `${j.applicantCount} ${j.applicantCount === 1 ? 'worker' : 'workers'}`}
                  {j.paidOutCents > 0 ? ` · ${formatCents(j.paidOutCents)} paid out` : ''}
                </Muted>
              </Row>

              <Actions>
                {j.applicantCount > 0 ? (
                  <Button size="compact" variant="secondary" onClick={() => setOpenJob(j)}>
                    View workers
                  </Button>
                ) : null}
                {j.status === 'filled' ? (
                  <Button
                    size="compact"
                    variant="secondary"
                    loading={noShow.isPending && noShow.variables === j.id}
                    onClick={() =>
                      noShow.mutate(j.id, {
                        onSuccess: () => show('Marked as a no-show — the shift is back on the board', 'default'),
                        onError: (e) =>
                          show(e instanceof AppApiError ? e.message : 'Could not mark no-show', 'danger'),
                      })
                    }
                  >
                    <UserX size={14} /> No-show
                  </Button>
                ) : null}
                {j.status === 'open' || j.status === 'filled' ? (
                  <Button
                    size="compact"
                    variant="tertiary"
                    loading={cancel.isPending && cancel.variables?.jobId === j.id}
                    onClick={() =>
                      cancel.mutate(
                        { jobId: j.id },
                        {
                          onSuccess: () => show('Gig cancelled', 'default'),
                          onError: (e) =>
                            show(e instanceof AppApiError ? e.message : 'Could not cancel', 'danger'),
                        },
                      )
                    }
                  >
                    <X size={14} /> Cancel
                  </Button>
                ) : null}
              </Actions>
            </Card>
          ))}
        </List>
      )}

      <Modal open={composing} onClose={() => setComposing(false)} title="Post a gig">
        <Form>
          <Input
            label="What's the job?"
            placeholder="Event setup crew"
            value={title}
            error={error}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label="Pay (total)"
            placeholder="80.00"
            inputMode="decimal"
            value={pay}
            onChange={(e) => setPay(e.target.value)}
            required
          />
          <Input
            label="Hours"
            inputMode="numeric"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <Input
            label="Starts (optional)"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
          <Hint>
            <MapPin size={13} aria-hidden />
            Posted at your current location — workers must be within range to check in.
          </Hint>
          <Button fullWidth loading={post.isPending} onClick={submit}>
            Post gig
          </Button>
        </Form>
      </Modal>

      <ApplicantsModal job={openJob} onClose={() => setOpenJob(null)} />
    </TabPage>
  );
}

/** Who claimed a gig, where each got to, and the on-site code for a worker whose GPS won't work. */
function ApplicantsModal({ job, onClose }: { job: PostedJob | null; onClose: () => void }) {
  const { data, isLoading } = useJobApplicants(job?.id);
  // Only fetched while the sheet is open — this code authorises a check-in, so it isn't kept warm.
  const qr = useJobCheckInToken(job?.id, Boolean(job));
  return (
    <Modal open={Boolean(job)} onClose={onClose} title={job?.title ?? 'Workers'}>
      {job?.status === 'filled' && qr.data ? (
        <CodeBlock>
          <CodeLabel>On-site check-in code</CodeLabel>
          <Token>{qr.data.token}</Token>
          <Hint>
            <MapPin size={13} aria-hidden />
            Show this to a worker whose phone can’t get a location. It changes every{' '}
            {qr.data.rotateSeconds}s, so it can’t be used from off site.
          </Hint>
        </CodeBlock>
      ) : null}
      {isLoading ? (
        <Skeleton $h="80px" $radius={12} />
      ) : (data ?? []).length === 0 ? (
        <Muted>No one has claimed this gig yet.</Muted>
      ) : (
        <List>
          {(data ?? []).map((a) => (
            <Applicant key={a.id}>
              <div>
                <Title>{a.applicantName}</Title>
                <Meta>
                  {a.checkedInAt ? `Checked in ${formatDateTime(a.checkedInAt)}` : 'Not checked in'}
                  {a.payoutCents > 0 ? ` · ${formatCents(a.payoutCents)} paid` : ''}
                </Meta>
              </div>
              <StatusChip
                status={
                  a.status === 'completed' ? 'free' : a.status === 'checked_in' ? 'parked' : a.status === 'no_show' ? 'discount' : 'popup'
                }
                label={a.status.replace('_', ' ')}
                size="sm"
              />
            </Applicant>
          ))}
        </List>
      )}
    </Modal>
  );
}

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  max-width: 560px;
`;
const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Title = styled.p`
  font-size: 15px;
  font-weight: 700;
  overflow-wrap: anywhere;
`;
const Meta = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Muted = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Form = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Hint = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
  svg {
    flex: none;
    margin-top: 2px;
  }
`;
const Applicant = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const CodeBlock = styled.div`
  display: grid;
  gap: 6px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const CodeLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Token = styled.code`
  font-family: monospace;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  user-select: all;
  overflow-wrap: anywhere;
  word-break: break-word;
  color: ${({ theme }) => theme.color.textPrimary};
`;
