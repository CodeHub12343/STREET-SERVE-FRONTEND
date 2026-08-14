import { afterEach, describe, expect, it, vi } from 'vitest';
import { bboxKey, coverCells, distanceMeters, geohashEncode, requestPosition } from './geo';

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

/**
 * The mobile PWA reported "finding your location took too long" repeatedly. Every call site asked
 * for a FRESH high-accuracy fix (`maximumAge` defaults to 0), which a phone indoors cannot deliver
 * inside ten seconds — so the retry advice was advice to fail again.
 */
describe('requestPosition', () => {
  const position = (accuracy = 30) =>
    ({ coords: { longitude: -120.9969, latitude: 37.6391, accuracy } }) as GeolocationPosition;

  const stub = (impl: (ok: PositionCallback, err: PositionErrorCallback, o: PositionOptions) => void) => {
    const getCurrentPosition = vi.fn(impl);
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
    return getCurrentPosition;
  };

  afterEach(() => vi.unstubAllGlobals());

  it('accepts a recent cached fix on the first pass, without a second request', async () => {
    const get = stub((ok) => ok(position()));

    await expect(requestPosition()).resolves.toMatchObject({ coords: { latitude: 37.6391 } });

    expect(get).toHaveBeenCalledTimes(1);
    // The whole point: a position the device already holds is good enough for choosing an area.
    expect(get.mock.calls[0]![2]).toMatchObject({ maximumAge: 300_000, enableHighAccuracy: false });
  });

  it('retries patiently when the fast pass times out', async () => {
    const get = stub((ok, err, opts) => {
      if (opts.enableHighAccuracy) return ok(position(12));
      err({ code: 3, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
    });

    await expect(requestPosition()).resolves.toMatchObject({ coords: { accuracy: 12 } });

    expect(get).toHaveBeenCalledTimes(2);
    // A cold GPS needs materially longer than the 10s every call site used to allow.
    expect(get.mock.calls[1]![2]).toMatchObject({ enableHighAccuracy: true, timeout: 25_000 });
  });

  it('honours a tighter cache window for callers that pin a physical position', async () => {
    // Going live sets the seller's map pin where they are standing; a 5-minute-old fix could be
    // blocks away, so that caller narrows the window rather than taking the onboarding default.
    const get = stub((ok) => ok(position()));

    await requestPosition({ maxCachedAgeMs: 60_000 });

    expect(get.mock.calls[0]![2]).toMatchObject({ maximumAge: 60_000 });
  });

  it('does not retry a denied permission', async () => {
    // Asking again cannot turn a denial into a grant, and the browser will not re-prompt — retrying
    // only makes the user wait longer for the same answer.
    const get = stub((_ok, err) =>
      err({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
    );

    await expect(requestPosition()).rejects.toMatchObject({ code: 1 });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('rejects rather than hanging when the device has no geolocation at all', async () => {
    vi.stubGlobal('navigator', {});
    await expect(requestPosition()).rejects.toMatchObject({ code: 2 });
  });
});
