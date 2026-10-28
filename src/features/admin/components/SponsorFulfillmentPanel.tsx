'use client';

/**
 * ═══ Admin fulfillment panel — log deliveries against a sponsor's package. ═══
 *
 * Reads `/admin/sponsors/:id/fulfillment` and lets an operator log a shout-out, promotional
 * video, postcard batch, or spotlight video with a proof URL. The log is append-only server-side
 * — a correction is a negative count row with a note, never an edit.
 *
 * Why log here and not auto-ingest from Instagram / YouTube / the postcard webhook: because for
 * the first dozen sponsors it is one operator doing it by hand, and a hand-logged system that
 * works today beats an auto-ingest that is 70% built. The event schema is the same either way,
 * so when auto-ingest arrives it writes the same rows.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { Megaphone, Mail, Video, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { AppApiError } from '@/lib/api/errors';
import { newIdempotencyKey } from '@/lib/idempotency';

type DeliverableType = 'shoutouts' | 'promotionalVideos' | 'postcards' | 'spotlightVideos';

interface Counters {
  shoutouts: number;
  promotionalVideos: number;
  postcards: number;
  spotlightVideos: number;
}
interface Event {
  id: string;
  deliverableType: DeliverableType;
  count: number;
  proofUrl: string | null;
  note: string | null;
  loggedBy: string;
  deliveredAt: string;
  createdAt: string | null;
}
interface Fulfillment {
  empty?: true;
  sponsorId?: string;
  program?: string;
  tier?: string;
  committed?: Counters;
  delivered?: Counters;
  startedAt?: string;
  endsAt?: string;
  reportingCadence?: 'final' | 'monthly';
  events?: Event[];
}

const META: Record<DeliverableType, { label: string; icon: typeof Megaphone; unit: string }> = {
  shoutouts: { label: 'Shout-outs', icon: Megaphone, unit: 'shout-out' },
  promotionalVideos: { label: 'Promotional videos', icon: Video, unit: 'video' },
  postcards: { label: 'Postcards', icon: Mail, unit: 'postcard' },
  spotlightVideos: { label: 'Spotlight videos', icon: FileText, unit: 'spotlight video' },
};

export function SponsorFulfillmentPanel({ sponsorId }: { sponsorId: string }) {
  const qc = useQueryClient();
  const { show } = useToast();

  const query = useQuery<Fulfillment>({
    queryKey: ['admin', 'sponsor', sponsorId, 'fulfillment'],
    queryFn: () => api.get<Fulfillment>(endpoints.admin.sponsorFulfillment(sponsorId)),
    staleTime: 30_000,
  });

  const [type, setType] = useState<DeliverableType>('shoutouts');
  const [count, setCount] = useState('1');
  const [proofUrl, setProofUrl] = useState('');
  const [note, setNote] = useState('');

  const logMutation = useMutation({
    mutationFn: () =>
      api.post(
        endpoints.admin.sponsorFulfillmentLog(sponsorId),
        {
          deliverableType: type,
          count: Number(count),
          ...(proofUrl.trim() ? { proofUrl: proofUrl.trim() } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        },
        { idempotencyKey: newIdempotencyKey() },
      ),
    onSuccess: () => {
      show('Delivery logged', 'success');
      setCount('1');
      setProofUrl('');
      setNote('');
      void qc.invalidateQueries({ queryKey: ['admin', 'sponsor', sponsorId, 'fulfillment'] });
    },
    onError: (e) =>
      show(e instanceof AppApiError ? e.message : 'Could not log delivery', 'danger'),
  });

  if (query.isLoading) return <Skeleton $h="420px" $radius={16} />;
  if (query.isError)
    return (
      <ErrorState title="Couldn’t load fulfillment" onRetry={() => void query.refetch()} />
    );

  const data = query.data;
  if (!data || data.empty) {
    return (
      <Empty>
        No fulfillment record. This sponsor hasn’t been approved yet, or was approved before the
        tracker was wired. Approve the sponsor first; the tracker seeds automatically.
      </Empty>
    );
  }

  const committed = data.committed ?? {
    shoutouts: 0,
    promotionalVideos: 0,
    postcards: 0,
    spotlightVideos: 0,
  };
  const delivered = data.delivered ?? {
    shoutouts: 0,
    promotionalVideos: 0,
    postcards: 0,
    spotlightVideos: 0,
  };

  const activeRows = (Object.keys(META) as DeliverableType[]).filter(
    (k) => committed[k] > 0 || delivered[k] > 0,
  );

  const canSubmit = Number(count) !== 0 && Number.isFinite(Number(count));

  return (
    <Wrap>
      <Header>
        <h2>{(data.tier ?? '').toUpperCase()} fulfillment</h2>
        <HeaderMeta>
          <Clock size={14} aria-hidden /> Reporting:{' '}
          <strong>{data.reportingCadence ?? 'final'}</strong>
          {data.endsAt ? <> &middot; Ends {new Date(data.endsAt).toDateString()}</> : null}
        </HeaderMeta>
      </Header>

      <Grid>
        {activeRows.length === 0 ? (
          <Empty>
            No countable deliverables for this tier — logo placement only. Nothing to log here.
          </Empty>
        ) : (
          activeRows.map((k) => {
            const Icon = META[k].icon;
            const d = delivered[k];
            const c = committed[k];
            const pct = c > 0 ? Math.min(100, Math.round((d / c) * 100)) : 0;
            return (
              <Tile key={k}>
                <TileHead>
                  <Icon size={14} aria-hidden /> {META[k].label}
                </TileHead>
                <TileCount className="tnum">
                  {d.toLocaleString()}
                  <TileCommit> / {c.toLocaleString()}</TileCommit>
                </TileCount>
                <Bar>
                  <BarFill style={{ width: `${pct}%` }} />
                </Bar>
                <TilePct className="tnum">{pct}%</TilePct>
              </Tile>
            );
          })
        )}
      </Grid>

      {activeRows.length > 0 ? (
        <LogForm>
          <h3>Log a delivery</h3>
          <TypeRow role="radiogroup" aria-label="Deliverable type">
            {activeRows.map((k) => (
              <TypeChip
                key={k}
                type="button"
                role="radio"
                aria-checked={type === k}
                $selected={type === k}
                onClick={() => setType(k)}
              >
                {META[k].label}
              </TypeChip>
            ))}
          </TypeRow>
          <Fields>
            <Input
              label="Count"
              type="number"
              hint="Positive to log, negative to correct an over-log."
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
            <Input
              label="Proof URL"
              hint="Link to the social post, the video, or the postcard-batch report."
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
            <Input
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Fields>
          <Button
            disabled={!canSubmit}
            loading={logMutation.isPending}
            onClick={() => logMutation.mutate()}
          >
            Log {Number(count) || 0} {META[type].unit}
            {Math.abs(Number(count)) === 1 ? '' : 's'}
          </Button>
        </LogForm>
      ) : null}

      <History>
        <h3>History</h3>
        {(data.events?.length ?? 0) === 0 ? (
          <Empty>Nothing logged yet.</Empty>
        ) : (
          <HistoryList>
            {data.events!.map((e) => (
              <HistoryRow key={e.id}>
                <strong>{META[e.deliverableType].label}</strong>
                <span className="tnum">
                  {e.count > 0 ? `+${e.count}` : e.count} {META[e.deliverableType].unit}
                  {Math.abs(e.count) === 1 ? '' : 's'}
                </span>
                <span>{new Date(e.deliveredAt).toDateString()}</span>
                {e.proofUrl ? (
                  <a href={e.proofUrl} target="_blank" rel="noopener noreferrer">
                    Proof
                  </a>
                ) : (
                  <span>—</span>
                )}
                {e.note ? <small>{e.note}</small> : null}
              </HistoryRow>
            ))}
          </HistoryList>
        )}
      </History>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[5]}px;
`;

const Header = styled.header`
  display: grid;
  gap: 4px;
  h2 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: 20px;
    font-weight: 800;
  }
`;

const HeaderMeta = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  grid-template-columns: 1fr;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Tile = styled.div`
  display: grid;
  gap: 6px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const TileHead = styled.p`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;
const TileCount = styled.p`
  font-size: 22px;
  font-weight: 800;
`;
const TileCommit = styled.small`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Bar = styled.div`
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  overflow: hidden;
`;
const BarFill = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.color.accentPrimary};
`;
const TilePct = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
  font-weight: 700;
`;

const LogForm = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  h3 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: 16px;
    font-weight: 800;
  }
`;

const TypeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const TypeChip = styled.button<{ $selected: boolean }>`
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $selected }) =>
    $selected ? theme.color.accentPrimary : theme.color.surfaceRaised2};
  color: ${({ theme, $selected }) => ($selected ? '#fff' : theme.color.textPrimary)};
  border: 1px solid ${({ theme, $selected }) => ($selected ? 'transparent' : theme.color.line)};
`;

const Fields = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: 1fr 2fr;
    > :last-child {
      grid-column: 1 / -1;
    }
  }
`;

const History = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  h3 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: 16px;
    font-weight: 800;
  }
`;

const HistoryList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const HistoryRow = styled.li`
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr auto;
  align-items: baseline;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  font-size: 13.5px;
  a {
    color: ${({ theme }) => theme.color.accentPrimary};
    font-weight: 700;
    text-decoration: underline;
  }
  small {
    grid-column: 1 / -1;
    font-size: 12.5px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;

const Empty = styled.p`
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px dashed ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
  line-height: 1.55;
`;
