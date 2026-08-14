/**
 * StreetServe basemap restyler (MAP_REDESIGN_SPECIFICATION §3).
 *
 * Repaints `streets-v12` into the Paper / Ink palettes at runtime instead of forking a style in
 * Mapbox Studio. Chosen deliberately over `mapbox://styles/mapbox/standard`: Standard is a *closed*
 * style whose internal layers aren't addressable, so `setConfigProperty` can toggle its day/night
 * preset and label visibility but cannot repaint roads or land — it can't deliver the contrast fix
 * that is the entire point. Doing it in code keeps the palette version-controlled and reviewable.
 *
 * Idempotent, and called from the map's persistent `style.load` handler — `setStyle()` on a theme
 * swap resets every paint property, so this must re-run alongside `installCinematicLayers`.
 *
 * Defensive by construction (same contract as the cinematic kit): rules match on layer *type* plus
 * id substrings rather than an exact id manifest, every write is individually guarded, and an
 * unrecognized style degrades to stock Mapbox rather than throwing. Mapbox renames layers between
 * style versions; a renamed layer must cost us a color, never the map.
 */
import type { Map as MapboxMap } from 'mapbox-gl';
import type { ThemeMode } from '@/styles/tokens';
import { getBasemapPalette, SUPPRESSED_POI_CLASSES, type BasemapPalette } from './palette';

/** Minimal shape we rely on — avoids coupling to mapbox-gl's LayerSpecification union. */
interface StyleLayer {
  id: string;
  type: string;
}

const has = (id: string, ...needles: string[]): boolean =>
  needles.some((n) => id.includes(n));

/**
 * mapbox-gl types the property name as a union correlated with the layer's own type, which we
 * can't narrow — we're walking a heterogeneous layer list by string id. The runtime accepts any
 * name and throws for a mismatch, which the try/catch already handles, so a loose local signature
 * is the honest shape here.
 */
type LooseSetter = (id: string, prop: string, value: unknown) => void;

function setPaint(map: MapboxMap, id: string, prop: string, value: unknown): void {
  try {
    (map.setPaintProperty as unknown as LooseSetter)(id, prop, value);
  } catch {
    /* property unsupported on this layer — cosmetic only */
  }
}

function setLayout(map: MapboxMap, id: string, prop: string, value: unknown): void {
  try {
    (map.setLayoutProperty as unknown as LooseSetter)(id, prop, value);
  } catch {
    /* property unsupported on this layer — cosmetic only */
  }
}

/* ------------------------------------------------------------------ *
 * Label typography (§3.3)
 * ------------------------------------------------------------------ */

/**
 * Halo width ≥1.4px with **zero blur** is the single highest-impact fix for "faded" labels. A dark
 * glyph on light land is legible until it crosses a white road, where local contrast swings and the
 * eye reads the inconsistency as blur. A hard, opaque halo makes the background behind every glyph
 * constant everywhere on the map.
 */
function inkLabel(
  map: MapboxMap,
  id: string,
  color: string,
  halo: string,
  haloWidth: number,
): void {
  setPaint(map, id, 'text-color', color);
  setPaint(map, id, 'text-halo-color', halo);
  setPaint(map, id, 'text-halo-width', haloWidth);
  setPaint(map, id, 'text-halo-blur', 0);
}

/** Mapbox tunes its size ramps for desktop viewing distance; phones read them ~1px small. */
const ROAD_LABEL_SIZE = ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 12, 20, 13];
const DISTRICT_LABEL_SIZE = ['interpolate', ['linear'], ['zoom'], 10, 12, 14, 15, 18, 17];
const CITY_LABEL_SIZE = ['interpolate', ['linear'], ['zoom'], 6, 13, 12, 18, 16, 22];

