'use client';

/**
 * The artwork review queue (7.4, F-7) — staff only.
 *
 * ## What a reviewer is actually deciding
 *
 * Not "is this a good design". The only question is **may StreetServe lawfully print this and put
 * it through the postal service**: does the buyer appear to own it, does it avoid prohibited
 * content, is it mailable. The screen says so out loud, because a reviewer left to invent their own
 * bar will invent a different one each time, and refusing someone's advertising on taste is not a
 * power this queue is meant to hand out.
 *
 * ## A rejection must be usable
 *
 * The reason is required and it is shown to the business, so it has to be something they can act
 * on. "Rejected" with no explanation is a dead end that turns into a support ticket and a refund.
 *
 * ## The automated flags are hints, and are labelled as hints
 *
 * The screener can only see structure — a file that is not the type it claimed, an oddly small
 * upload. It cannot see content. Presenting its output as anything but a nudge would invite
 * approving on its say-so, which is precisely the false assurance the screener was written to
 * avoid.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Spinner } from '@/components/feedback/Spinner';
import { TextArea } from '@/components/primitives/TextArea';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { useModerateArtwork, useModerationQueue } from '../hooks/usePostcards';
import type { ModerationQueueItem } from '../types';

const FLAG_COPY: Record<string, string> = {
  declared_type_mismatch: 'File type does not match what was declared — worth a closer look.',
  grayscale_artwork: 'Black and white artwork. Unusual, not a problem.',
  unusually_small_file: 'Small file for print resolution. Could be a screenshot or placeholder.',
  screening_unavailable: 'Automated checks did not run for this file.',
};

function ago(iso: string | null): string {
  if (!iso) return 'just now';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ModerationQueuePanel() {
  const queue = useModerationQueue();

  if (queue.isLoading) {
    return (
      <Centered>
        <Spinner />
      </Centered>
    );
  }

  if (!queue.data?.length) {
    return <EmptyState title="Nothing waiting" description="All artwork has been reviewed." />;
  }

  return (
    <Root>
      <Intro>
        <IntroTitle>
          {queue.data.length} {queue.data.length === 1 ? 'design' : 'designs'} waiting
        </IntroTitle>
        <IntroBody>
          You are checking whether we can lawfully print and post this — ownership, prohibited
          content, mailability. Not whether the design is any good.
        </IntroBody>
      </Intro>

      <List>
        {queue.data.map((item) => (
          <ReviewCard key={item.id} item={item} />
        ))}
      </List>
    </Root>
  );
}

function ReviewCard({ item }: { item: ModerationQueueItem }) {
  const { show } = useToast();
  const moderate = useModerateArtwork();
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  async function decide(decision: 'approved' | 'rejected'): Promise<void> {
    if (decision === 'rejected' && !reason.trim()) {
      setRejecting(true);
      return;
    }
    try {
      await moderate.mutateAsync({ assetId: item.id, decision, reason: reason.trim() || undefined });
      show(decision === 'approved' ? 'Approved for printing.' : 'Rejected and refundable.', 'success');
    } catch (err) {
      show(err instanceof AppApiError ? err.message : 'That decision did not save.', 'danger');
    }
  }

  return (
    <Card>
      <CardHead>
        <CardTitle>Artwork {item.id.slice(-6)}</CardTitle>
        <Meta>waiting {ago(item.uploadedAt)}</Meta>
      </CardHead>

      <Facts>
        <Fact>
          <dt>Format</dt>
          <dd>{item.format ?? '—'}</dd>
        </Fact>
        <Fact>
          <dt>Size</dt>
          <dd>
            {item.widthPx && item.heightPx ? `${item.widthPx} × ${item.heightPx}px` : 'vector'}
          </dd>
        </Fact>
        <Fact>
          <dt>Resolution</dt>
          <dd>{item.effectiveDpi ? `${item.effectiveDpi} DPI` : '—'}</dd>
        </Fact>
        <Fact>
          <dt>Colour</dt>
          <dd>{item.colorSpace ?? '—'}</dd>
        </Fact>
      </Facts>

      {item.screeningFlags.length ? (
        <Banner tone="info" title="Automated checks flagged (not a verdict)">
          <FlagList>
            {item.screeningFlags.map((f) => (
              <li key={f}>{FLAG_COPY[f] ?? f}</li>
            ))}
          </FlagList>
        </Banner>
      ) : null}

      {rejecting ? (
        <TextArea
          label="Why are you rejecting it?"
          hint="The business is shown this, so make it something they can fix."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={!reason.trim() ? 'A reason is required.' : undefined}
        />
      ) : null}

      <Actions>
        <Button
          variant="destructive"
          onClick={() => void decide('rejected')}
          disabled={moderate.isPending}
        >
          Reject
        </Button>
        <Button onClick={() => void decide('approved')} disabled={moderate.isPending}>
          Approve for printing
        </Button>
      </Actions>
    </Card>
  );
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]}px;
`;

const Centered = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.space[6]}px;
`;

const Intro = styled.div``;

const IntroTitle = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[1]}px;
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.scale[3]}px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const IntroBody = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: ${({ theme }) => theme.typography.scale[1]}px;
  line-height: ${({ theme }) => theme.typography.lineBody};
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
  align-items: baseline;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.scale[2]}px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const Meta = styled.span`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: ${({ theme }) => theme.typography.scale[0]}px;
`;

const Facts = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[2]}px;
  margin: 0;

  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Fact = styled.div`
  dt {
    color: ${({ theme }) => theme.color.textTertiary};
    font-size: ${({ theme }) => theme.typography.scale[0]}px;
  }
  dd {
    margin: 0;
    color: ${({ theme }) => theme.color.textPrimary};
    font-size: ${({ theme }) => theme.typography.scale[1]}px;
  }
`;

const FlagList = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.space[4]}px;
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  justify-content: flex-end;
`;
