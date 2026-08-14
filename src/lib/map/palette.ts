/**
 * Basemap palettes (MAP_REDESIGN_SPECIFICATION §3.2 "Paper" / §3.4 "Ink").
 *
 * These replace the washed-out `light-v11` / `dark-v11` backdrops, which Mapbox ships deliberately
 * low-contrast as a substrate for data overlays — land `#F8F8F8` against residential road `#FFFFFF`
 * is 1.07:1, and road labels near `#8C8C8C` land at 2.6:1, under the WCAG large-text floor. Used as
 * a wayfinding basemap they read as permanently faded, which is exactly the reported symptom.
 *
 * The light palette's central trick: land is warm off-white and roads are pure white, so the *fill*
 * contrast stays low by design and the road **casing** carries legibility. This is how a near-white
 * map stays readable (cf. Apple Maps); widening the casings matters far more than darkening fills.
 * Dark mode inverts it — land is darker than road fill, so fill carries hierarchy and casing is
 * nearly vestigial. Do not mirror the light-mode casing weights into Ink.
 */
import type { ThemeMode } from '@/styles/tokens';

export interface BasemapPalette {
  land: string;
  landcover: string;
  park: string;
  water: string;
  waterLabel: string;
  waterLabelHalo: string;
  building: string;
  buildingOutline: string;
  buildingExtrusion: string;
  /** Road fills, ordered by hierarchy. */
  motorway: string;
  motorwayCase: string;
  primary: string;
  primaryCase: string;
  secondary: string;
  secondaryCase: string;
  residential: string;
  residentialCase: string;
  path: string;
  rail: string;
  adminBoundary: string;
  /** Label inks. */
  labelCountry: string;
  labelCity: string;
  labelDistrict: string;
  labelStreet: string;
  labelPoi: string;
  /** One halo color per theme — a constant local background behind every glyph. */
  halo: string;
  haloSoft: string;
  /** Fog + extrusion tints handed to the cinematic kit so both stay in one palette. */
  fog: string;
  fogHorizon: string;
}

const PAPER: BasemapPalette = {
  land: '#F4F2ED',
  landcover: '#EAEFE6',
  park: '#E2EDDD',
  water: '#C3D9E8',
  waterLabel: '#40728F',
  waterLabelHalo: '#DDEBF5',
  building: '#EAE7E0',
  buildingOutline: '#DCD8CF',
  buildingExtrusion: '#EFECE5',
  motorway: '#FFD79A',
  motorwayCase: '#E8B25C',
  primary: '#FFFFFF',
  primaryCase: '#D6D1C6',
  secondary: '#FFFFFF',
  secondaryCase: '#DFDAD0',
  residential: '#FCFBF8',
  residentialCase: '#E7E2D8',
  path: '#EDE9E1',
  rail: '#D3CEC4',
  adminBoundary: '#CFC9BE',
  labelCountry: '#6B675E',
  labelCity: '#232220',
  labelDistrict: '#3A3833',
  labelStreet: '#54514A',
  labelPoi: '#5C594F',
  halo: '#FFFFFF',
  haloSoft: '#F4F2ED',
  fog: '#F4F2ED',
  fogHorizon: '#CBD9F0',
};

const INK: BasemapPalette = {
  land: '#101216',
  landcover: '#141A17',
  park: '#16211A',
  water: '#0A1721',
  waterLabel: '#6E93AB',
  waterLabelHalo: '#0A1721',
  building: '#191C22',
  buildingOutline: '#232830',
  buildingExtrusion: '#1B1F26',
  motorway: '#4A4335',
  motorwayCase: '#6B5F45',
  primary: '#2C313A',
  primaryCase: '#3B424E',
  secondary: '#272C34',
  secondaryCase: '#353B46',
  residential: '#212630',
  residentialCase: '#2B313B',
  path: '#232830',
  rail: '#2A303A',
  adminBoundary: '#3A414C',
  labelCountry: '#8A909C',
  labelCity: '#F0F2F6',
  labelDistrict: '#D6DAE2',
  labelStreet: '#A8ADB8',
  labelPoi: '#949AA6',
  halo: '#101216',
  haloSoft: '#0A0C0F',
  fog: '#101216',
  fogHorizon: '#13233F',
};

export const BASEMAP_PALETTES: Record<ThemeMode, BasemapPalette> = {
  light: PAPER,
  dark: INK,
};

export function getBasemapPalette(mode: ThemeMode): BasemapPalette {
  return BASEMAP_PALETTES[mode];
}

/**
 * Generic POI classes suppressed because StreetServe renders these categories as its own pins
 * (§3.5). Without this every coffee pin sits beside a Mapbox coffee icon and the map reads as
 * duplicated — the most visible source of marker-field noise after pin LOD.
 */
export const SUPPRESSED_POI_CLASSES = [
  'restaurant',
  'fast_food',
  'cafe',
  'bakery',
  'bar',
  'grocery',
  'food_and_drink',
  'food_and_drink_stores',
  // Mapbox Streets v8 spells retail `shop`; `shopping` is carried as a defensive alias in case a
  // future tileset revision renames it. Verified against a live render — `shopping` alone was
  // silently matching nothing.
  'shop',
  'shopping',
  'clothing_store',
  'convenience',
] as const;
