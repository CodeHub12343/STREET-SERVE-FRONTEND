'use client';

/**
 * "Serve Near Me" FAB (docs/06 §2.5a) — recenters on the user's location and refreshes results.
 * Falls back to the current viewport center if geolocation is unavailable/denied.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Crosshair } from 'lucide-react';
import { useToast } from '@/components/feedback/ToastProvider';
import { positionErrorMessage, requestPosition } from '@/lib/geo';
import type { LngLat } from '@/types';

// Above this accuracy (metres) a fix is treated as coarse (IP/network, not GPS) and is not allowed
// to auto-recentre the map. Manual taps bypass this.
const AUTO_MAX_ACCURACY_M = 1500;

export function ServeNearMeFab({
  onLocate,
  autoLocate = false,
}: {
  onLocate: (center: LngLat) => void;
  /** Run the locate once on mount so the map opens on the user's surroundings, not the pilot default. */
  autoLocate?: boolean;
}) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const didAutoLocate = useRef(false);

  const locate = async (opts?: { auto?: boolean }) => {
    setBusy(true);
    try {
      /**
       * The automatic locate keeps `maximumAge: 0` and the accuracy guard below: a cached or coarse
       * fix must not silently drag the map off the viewport the user left it on.
       *
       * A manual tap is the opposite situation — the user is explicitly asking to be moved, and the
       * old 10s/no-cache request routinely could not deliver on a phone indoors. It then failed
       * SILENTLY (see the catch), so the button appeared to do nothing at all while the map stayed
       * on a remembered viewport that could be thousands of miles away.
       */
      const pos = opts?.auto
        ? await new Promise<GeolocationPosition>((resolve, reject) => {
            if (typeof navigator === 'undefined' || !navigator.geolocation) {
              reject(undefined);
              return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10_000,
              maximumAge: 0,
            });
          })
        : await requestPosition({ maxCachedAgeMs: 60_000 });

      // Cold start often yields a coarse network/IP fix — a far-off major city, not the user's GPS
      // position. Never let that auto-recentre; a manual tap applies regardless, because the user
      // asked and a rough fix still beats a stale viewport on another continent.
      if (opts?.auto && pos.coords.accuracy > AUTO_MAX_ACCURACY_M) return;
      onLocate([pos.coords.longitude, pos.coords.latitude]);
    } catch (e) {
      /**
       * Silence here was the whole defect. The map remembers its last viewport in localStorage, so a
       * failed locate leaves the user staring at wherever the map happened to be — with "0 nearby",
       * which reads as "there is nothing around you" rather than "I could not find you".
       *
       * The automatic attempt stays quiet: the user did not ask for it, and a toast on page load
       * would be noise. A tap gets an answer.
       */
      if (!opts?.auto) {
        show(
          positionErrorMessage(e as GeolocationPositionError | undefined, 'The map is still showing its last area.'),
          'warning',
        );
      }
    } finally {
      setBusy(false);
    }
  };

  // First load: centre on the user automatically so they see what's near them without a tap. Guarded
  // to run exactly once; if permission is denied the map simply stays on the restored viewport.
  useEffect(() => {
    if (!autoLocate || didAutoLocate.current) return;
    didAutoLocate.current = true;
    void locate({ auto: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate]);

  return (
    <Fab type="button" onClick={() => void locate()} aria-label="Serve near me" $busy={busy}>
      <Crosshair size={18} aria-hidden />
      Serve Near Me
    </Fab>
  );
}

const Fab = styled.button<{ $busy: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 20px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.color.shadow};
  opacity: ${({ $busy }) => ($busy ? 0.7 : 1)};
`;
