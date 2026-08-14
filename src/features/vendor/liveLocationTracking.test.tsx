import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// `vi.hoisted` because the mock factory is lifted above ordinary top-level consts.
const patch = vi.hoisted(() => vi.fn());
const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', () => ({ api: { patch, post, get: vi.fn(), del: vi.fn() } }));
vi.mock('@/lib/env', () => ({ isMapDemo: false, isAuthConfigured: false }));

import { useLiveLocationTracking } from './hooks/useLiveSession';

/**
 * A live vendor's pin has to follow the vendor.
 *
 * The backend has always had `PATCH /live-sessions/:id/location` — it moves the pin, re-buckets the
 * geohash, refreshes the live store and emits a realtime update. **Nothing in the app ever called
 * it.** The dashboard sent heartbeats only, so `current_location` stayed frozen at the single fix
 * taken when the vendor tapped "Go live", permanently, including while their status said `driving`.
 *
 * The symptom is a vendor who is live and confident and customers standing next to them seeing
 * "0 nearby" — and if that first fix was a coarse IP one, the pin was in the wrong city entirely.
 *
 * These tests exist because that class of bug (a complete endpoint with no caller) is invisible to
 * every other kind of check: types pass, lint passes, the backend's own tests pass.
 */

type Watcher = (pos: { coords: { longitude: number; latitude: number; accuracy: number } }) => void;

let watcher: Watcher | null = null;
const clearWatch = vi.fn();

function emit(lng: number, lat: number, accuracy = 10) {
  act(() => {
    watcher?.({ coords: { longitude: lng, latitude: lat, accuracy } });
  });
}

beforeEach(() => {
  patch.mockReset().mockResolvedValue({ ok: true });
  post.mockReset().mockResolvedValue({ ok: true });
  clearWatch.mockClear();
  watcher = null;
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: {
      watchPosition: (ok: Watcher) => {
        watcher = ok;
        return 1;
      },
      clearWatch,
      getCurrentPosition: vi.fn(),
    },
  });
});
afterEach(() => vi.restoreAllMocks());

describe('useLiveLocationTracking', () => {
  it('pushes the vendor’s position to the endpoint that was never being called', async () => {
    renderHook(() => useLiveLocationTracking('sess_1', 'driving'));
    emit(3.39, 6.45);

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch).toHaveBeenCalledWith('/live-sessions/sess_1/location', {
      lng: 3.39,
      lat: 6.45,
    });
  });

  it('ignores coarse fixes, which is what teleports a pin into the wrong city', async () => {
    renderHook(() => useLiveLocationTracking('sess_1', 'driving'));

    // A network/IP fix: accurate to kilometres, and pointing at a carrier's city centre.
    emit(3.39, 6.45, 5000);
    expect(patch).not.toHaveBeenCalled();

    // A real GPS fix is accepted.
    emit(5.32, 7.78, 12);
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
  });

  it('does not spend a request on GPS jitter', async () => {
    renderHook(() => useLiveLocationTracking('sess_1', 'parked'));

    emit(3.39, 6.45);
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));

    // ~2 metres away. A stationary phone does this constantly; posting each one would flatten a
    // vendor's battery over a shift.
    emit(3.390018, 6.45);
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it('pushes once the vendor has genuinely moved', async () => {
    renderHook(() => useLiveLocationTracking('sess_1', 'driving'));

    emit(3.39, 6.45);
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));

    // ~110 m east — a truck that has actually driven somewhere.
    emit(3.391, 6.45);
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
  });

  it('does not track a session that is away/closed', () => {
    renderHook(() => useLiveLocationTracking('sess_1', 'away_closed'));
    // Nothing is watching, so there is no position to emit and nothing to push.
    expect(watcher).toBeNull();
  });

  it('does not track when there is no session', () => {
    renderHook(() => useLiveLocationTracking(undefined, undefined));
    expect(watcher).toBeNull();
  });

  it('stops watching on unmount, so a closed dashboard stops using GPS', () => {
    const { unmount } = renderHook(() => useLiveLocationTracking('sess_1', 'driving'));
    unmount();
    expect(clearWatch).toHaveBeenCalledWith(1);
  });
});
