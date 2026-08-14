'use client';

/**
 * LiveMapScene (hero spec §3–§6, 3D spec §1–§4) — the living hero map. Owns one Mapbox GL
 * instance (lazy-imported), the dusk camera (pitch/bearing/left padding), the marketing layers
 * (3D extrusions + fog on T1, route lines, wave arc, ripple/glow, ambient dots), the rAF loop
 * that plays the SimulationDirector, idle drift + the 20s camera tour, cooperative gestures,
 * focusable pins with a preview popover, and the floating activity cards.
 *
 * Poster-first: this mounts INSIDE the hero's static scene panel and cross-fades over it
 * (opacity only) once the style has loaded and the first frame has ticked — zero layout shift.
 * All rAF work suspends when the tab is hidden or the hero is off-screen.
 */
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { useTheme } from 'styled-components';
import type { GeoJSONSource, Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';
import type { FeatureCollection } from 'geojson';
import { env } from '@/lib/env';
import { getHeroMapStyle } from '@/lib/map/mapbox';
import { trackOncePerSession } from '../../analytics';
import { SimulationDirector, type SimFrame, type VendorFrame } from '../../sim/director';
import type { CardCue } from '../../sim/scene';
import { FloatingActivityCards } from './FloatingActivityCards';
import { PinPreviewCard } from './PinPreviewCard';
import { SimPinMarker } from './SimPinMarker';

export interface LiveMapSceneProps {
  tier: 'T1' | 'T2';
}

const CAMERA = {
  center: [-120.9965, 37.6408] as [number, number],
  T1: { zoom: 15.05, pitch: 55, bearing: -17 },
  T2: { zoom: 14.55, pitch: 28, bearing: -17 },
};

const DRIFT_BEARING_DEG = 8;
const DRIFT_PERIOD_MS = 40_000;
const ZOOM_BREATH = 0.05;
const ZOOM_BREATH_PERIOD_MS = 23_000;
const INTERACTION_GRACE_MS = 8_000;
const TOUR_AFTER_IDLE_MS = 20_000;
const TOUR_COOLDOWN_MS = 40_000;

const emptyFC: FeatureCollection = { type: 'FeatureCollection', features: [] };

function lineFC(coords: [number, number][][]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: coords.map((line) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: line },
    })),
  };
}

