'use client';

/**
 * The mode the user is ACTUALLY in — read from the route, not from stored intent.
 *
 * Before this, every "You're in …" label read the persisted `activeMode`, which is only written
 * when someone taps Switch. Reaching a surface any other way left the label describing a mode the
 * user had left: standing on the customer map with the orbit insisting "You're in Consignment Hub".
 *
 * The store is not redundant — it still answers "where should this user land / what did they last
 * choose", which matters on routes that belong to no surface (onboarding, sign-in, a payment link).
 * So: route first, stored preference only as the fallback.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useModeStore } from '@/stores/mode.store';
import type { AppMode } from '@/types';
import { modeFromPathname } from '../modes';

export function useActiveMode(): AppMode {
  const pathname = usePathname();
  const stored = useModeStore((s) => s.activeMode);
  const setMode = useModeStore((s) => s.setMode);

  const routeMode = modeFromPathname(pathname ?? '');

  /**
   * Write the route's answer back, so the persisted preference converges on where the user really
   * goes and survives to the next session. Guarded: an unconditional set would loop, and several
   * components call this hook on the same render.
   */
  useEffect(() => {
    if (routeMode && routeMode !== stored) setMode(routeMode);
  }, [routeMode, stored, setMode]);

  return routeMode ?? stored;
}
