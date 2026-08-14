'use client';

/**
 * Capability ladder (LANDING_PAGE_3D_INTERACTIONS.md §7). Detection order is binding:
 * reduced-motion (T0, overrides all) → no WebGL / save-data / no Mapbox token (T3, static poster)
 * → touch/small-viewport/low-memory (T2 lite) → T1 full. Starts at 'ssr' so the server and the
 * first client render agree (poster-only), then resolves after mount.
 */
import { useEffect, useState } from 'react';
import { isMapConfigured } from '@/lib/env';

export type CapabilityTier = 'ssr' | 'T0' | 'T1' | 'T2' | 'T3';

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function detect(): CapabilityTier {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'T0';
  const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData;
  if (!isMapConfigured || saveData || !detectWebGL()) return 'T3';
  const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory;
  const small = window.matchMedia('(max-width: 1023px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (small || coarse || (deviceMemory !== undefined && deviceMemory <= 4)) return 'T2';
  return 'T1';
}

export interface CapabilityState {
  tier: CapabilityTier;
  /** T0 users can explicitly opt into the animated scene ("Play preview ▶"). */
  playAnyway: () => void;
}

export function useCapabilityTier(): CapabilityState {
  const [tier, setTier] = useState<CapabilityTier>('ssr');
  const [override, setOverride] = useState(false);

  useEffect(() => {
    setTier(detect());
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      setOverride(false);
      setTier(detect());
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const effective: CapabilityTier =
    override && tier === 'T0'
      ? // Opted-in reduced-motion users get the lite scene — gentler by design.
        'T2'
      : tier;

  return { tier: effective, playAnyway: () => setOverride(true) };
}
