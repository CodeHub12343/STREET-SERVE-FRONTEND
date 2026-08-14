'use client';

/**
 * SheetStack template (docs/12 §1) — a bottom Sheet layered over a background surface (usually a
 * MapShell). Used by the business profile, product detail, wave-down confirm, and filters. This is
 * a thin composition of a background + the Sheet primitive so screens don't re-wire the layering.
 */
import type { ReactNode } from 'react';
import { Sheet, type SheetProps } from '@/components/primitives/Sheet';

export interface SheetStackProps {
  /** The persistent background (e.g. a MapShell with the map). */
  background: ReactNode;
  /** Sheet configuration + content. */
  sheet: SheetProps;
}

export function SheetStack({ background, sheet }: SheetStackProps) {
  return (
    <>
      {background}
      <Sheet {...sheet} />
    </>
  );
}
