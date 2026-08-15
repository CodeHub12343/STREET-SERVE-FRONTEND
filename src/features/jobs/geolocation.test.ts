import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCurrentCoords, locationFailureKind } from './hooks/useJobs';

/**
 * "Location permission is needed" used to be shown for EVERY geolocation failure — including the
 * ones where permission was already granted and working. Someone with location switched on was told
 * to switch on location, which is a dead end dressed as an instruction.
 *
 * The browser gives three distinct codes and only one of them is about permission. These tests pin
 * that they stay distinguishable, and that the request itself is tuned so browsing does not demand
 * a satellite-grade fix it does not need.
 */

const ERR = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
} as const;

function mockGeolocation(code: number) {
  // The options argument is declared because the accuracy assertions below read it.
  const getCurrentPosition = vi.fn(
    (_ok: PositionCallback, fail?: PositionErrorCallback | null, _opts?: PositionOptions) => {
      fail?.({ code, message: '', ...ERR } as GeolocationPositionError);
    },
  );
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  return getCurrentPosition;
}

afterEach(() => vi.unstubAllGlobals());

describe('geolocation failures are told apart', () => {
  it('reports a denied permission as denied, and says where to unblock it', async () => {
    mockGeolocation(ERR.PERMISSION_DENIED);

    await expect(getCurrentCoords()).rejects.toMatchObject({ kind: 'denied' });
    await expect(getCurrentCoords()).rejects.toThrow(/padlock|allow it in your browser/i);
  });

  it('does NOT blame permission when the device simply has no fix', async () => {
    // The regression: location on, working, but the device cannot resolve a position.
    mockGeolocation(ERR.POSITION_UNAVAILABLE);

    const err = await getCurrentCoords().catch((e: unknown) => e);
    expect(locationFailureKind(err)).toBe('unavailable');
    expect((err as Error).message).not.toMatch(/permission/i);
  });

  it('does NOT blame permission on a timeout', async () => {
    // The likeliest cause on a laptop: permission granted, fix just too slow.
    mockGeolocation(ERR.TIMEOUT);

    const err = await getCurrentCoords().catch((e: unknown) => e);
    expect(locationFailureKind(err)).toBe('timeout');
    expect((err as Error).message).not.toMatch(/permission/i);
    expect((err as Error).message).toMatch(/too long/i);
  });

  it('reports a device with no geolocation at all as unsupported', async () => {
    vi.stubGlobal('navigator', {});
    const err = await getCurrentCoords().catch((e: unknown) => e);
    expect(locationFailureKind(err)).toBe('unsupported');
  });

  it('returns null for errors that are not ours, rather than guessing', () => {
    expect(locationFailureKind(new Error('something else'))).toBeNull();
    expect(locationFailureKind(null)).toBeNull();
  });
});

describe('accuracy is matched to what the caller actually needs', () => {
  it('browsing accepts a recent, coarse fix — which is what stops the timeouts', async () => {
    const spy = mockGeolocation(ERR.TIMEOUT);
    await getCurrentCoords().catch(() => undefined);

    const opts = spy.mock.calls[0]![2] as PositionOptions;
    expect(opts.enableHighAccuracy).toBe(false);
    // A minute-old fix ranks a list of nearby gigs exactly as well as a fresh one.
    expect(opts.maximumAge).toBeGreaterThan(0);
  });

  it('check-in demands a fresh, precise fix, because it gates on real distance', async () => {
    const spy = mockGeolocation(ERR.TIMEOUT);
    await getCurrentCoords({ precise: true }).catch(() => undefined);

    const opts = spy.mock.calls[0]![2] as PositionOptions;
    expect(opts.enableHighAccuracy).toBe(true);
    // A cached position could wave through someone who is not on site.
    expect(opts.maximumAge).toBe(0);
  });
});

/**
 * The jobs board cannot be fetched without coordinates — `NearbyJobsQuery` requires lat and lng —
 * so a failed acquisition is not a degraded list, it is no list at all. A worker opening this screen
 * is usually looking for work now, and showing them an empty board because the GPS was slow is a far
 * worse error than ranking from a position a few minutes old.
 */
describe('the board survives a failed fix', () => {
  const STORE_KEY = 'ss.jobs.lastKnownCoords';

  function withStorage(initial: Record<string, string> = {}) {
    const store = new Map(Object.entries(initial));
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    });
    return store;
  }

  it('remembers a good position so a later failure still ranks the board', async () => {
    const store = withStorage();
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 6.44, longitude: 3.39 } } as GeolocationPosition),
      },
    });

    const { resolveRankingCoords } = await import('./hooks/useJobs');
    const first = await resolveRankingCoords();
    expect(first).toEqual({ lat: 6.44, lng: 3.39 });
    expect(store.get(STORE_KEY)).toBeTruthy();
  });

  it('ranks from the remembered position when the fix fails', async () => {
    // The whole point: a slow GPS must not empty a board that someone opened to find work today.
    withStorage({ [STORE_KEY]: JSON.stringify({ lat: 6.44, lng: 3.39 }) });
    mockGeolocation(ERR.TIMEOUT);

    const { resolveRankingCoords } = await import('./hooks/useJobs');
    await expect(resolveRankingCoords()).resolves.toEqual({ lat: 6.44, lng: 3.39 });
  });

  it('keeps the original error when there is no remembered position', async () => {
    // Nothing stored means nothing to fall back to, and the banner still has to explain what to do.
    withStorage();
    mockGeolocation(ERR.TIMEOUT);
    await expect(getCurrentCoords()).rejects.toMatchObject({ kind: 'timeout' });
  });
});
