'use client';

/**
 * C-5 — "where is my inventory right now".
 *
 * A hub owner hands stock to people who then walk away with it. Until now that was answerable only
 * as a list of names and return dates; this places each holder on the map.
 *
 * The design decision that matters: sellers with NO live session are shown prominently rather than
 * hidden. "We don't know where this is" is the single most useful thing a hub owner can be told —
 * dropping those rows would quietly conceal exactly the stock worth chasing, which is the opposite
 * of what a reconciliation surface is for. So the unlocatable list sits above the map, not below it.
 */
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { AlertTriangle, MapPinOff, PackageSearch } from 'lucide-react';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { formatCents } from '@/lib/money';
import { useHubInventoryMap } from '@/features/livemap/hooks/useMapLayers';
import type { InventoryHolder } from '@/features/livemap/types';
import type { MapMarker } from '@/components/map/Map';

// Mapbox GL touches `window` at import time.
/** Named `HubMap`, not `Map`: a module-level `const Map` shadows the global for the whole file. */
const HubMap = dynamic(() => import('@/components/map/Map').then((m) => m.Map), { ssr: false });

const rel = (iso: string | null) => {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`;
};

export function HubInventoryMap({ hubId }: { hubId: string }) {
  const { data, isLoading, isError, refetch } = useHubInventoryMap(hubId);
  const [selected, setSelected] = useState<string | undefined>();

  const located = useMemo(
    () => (data?.holders ?? []).filter((h): h is InventoryHolder & { lngLat: [number, number] } =>
      h.lngLat !== null,
    ),
    [data],
  );
  const unlocated = useMemo(
    () => (data?.holders ?? []).filter((h) => h.lngLat === null),
    [data],
  );
  const overdue = useMemo(
    () => (data?.holders ?? []).filter((h) => h.status === 'overdue'),
    [data],
  );

  const markers: MapMarker[] = located.map((h) => ({
    id: h.checkoutId,
    lngLat: h.lngLat,
    // Overdue holders render above the rest — they're the ones being looked for.
    priority: h.status === 'overdue' ? 20 : 10,
    node: (
      <HolderPin
        type="button"
        $overdue={h.status === 'overdue'}
        $selected={selected === h.checkoutId}
        onClick={() => setSelected(h.checkoutId)}
        aria-label={`${h.sellerName}, ${h.outstanding} × ${h.productName}, last seen ${rel(h.lastSeenAt)}`}
      >
        <HolderCount className="tnum">{h.outstanding}</HolderCount>
      </HolderPin>
    ),
  }));

  if (isLoading) return <Skeleton $h="360px" $radius={16} />;
  if (isError || !data) {
    return (
      <ErrorState
        title="Couldn’t load your inventory map"
        message="Please try again in a moment."
        onRetry={() => void refetch()}
      />
    );
  }
  if (data.holders.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="No stock is out right now"
        description="When a seller checks out inventory, you’ll see where it is here."
      />
    );
  }

  const totalValue = data.holders.reduce((s, h) => s + h.valueCents, 0);
  const selectedHolder = data.holders.find((h) => h.checkoutId === selected);

  return (
    <Wrap>
      <Stats>
        <Stat>
          <StatValue className="tnum">{formatCents(totalValue)}</StatValue>
          <StatLabel>out with sellers</StatLabel>
        </Stat>
        <Stat>
          <StatValue className="tnum">
            {data.locatedCount}/{data.holders.length}
          </StatValue>
          <StatLabel>located</StatLabel>
        </Stat>
        <Stat $alert={overdue.length > 0}>
          <StatValue className="tnum">{overdue.length}</StatValue>
          <StatLabel>overdue</StatLabel>
        </Stat>
      </Stats>

      {/* Above the map on purpose — stock nobody can see is the reason to open this screen. */}
      {unlocated.length > 0 ? (
        <Unlocated>
          <UnlocatedHead>
            <MapPinOff size={15} aria-hidden />
            <b>
              {unlocated.length} not showing a location
            </b>
          </UnlocatedHead>
          <UnlocatedHint>
            These sellers aren’t broadcasting right now. That’s normal between shifts — worth a
            message if any are overdue.
          </UnlocatedHint>
          <UnlocatedList>
            {unlocated.map((h) => (
              <UnlocatedRow key={h.checkoutId} $overdue={h.status === 'overdue'}>
                {h.status === 'overdue' ? <AlertTriangle size={13} aria-hidden /> : null}
                <span>
                  {h.sellerName} · {h.outstanding} × {h.productName}
                </span>
                <RowValue className="tnum">{formatCents(h.valueCents)}</RowValue>
              </UnlocatedRow>
            ))}
          </UnlocatedList>
        </Unlocated>
      ) : null}

      <MapFrame>
        {located.length > 0 ? (
          <HubMap
            center={located[0]!.lngLat}
            zoom={12}
            markers={markers}
            enhanced={false}
            ariaLabel="Sellers holding your inventory"
          />
        ) : (
          <NoneLocated>
            <PackageSearch size={22} aria-hidden />
            <span>None of your stock is broadcasting a location right now.</span>
          </NoneLocated>
        )}
      </MapFrame>

      {selectedHolder ? (
        <Detail>
          <DetailName>{selectedHolder.sellerName}</DetailName>
          <DetailMeta>
            {selectedHolder.outstanding} × {selectedHolder.productName} ·{' '}
            {formatCents(selectedHolder.valueCents)}
          </DetailMeta>
          <DetailMeta>
            {selectedHolder.quantitySold} sold · last seen {rel(selectedHolder.lastSeenAt)}
            {selectedHolder.status === 'overdue' ? ' · overdue' : ''}
          </DetailMeta>
        </Detail>
      ) : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Stat = styled.div<{ $alert?: boolean }>`
  display: grid;
  gap: 2px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid
    ${({ theme, $alert }) =>
      $alert ? `color-mix(in srgb, ${theme.color.statusAway} 40%, transparent)` : theme.color.line2};
`;
const StatValue = styled.b`
  font-size: 18px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const StatLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Unlocated = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-left: 3px solid ${({ theme }) => theme.color.statusAway};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  border-right: 1px solid ${({ theme }) => theme.color.line};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;
const UnlocatedHead = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textPrimary};

  svg {
    color: ${({ theme }) => theme.color.statusAway};
  }
`;
const UnlocatedHint = styled.p`
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0;
`;
const UnlocatedList = styled.div`
  display: grid;
  gap: 4px;
`;
const UnlocatedRow = styled.div<{ $overdue: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme, $overdue }) =>
    $overdue ? theme.color.statusAway : theme.color.textSecondary};

  > span {
    flex: 1;
    min-width: 0;
  }
`;
const RowValue = styled.b`
  color: ${({ theme }) => theme.color.textPrimary};
`;
const MapFrame = styled.div`
  position: relative;
  height: 340px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const NoneLocated = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
  background: ${({ theme }) => theme.color.surfaceRaised};
`;
const HolderPin = styled.button<{ $overdue: boolean; $selected: boolean }>`
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  color: #fff;
  background: ${({ theme, $overdue }) =>
    $overdue ? theme.color.statusAway : theme.color.statusLive};
  border: 2px solid ${({ theme }) => theme.color.surfaceBase};
  box-shadow: ${({ theme }) => theme.color.shadow};
  transform: ${({ $selected }) => ($selected ? 'scale(1.15)' : 'none')};
  transition: transform 140ms ease;
`;
const HolderCount = styled.span`
  font-size: 12px;
  font-weight: 800;
`;
const Detail = styled.div`
  display: grid;
  gap: 2px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const DetailName = styled.b`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const DetailMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
