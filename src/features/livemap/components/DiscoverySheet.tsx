'use client';

/**
 * C-10 Discovery Sheet (MAP_REDESIGN_SPECIFICATION §7.2) — the browse layer the map was missing.
 * The map answered "where"; this answers "which of the 124." A persistent, NON-MODAL bottom sheet
 * with three detents:
 *
 *   peek (132px) — count + serving count + the single nearest result. Glass; map fully interactive.
 *   half (44%)   — sorted, scrollable result list + a sort control. Solid; map still interactive.
 *   full (88%)   — list + a "serving now" filter; the map dims behind a scrim and its gestures pause.
 *
 * Non-modal is the whole point (and the reason it doesn't violate "map stays hero"): at peek/half
 * the wrapper is pointer-transparent, so pans and pin taps land on the map underneath. Only `full`
 * draws a scrim. It reports its detent height so MapHome can pad the camera and keep pins above it.
 *
 * This is deliberately NOT the `Sheet` primitive — that one is modal (scrim + focus trap) and
 * dismissible; this is neither. It docks ABOVE the OrbitNav tab bar and can never be dismissed.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { BadgeCheck, Star } from 'lucide-react';
import { Avatar } from '@/components/primitives/Avatar';
import { StatusChip, type StatusVariant } from '@/components/primitives/StatusChip';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { glassSurface } from '@/styles/glass';
import { distanceMeters } from '@/lib/geo';
import { resolveActions } from '@/features/business/businessActions';
import { AdSlot, useServedAds } from '@/features/ads';
import type { LngLat } from '@/types';
import type { MapPinData } from '../types';

/**
 * Peek height. Exported so MapHome can seed state and lift the Serve Near Me CTA above the sheet.
 *
 * This used to be a flat 132px in every situation, which cost the map twice on a real phone:
 *  - With no results the peek body renders NOTHING, so 132px of glass sat there holding one line
 *    of text ("0 nearby") and a lot of nothing.
 *  - A fixed pixel budget is a bigger share of a short viewport, and a phone's viewport is short
 *    exactly when the browser's URL bar is showing.
 * So it now scales with the viewport and collapses when there is nothing to preview.
 */
export const DISCOVERY_PEEK = 132;
/** Just the grab handle + the count line — nothing below it to make room for. */
const DISCOVERY_PEEK_BARE = 72;

/**
 * @param vh          visible viewport height
 * @param hasPreview  whether the peek body has something in it (a result, skeleton, or error)
 */
export function discoveryPeekHeight(vh: number, hasPreview: boolean): number {
  if (!hasPreview) return DISCOVERY_PEEK_BARE;
  // Never more than ~17% of the screen, and never so small the result row clips.
  return Math.round(Math.min(DISCOVERY_PEEK, Math.max(104, vh * 0.17)));
}
/** The OrbitNav dock height the sheet sits above (matches MapShell's FAB offset). */
const TAB_BAR = 78;

type Detent = 'peek' | 'half' | 'full';
const ORDER: Detent[] = ['peek', 'half', 'full'];
type Sort = 'distance' | 'status';
const STATUS_RANK: Record<MapPinData['status'], number> = { driving: 0, parked: 1, away: 2 };

export interface DiscoverySheetProps {
  pins: MapPinData[];
  center: LngLat;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Open the business profile for a tapped result (and fly its pin). */
  onSelect: (businessId: string, lngLat: LngLat) => void;
  /** Fires on each detent settle with the height the camera should keep clear (capped at half). */
  onDetentChange?: (cameraPadding: number) => void;
  /**
   * The peek's current height, which now varies with viewport and content. The floating CTA docks
   * above it, so it has to follow — a hardcoded offset would float in space once the peek collapses.
   */
  onPeekHeightChange?: (peekHeight: number) => void;
}

