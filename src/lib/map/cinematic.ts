/**
 * Cinematic layer kit for the product map — the hero scene's dusk treatment (fog + 3D building
 * extrusions + camera presets) as an idempotent installer. Called from the map's persistent
 * 'style.load' handler so a theme swap (setStyle wipes custom layers) reinstalls everything.
 * Every addition is defensive: a basemap without fog support or a building source degrades to
 * the flat map, never a broken one.
 */
import type { Map as MapboxMap } from 'mapbox-gl';
import type { ThemeMode } from '@/styles/tokens';
import { getBasemapPalette } from './palette';

/** Dusk camera preset (hero spec §3 adapted for utility: shallower pitch, subtle bearing). */
export const CINEMATIC_CAMERA = { pitch: 48, bearing: -12 } as const;
export const FLAT_CAMERA = { pitch: 0, bearing: 0 } as const;

export const EASE_DECELERATE = (x: number) => 1 - Math.pow(1 - x, 3);

const BUILDINGS_LAYER = 'ss-app-3d-buildings';

/**
 * Idempotent in both directions: safe to call after a style reload (adds the layer) and safe to
 * call on a theme swap (repaints it). The second case is new — theme changes no longer reload the
 * style, so this can no longer rely on `addLayer` to pick up the new palette.
 */
export function installCinematicLayers(map: MapboxMap, mode: ThemeMode): void {
  const p = getBasemapPalette(mode);

  try {
    map.setFog({
      range: [0.6, 9],
      color: p.fog,
      'high-color': p.fogHorizon,
      'horizon-blend': 0.06,
    });
  } catch {
    /* fog unsupported by this style — cosmetic only */
  }
  try {
    if (map.getLayer(BUILDINGS_LAYER)) {
      map.setPaintProperty(BUILDINGS_LAYER, 'fill-extrusion-color', p.buildingExtrusion);
    } else {
      map.addLayer({
        id: BUILDINGS_LAYER,
        type: 'fill-extrusion',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', ['get', 'extrude'], 'true'],
        minzoom: 14,
        paint: {
          'fill-extrusion-color': p.buildingExtrusion,
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          // Fade extrusions in across a zoom band so entering 3D never pops.
          'fill-extrusion-opacity': 0.55,
        },
      });
    }
  } catch {
    /* no composite/building source — stay flat */
  }
}
