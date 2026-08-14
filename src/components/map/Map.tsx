'use client';

/**
 * Map (docs/06 §2.6h, docs/13 C-10) — the single Mapbox GL JS wrapper, upgraded with the hero
 * scene's treatment (LP-2) adapted for the product surface:
 *  - capability ladder: cinematic tier (desktop) gets the dusk camera (pitch/bearing), 3D
 *    building extrusions + fog, and a 3D/2D toggle; lite tier (mobile/low-end) stays flat & fast
 *  - `focus` camera API: eased recenter with optional padding, so callers can keep a selected
 *    pin visible above a bottom sheet (the key mobile interaction)
 *  - marker glide: live position deltas ease pins to their new location instead of teleporting
 *    (instant under prefers-reduced-motion)
 *  - React markers via portals; provider isolated so a MapLibre swap stays a one-file change;
 *    graceful placeholder without a token. Client-only: mount via next/dynamic({ ssr: false }).
 */
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled, { useTheme } from 'styled-components';
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';
import { env, isMapConfigured } from '@/lib/env';
import { DEFAULT_CENTER, DEFAULT_ZOOM, getMapStyle } from '@/lib/map/mapbox';
import { applyBasemapStyle } from '@/lib/map/basemap';
import { useMapCapability } from '@/lib/map/capability';
import {
  CINEMATIC_CAMERA,
  EASE_DECELERATE,
  FLAT_CAMERA,
  installCinematicLayers,
} from '@/lib/map/cinematic';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ClusterPin } from './ClusterPin';
import type { LngLat } from '@/types';

export interface MapMarker {
  id: string;
  lngLat: LngLat;
  node: ReactNode;
  /**
   * Stacking priority — higher renders above lower (docs §9.3, via STATUS_PRIORITY). A live
   * driving vendor must never be occluded by a closed one. Applied to the marker element's
   * z-index; omit for the default 0.
   */
  priority?: number;
}

export interface MapViewport {
  center: LngLat;
  zoom: number;
  bounds: { sw: LngLat; ne: LngLat };
}

/**
 * C-3 — a data-driven layer, for things there are too many of to be React markers.
 *
 * Demand is thousands of weighted points; rendering those as DOM nodes would stall the main thread
 * on exactly the low-end devices this product targets. A GL heatmap layer draws them on the GPU for
 * free. Markers stay React for anything tappable and identity-bearing (a business, a hub); this is
 * for ambient signal.
 *
 * Kept deliberately narrow — points and a paint object — rather than exposing Mapbox's full layer
 * API, so the MapLibre swap the wrapper exists to enable stays a one-file change.
 */
export interface MapDataLayer {
  id: string;
  /** GeoJSON features; `weight` on a point drives heatmap intensity. */
  points: Array<{ lngLat: LngLat; weight?: number; properties?: Record<string, unknown> }>;
  type: 'heatmap' | 'circle';
  paint: Record<string, unknown>;
  /** Drawn beneath this layer id when present — keeps ambient data under labels and markers. */
  beforeId?: string;
  visible?: boolean;
}

export interface MapPadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/** Eased camera move; omit `center` to adjust only padding/zoom (e.g. sheet open/close). */
export interface MapFocus {
  center?: LngLat;
  zoom?: number;
  padding?: MapPadding;
  nonce: number;
}

export interface MapProps {
  center?: LngLat;
  zoom?: number;
  markers?: MapMarker[];
  /** C-3: GPU-drawn ambient data (demand heat). See `MapDataLayer`. */
  dataLayers?: MapDataLayer[];
  /** Imperative recenter: bump `nonce` to fly to a new center (e.g. Serve Near Me). */
  flyTo?: { center: LngLat; zoom?: number; nonce: number };
  /** Richer eased camera API (supersedes flyTo; both are honored). */
  focus?: MapFocus;
  /** Cinematic tier opt-out for utility embeds that must stay flat. */
  enhanced?: boolean;
  onMoveEnd?: (viewport: MapViewport) => void;
  onLoad?: () => void;
  ariaLabel?: string;
}

