'use client';

/**
 * C-10 Map Home — MapShell + live pins + search/category header + Serve Near Me. Tapping a pin
 * opens the status-driven business profile sheet (C-14). Live position/status deltas arrive over
 * the /live socket and patch the pin cache (useViewportNearby). Renders loading / empty / offline
 * states per docs/13 C-10.
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { List, X } from 'lucide-react';
import { MapShell } from '@/components/layout/MapShell';
import { Map, type MapDataLayer, type MapFocus, type MapMarker } from '@/components/map/Map';
import { MapPin, STATUS_PRIORITY } from '@/components/map/MapPin';
import { HubPin, HUB_PIN_PRIORITY } from '@/components/map/HubPin';
import { EventPin, EVENT_PIN_PRIORITY } from '@/components/map/EventPin';
import { IconButton } from '@/components/primitives/IconButton';
import { Banner } from '@/components/feedback/Banner';
import { Button } from '@/components/primitives/Button';
import { useViewportStore } from '@/stores/mapViewport.store';
import { useMapLayersStore } from '@/stores/mapLayers.store';
import { formatCents } from '@/lib/money';
/**
 * The profile sheet is the map's largest dependency and none of it is on the first screen — it opens
 * only once a customer taps a pin. Loading it eagerly is what took this route over its bundle budget
 * once already, and the baseline's own recommendation was to "lazy-load what the first screen does
 * not need". Gated on `selectedId` below, so nothing is fetched until a pin is actually chosen.
 */
const BusinessProfileSheet = dynamic(
  () => import('@/features/business').then((m) => m.BusinessProfileSheet),
  { ssr: false },
);
import type { LngLat } from '@/types';
import { useViewportNearby } from '../hooks/useViewportNearby';
import { useDemandTiles, useMapHubs } from '../hooks/useMapLayers';
import { useNearbyEvents } from '@/features/ai';
import { MapLayerControl } from './MapLayerControl';
import type { HubPinData } from '../types';
import { SearchBar } from './SearchBar';
import { CategoryTabs } from './CategoryTabs';
import { ServeNearMeFab } from './ServeNearMeFab';
import { DiscoverySheet, DISCOVERY_PEEK } from './DiscoverySheet';

