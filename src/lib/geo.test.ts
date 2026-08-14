import { describe, expect, it } from 'vitest';
import { bboxKey, coverCells, distanceMeters, geohashEncode } from './geo';

describe('geo', () => {
  it('encodes a known coordinate to the expected geohash prefix', () => {
    // San Francisco (lng, lat).
    expect(geohashEncode([-122.4194, 37.7749], 5)).toBe('9q8yy');
  });

  it('measures distance between two points (~1.6km across SF blocks)', () => {
    const d = distanceMeters([-122.4194, 37.7749], [-122.4, 37.79]);
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(3000);
  });

  it('builds a stable rounded bbox key', () => {
    expect(bboxKey([-122.42, 37.77], [-122.4, 37.79])).toBe('-122.420,37.770,-122.400,37.790');
  });

  it('covers a bbox with a bounded, unique set of cells', () => {
    const cells = coverCells([-121.04, 37.61], [-120.96, 37.67], 6);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThanOrEqual(64); // hard cap
    expect(new Set(cells).size).toBe(cells.length); // unique
  });
});
