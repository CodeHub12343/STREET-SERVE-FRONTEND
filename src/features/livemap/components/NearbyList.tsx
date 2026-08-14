'use client';

/**
 * C-12 List view — full functional parity with the map (docs/06 §1, §2.8): the only way
 * screen-reader and low-vision users can use discovery. Sortable by distance or status, same live
 * data as the map (shares useViewportNearby, so demo pins move here too).
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { BadgeCheck } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { StatusChip, type StatusVariant } from '@/components/primitives/StatusChip';
import { Avatar } from '@/components/primitives/Avatar';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { distanceMeters } from '@/lib/geo';
import { resolveActions } from '@/features/business/businessActions';
import { AdSlot, useServedAds } from '@/features/ads';
import { useViewportNearby } from '../hooks/useViewportNearby';
import { TrendingRow } from './TrendingRow';
import type { MapPinData } from '../types';

type Sort = 'distance' | 'status';
const STATUS_RANK: Record<MapPinData['status'], number> = { driving: 0, parked: 1, away: 2 };

export function NearbyList() {
  const router = useRouter();
  const { pins, isLoading, isError, refetch, center } = useViewportNearby();
  const [sort, setSort] = useState<Sort>('distance');

  const sorted = useMemo(() => {
    const withDist = pins.map((p) => ({ ...p, dist: distanceMeters(center, p.lngLat) }));
    withDist.sort((a, b) =>
      sort === 'distance' ? a.dist - b.dist : STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.dist - b.dist,
    );
    return withDist;
  }, [pins, sort, center]);

  /**
   * P-18 — paid placement reaches discovery, not just Trending.
   *
   * `feedSize` is the real organic count, which is what makes the server's share-of-feed cap mean
   * something: with 5 results nearby an advertiser gets at most 1 slot, not a fixed number that
   * would swamp a thin list. Requested only once there is an organic list to sit inside, so an
   * empty area never shows an ad and nothing else.
   */
  const { ads } = useServedAds('discovery_card', {
    feedSize: sorted.length,
    lng: center[0],
    lat: center[1],
    enabled: sorted.length > 0,
  });

  return (
    <TabPage
      title="Nearby"
      backHref="/map"
      backLabel="Back to the map"
      actions={
        <SegmentedControl
          ariaLabel="Sort by"
          value={sort}
          onChange={setSort}
          segments={[
            { value: 'distance', label: 'Distance' },
            { value: 'status', label: 'Status' },
          ]}
        />
      }
    >
      {/* Trending (R1b) sits above the list — it answers "who's worth going to right now?" before
          the raw distance-sorted set. Self-hiding when nothing is trending. */}
      <TrendingRow center={center} />

      {isLoading ? (
        <Rows>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} $h="64px" $radius={16} />
          ))}
        </Rows>
      ) : isError ? (
        <ErrorState title="Couldn’t load nearby" onRetry={() => void refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState icon="🗺️" title="Nothing nearby yet" description="Try widening your area from the map." />
      ) : (
        <Rows>
          {sorted.map((p) => (
            <Row key={p.sessionId} onClick={() => router.push(`/business/${p.businessId}`)}>
              <Avatar name={p.name} src={p.logoUrl} size={44} />
              <Info>
                <Name>
                  {p.name}
                  {/* P-19 — the paid Verified Badge, finally rendered where it was sold. */}
                  {p.verified ? <BadgeCheck size={13} aria-label="Verified business" /> : null}
                </Name>
                <Meta>
                  <StatusChip status={p.status as StatusVariant} size="sm" />
                  <span>· {formatDistance(p.dist)}</span>
                  {/* What this business can actually do — served with the pin, not guessed here. */}
                  {resolveActions(p.modules)[0] ? (
                    <Capability>· {resolveActions(p.modules)[0]!.short}</Capability>
                  ) : null}
                </Meta>
              </Info>
              {p.status !== 'away' && p.etaMin != null ? <Eta className="tnum">{p.etaMin} min</Eta> : null}
            </Row>
          ))}
          {/* Paid placement sits BELOW the organic results, labelled. It is additive — it never
              reorders or displaces what the list would have shown. */}
          <AdSlot ads={ads} surface="discovery_card" />
        </Rows>
      )}
    </TabPage>
  );
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

const Rows = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Row = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised};
  text-align: left;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.color.accentSecondary};
  }
`;
const Info = styled.div`
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 4px;
`;
const Name = styled.span`
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  font-size: 15px;
  svg {
    flex: none;
    color: ${({ theme }) => theme.color.accentSecondary};
  }
`;
const Meta = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Capability = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Eta = styled.span`
  font-weight: 800;
  font-size: 13px;
`;
