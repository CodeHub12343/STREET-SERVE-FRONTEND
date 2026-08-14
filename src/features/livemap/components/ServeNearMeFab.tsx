'use client';

/**
 * "Serve Near Me" FAB (docs/06 §2.5a) — recenters on the user's location and refreshes results.
 * Falls back to the current viewport center if geolocation is unavailable/denied.
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Crosshair } from 'lucide-react';
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
  const [busy, setBusy] = useState(false);
  const didAutoLocate = useRef(false);

  const locate = (opts?: { auto?: boolean }) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        // Cold start often yields a coarse network/IP fix — a far-off major city, not the user's
        // GPS position. For the AUTOMATIC locate, ignore imprecise fixes so they can't yank the map
        // away from the user's remembered location. A manual tap always applies (they asked for it,
        // and by then GPS has usually warmed up to a precise fix).
        if (opts?.auto && pos.coords.accuracy > AUTO_MAX_ACCURACY_M) return;
        onLocate([pos.coords.longitude, pos.coords.latitude]);
      },
      () => setBusy(false), // denied/unavailable → stay on the current viewport (graceful fallback)
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  };

  // First load: centre on the user automatically so they see what's near them without a tap. Guarded
  // to run exactly once; if permission is denied the map simply stays on the restored viewport.
  useEffect(() => {
    if (!autoLocate || didAutoLocate.current) return;
    didAutoLocate.current = true;
    locate({ auto: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate]);

  return (
    <Fab type="button" onClick={() => locate()} aria-label="Serve near me" $busy={busy}>
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
