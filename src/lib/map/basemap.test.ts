import { describe, it, expect } from 'vitest';
import type { Map as MapboxMap } from 'mapbox-gl';
import { applyBasemapStyle } from './basemap';
import { getBasemapPalette } from './palette';

interface StubLayer {
  id: string;
  type: string;
}

/** Records every paint/layout write so assertions can read the resolved style. */
function stubMap(layers: StubLayer[], opts: { throwOn?: string; filters?: Record<string, unknown> } = {}) {
  const paint: Record<string, Record<string, unknown>> = {};
  const layout: Record<string, Record<string, unknown>> = {};
  const filters: Record<string, unknown> = { ...opts.filters };

  const map = {
    getStyle: () => ({ layers }),
    setPaintProperty: (id: string, prop: string, value: unknown) => {
      if (id === opts.throwOn) throw new Error('unsupported property');
      (paint[id] ??= {})[prop] = value;
    },
    setLayoutProperty: (id: string, prop: string, value: unknown) => {
      if (id === opts.throwOn) throw new Error('unsupported property');
      (layout[id] ??= {})[prop] = value;
    },
    getFilter: (id: string) => filters[id],
    setFilter: (id: string, f: unknown) => {
      filters[id] = f;
    },
  };

  return {
    map: map as unknown as MapboxMap,
    /** Resolved paint for a layer — `{}` when untouched, so assertions stay index-safe. */
    paint: (id: string): Record<string, unknown> => paint[id] ?? {},
    layout: (id: string): Record<string, unknown> => layout[id] ?? {},
    /** Whether the layer was written to at all (distinct from "written with no properties"). */
    touched: (id: string): boolean => id in paint || id in layout,
    filters,
  };
}

const PAPER = getBasemapPalette('light');
const INK = getBasemapPalette('dark');

describe('applyBasemapStyle', () => {
  it('paints the background and land with the palette land color', () => {
    const { map, paint } = stubMap([
      { id: 'background', type: 'background' },
      { id: 'land', type: 'fill' },
    ]);
    applyBasemapStyle(map, 'light');

    expect(paint('background')['background-color']).toBe(PAPER.land);
    expect(paint('land')['fill-color']).toBe(PAPER.land);
  });

  it('distinguishes road casings from road fills', () => {
    // The highest-risk matching rule: `road-primary-case` also contains `primary`, so casings must
    // be tested first or every casing silently takes the fill color and the grid disappears.
    const { map, paint } = stubMap([
      { id: 'road-motorway-trunk', type: 'line' },
      { id: 'road-motorway-trunk-case', type: 'line' },
      { id: 'road-primary', type: 'line' },
      { id: 'road-primary-case', type: 'line' },
      { id: 'road-secondary-tertiary', type: 'line' },
      { id: 'road-secondary-tertiary-case', type: 'line' },
      { id: 'road-minor', type: 'line' },
      { id: 'road-minor-case', type: 'line' },
    ]);
    applyBasemapStyle(map, 'light');

    expect(paint('road-motorway-trunk')['line-color']).toBe(PAPER.motorway);
    expect(paint('road-motorway-trunk-case')['line-color']).toBe(PAPER.motorwayCase);
    expect(paint('road-primary')['line-color']).toBe(PAPER.primary);
    expect(paint('road-primary-case')['line-color']).toBe(PAPER.primaryCase);
    expect(paint('road-secondary-tertiary')['line-color']).toBe(PAPER.secondary);
    expect(paint('road-secondary-tertiary-case')['line-color']).toBe(PAPER.secondaryCase);
    expect(paint('road-minor')['line-color']).toBe(PAPER.residential);
    expect(paint('road-minor-case')['line-color']).toBe(PAPER.residentialCase);
  });

  it('widens minor road casings but leaves arterial widths native', () => {
    const { map, paint } = stubMap([
      { id: 'road-minor-case', type: 'line' },
      { id: 'road-primary-case', type: 'line' },
    ]);
    applyBasemapStyle(map, 'light');

    expect(paint('road-minor-case')['line-width']).toBeDefined();
    expect(paint('road-primary-case')['line-width']).toBeUndefined();
  });

  it('gives every label a hard, unblurred halo', () => {
    const { map, paint } = stubMap([
      { id: 'road-label-simple', type: 'symbol' },
      { id: 'settlement-major-label', type: 'symbol' },
    ]);
    applyBasemapStyle(map, 'light');

    expect(paint('road-label-simple')['text-color']).toBe(PAPER.labelStreet);
    expect(paint('road-label-simple')['text-halo-width']).toBeGreaterThanOrEqual(1.4);
    expect(paint('road-label-simple')['text-halo-blur']).toBe(0);
    expect(paint('settlement-major-label')['text-halo-blur']).toBe(0);
  });

  it('uppercases district labels only', () => {
    const { map, layout } = stubMap([
      { id: 'settlement-subdivision-label', type: 'symbol' },
      { id: 'settlement-major-label', type: 'symbol' },
    ]);
    applyBasemapStyle(map, 'light');

    expect(layout('settlement-subdivision-label')['text-transform']).toBe('uppercase');
    expect(layout('settlement-major-label')['text-transform']).toBeUndefined();
  });

  it('leaves road shields untouched', () => {
    // Shields carry baked artwork; repainting their text produces unreadable mush.
    const { map, touched } = stubMap([{ id: 'road-number-shield', type: 'symbol' }]);
    applyBasemapStyle(map, 'light');

    expect(touched('road-number-shield')).toBe(false);
  });

  it('ANDs POI suppression onto the existing filter instead of replacing it', () => {
    const existing = ['<=', ['get', 'filterrank'], 2];
    const { map, filters } = stubMap([{ id: 'poi-label', type: 'symbol' }], {
      filters: { 'poi-label': existing },
    });
    applyBasemapStyle(map, 'light');

    const next = filters['poi-label'] as unknown[];
    expect(next[0]).toBe('all');
    expect(next[1]).toBe(existing);
  });

  it('sets a bare exclusion when the layer has no existing filter', () => {
    const { map, filters } = stubMap([{ id: 'poi-label', type: 'symbol' }]);
    applyBasemapStyle(map, 'light');

    expect((filters['poi-label'] as unknown[])[0]).toBe('!');
  });

  it('resolves a different palette per theme', () => {
    const light = stubMap([{ id: 'water', type: 'fill' }]);
    applyBasemapStyle(light.map, 'light');
    const dark = stubMap([{ id: 'water', type: 'fill' }]);
    applyBasemapStyle(dark.map, 'dark');

    expect(light.paint('water')['fill-color']).toBe(PAPER.water);
    expect(dark.paint('water')['fill-color']).toBe(INK.water);
    expect(PAPER.water).not.toBe(INK.water);
  });

  it('survives a layer that rejects a property and keeps styling the rest', () => {
    const { map, paint } = stubMap(
      [
        { id: 'water', type: 'fill' },
        { id: 'land', type: 'fill' },
      ],
      { throwOn: 'water' },
    );

    expect(() => applyBasemapStyle(map, 'light')).not.toThrow();
    expect(paint('land')['fill-color']).toBe(PAPER.land);
  });

  it('is a no-op when the style is not readable', () => {
    const map = {
      getStyle: () => {
        throw new Error('style not loaded');
      },
    } as unknown as MapboxMap;

    expect(() => applyBasemapStyle(map, 'light')).not.toThrow();
  });

  it('ignores unknown layer types', () => {
    const { map, touched } = stubMap([{ id: 'hillshade', type: 'raster' }]);
    applyBasemapStyle(map, 'light');

    expect(touched('hillshade')).toBe(false);
  });
});