interface MarkerEntry {
  marker: MapboxMarker;
  el: HTMLElement;
  current: LngLat;
  target: LngLat;
}

interface ClusterGroup {
  id: string;
  lngLat: LngLat;
  count: number;
}

const GLIDE_EPSILON = 1e-7;
/** Pins whose screen positions are within this many px collapse into a ClusterPin. */
const CLUSTER_RADIUS_PX = 56;

/** Greedy screen-space grouping — O(n²) is fine at viewport pin counts (tens, not thousands). */
function groupByScreenDistance(
  items: { id: string; lngLat: LngLat; x: number; y: number }[],
): { clusters: ClusterGroup[]; clustered: string[] } {
  const assigned = new Set<string>();
  const clusters: ClusterGroup[] = [];
  const clustered: string[] = [];
  for (const seed of items) {
    if (assigned.has(seed.id)) continue;
    const members = items.filter(
      (m) => !assigned.has(m.id) && Math.hypot(m.x - seed.x, m.y - seed.y) <= CLUSTER_RADIUS_PX,
    );
    if (members.length < 2) continue;
    members.forEach((m) => {
      assigned.add(m.id);
      clustered.push(m.id);
    });
    const lng = members.reduce((s, m) => s + m.lngLat[0], 0) / members.length;
    const lat = members.reduce((s, m) => s + m.lngLat[1], 0) / members.length;
    clusters.push({
      id: members.map((m) => m.id).sort().join('+'),
      lngLat: [lng, lat],
      count: members.length,
    });
  }
  return { clusters, clustered };
}

