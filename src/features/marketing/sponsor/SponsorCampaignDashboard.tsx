'use client';

/**
 * ═══ Sponsor campaign dashboard — the signed-in sponsor's own progress. ═══
 *
 * Reads `/sponsors/me/fulfillment`, which resolves the signed-in user's most-recent active
 * sponsorship and returns `{ committed, delivered, events, startedAt, endsAt, reportingCadence }`.
 * Progress bars for each deliverable, the running delivery log newest-first, and the campaign's
 * next report date.
 *
 * Deliberately NOT a settings page. A sponsor cannot log their OWN deliveries here — that would
 * defeat the point of a tracker. Logging is admin-only.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  CalendarClock,
  Eye,
  ExternalLink,
  FileText,
  Megaphone,
  Mail,
  TrendingUp,
  UserPlus,
  Video,
} from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { AppApiError } from '@/lib/api/errors';
import { useRequireAuth } from '@/lib/auth/guards';

interface StatsPayload {
  empty?: true;
  impressions?: number;
  attributedSignups?: number;
  utmCode?: string;
  signupRatePercent?: number | null;
  websiteUrl?: string | null;
  about?: string | null;
  slug?: string | null;
  hasPublicProfile?: boolean;
}

interface Counters {
  shoutouts: number;
  promotionalVideos: number;
  postcards: number;
  spotlightVideos: number;
}

interface FulfillmentEvent {
  id: string;
  deliverableType: keyof Counters;
  count: number;
  proofUrl: string | null;
  note: string | null;
  loggedBy: string;
  deliveredAt: string;
  createdAt: string | null;
}

interface FulfillmentPayload {
  empty?: true;
  sponsorId?: string;
  program?: string;
  tier?: string;
  committed?: Counters;
  delivered?: Counters;
  startedAt?: string;
  endsAt?: string;
  reportingCadence?: 'final' | 'monthly';
  events?: FulfillmentEvent[];
}

const DELIVERABLE_META: Record<
  keyof Counters,
  { label: string; icon: typeof Megaphone; unit: string }
> = {
  shoutouts: { label: 'Shout-outs', icon: Megaphone, unit: 'shout-out' },
  promotionalVideos: { label: 'Promotional videos', icon: Video, unit: 'video' },
  postcards: { label: 'Postcards mailed', icon: Mail, unit: 'postcard' },
  spotlightVideos: { label: 'Spotlight videos', icon: FileText, unit: 'spotlight video' },
};

function pct(delivered: number, committed: number): number {
  if (committed <= 0) return 0;
  return Math.min(100, Math.round((delivered / committed) * 100));
}

function nextReportLine(
  cadence: 'final' | 'monthly' | undefined,
  endsAt?: string,
): string {
  if (!endsAt) return '';
  const end = new Date(endsAt);
  if (cadence === 'monthly') {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return next < end
      ? `Next report: ${next.toDateString()}.`
      : `Final report when the campaign ends on ${end.toDateString()}.`;
  }
  return `One final report when the campaign ends on ${end.toDateString()}.`;
}

export function SponsorCampaignDashboard() {
  useRequireAuth();
  const qc = useQueryClient();
  const { show } = useToast();

  const { data, isLoading, isError, refetch } = useQuery<FulfillmentPayload>({
    queryKey: ['sponsor', 'me', 'fulfillment'],
    queryFn: () => api.get<FulfillmentPayload>(endpoints.sponsorMineFulfillment),
    staleTime: 60_000,
  });

  /**
   * Reach stats are a separate query because they apply to EVERY active sponsorship (including
   * platform logo-only placements), whereas fulfilment only exists for approved sponsors with
   * countable deliverables. Showing one without the other was the gap item 6 of the shortlist.
   */
  const stats = useQuery<StatsPayload>({
    queryKey: ['sponsor', 'me', 'stats'],
    queryFn: () => api.get<StatsPayload>(endpoints.sponsorMineStats),
    staleTime: 60_000,
  });

  const [websiteUrl, setWebsiteUrl] = useState('');
  const [about, setAbout] = useState('');
  const [editing, setEditing] = useState(false);

  /** Prefill the edit form from the server once stats arrive — a one-shot sync, not binding. */
  useEffect(() => {
    if (stats.data?.empty) return;
    if (!editing) {
      setWebsiteUrl(stats.data?.websiteUrl ?? '');
      setAbout(stats.data?.about ?? '');
    }
  }, [stats.data, editing]);

  const saveProfile = useMutation({
    mutationFn: () =>
      api.patch(endpoints.sponsorMineProfile, {
        websiteUrl: websiteUrl.trim() || null,
        about: about.trim() || null,
      }),
    onSuccess: () => {
      show('Profile updated', 'success');
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ['sponsor', 'me', 'stats'] });
    },
    onError: (e) =>
      show(e instanceof AppApiError ? e.message : 'Could not update profile', 'danger'),
  });

  if (isLoading) {
    return (
      <Page>
        <Skeleton $h="320px" $radius={16} />
      </Page>
    );
  }
  if (isError) {
    return (
      <Page>
        <ErrorState title="Couldn’t load your campaign" onRetry={() => void refetch()} />
      </Page>
    );
  }

  if (!data || data.empty) {
    return (
      <Page>
        <H1>Your campaign</H1>
        <Empty>
          You don’t have an active sponsorship yet. Once a sponsorship you buy is approved by the
          team, this is where you’ll see your campaign progress — shout-outs posted, videos
          published, postcards mailed, and your next report date.
        </Empty>
      </Page>
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

  /**
   * Only show rows the sponsor is owed. A Silver sponsor committed to 0 spotlight videos
   * doesn't need a "0 / 0 spotlights" bar — it is noise.
   */
  const rows = (Object.keys(DELIVERABLE_META) as (keyof Counters)[])
    .filter((k) => (committed[k] ?? 0) > 0 || (delivered[k] ?? 0) > 0)
    .map((k) => ({ key: k, ...DELIVERABLE_META[k] }));

  return (
    <Page>
      <Header>
        <H1>Your campaign</H1>
        <Sub>
          <TierBadge>{(data.tier ?? '').toUpperCase()}</TierBadge>
          <span>
            {data.startedAt
              ? `Started ${new Date(data.startedAt).toDateString()}`
              : null}
            {data.endsAt
              ? ` · Ends ${new Date(data.endsAt).toDateString()}`
              : null}
          </span>
        </Sub>
      </Header>

      <Grid>
        {rows.length === 0 ? (
          <Empty>
            This sponsorship covers logo placement only — no counted deliverables. Your logo on
            the StreetServe landing page is already live.
          </Empty>
        ) : (
          rows.map((r) => {
            const d = delivered[r.key] ?? 0;
            const c = committed[r.key] ?? 0;
            const Icon = r.icon;
            return (
              <Tile key={r.key}>
                <TileHead>
                  <Icon size={16} aria-hidden />
                  <span>{r.label}</span>
                </TileHead>
                <TileCount className="tnum">
                  {d.toLocaleString()}
                  <TileCommit> / {c.toLocaleString()}</TileCommit>
                </TileCount>
                <Bar aria-hidden>
                  <BarFill style={{ width: `${pct(d, c)}%` }} />
                </Bar>
                <TilePct className="tnum">{pct(d, c)}%</TilePct>
              </Tile>
            );
          })
        )}
      </Grid>

      <NextReport>
        <CalendarClock size={16} aria-hidden />
        <span>{nextReportLine(data.reportingCadence, data.endsAt)}</span>
      </NextReport>

      {/*
        Reach + attribution — same figures the admin report returns, scoped to the signed-in
        sponsor. Rendered as its own tile row so a sponsor with no countable deliverables still
        sees something worth logging in for.
      */}
      {!stats.data?.empty && stats.data ? (
        <Section>
          <H2>Reach &amp; attribution</H2>
          <ReachGrid>
            <ReachTile>
              <ReachHead>
                <Eye size={14} aria-hidden /> Logo views
              </ReachHead>
              <ReachValue className="tnum">
                {(stats.data.impressions ?? 0).toLocaleString()}
              </ReachValue>
            </ReachTile>
            <ReachTile>
              <ReachHead>
                <UserPlus size={14} aria-hidden /> Signups from your link
              </ReachHead>
              <ReachValue className="tnum">
                {(stats.data.attributedSignups ?? 0).toLocaleString()}
              </ReachValue>
            </ReachTile>
            <ReachTile>
              <ReachHead>
                <TrendingUp size={14} aria-hidden /> Signup rate
              </ReachHead>
              <ReachValue className="tnum">
                {stats.data.signupRatePercent === null ||
                stats.data.signupRatePercent === undefined
                  ? '—'
                  : `${stats.data.signupRatePercent}%`}
              </ReachValue>
            </ReachTile>
          </ReachGrid>
          {stats.data.utmCode ? (
            <ReachNote>
              Your tracked link: <code>?utm={stats.data.utmCode}</code> — append it to any URL you
              share about StreetServe and every signup it brings is credited to you here.
            </ReachNote>
          ) : null}
        </Section>
      ) : null}

      {/*
        Profile editor — only visible for tiers that bought a public profile. The server also
        gates on tier, so a client that bypasses this UI still can't publish a profile.
      */}
      {stats.data?.hasPublicProfile ? (
        <Section>
          <ProfileHead>
            <H2>Your public profile</H2>
            {stats.data.slug ? (
              <ProfileViewLink
                href={`/sponsor/p/${stats.data.slug}`}
                target="_blank"
                rel="noopener"
              >
                View public page <ExternalLink size={13} aria-hidden />
              </ProfileViewLink>
            ) : null}
          </ProfileHead>
          {editing ? (
            <ProfileForm>
              <Input
                label="Website URL"
                hint="A direct link to your business. Opens in a new tab."
                placeholder="https://…"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <Input
                label="About (max 500 chars)"
                hint="A short description of what your business does. Shown on your public profile page."
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                maxLength={500}
              />
              <ProfileActions>
                <Button
                  variant="tertiary"
                  size="compact"
                  onClick={() => setEditing(false)}
                  disabled={saveProfile.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="compact"
                  loading={saveProfile.isPending}
                  onClick={() => saveProfile.mutate()}
                >
                  Save profile
                </Button>
              </ProfileActions>
            </ProfileForm>
          ) : (
            <ProfilePreview>
              <p>
                <strong>Website:</strong>{' '}
                {stats.data.websiteUrl ? (
                  <a href={stats.data.websiteUrl} target="_blank" rel="noopener">
                    {stats.data.websiteUrl}
                  </a>
                ) : (
                  <em>Not set</em>
                )}
              </p>
              <p>
                <strong>About:</strong>{' '}
                {stats.data.about ? stats.data.about : <em>Not set</em>}
              </p>
              <Button size="compact" variant="secondary" onClick={() => setEditing(true)}>
                Edit profile
              </Button>
            </ProfilePreview>
          )}
        </Section>
      ) : null}

      <Section>
        <H2>Delivery log</H2>
        {(data.events?.length ?? 0) === 0 ? (
          <Empty>
            No deliveries recorded yet. New shout-outs, videos, and postcards appear here as the
            team publishes them.
          </Empty>
        ) : (
          <LogList>
            {data.events!.map((e) => (
              <LogRow key={e.id}>
                <LogType>{DELIVERABLE_META[e.deliverableType].label}</LogType>
                <LogCount className="tnum">
                  {e.count > 0 ? `+${e.count}` : e.count}{' '}
                  <LogUnit>
                    {Math.abs(e.count) === 1
                      ? DELIVERABLE_META[e.deliverableType].unit
                      : `${DELIVERABLE_META[e.deliverableType].unit}s`}
                  </LogUnit>
                </LogCount>
                <LogWhen>{new Date(e.deliveredAt).toDateString()}</LogWhen>
                {e.proofUrl ? (
                  <LogProof href={e.proofUrl} target="_blank" rel="noopener noreferrer">
                    See it
                  </LogProof>
                ) : null}
                {e.note ? <LogNote>{e.note}</LogNote> : null}
              </LogRow>
            ))}
          </LogList>
        )}
      </Section>
    </Page>
  );
}

const Page = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[5]}px;
  max-width: 920px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px
    ${({ theme }) => theme.space[7]}px;
`;

const Header = styled.header`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const H1 = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;

const H2 = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 20px;
  font-weight: 800;
`;

const Sub = styled.p`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const TierBadge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  font-weight: 800;
  font-size: 11px;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textPrimary};
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
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const TileHead = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const TileCount = styled.p`
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
`;