export function MapHome({ initialBusinessId }: { initialBusinessId?: string }) {
  const router = useRouter();
  const setViewport = useViewportStore((s) => s.setViewport);
  const zoom = useViewportStore((s) => s.zoom);
  const { pins, isLoading, isError, refetch, center } = useViewportNearby();
  // C-1/C-3: layer data. Each hook no-ops when its layer is switched off.
  const { data: hubs } = useMapHubs();
  const { data: demand } = useDemandTiles();
  const showBusinesses = useMapLayersStore((s) => s.businesses);
  const showHubs = useMapLayersStore((s) => s.hubs);
  const showDemand = useMapLayersStore((s) => s.demand);
  const showEvents = useMapLayersStore((s) => s.events);
  // E-4: the map's fourth layer, deferred at C-4 because no event entity existed yet.
  const { data: events } = useNearbyEvents();
  const [selectedHub, setSelectedHub] = useState<HubPinData | undefined>();
  const [selectedId, setSelectedId] = useState<string | undefined>(initialBusinessId);
  const [flyTo, setFlyTo] = useState<{ center: LngLat; zoom?: number; nonce: number }>();
  const [focus, setFocus] = useState<MapFocus>();
  // The Discovery Sheet's current camera clearance — pins are kept above it. Seeded to the peek so
  // the nearest pins aren't hidden behind the sheet on first paint.
  const [discoveryPad, setDiscoveryPad] = useState(DISCOVERY_PEEK);
  // The peek is no longer a fixed height (it scales with viewport and collapses when empty), so the
  // CTA follows the reported value instead of a constant that would leave it floating.
  const [peekHeight, setPeekHeight] = useState(DISCOVERY_PEEK);

  /** Sheet-aware select: ease the pin into the strip left visible above the profile sheet. */
  const selectPin = (businessId: string, lngLat: LngLat) => {
    setSelectedHub(undefined);
    setSelectedId(businessId);
    const sheetHeight = Math.min(Math.round(window.innerHeight * 0.42), 420);
    setFocus({ center: lngLat, padding: { bottom: sheetHeight }, nonce: Date.now() });
  };

  /**
   * C-1: selecting a hub. Deliberately a lightweight card rather than reusing the business profile
   * sheet — a hub answers "what can I pick up here", which is a different question from "what is
   * this vendor selling", and forcing one sheet to do both would serve neither.
   */
  const selectHub = (hub: HubPinData) => {
    setSelectedId(undefined);
    setSelectedHub(hub);
    setFocus({ center: hub.lngLat, padding: { bottom: 260 }, nonce: Date.now() });
  };

  /**
   * Open the deep-linked business when the route changes to a different one.
   *
   * `useState(initialBusinessId)` alone reads the prop only on FIRST mount, and `/map` and
   * `/business/[id]` both render this same component — so navigating between them reuses the
   * instance and the initial state never updates. The result was a promoted ad that navigated
   * correctly and then showed the plain map, with no profile sheet.
   *
   * Keyed on `initialBusinessId`, so closing the sheet while staying on the route does NOT
   * reopen it: the prop has not changed, the effect does not re-run.
   */
  useEffect(() => {
    if (initialBusinessId) setSelectedId(initialBusinessId);
  }, [initialBusinessId]);

  const closeSheet = () => {
    setSelectedId(undefined);
    // Release the profile-sheet padding back to whatever the Discovery Sheet needs, no re-center.
    setFocus({ padding: { bottom: discoveryPad }, nonce: Date.now() });
  };

  /** Discovery Sheet detent settled: keep pins clear of it (unless a profile sheet owns the camera). */
  const onDiscoveryDetent = (pad: number) => {
    setDiscoveryPad(pad);
    if (!selectedId) setFocus({ padding: { bottom: pad }, nonce: Date.now() });
  };

  /**
   * C-1/C-4: business pins and hub pins share one marker array so they cluster against each other
   * rather than overlapping — two independent layers would let a hub badge sit exactly on top of a
   * vendor's avatar with neither aware of the other.
   */
  const businessMarkers: MapMarker[] = showBusinesses
    ? pins.map((p) => ({
        id: p.sessionId,
        lngLat: p.lngLat,
        // Live pins render above closed ones so a driving vendor is never occluded (§9.3).
        priority: STATUS_PRIORITY[p.status],
        node: (
          <MapPin
            name={p.name}
            logoUrl={p.logoUrl}
            status={p.status}
            etaLabel={
              p.status === 'away' ? undefined : p.etaMin != null ? `${p.etaMin} min` : undefined
            }
            onClick={() => selectPin(p.businessId, p.lngLat)}
          />
        ),
      }))
    : [];

  const hubMarkers: MapMarker[] = showHubs
    ? (hubs ?? []).map((h) => ({
        id: `hub:${h.hubId}`,
        lngLat: h.lngLat,
        priority: HUB_PIN_PRIORITY,
        node: (
          <HubPin
            name={h.name}
            itemCount={h.itemCount}
            fromUnitValueCents={h.fromUnitValueCents}
            selected={selectedHub?.hubId === h.hubId}
            onClick={() => selectHub(h)}
          />
        ),
      }))
    : [];

  const eventMarkers: MapMarker[] = showEvents
    ? (events ?? []).map((e) => ({
        id: `event:${e.id}`,
        lngLat: e.lngLat,
        priority: EVENT_PIN_PRIORITY,
        node: (
          <EventPin
            name={e.name}
            expectedAttendance={e.expectedAttendance}
            hoursUntil={(new Date(e.startsAt).getTime() - Date.now()) / 3_600_000}
          />
        ),
      }))
    : [];

  // All three pin layers share one array so they cluster against each other rather than overlapping.
  const markers = [...businessMarkers, ...hubMarkers, ...eventMarkers];

  /**
   * C-3: demand as a GL heatmap rather than markers. There can be hundreds of tiles, and DOM nodes
   * for ambient signal would stall exactly the low-end devices this product targets.
   *
   * `weight` drives intensity, so a tile carrying four queue joins burns hotter than one with a
   * single wave — the visual matches the weighting the server already applied.
   */
  const dataLayers: MapDataLayer[] = showDemand
    ? [
        {
          id: 'demand-heat',
          type: 'heatmap',
          points: (demand ?? []).map((t) => ({ lngLat: t.lngLat, weight: t.weight })),
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 20, 1],
            'heatmap-intensity': 1.1,
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 16, 48],
            // Transparent at the low end so quiet areas stay readable map rather than a wash.
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0,0,0,0)',
              0.2, 'rgba(124,92,255,0.20)',
              0.5, 'rgba(124,92,255,0.42)',
              0.8, 'rgba(255,138,76,0.55)',
              1, 'rgba(255,92,92,0.70)',
            ],
            'heatmap-opacity': 0.85,
          },
        },
      ]
    : [];

  return (
    <MapShell
      header={
        <>
          <TopRow>
            <SearchBar />
            {/* C-4: the layer switcher sits with the other map-level controls, not buried in
                settings — it changes what the map IS, which is a per-glance decision. */}
            <MapLayerControl />
            <IconButton
              label="List view"
              variant="glass"
              icon={<List size={18} />}
              onClick={() => router.push('/map/list')}
            />
          </TopRow>
          <CategoryTabs />
          {isError ? (
            <Banner tone="warning" action={<Button size="compact" variant="secondary" onClick={() => void refetch()}>Retry</Button>}>
              Couldn’t refresh the map — showing last-known pins.
            </Banner>
          ) : null}
          {/* "Nothing nearby" now lives in the Discovery Sheet's count line + empty state, not a
              second card up here. */}
        </>
      }
      floatingAction={
        <ServeNearMeFab
          autoLocate={!initialBusinessId}
          onLocate={(c) => {
            setViewport({
              center: c,
              zoom: Math.max(zoom, 14),
              bounds: {
                sw: [c[0] - 0.03, c[1] - 0.02],
                ne: [c[0] + 0.03, c[1] + 0.02],
              },
            });
            setFlyTo({ center: c, zoom: 14, nonce: Date.now() });
          }}
        />
      }
      floatingActionBottomOffset={peekHeight}
      overlay={
        <>
          <DiscoverySheet
            pins={pins}
            center={center}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            onSelect={selectPin}
            onDetentChange={onDiscoveryDetent}
            onPeekHeightChange={setPeekHeight}
          />
          {selectedId ? (
            <BusinessProfileSheet businessId={selectedId} open onClose={closeSheet} />
          ) : null}
          {selectedHub ? (
            <HubCard
              hub={selectedHub}
              onClose={() => setSelectedHub(undefined)}
              onBrowse={() => router.push('/seller')}
            />
          ) : null}
        </>
      }
    >
      <Map
        center={center}
        markers={markers}
        dataLayers={dataLayers}
        flyTo={flyTo}
        focus={focus}
        onMoveEnd={(v) => setViewport(v)}
        ariaLabel="Businesses and pickup hubs near you"
      />
    </MapShell>
  );
}

