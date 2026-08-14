import { describe, expect, it } from 'vitest';

import { ALL_MODES, MODE_META, modeFromPathname } from './modes';

describe('modeFromPathname — the surface on screen', () => {
  it('maps each surface root and its nested routes', () => {
    expect(modeFromPathname('/map')).toBe('customer');
    expect(modeFromPathname('/map/list')).toBe('customer');
    expect(modeFromPathname('/seller')).toBe('seller');
    expect(modeFromPathname('/seller/inventory')).toBe('seller');
    expect(modeFromPathname('/vendor/analytics')).toBe('vendor');
    expect(modeFromPathname('/hub/settlements')).toBe('hub');
    expect(modeFromPathname('/admin/disputes/abc')).toBe('admin');
  });

  it('reports customer for customer surfaces a seller or hub can navigate to', () => {
    // The regression: a hub owner tapping into these kept the label "Consignment Hub".
    for (const p of ['/map', '/profile', '/profile/wallet', '/orders', '/favorites', '/settings']) {
      expect(modeFromPathname(p)).toBe('customer');
    }
  });

  it('returns null for routes that belong to no surface', () => {
    // Guessing a mode for these would trade one wrong label for another.
    for (const p of ['/', '/sign-in', '/onboarding/role', '/pay/tok_123', '/payouts/complete']) {
      expect(modeFromPathname(p)).toBeNull();
    }
  });

  it('matches whole segments, so a sibling route cannot be captured by a prefix', () => {
    expect(modeFromPathname('/vendors')).toBeNull();
    expect(modeFromPathname('/sellers-guide')).toBeNull();
    expect(modeFromPathname('/mapbox')).toBeNull();
  });

  it("every mode's own home resolves back to that mode", () => {
    // Otherwise switching to a mode would land on a surface that reports a different one.
    for (const mode of ALL_MODES) {
      expect(modeFromPathname(MODE_META[mode].home)).toBe(mode);
    }
  });
});