function styleSymbolLayer(map: MapboxMap, layer: StyleLayer, p: BasemapPalette): void {
  const { id } = layer;

  // Shields carry their own baked artwork — repainting them produces unreadable mush.
  if (has(id, 'shield', 'exit')) return;

  if (has(id, 'poi-label', 'transit-label', 'airport-label')) {
    inkLabel(map, id, p.labelPoi, p.halo, 1.3);
    // Zoom-gated and held under full strength: context, never competition (§3.5). Icon opacity
    // must be set alongside text — POI markers are icon+text pairs, and dimming only the text
    // leaves the icons at full strength, which is the louder half of the pair.
    const fade = ['interpolate', ['linear'], ['zoom'], 14.5, 0, 15.5, 0.6];
    setPaint(map, id, 'text-opacity', fade);
    setPaint(map, id, 'icon-opacity', fade);
    return;
  }

  if (has(id, 'water-line-label', 'water-point-label', 'natural-line-label', 'natural-point-label')) {
    inkLabel(map, id, p.waterLabel, p.waterLabelHalo, 1.2);
    return;
  }

  if (has(id, 'settlement-subdivision-label')) {
    // Districts are the one class that gets a *case* change. Uppercasing exactly one label class
    // buys unmistakable hierarchy without spending another color or size step, and reads editorial
    // rather than default — this is the "clearer district names" requirement.
    inkLabel(map, id, p.labelDistrict, p.halo, 1.6);
    setLayout(map, id, 'text-size', DISTRICT_LABEL_SIZE);
    setLayout(map, id, 'text-transform', 'uppercase');
    setLayout(map, id, 'text-letter-spacing', 0.06);
    return;
  }

  if (has(id, 'settlement-major-label', 'settlement-minor-label')) {
    inkLabel(map, id, p.labelCity, p.halo, 1.8);
    setLayout(map, id, 'text-size', CITY_LABEL_SIZE);
    return;
  }

  if (has(id, 'country-label', 'state-label', 'continent-label')) {
    inkLabel(map, id, p.labelCountry, p.haloSoft, 1.2);
    setLayout(map, id, 'text-letter-spacing', 0.08);
    return;
  }

  if (has(id, 'road-label')) {
    // Floor, not a target: #54514A on #F4F2ED is 5.9:1. Never lighten this in Paper.
    inkLabel(map, id, p.labelStreet, p.halo, 1.4);
    setLayout(map, id, 'text-size', ROAD_LABEL_SIZE);
    return;
  }

  // Unmatched symbol layers (building numbers, golf holes, ferry aerialways) keep stock styling
  // but still get a halo bump, since every one of them sits over the repainted land.
  setPaint(map, id, 'text-halo-color', p.halo);
  setPaint(map, id, 'text-halo-blur', 0);
}

/* ------------------------------------------------------------------ *
 * Roads (§3.2)
 * ------------------------------------------------------------------ */

/**
 * Minor-road casing widths, bumped modestly. In Paper, residential fill (#FCFBF8) against land
 * (#F4F2ED) is 1.09:1 — invisible by fill alone. The casing is what makes the street grid legible,
 * so it is the one geometry override worth the risk. Motorway/primary widths stay native; their
 * fills already separate on color.
 */
const MINOR_CASE_WIDTH = [
  'interpolate',
  ['exponential', 1.5],
  ['zoom'],
  12,
  0.6,
  14,
  1.4,
  16,
  3,
  18,
  8,
];