export function Map({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  markers = [],
  dataLayers = [],
  flyTo,
  focus,
  enhanced = true,
  onMoveEnd,
  onLoad,
  ariaLabel = 'Map',
}: MapProps) {
  const theme = useTheme();
  const capability = useMapCapability();
  const cinematic = enhanced && capability.tier === 'cinematic';
  const reducedRef = useRef(false);
  reducedRef.current = capability.reducedMotion;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Record<string, MarkerEntry>>({});
  const clusterMarkerRef = useRef<Record<string, { marker: MapboxMarker; el: HTMLElement }>>({});
  const markersDataRef = useRef<MapMarker[]>([]);
  /** Ids currently added to the GL style, so removals can be reconciled (C-3). */
  const dataLayerIdsRef = useRef<string[]>([]);
  const glideRaf = useRef(0);
  const glideLast = useRef(0);
  const themeModeRef = useRef(theme.mode);
  themeModeRef.current = theme.mode;
  const cinematicRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [pitched, setPitched] = useState(true);
  const [clusterInfo, setClusterInfo] = useState<{ clusters: ClusterGroup[]; clustered: string[] }>(
    { clusters: [], clustered: [] },
  );
  const [, force] = useState(0);

  markersDataRef.current = markers;

  /** Recompute overlap clusters from projected screen positions (moveend + markers change). */
  const computeClusters = () => {
    const map = mapRef.current;
    if (!map) return;
    const items = markersDataRef.current.map((m) => {
      const p = map.project(m.lngLat);
      return { id: m.id, lngLat: m.lngLat, x: p.x, y: p.y };
    });
    const next = groupByScreenDistance(items);
    setClusterInfo((prev) => {
      const sig = (v: typeof next) =>
        v.clusters.map((c) => `${c.id}:${c.count}`).join('|');
      return sig(prev) === sig(next) ? prev : next;
    });
  };
  const computeClustersRef = useRef(computeClusters);
  computeClustersRef.current = computeClusters;

  // Init once per capability resolution (lite → cinematic upgrades remount the canvas once,
  // before any real interaction — capability resolves on first client effect).
  useEffect(() => {
    if (!isMapConfigured || !containerRef.current) return;
    cinematicRef.current = cinematic;
    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = env.mapboxToken!;
      const cam = cinematic ? CINEMATIC_CAMERA : FLAT_CAMERA;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: getMapStyle(themeModeRef.current),
        center,
        zoom,
        pitch: cam.pitch,
        bearing: cam.bearing,
        attributionControl: false,
        dragRotate: cinematic,
        pitchWithRotate: cinematic,
      });
      mapRef.current = map;

      // Persistent: repaints the basemap (and reinstalls cinematic layers) after any style load.
      map.on('style.load', () => {
        if (cancelled) return;
        applyBasemapStyle(map, themeModeRef.current);
        if (cinematicRef.current) {
          installCinematicLayers(map, themeModeRef.current);
        }
      });

      map.on('load', () => {
        if (cancelled) return;
        setReady(true);
        computeClustersRef.current();
        onLoad?.();
      });
      map.on('moveend', () => computeClustersRef.current());
      map.on('moveend', () => {
        if (!onMoveEnd) return;
        const c = map.getCenter();
        const b = map.getBounds();
        if (!b) return;
        onMoveEnd({
          center: [c.lng, c.lat],
          zoom: map.getZoom(),
          bounds: { sw: [b.getWest(), b.getSouth()], ne: [b.getEast(), b.getNorth()] },
        });
      });
    })();

    const activeMarkers = markerRef.current;
    const activeClusters = clusterMarkerRef.current;
    return () => {
      cancelled = true;
      cancelAnimationFrame(glideRaf.current);
      glideRaf.current = 0;
      Object.values(activeMarkers).forEach(({ marker }) => marker.remove());
      Object.values(activeClusters).forEach(({ marker }) => marker.remove());
      markerRef.current = {};
      clusterMarkerRef.current = {};
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // Re-init only when the tier resolves; center/zoom/theme have dedicated effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinematic]);

  // React to theme changes. Both themes share one style URL (the palette carries light/dark), so
  // this is a repaint rather than a `setStyle` teardown — no layer reload, no flash, and the
  // cinematic layers survive instead of needing reinstallation.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    applyBasemapStyle(map, theme.mode);
    if (cinematicRef.current) installCinematicLayers(map, theme.mode);
  }, [theme.mode, ready]);

  // Legacy imperative recenter (Serve Near Me / deep-link focus) — now eased.
  useEffect(() => {
    const map = mapRef.current;
    if (ready && flyTo && map) {
      map.easeTo({
        center: flyTo.center,
        zoom: flyTo.zoom ?? map.getZoom(),
        duration: 900,
        easing: EASE_DECELERATE,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo?.nonce, ready]);

  // Focus API: eased center/zoom/padding — padding keeps a selected pin above a bottom sheet.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !focus || !map) return;
    map.easeTo({
      ...(focus.center ? { center: focus.center } : {}),
      ...(focus.zoom !== undefined ? { zoom: focus.zoom } : {}),
      ...(focus.padding
        ? { padding: { top: 0, right: 0, bottom: 0, left: 0, ...focus.padding } }
        : {}),
      duration: 700,
      easing: EASE_DECELERATE,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, ready]);

  /** Glide loop: ease every marker toward its target; stops itself when all are settled. */
  const startGlide = () => {
    if (glideRaf.current) return;
    glideLast.current = performance.now();
    const step = (now: number) => {
      glideRaf.current = 0;
      const dt = Math.min(0.1, (now - glideLast.current) / 1000);
      glideLast.current = now;
      let moving = false;
      for (const entry of Object.values(markerRef.current)) {
        const [cx, cy] = entry.current;
        const [tx, ty] = entry.target;
        const dx = tx - cx;
        const dy = ty - cy;
        if (Math.abs(dx) < GLIDE_EPSILON && Math.abs(dy) < GLIDE_EPSILON) {
          if (cx !== tx || cy !== ty) {
            entry.current = entry.target;
            entry.marker.setLngLat(entry.target);
          }
          continue;
        }
        // Exponential smoothing ≈ 300ms to close 80% of the gap — reads as driving, not lag.
        const f = 1 - Math.exp(-dt * 5.5);
        entry.current = [cx + dx * f, cy + dy * f];
        entry.marker.setLngLat(entry.current);
        moving = true;
      }
      if (moving) glideRaf.current = requestAnimationFrame(step);
    };
    glideRaf.current = requestAnimationFrame(step);
  };

  // Reconcile markers by id; position updates glide (or snap under reduced motion).
  // Pins that belong to an overlap cluster are removed — the ClusterPin represents them.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let changed = false;
    const clusteredIds = new Set(clusterInfo.clustered);
    const visible = markers.filter((m) => !clusteredIds.has(m.id));

    void (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      const map = mapRef.current;
      if (!map) return;
      const next = new Set(visible.map((m) => m.id));
      const registry = markerRef.current;

      for (const [id, entry] of Object.entries(registry)) {
        if (!next.has(id)) {
          entry.marker.remove();
          delete registry[id];
          changed = true;
        }
      }
      let needsGlide = false;
      for (const m of visible) {
        const existing = registry[m.id];
        if (existing) {
          if (existing.target[0] !== m.lngLat[0] || existing.target[1] !== m.lngLat[1]) {
            existing.target = m.lngLat;
            if (reducedRef.current) {
              existing.current = m.lngLat;
              existing.marker.setLngLat(m.lngLat);
            } else {
              needsGlide = true;
            }
          }
          // Status can flip on a live pin (driving → away) without the pin moving — keep its
          // stacking in sync so a newly-closed vendor drops beneath the live ones (§9.3).
          existing.el.style.zIndex = String(m.priority ?? 0);
        } else {
          const el = document.createElement('div');
          el.style.zIndex = String(m.priority ?? 0);
          const marker = new mapboxgl.Marker({ element: el }).setLngLat(m.lngLat).addTo(map);
          registry[m.id] = { marker, el, current: m.lngLat, target: m.lngLat };
          changed = true;
        }
      }
      if (needsGlide) startGlide();
      if (changed) force((n) => n + 1);
    })();
    // Also re-cluster when the pin set itself changes (moveend won't fire for data updates).
    computeClustersRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, ready, clusterInfo]);

  // Reconcile cluster markers by cluster id; clicking zooms in until the group separates.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let changed = false;

    void (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      const map = mapRef.current;
      if (!map) return;
      // NB: `new Map()` would resolve to this component (name shadowing) — use a Set of ids.
      const nextIds = new Set(clusterInfo.clusters.map((c) => c.id));
      const registry = clusterMarkerRef.current;

      for (const [id, entry] of Object.entries(registry)) {
        if (!nextIds.has(id)) {
          entry.marker.remove();
          delete registry[id];
          changed = true;
        }
      }
      for (const c of clusterInfo.clusters) {
        const existing = registry[c.id];
        if (existing) {
          existing.marker.setLngLat(c.lngLat);
        } else {
          const el = document.createElement('div');
          const marker = new mapboxgl.Marker({ element: el }).setLngLat(c.lngLat).addTo(map);
          registry[c.id] = { marker, el };
          changed = true;
        }
      }
      if (changed) force((n) => n + 1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterInfo, ready]);

  /**
   * C-3 — reconcile GL data layers.
   *
   * Sources are updated in place with `setData` rather than being torn down and re-added: a
   * remove/add cycle makes the heat layer blink on every poll, which reads as a rendering fault
   * rather than as data refreshing.
   *
   * Runs on `style.load` too, because `setStyle`/theme repaints drop custom sources — without the
   * `ready` dependency the layer would silently vanish the first time someone flips the theme.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const toFeature = (p: MapDataLayer['points'][number]) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: p.lngLat },
      properties: { weight: p.weight ?? 1, ...(p.properties ?? {}) },
    });

    const activeIds = new Set(dataLayers.map((l) => l.id));
    // Drop layers that are gone from the prop entirely.
    for (const id of dataLayerIdsRef.current) {
      if (activeIds.has(id)) continue;
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    }
    dataLayerIdsRef.current = [...activeIds];

    for (const layer of dataLayers) {
      const data = {
        type: 'FeatureCollection' as const,
        features: layer.points.map(toFeature),
      };
      const existing = map.getSource(layer.id);
      if (existing && 'setData' in existing) {
        (existing as { setData: (d: unknown) => void }).setData(data);
      } else {
        map.addSource(layer.id, { type: 'geojson', data } as never);
      }

      if (!map.getLayer(layer.id)) {
        map.addLayer(
          {
            id: layer.id,
            type: layer.type,
            source: layer.id,
            paint: layer.paint,
          } as never,
          // Only pass beforeId when that layer really exists — Mapbox throws otherwise, and the
          // basemap's layer names differ between styles.
          layer.beforeId && map.getLayer(layer.beforeId) ? layer.beforeId : undefined,
        );
      }
      map.setLayoutProperty(
        layer.id,
        'visibility',
        layer.visible === false ? 'none' : 'visible',
      );
    }
  }, [dataLayers, ready]);

  const expandCluster = (c: ClusterGroup) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      center: c.lngLat,
      zoom: Math.min(map.getZoom() + 2.2, 17),
      duration: 600,
      easing: EASE_DECELERATE,
      essential: true, // explicit user action
    });
  };

  const togglePitch = () => {
    const map = mapRef.current;
    if (!map) return;
    const next = !pitched;
    setPitched(next);
    const cam = next ? CINEMATIC_CAMERA : FLAT_CAMERA;
    map.easeTo({
      pitch: cam.pitch,
      bearing: cam.bearing,
      duration: 700,
      easing: EASE_DECELERATE,
      essential: true, // explicit user action — animate even under reduced motion
    });
  };

  if (!isMapConfigured) {
    return (
      <Placeholder role="img" aria-label={`${ariaLabel} (map token not configured)`}>
        <EmptyState
          icon="🗺️"
          title="Map preview"
          description="Set NEXT_PUBLIC_MAPBOX_TOKEN to render the live basemap. The pin layer + realtime wiring work regardless."
        />
      </Placeholder>
    );
  }

  return (
    <>
      {/* Inline geometry: mapbox-gl.css's `.mapboxgl-map { position: relative }` can beat a
          class rule in the cascade and collapse the canvas (proven in LP-2) — inline always wins. */}
      <Container
        ref={containerRef}
        aria-label={ariaLabel}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {cinematic && ready && (
        <PitchToggle
          type="button"
          aria-pressed={pitched}
          aria-label={pitched ? 'Switch to 2D map' : 'Switch to 3D map'}
          onClick={togglePitch}
        >
          {pitched ? '2D' : '3D'}
        </PitchToggle>
      )}
      {markers.map((m) => {
        const entry = markerRef.current[m.id];
        return entry ? createPortal(m.node, entry.el) : null;
      })}
      {clusterInfo.clusters.map((c) => {
        const entry = clusterMarkerRef.current[c.id];
        return entry
          ? createPortal(
              <ClusterPin count={c.count} onClick={() => expandCluster(c)} />,
              entry.el,
            )
          : null;
      })}
    </>
  );
}

const Container = styled.div`
  .mapboxgl-canvas {
    outline: none;
  }
`;

const PitchToggle = styled.button`
  position: absolute;
  right: 12px;
  bottom: calc(78px + env(safe-area-inset-bottom, 0px) + ${({ theme }) => theme.space[3]}px);
  z-index: 10;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme }) => theme.color.textPrimary};
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.color.shadow};
`;

const Placeholder = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background:
    radial-gradient(60% 60% at 50% 30%, ${({ theme }) => theme.color.surfaceRaised2}, transparent),
    ${({ theme }) => theme.color.surfaceBase};
`;
