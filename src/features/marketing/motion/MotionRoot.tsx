'use client';

/**
 * MotionRoot (animation spec §2/§7) — one LazyMotion boundary for the whole marketing surface:
 * domAnimation features only (keeps the motion runtime small, per the ≤18KB budget), strict mode
 * so accidental full `motion.*` imports throw in dev, and MotionConfig reducedMotion="user" as
 * the page-wide OS-preference switch.
 */
import type { ReactNode } from 'react';
import { LazyMotion, domAnimation, MotionConfig } from 'motion/react';

export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
