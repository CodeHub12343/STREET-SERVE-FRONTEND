'use client';

/**
 * Map capability ladder for the PRODUCT map — the hero's T1/T2 model (LANDING_PAGE_3D_INTERACTIONS
 * §7) adapted to a utility surface:
 *  - 'cinematic': desktop-class device, WebGL, no reduced-motion → dusk camera (pitch/bearing),
 *    3D building extrusions + fog, 3D/2D toggle, animated cameras.
 *  - 'lite': touch/small/low-memory or reduced motion → flat camera, no extrusions; smoothness
 *    (pin glide, eased focus) still applies because Mapbox honors reduced-motion natively.
 * SSR-safe: starts 'lite' and resolves after mount so server/client first paint agree.
 */
import { useEffect, useState } from 'react';

export type MapTier = 'cinematic' | 'lite';

export interface MapCapability {
  tier: MapTier;
  reducedMotion: boolean;
}

function detect(): MapCapability {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 1023px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory;
  let webgl = false;
  try {
    const canvas = document.createElement('canvas');
    webgl = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    webgl = false;
  }
  const cinematic =
    webgl && !reducedMotion && !small && !coarse && (deviceMemory === undefined || deviceMemory > 4);
  return { tier: cinematic ? 'cinematic' : 'lite', reducedMotion };
}

export function useMapCapability(): MapCapability {
  const [cap, setCap] = useState<MapCapability>({ tier: 'lite', reducedMotion: false });
  useEffect(() => {
    setCap(detect());
  }, []);
  return cap;
}
