'use client';

/**
 * D-1 — "Earn Today", as one list.
 *
 * Selling, gigs and promotions used to live on separate screens with no common ranking, so a seller
 * comparing "take stock" against "work a shift" had to do the maths in their head.
 *
 * The design decision that carries this screen: BOTH ranking axes are printed on every row. Payout
 * alone would always float a $90 four-hour gig above $18 of candles, ignoring that the candles pay
 * when they sell and the gig pays after the shift. Someone who needs money for a bed tonight is
 * optimising the second axis — so the row says "$80 · today" rather than hiding it behind a rank.
 */
import styled from 'styled-components';
import Link from 'next/link';
import { Briefcase, Clock, MapPin, Package, Sparkles } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { AdSlot, useServedAds } from '@/features/ads';
import { ErrorState } from '@/components/feedback/ErrorState';
import { formatCents } from '@/lib/money';
import { useEarnFeed } from '../hooks/useAcademy';
import type { Opportunity, OpportunityKind } from '../types';

const KIND_LABEL: Record<OpportunityKind, string> = {
  consignment: 'Sell stock',
  gig: 'Gig',
  promotion: 'Promotion',
};

/** Plain-language time-to-payout. "4h" means nothing at a glance; "today" does. */
function payoutTiming(hours: number): string {
  if (hours <= 8) return 'paid today';
  if (hours <= 24) return 'paid when it sells';
  return `paid in ~${Math.round(hours / 24)}d`;
}

function distance(m: number | null): string | null {
  if (m === null) return null;
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

export function EarnHub() {
  const { data, isLoading, isError, refetch } = useEarnFeed();
  /**
   * P-18 — the earn surface's paid slot. `feedSize` is the real opportunity count, so the server's
   * share-of-feed cap scales with the list; requested only when there is genuine work to sit under.
   */
  const { ads } = useServedAds('earn_slot', {
    feedSize: data?.items.length ?? 0,
    enabled: (data?.items.length ?? 0) > 0,
  });

  if (isLoading) {
    return (
      <TabPage title="Earn today">
        <Stack>
          <Skeleton $h="96px" $radius={16} />
          <Skeleton $h="96px" $radius={16} />
          <Skeleton $h="96px" $radius={16} />
        </Stack>
      </TabPage>
    );
  }
  if (isError || !data) {
    return (
      <TabPage title="Earn today">
        <ErrorState
          title="Couldn’t load opportunities"
          message="Please try again in a moment."
          onRetry={() => void refetch()}
        />
      </TabPage>
    );
  }

  return (
    <TabPage title="Earn today">
      {/* D-2: a blank profile is the cold-start problem — the engine has nothing to match on. */}
      {!data.profileComplete ? (
        <ProfileNudge href="/seller/profile">
          <Sparkles size={16} aria-hidden />
          <NudgeText>
            <b>Tell us what you’re good at</b>
            <span>Two taps, and this list starts matching what you actually sell.</span>
          </NudgeText>
        </ProfileNudge>
      ) : null}

      {data.items.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Nothing available right now"
          description="New stock and gigs appear through the day. Check back shortly."
        />
      ) : (
        <Stack>
          {data.items.map((o) => (
            <Row key={o.id} opportunity={o} />
          ))}
          {/* Paid placement sits BELOW every real earning opportunity, labelled. On a screen whose
              whole promise is "here is how to make money today", an ad must never outrank the
              actual work. */}
          <AdSlot ads={ads} surface="earn_slot" />
        </Stack>
      )}
    </TabPage>
  );
}

function Row({ opportunity: o }: { opportunity: Opportunity }) {
  const dist = distance(o.distanceM);
  return (
    <Card href={o.href}>
      <Head>
        <Kind $kind={o.kind}>
          {o.kind === 'gig' ? <Briefcase size={12} aria-hidden /> : <Package size={12} aria-hidden />}
          {KIND_LABEL[o.kind]}
        </Kind>
        <Payout className="tnum">{formatCents(o.expectedPayoutCents)}</Payout>
      </Head>

      <Title>{o.title}</Title>
      <Subtitle>{o.subtitle}</Subtitle>

      <Meta>
        {/* The second axis, always visible — this is the whole reason the merge works. */}
        <MetaItem>
          <Clock size={12} aria-hidden /> {payoutTiming(o.hoursToPayout)}
        </MetaItem>
        {dist ? (
          <MetaItem>
            <MapPin size={12} aria-hidden /> {dist}
          </MetaItem>
        ) : null}
      </Meta>

      {/* Explainable, in the same style as Trending and the AI recommendations. */}
      {o.factors.length > 0 ? <Why>{o.reasonSummary}</Why> : null}

      {o.kind === 'consignment' ? (
        // The honest caveat: the payout figure is per unit, not the whole pickup.
        <PerUnit>per item you sell · nothing to pay upfront</PerUnit>
      ) : null}
    </Card>
  );
}

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Card = styled(Link)`
  display: grid;
  gap: 4px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  text-decoration: none;
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Kind = styled.span<{ $kind: OpportunityKind }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme, $kind }) =>
    $kind === 'gig' ? theme.color.accentPrimary : theme.color.accentSecondary};
`;
const Payout = styled.b`
  font-size: 18px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Title = styled.p`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
  margin: 0;
`;
const Subtitle = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0;
`;
const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-top: 2px;
`;
const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Why = styled.p`
  font-size: 11px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: 2px 0 0;
`;
const PerUnit = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.accentSecondary};
`;
const ProfileNudge = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.color.accentPrimary} 12%, ${theme.color.surfaceRaised})`};
  border: 1px solid
    ${({ theme }) => `color-mix(in srgb, ${theme.color.accentPrimary} 28%, transparent)`};
  color: ${({ theme }) => theme.color.accentPrimary};
  text-decoration: none;
`;
const NudgeText = styled.span`
  display: grid;
  gap: 1px;

  b {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textPrimary};
  }
  span {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
