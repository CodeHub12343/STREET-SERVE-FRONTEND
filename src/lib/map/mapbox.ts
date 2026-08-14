/**
 * Mapbox configuration (docs/06 §2.6h). Isolates the map provider so a Mapbox↔MapLibre swap stays
 * a one-file change.
 *
 * Both themes now load `streets-v12` and are repainted into the StreetServe Paper / Ink palettes by
 * `applyBasemapStyle` (see basemap.ts). This replaces the `light-v11` / `dark-v11` pilot styles,
 * which Mapbox ships as intentionally low-contrast substrates for data overlays — legible as a
 * backdrop, unusable as a wayfinding map. `streets-v12` is a real navigation style with a proper
 * road hierarchy, which is what the palette needs underneath it.
 */
import type { ThemeMode } from '@/styles/tokens';

/**
 * One style for both themes — the palette, not the style URL, carries light/dark. Keeping a single
 * URL means a theme swap re-runs `setStyle` against identical layer ids, so the repaint is
 * deterministic across modes.
 */
export const BASE_STYLE = 'mapbox://styles/mapbox/streets-v12';

export function getMapStyle(_mode: ThemeMode): string {
  return BASE_STYLE;
}

/**
 * The marketing hero (LiveMapScene, LP-2) is a distinct surface with its own cinematic layer kit
 * and deliberately abstract, low-detail treatment — a backdrop, which is precisely what the v11
 * styles are good at. It keeps them, and keeps its per-theme `setStyle` swap. Repainting the hero
 * is a separate decision from fixing the product map's readability.
 */
export const HERO_MAP_STYLES: Record<ThemeMode, string> = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
};

export function getHeroMapStyle(mode: ThemeMode): string {
  return HERO_MAP_STYLES[mode];
}

/** Pilot default view — Modesto, CA (docs footer). */
export const DEFAULT_CENTER: [number, number] = [-120.9969, 37.6391];

/**
 * 13.4, raised from 12.5. The old default landed inside the cluster band, so first paint showed
 * zero individual pins — businesses only appeared after the user zoomed. 13.4 opens on visible
 * pins, which is the "nearby businesses are immediately noticeable" requirement (spec §3.6).
 */
export const DEFAULT_ZOOM = 13.4;