/**
 * C-1 — the hub detail card.
 *
 * Answers exactly one question: is it worth walking there? So it leads with what's available and
 * ends with a way to browse it, and says nothing else. An empty hub says so outright rather than
 * showing "0 items", which reads as a failure to load.
 */
function HubCard({
  hub,
  onClose,
  onBrowse,
}: {
  hub: HubPinData;
  onClose: () => void;
  onBrowse: () => void;
}) {
  return (
    <Card role="dialog" aria-label={`${hub.name} pickup hub`}>
      <CardHead>
        <div>
          <CardKicker>Pickup hub</CardKicker>
          <CardName>{hub.name}</CardName>
          {hub.address ? <CardAddress>{hub.address}</CardAddress> : null}
        </div>
        <IconButton label="Close" variant="glass" icon={<X size={16} />} onClick={onClose} />
      </CardHead>

      {hub.itemCount > 0 ? (
        <>
          <CardStats>
            <Stat>
              <StatValue className="tnum">{hub.itemCount}</StatValue>
              <StatLabel>item{hub.itemCount === 1 ? '' : 's'}</StatLabel>
            </Stat>
            <Stat>
              <StatValue className="tnum">{hub.unitCount}</StatValue>
              <StatLabel>units</StatLabel>
            </Stat>
            {hub.fromUnitValueCents != null ? (
              <Stat>
                <StatValue className="tnum">{formatCents(hub.fromUnitValueCents)}</StatValue>
                <StatLabel>from</StatLabel>
              </Stat>
            ) : null}
          </CardStats>
          <Button fullWidth onClick={onBrowse}>
            Browse what&rsquo;s here
          </Button>
        </>
      ) : (
        <CardEmpty>
          Nothing available here right now. Hubs restock often — try another pin nearby.
        </CardEmpty>
      )}
    </Card>
  );
}

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  > *:first-child {
    flex: 1;
  }
`;

/**
 * Sits above the Discovery Sheet's peek rather than replacing it — the hub card is a transient
 * answer to one tap, not a mode the user has to dismiss to get their map back.
 */
const Card = styled.div`
  position: absolute;
  left: ${({ theme }) => theme.space[3]}px;
  right: ${({ theme }) => theme.space[3]}px;
  bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  z-index: 20;
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  box-shadow: ${({ theme }) => theme.color.shadow};
  max-width: 520px;
  margin: 0 auto;
`;
const CardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const CardKicker = styled.span`
  display: block;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.accentSecondary};
`;
const CardName = styled.b`
  display: block;
  font-size: 16px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const CardAddress = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const CardStats = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const Stat = styled.div`
  display: grid;
  gap: 1px;
`;
const StatValue = styled.b`
  font-size: 17px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const StatLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const CardEmpty = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0;
`;