export function DiscoverySheet({
  pins,
  center,
  isLoading,
  isError,
  onRetry,
  onSelect,
  onDetentChange,
  onPeekHeightChange,
}: DiscoverySheetProps) {
  const [detent, setDetent] = useState<Detent>('peek');
  const [vh, setVh] = useState(800);
  const [drag, setDrag] = useState(0);
  const [sort, setSort] = useState<Sort>('distance');
  const [servingOnly, setServingOnly] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0); // px/ms, +down

  useEffect(() => {
    // visualViewport is what the user can actually SEE — it shrinks for the mobile URL bar and the
    // on-screen keyboard, neither of which window.innerHeight reliably reflects. The sheet's
    // detents are a share of the screen, so measuring the wrong box makes the map too small.
    const vv = window.visualViewport;
    const update = () => setVh(vv?.height ?? window.innerHeight);
    update();
    vv?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // The peek body only has something to show when there's a nearest result, a skeleton, or an error.
  const hasPreview = pins.length > 0 || isLoading || isError;

  const detentHeight = useCallback(
    (d: Detent): number =>
      d === 'peek'
        ? discoveryPeekHeight(vh, hasPreview)
        : d === 'half'
          ? Math.round(vh * 0.44)
          : Math.round(vh * 0.88),
    [vh, hasPreview],
  );

  // Report the camera-clearance height on every settle. Capped at the half height: at `full` the map
  // is hidden behind the sheet, so padding it further just shoves pins off-screen for no gain.
  useEffect(() => {
    const raw = detentHeight(detent);
    onDetentChange?.(Math.min(raw, detentHeight('half')) + TAB_BAR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detent, vh, hasPreview]);

  // Keep the floating CTA docked to the peek as it grows/collapses with content and viewport.
  useEffect(() => {
    onPeekHeightChange?.(discoveryPeekHeight(vh, hasPreview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vh, hasPreview]);

  const base = detentHeight(detent);
  const peekH = detentHeight('peek');
  const fullH = detentHeight('full');
  // Live height while dragging, with rubber-band resistance past both ends (0.35, per §10.2).
  const raw = base - drag;
  const height = rubberBand(raw, peekH, fullH);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    lastY.current = e.clientY;
    lastT.current = e.timeStamp;
    velocity.current = 0;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dt = e.timeStamp - lastT.current;
    if (dt > 0) velocity.current = (e.clientY - lastY.current) / dt;
    lastY.current = e.clientY;
    lastT.current = e.timeStamp;
    setDrag(e.clientY - startY.current);
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    // Project the release ~120ms along its velocity so a flick carries to the next detent.
    const projected = base - drag - velocity.current * 120;
    let nearest: Detent = detent;
    let best = Infinity;
    for (const d of ORDER) {
      const dist = Math.abs(detentHeight(d) - projected);
      if (dist < best) {
        best = dist;
        nearest = d;
      }
    }
    setDrag(0);
    setDetent(nearest);
  };

  const cycle = () => setDetent((d) => (d === 'peek' ? 'half' : d === 'half' ? 'full' : 'peek'));
  const onGrabKey = (e: React.KeyboardEvent) => {
    const i = ORDER.indexOf(detent);
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDetent(ORDER[Math.min(i + 1, ORDER.length - 1)]!);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDetent(ORDER[Math.max(i - 1, 0)]!);
    }
  };

  const sorted = useMemo(() => {
    const withDist = pins.map((p) => ({ ...p, dist: distanceMeters(center, p.lngLat) }));
    if (servingOnly) {
      // Filter in place before sorting so the count line and list agree.
      for (let i = withDist.length - 1; i >= 0; i--) {
        if (withDist[i]!.status === 'away') withDist.splice(i, 1);
      }
    }
    withDist.sort((a, b) =>
      sort === 'distance'
        ? a.dist - b.dist
        : STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.dist - b.dist,
    );
    return withDist;
  }, [pins, center, sort, servingOnly]);

  const total = pins.length;
  const serving = pins.filter((p) => p.status !== 'away').length;
  const top = useMemo(() => {
    if (pins.length === 0) return undefined;
    return [...pins]
      .map((p) => ({ ...p, dist: distanceMeters(center, p.lngLat) }))
      .sort((a, b) => a.dist - b.dist)[0];
  }, [pins, center]);

  const expanded = detent !== 'peek';

  /**
   * P-18 — the map's own paid surface. `feedSize` is the real organic count so the server's
   * share-of-feed cap scales with what the user is actually looking at, and it is requested only
   * when the sheet is expanded enough to have a list worth sitting inside.
   */
  const { ads } = useServedAds('map_banner', {
    feedSize: sorted.length,
    lng: center[0],
    lat: center[1],
    enabled: expanded && sorted.length > 0,
  });

  return (
    <>
      {detent === 'full' ? <Scrim onClick={() => setDetent('half')} aria-hidden /> : null}
      <Wrapper>
        <Panel
          role="region"
          aria-label="Nearby businesses"
          $height={height}
          $dragging={dragging.current}
          $solid={expanded}
        >
          <Grab
            type="button"
            aria-label={expanded ? 'Collapse nearby list' : 'Expand nearby list'}
            aria-expanded={expanded}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={() => !dragging.current && cycle()}
            onKeyDown={onGrabKey}
          >
            <Handle />
          </Grab>

          <Count>
            {isLoading ? (
              'Finding nearby…'
            ) : isError ? (
              'Couldn’t load nearby'
            ) : (
              <>
                <b className="tnum">{total}</b> nearby
                {serving > 0 ? (
                  <>
                    {' '}
                    · <Serving className="tnum">{serving} serving now</Serving>
                  </>
                ) : null}
              </>
            )}
          </Count>

          {!expanded ? (
            // Peek: browse begins before any gesture — the single nearest result.
            <PeekBody>
              {isError ? (
                <ErrorState title="Couldn’t load nearby" onRetry={onRetry} />
              ) : top ? (
                <ResultRow item={top} onSelect={onSelect} />
              ) : isLoading ? (
                <Skeleton $h="64px" $radius={16} />
              ) : null}
            </PeekBody>
          ) : (
            <Body>
              <Controls>
                <SegmentedControl
                  ariaLabel="Sort by"
                  value={sort}
                  onChange={setSort}
                  segments={[
                    { value: 'distance', label: 'Distance' },
                    { value: 'status', label: 'Status' },
                  ]}
                />
                {detent === 'full' ? (
                  <FilterToggle
                    type="button"
                    aria-pressed={servingOnly}
                    $on={servingOnly}
                    onClick={() => setServingOnly((v) => !v)}
                  >
                    Serving now
                  </FilterToggle>
                ) : null}
              </Controls>

              <List>
                {isLoading ? (
                  Array.from({ length: 6 }, (_, i) => <Skeleton key={i} $h="64px" $radius={16} />)
                ) : isError ? (
                  <ErrorState title="Couldn’t load nearby" onRetry={onRetry} />
                ) : sorted.length === 0 ? (
                  <EmptyState
                    icon="🗺️"
                    title={servingOnly ? 'Nobody serving right now' : 'Nothing nearby yet'}
                    description={
                      servingOnly ? 'Turn off the filter or widen your area.' : 'Try widening your area from the map.'
                    }
                  />
                ) : (
                  <>
                    {sorted.map((p) => (
                      <ResultRow key={p.sessionId} item={p} onSelect={onSelect} />
                    ))}
                    {/* Paid placement sits below the organic results, labelled, and only when the
                        sheet is actually expanded — an ad in a peek that shows one result would be
                        half the surface. Additive, never a reorder. */}
                    <AdSlot ads={ads} surface="map_banner" />
                  </>
                )}
              </List>
            </Body>
          )}
        </Panel>
      </Wrapper>
    </>
  );
}

/** One result — used both as the peek's top result and as a list row. */
function ResultRow({
  item,
  onSelect,
}: {
  item: MapPinData & { dist: number };
  onSelect: (businessId: string, lngLat: LngLat) => void;
}) {
  const cap = resolveActions(item.modules)[0];
  return (
    <Row type="button" onClick={() => onSelect(item.businessId, item.lngLat)}>
      <Avatar name={item.name} src={item.logoUrl} size={44} />
      <Info>
        <Name>
                  <span>{item.name}</span>
                  {/* P-19 — the paid Verified Badge, finally rendered where it was sold. */}
                  {item.verified ? <BadgeCheck size={13} aria-label="Verified business" /> : null}
                </Name>
        <Meta>
          <StatusChip status={item.status as StatusVariant} size="sm" />
          <span>· {formatDistance(item.dist)}</span>
          {item.rating !== undefined ? (
            <Rating>
              · <Star size={11} fill="currentColor" /> <b className="tnum">{item.rating.toFixed(1)}</b>
            </Rating>
          ) : null}
          {cap ? <Capability>· {cap.short}</Capability> : null}
        </Meta>
      </Info>
      {item.status !== 'away' && item.etaMin != null ? (
        <Eta className="tnum">{item.etaMin} min</Eta>
      ) : null}
    </Row>
  );
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Resist motion past either end so the sheet feels physical rather than clamped (§10.2). */
function rubberBand(value: number, min: number, max: number): number {
  if (value < min) return min - (min - value) * 0.35;
  if (value > max) return max + (value - max) * 0.35;
  return value;
}

const Wrapper = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 890; /* above map + header (10), below OrbitNav dock (900) and the modal Sheet (920) */
  pointer-events: none; /* NON-MODAL: only the panel itself catches events; the map stays live */
`;
const Scrim = styled.div`
  position: fixed;
  inset: 0;
  bottom: calc(${TAB_BAR}px + env(safe-area-inset-bottom, 0px));
  z-index: 889;
  background: rgba(0, 0, 0, 0.45);
  animation: fade ${({ theme }) => theme.motion.sheet}ms ${({ theme }) => theme.motion.easeOut};
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
const Panel = styled.div<{ $height: number; $dragging: boolean; $solid: boolean }>`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(${TAB_BAR}px + env(safe-area-inset-bottom, 0px));
  width: 100%;
  max-width: 560px;
  height: ${({ $height }) => $height}px;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-top-left-radius: ${({ theme }) => theme.radius.card}px;
  border-top-right-radius: ${({ theme }) => theme.radius.card}px;
  transition: ${({ $dragging, theme }) =>
    $dragging ? 'none' : `height ${theme.motion.sheet}ms ${theme.motion.easeOut}`};
  ${({ theme, $solid }) =>
    $solid
      ? css`
          background: ${theme.color.surfaceRaised};
        `
      : glassSurface(theme)}
  /* Upward-facing separation from the map — a downward shadow would be invisible here. */
  box-shadow: 0 -6px 32px -8px rgba(0, 0, 0, 0.24);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
const Grab = styled.button`
  display: grid;
  place-items: center;
  padding: 10px 0 6px;
  border: none;
  background: transparent;
  cursor: grab;
  touch-action: none;
  &:active {
    cursor: grabbing;
  }
`;
const Handle = styled.span`
  width: 36px;
  height: 5px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.line2};
`;
const Count = styled.p`
  flex: none;
  padding: 0 ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[3]}px;
  font-size: 15px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    font-weight: 800;
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Serving = styled.span`
  font-weight: 800;
  color: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 55%, ${theme.color.textPrimary})`};
`;
const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: 0 ${({ theme }) => theme.space[5]}px;
`;
const Controls = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const FilterToggle = styled.button<{ $on: boolean }>`
  flex: none;
  height: 32px;
  padding: 0 14px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $on }) => ($on ? 'transparent' : theme.color.line2)};
  background: ${({ theme, $on }) => ($on ? theme.color.statusLive : 'transparent')};
  color: ${({ theme, $on }) => ($on ? '#fff' : theme.color.textSecondary)};
  transition: background ${({ theme }) => theme.motion.standard}ms;
`;
const List = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  grid-auto-rows: max-content;
  padding-bottom: ${({ theme }) => theme.space[5]}px;
  overscroll-behavior: contain;
`;
const PeekBody = styled.div`
  flex: none;
  padding: 0 ${({ theme }) => theme.space[5]}px;
`;
const Row = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surfaceRaised2};
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
  min-width: 0;
  /* The name truncates; the badge never does — it is the shortest and most load-bearing part. */
  > :first-child {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
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
const Rating = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusWarning} 55%, ${theme.color.textPrimary})`};
`;
const Capability = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Eta = styled.span`
  flex: none;
  font-weight: 800;
  font-size: 13px;
`;
