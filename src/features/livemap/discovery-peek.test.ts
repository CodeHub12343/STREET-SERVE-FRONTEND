import { describe, expect, it } from 'vitest';

import { DISCOVERY_PEEK, discoveryPeekHeight } from './components/DiscoverySheet';

/**
 * The peek is the only app chrome permanently covering the map, so its height is a direct tax on
 * the product's main surface. These lock in that the tax scales with the screen and disappears
 * when the peek has nothing to show.
 */
describe('discoveryPeekHeight', () => {
  it('collapses to a bare bar when there is nothing to preview', () => {
    // The reported bug: "0 nearby" sat in a tall empty card on a phone.
    const bare = discoveryPeekHeight(844, false);
    expect(bare).toBeLessThan(DISCOVERY_PEEK);
    expect(bare).toBe(72);
  });

  it('never exceeds the design maximum on a tall screen', () => {
    expect(discoveryPeekHeight(1200, true)).toBe(DISCOVERY_PEEK);
    expect(discoveryPeekHeight(844, true)).toBe(DISCOVERY_PEEK);
  });

  it('shrinks on a short viewport rather than eating a bigger share of the map', () => {
    // A phone with the browser URL bar showing.
    const short = discoveryPeekHeight(600, true);
    expect(short).toBeLessThan(DISCOVERY_PEEK);
    expect(short / 600).toBeLessThanOrEqual(0.18);
  });

  it('keeps a floor so the result row cannot clip on very short viewports', () => {
    expect(discoveryPeekHeight(400, true)).toBe(104);
    expect(discoveryPeekHeight(200, true)).toBe(104);
  });

  it('always leaves the large majority of the viewport to the map', () => {
    for (const vh of [560, 640, 720, 844, 932]) {
      expect(discoveryPeekHeight(vh, true) / vh).toBeLessThan(0.2);
    }
  });
});