export function LiveMapScene({ tier }: LiveMapSceneProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const previewPosRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Record<string, { marker: MapboxMarker; el: HTMLElement }>>({});
  const directorRef = useRef<SimulationDirector | null>(null);

  const rafRef = useRef(0);
  const startRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const inViewRef = useRef(true);
  const interactedAtRef = useRef(0);
  const lastTourAtRef = useRef(0);
  const tourActiveRef = useRef(false);
  const uiSignatureRef = useRef('');
  const openPinRef = useRef<string | null>(null);

  const [visible, setVisible] = useState(false);
  const [uiVendors, setUiVendors] = useState<VendorFrame[]>([]);
  const [uiCards, setUiCards] = useState<CardCue[]>([]);
  const [openPin, setOpenPin] = useState<string | null>(null);
  const [markerVersion, setMarkerVersion] = useState(0);

  openPinRef.current = openPin;

  const director = useMemo(
    () => new SimulationDirector(tier === 'T1' ? 'full' : 'lite'),
    [tier],
  );
  directorRef.current = director;

  const themeModeRef = useRef(theme.mode);
  themeModeRef.current = theme.mode;

  /** (Re)install marketing sources/layers — runs on initial style load and every theme swap. */
  const installLayers = useCallback((map: MapboxMap, mode: 'dark' | 'light', t: 'T1' | 'T2') => {
    const colors =
      mode === 'dark'
        ? { live: '#22C55E', accent: '#FF6B45', discount: '#9B8AFA', building: '#1E2027' }
        : { live: '#17B26A', accent: '#E04B12', discount: '#7A5AF8', building: '#E4E4E1' };

    if (t === 'T1') {
      try {
        map.setFog({
          range: [0.6, 8],
          color: mode === 'dark' ? '#0E0F12' : '#F1EFEA',
          'high-color': mode === 'dark' ? '#13233F' : '#CBD9F0',
          'horizon-blend': 0.08,
        });
      } catch {
        /* style without fog support — cosmetic only */
      }
      try {
        if (!map.getLayer('ss-3d-buildings')) {
          map.addLayer({
            id: 'ss-3d-buildings',
            type: 'fill-extrusion',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', ['get', 'extrude'], 'true'],
            minzoom: 14,
            paint: {
              'fill-extrusion-color': colors.building,
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.6,
            },
          });
        }
      } catch {
        /* basemap without a building source — scene still works flat */
      }
    }

    const ensureSource = (id: string) => {
      if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: emptyFC });
    };
    ensureSource('ss-routes');
    ensureSource('ss-wave');
    ensureSource('ss-dots');
    ensureSource('ss-fx');

    if (!map.getLayer('ss-routes-line')) {
      map.addLayer({
        id: 'ss-routes-line',
        type: 'line',
        source: 'ss-routes',
        paint: {
          'line-color': colors.live,
          'line-width': 2,
          'line-opacity': 0.28,
          'line-dasharray': [1.5, 2],
        },
      });
    }
    if (!map.getLayer('ss-fx-glow')) {
      map.addLayer({
        id: 'ss-fx-glow',
        type: 'circle',
        source: 'ss-fx',
        filter: ['==', ['get', 'kind'], 'glow'],
        paint: {
          'circle-radius': ['*', ['get', 'progress'], 120],
          'circle-color': colors.accent,
          'circle-opacity': ['*', ['get', 'progress'], 0.16],
          'circle-blur': 1,
        },
      });
    }
    if (!map.getLayer('ss-fx-ripple')) {
      map.addLayer({
        id: 'ss-fx-ripple',
        type: 'circle',
        source: 'ss-fx',
        filter: ['==', ['get', 'kind'], 'ripple'],
        paint: {
          'circle-radius': ['*', ['get', 'progress'], 70],
          'circle-color': 'transparent',
          'circle-stroke-color': colors.discount,
          'circle-stroke-width': 2,
          'circle-stroke-opacity': ['-', 0.8, ['*', ['get', 'progress'], 0.8]],
        },
      });
    }
    if (!map.getLayer('ss-dots-layer')) {
      map.addLayer({
        id: 'ss-dots-layer',
        type: 'circle',
        source: 'ss-dots',
        paint: {
          'circle-radius': 4,
          'circle-color': mode === 'dark' ? '#9C9FA8' : '#5B5E68',
          'circle-opacity': ['get', 'opacity'],
        },
      });
    }
    if (!map.getLayer('ss-wave-line')) {
      map.addLayer({
        id: 'ss-wave-line',
        type: 'line',
        source: 'ss-wave',
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': colors.accent, 'line-width': 3, 'line-opacity': 0.9 },
      });
    }

    const routes = directorRef.current?.routes() ?? [];
    (map.getSource('ss-routes') as GeoJSONSource | undefined)?.setData(
      lineFC(routes.map((r) => r.line)),
    );
  }, []);

  /** Apply one simulation frame: imperative positions + source data; React state only on change. */
  const applyFrame = useCallback((map: MapboxMap, frame: SimFrame) => {
    for (const v of frame.vendors) {
      markersRef.current[v.id]?.marker.setLngLat(v.lngLat);
    }

    (map.getSource('ss-wave') as GeoJSONSource | undefined)?.setData(
      frame.effects.waveArc.length > 1 ? lineFC([frame.effects.waveArc]) : emptyFC,
    );

    const fx: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        ...(frame.effects.ripple
          ? [
              {
                type: 'Feature' as const,
                properties: { kind: 'ripple', progress: frame.effects.ripple.progress },
                geometry: { type: 'Point' as const, coordinates: frame.effects.ripple.center },
              },
            ]
          : []),
        ...(frame.effects.glow
          ? [
              {
                type: 'Feature' as const,
                properties: { kind: 'glow', progress: frame.effects.glow.progress },
                geometry: { type: 'Point' as const, coordinates: frame.effects.glow.center },
              },
            ]
          : []),
      ],
    };
    (map.getSource('ss-fx') as GeoJSONSource | undefined)?.setData(fx);

    (map.getSource('ss-dots') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: frame.dots.map((d) => ({
        type: 'Feature' as const,
        properties: { opacity: Number(d.opacity.toFixed(2)) },
        geometry: { type: 'Point' as const, coordinates: d.lngLat },
      })),
    });

    // React re-render only when chip/flash/card composition changes (a few times per loop).
    const signature =
      frame.vendors.map((v) => `${v.chip}|${v.flash}`).join('¦') +
      '::' +
      frame.cards.map((c) => c.id).join(',');
    if (signature !== uiSignatureRef.current) {
      uiSignatureRef.current = signature;
      setUiVendors(frame.vendors);
      setUiCards([...frame.cards]);
    }

    // Track the preview popover to its (possibly moving) pin.
    const open = openPinRef.current;
    if (open && previewPosRef.current) {
      const vendor = frame.vendors.find((v) => v.id === open);
      if (vendor) {
        const p = map.project(vendor.lngLat);
        previewPosRef.current.style.left = `${p.x}px`;
        previewPosRef.current.style.top = `${p.y}px`;
      }
    }
  }, []);

  // Mount the map once per tier/mount.
  useEffect(() => {
    if (!containerRef.current || !env.mapboxToken) return;
    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = env.mapboxToken as string;

      const cam = CAMERA[tier];
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: getHeroMapStyle(themeModeRef.current),
        center: CAMERA.center,
        zoom: cam.zoom,
        pitch: cam.pitch,
        bearing: cam.bearing,
        attributionControl: false,
        cooperativeGestures: true,
        dragRotate: tier === 'T1',
        pitchWithRotate: tier === 'T1',
      });
      mapRef.current = map;

      if (tier === 'T1' && window.innerWidth >= 1024) {
        // Compose the scene around the content column (hero spec §2).
        map.setPadding({ left: 480, top: 0, right: 0, bottom: 0 });
      }

      const markInteraction = () => {
        trackOncePerSession('hero_map_interact');
        interactedAtRef.current = performance.now();
        if (tourActiveRef.current) {
          map.stop();
          tourActiveRef.current = false;
        }
      };
      map.on('mousedown', markInteraction);
      map.on('touchstart', markInteraction);
      map.on('wheel', markInteraction);

      // Persistent handler: re-installs marketing layers after every setStyle (theme swap).
      map.on('style.load', () => {
        if (!cancelled) installLayers(map, themeModeRef.current, tier);
      });

      map.on('load', () => {
        if (cancelled) return;

        // Build DOM markers for the simulated vendors.
        const first = director.frame(0);
        for (const v of first.vendors) {
          const el = document.createElement('div');
          const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat(v.lngLat)
            .addTo(map);
          markersRef.current[v.id] = { marker, el };
        }
        setMarkerVersion((n) => n + 1);

        startRef.current = performance.now();
        runningRef.current = true;

        const loop = () => {
          if (!runningRef.current) return;
          rafRef.current = requestAnimationFrame(loop);
          const now = performance.now();

          if (document.hidden || !inViewRef.current) {
            // Suspend: freeze elapsed time so the loop resumes exactly where it paused.
            if (pausedAtRef.current === null) pausedAtRef.current = now;
            return;
          }
          if (pausedAtRef.current !== null) {
            startRef.current += now - pausedAtRef.current;
            pausedAtRef.current = null;
          }

          const elapsed = now - startRef.current;
          applyFrame(map, director.frame(elapsed));

          // Camera scripts (T1 only): idle drift + the 20s tour, both yielding to the user.
          if (tier === 'T1') {
            const sinceInteraction = now - interactedAtRef.current;
            const idle = interactedAtRef.current === 0 || sinceInteraction > INTERACTION_GRACE_MS;

            if (idle && !tourActiveRef.current) {
              const sinceTour = now - lastTourAtRef.current;
              const idleLongEnough =
                interactedAtRef.current === 0
                  ? elapsed > TOUR_AFTER_IDLE_MS
                  : sinceInteraction > TOUR_AFTER_IDLE_MS;
              if (idleLongEnough && sinceTour > TOUR_COOLDOWN_MS) {
                tourActiveRef.current = true;
                lastTourAtRef.current = now;
                map.easeTo({
                  zoom: CAMERA.T1.zoom - 0.55,
                  bearing: CAMERA.T1.bearing + 22,
                  duration: 6_000,
                  easing: (x) => 1 - Math.pow(1 - x, 3),
                });
                map.once('moveend', () => {
                  if (cancelled || !tourActiveRef.current) return;
                  map.easeTo({
                    zoom: CAMERA.T1.zoom,
                    bearing: CAMERA.T1.bearing,
                    duration: 6_000,
                    easing: (x) => 1 - Math.pow(1 - x, 3),
                  });
                  map.once('moveend', () => {
                    tourActiveRef.current = false;
                  });
                });
              } else if (!tourActiveRef.current) {
                // Imperceptible idle drift: bearing ±8°, zoom breathing ±0.05.
                const drift =
                  CAMERA.T1.bearing +
                  DRIFT_BEARING_DEG * Math.sin((elapsed / DRIFT_PERIOD_MS) * Math.PI * 2);
                const breath =
                  CAMERA.T1.zoom +
                  ZOOM_BREATH * Math.sin((elapsed / ZOOM_BREATH_PERIOD_MS) * Math.PI * 2);
                map.setBearing(drift);
                map.setZoom(breath);
              }
            }
          }
        };
        rafRef.current = requestAnimationFrame(loop);

        // Cross-fade over the poster only after the first painted frame.
        requestAnimationFrame(() => {
          if (!cancelled) setVisible(true);
        });
      });
    })();

    const container = containerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        inViewRef.current = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    io.observe(container);

    const activeMarkers = markersRef.current;
    return () => {
      cancelled = true;
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      io.disconnect();
      Object.values(activeMarkers).forEach(({ marker }) => marker.remove());
      markersRef.current = {};
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Mount once per tier; theme swaps are handled by the dedicated effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, director, installLayers, applyFrame]);

  // Theme swap: restyle; the persistent 'style.load' handler reinstalls the marketing layers.
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) map.setStyle(getHeroMapStyle(theme.mode));
  }, [theme.mode]);

  const closePreview = useCallback(() => {
    const id = openPinRef.current;
    setOpenPin(null);
    // Return focus to the pin that opened the popover (a11y spec §3).
    if (id) {
      requestAnimationFrame(() => {
        markersRef.current[id]?.el.querySelector('button')?.focus();
      });
    }
  }, []);

  const togglePin = useCallback((id: string) => {
    setOpenPin((cur) => (cur === id ? null : id));
    // Seed the popover anchor immediately so it doesn't flash at a stale position.
    const map = mapRef.current;
    const vendor = directorRef.current
      ?.frame(performance.now() - startRef.current)
      .vendors.find((v) => v.id === id);
    if (map && vendor && previewPosRef.current) {
      const p = map.project(vendor.lngLat);
      previewPosRef.current.style.left = `${p.x}px`;
      previewPosRef.current.style.top = `${p.y}px`;
    }
    interactedAtRef.current = performance.now();
  }, []);

  const openVendor = openPin ? uiVendors.find((v) => v.id === openPin) : undefined;

  return (
    <Root $visible={visible}>
      {/* Inline position/size: mapbox-gl.css sets `.mapboxgl-map { position: relative }` which
          would beat a class rule in the cascade and collapse the container to zero height. */}
      <Canvas
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {/* markerVersion forces the portal list to re-evaluate once markers exist. */}
      {markerVersion > 0 &&
        uiVendors.map((v) => {
          const entry = markersRef.current[v.id];
          if (!entry) return null;
          return createPortal(
            <SimPinMarker
              vendor={v}
              expanded={openPin === v.id}
              onToggle={() => togglePin(v.id)}
            />,
            entry.el,
          );
        })}
      <PreviewAnchor ref={previewPosRef}>
        {openVendor && (
          <PinPreviewCard vendor={openVendor} x={0} y={0} onClose={closePreview} />
        )}
      </PreviewAnchor>
      <FloatingActivityCards cards={uiCards} />
    </Root>
  );
}

const Root = styled.div<{ $visible: boolean }>`
  position: absolute;
  inset: 0;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 400ms cubic-bezier(0.2, 0, 0, 1);
`;

const Canvas = styled.div`
  .mapboxgl-canvas {
    outline: none;
  }
`;

const PreviewAnchor = styled.div`
  position: absolute;
  z-index: 20;
  pointer-events: none;
  > * {
    pointer-events: auto;
  }
`;