function styleLineLayer(map: MapboxMap, layer: StyleLayer, p: BasemapPalette): void {
  const { id } = layer;

  if (has(id, 'admin')) {
    setPaint(map, id, 'line-color', p.adminBoundary);
    setPaint(map, id, 'line-opacity', 0.6);
    return;
  }

  if (has(id, 'building-outline')) {
    setPaint(map, id, 'line-color', p.buildingOutline);
    return;
  }

  if (has(id, 'waterway')) {
    setPaint(map, id, 'line-color', p.water);
    return;
  }

  if (!has(id, 'road', 'bridge', 'tunnel')) return;

  if (has(id, 'rail', 'aerialway', 'ferry')) {
    setPaint(map, id, 'line-color', p.rail);
    return;
  }

  if (has(id, 'path', 'pedestrian', 'steps', 'golf')) {
    setPaint(map, id, 'line-color', p.path);
    return;
  }

  // Casings must be tested before fills — `road-primary-case` also contains `primary`.
  const isCasing = has(id, '-case', '-casing', '-bg');

  if (has(id, 'motorway', 'trunk')) {
    setPaint(map, id, 'line-color', isCasing ? p.motorwayCase : p.motorway);
    return;
  }
  if (has(id, 'primary')) {
    setPaint(map, id, 'line-color', isCasing ? p.primaryCase : p.primary);
    return;
  }
  if (has(id, 'secondary', 'tertiary')) {
    setPaint(map, id, 'line-color', isCasing ? p.secondaryCase : p.secondary);
    return;
  }

  // street / minor / service / track / everything left
  setPaint(map, id, 'line-color', isCasing ? p.residentialCase : p.residential);
  if (isCasing) setPaint(map, id, 'line-width', MINOR_CASE_WIDTH);
}

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */

function styleFillLayer(map: MapboxMap, layer: StyleLayer, p: BasemapPalette): void {
  const { id } = layer;

  if (has(id, 'water-shadow')) {
    setPaint(map, id, 'fill-color', p.water);
    setPaint(map, id, 'fill-opacity', 0.4);
    return;
  }
  if (has(id, 'water')) {
    setPaint(map, id, 'fill-color', p.water);
    return;
  }
  if (has(id, 'national-park', 'park', 'grass', 'pitch', 'cemetery', 'golf')) {
    setPaint(map, id, 'fill-color', p.park);
    return;
  }
  if (has(id, 'landcover', 'wood', 'scrub', 'snow')) {
    setPaint(map, id, 'fill-color', p.landcover);
    return;
  }
  if (has(id, 'building')) {
    setPaint(map, id, 'fill-color', p.building);
    setPaint(map, id, 'fill-outline-color', p.buildingOutline);
    return;
  }
  if (has(id, 'land', 'landuse')) {
    setPaint(map, id, 'fill-color', p.land);
  }
}

/* ------------------------------------------------------------------ *
 * POI suppression (§3.5)
 * ------------------------------------------------------------------ */

/**
 * ANDs an exclusion onto the layer's existing filter rather than replacing it — the stock
 * `poi-label` filter carries the zoom/rank logic that keeps the layer sane, and clobbering it
 * dumps every POI onto the map at once.
 */
function suppressDuplicatePois(map: MapboxMap, id: string): void {
  try {
    const existing = map.getFilter(id) as unknown;
    const exclusion = [
      '!',
      ['in', ['get', 'class'], ['literal', [...SUPPRESSED_POI_CLASSES]]],
    ];
    const next = existing ? ['all', existing, exclusion] : exclusion;
    map.setFilter(id, next as never);
  } catch {
    /* filter shape unsupported — POIs stay visible, which is merely noisy, not broken */
  }
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export function applyBasemapStyle(map: MapboxMap, mode: ThemeMode): void {
  const p = getBasemapPalette(mode);

  let layers: StyleLayer[];
  try {
    layers = (map.getStyle()?.layers ?? []) as StyleLayer[];
  } catch {
    return; // style not ready — the style.load caller guarantees it is, but never throw here
  }

  for (const layer of layers) {
    switch (layer.type) {
      case 'background':
        setPaint(map, layer.id, 'background-color', p.land);
        break;
      case 'fill':
        styleFillLayer(map, layer, p);
        break;
      case 'line':
        styleLineLayer(map, layer, p);
        break;
      case 'symbol':
        styleSymbolLayer(map, layer, p);
        if (has(layer.id, 'poi-label')) suppressDuplicatePois(map, layer.id);
        break;
      case 'fill-extrusion':
        setPaint(map, layer.id, 'fill-extrusion-color', p.buildingExtrusion);
        break;
      default:
        break;
    }
  }
}
