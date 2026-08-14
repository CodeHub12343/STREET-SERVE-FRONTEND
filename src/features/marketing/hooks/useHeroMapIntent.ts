'use client';

/**
 * Lazy-mount intent for the hero map (hero spec §6.2): Mapbox GL loads on pointer-enter over the
 * hero, first scroll, or a 1.5s idle timer — whichever fires first. Never blocks first paint.
 */
import { useEffect, useState, type RefObject } from 'react';

export function useHeroMapIntent(heroRef: RefObject<HTMLElement | null>): boolean {
  const [intent, setIntent] = useState(false);

  useEffect(() => {
    if (intent) return;
    const arm = () => setIntent(true);

    const timer = window.setTimeout(arm, 1_500);
    window.addEventListener('scroll', arm, { once: true, passive: true });
    const hero = heroRef.current;
    hero?.addEventListener('pointerenter', arm, { once: true });
    hero?.addEventListener('touchstart', arm, { once: true, passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', arm);
      hero?.removeEventListener('pointerenter', arm);
      hero?.removeEventListener('touchstart', arm);
    };
  }, [intent, heroRef]);

  return intent;
}