const TileCommit = styled.small`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Bar = styled.div`
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  overflow: hidden;
`;

const BarFill = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.color.accentPrimary};
  transition: width 240ms ease-out;
`;

const TilePct = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  font-weight: 700;
`;

const NextReport = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px dashed ${({ theme }) => theme.color.line2};
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
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

const LogList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const LogRow = styled.li`
  display: grid;
  grid-template-columns: auto auto auto 1fr;
  align-items: baseline;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  font-size: 13.5px;
`;

const LogType = styled.span`
  font-weight: 700;
`;
const LogCount = styled.span`
  color: ${({ theme }) => theme.color.textPrimary};
  font-weight: 700;
`;
const LogUnit = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const LogWhen = styled.span`
  color: ${({ theme }) => theme.color.textSecondary};
`;
const LogProof = styled.a`
  justify-self: end;
  color: ${({ theme }) => theme.color.accentPrimary};
  font-weight: 700;
  text-decoration: underline;
`;
const LogNote = styled.p`
  grid-column: 1 / -1;
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const ReachGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  grid-template-columns: 1fr;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ReachTile = styled.div`
  display: grid;
  gap: 6px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const ReachHead = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const ReachValue = styled.p`
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.01em;
`;

const ReachNote = styled.p`
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px dashed ${({ theme }) => theme.color.line2};
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textSecondary};
  code {
    padding: 1px 6px;
    border-radius: 4px;
    background: ${({ theme }) => theme.color.surfaceRaised2};
    font-size: 12px;
  }
`;

const ProfileHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;

const ProfileViewLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentPrimary};
  &:hover {
    text-decoration: underline;
  }
`;

const ProfilePreview = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  font-size: 14px;
  line-height: 1.55;
  color: ${({ theme }) => theme.color.textPrimary};
  em {
    color: ${({ theme }) => theme.color.textTertiary};
  }
  a {
    color: ${({ theme }) => theme.color.accentPrimary};
    text-decoration: underline;
  }
`;

const ProfileForm = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const ProfileActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  justify-content: flex-end;
`;
