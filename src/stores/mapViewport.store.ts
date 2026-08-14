/**
 * Map viewport (STATE_MANAGEMENT.md §5) — the current center/zoom/bounds, shared so the list view
 * (C-12) can query the same nearby set the map shows. Client-only; server data stays in Query.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LngLat } from '@/types';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/map/mapbox';

export interface Viewport {
  center: LngLat;
  zoom: number;
  bounds: { sw: LngLat; ne: LngLat };
}

interface ViewportState extends Viewport {
  setViewport: (v: Viewport) => void;
}

// Default bounds ≈ a few km box around the pilot center until the map reports its real bounds.
const DEFAULT_BOUNDS = {
  sw: [DEFAULT_CENTER[0] - 0.04, DEFAULT_CENTER[1] - 0.03] as LngLat,
  ne: [DEFAULT_CENTER[0] + 0.04, DEFAULT_CENTER[1] + 0.03] as LngLat,
};

// Persisted so a reload reopens where the user actually was, not the pilot default a continent away.
// This is what stops "reload → back to the default city" — the last panned/located viewport is
// restored on load, and only overridden by a fresh, sufficiently-accurate locate.
export const useViewportStore = create<ViewportState>()(
  persist(
    (set) => ({
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      bounds: DEFAULT_BOUNDS,
      setViewport: (v) => set(v),
    }),
    {
      name: 'ss-viewport',
      partialize: (s) => ({ center: s.center, zoom: s.zoom, bounds: s.bounds }),
    },
  ),
);
