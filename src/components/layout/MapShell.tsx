'use client';

/**
 * MapShell template (docs/12 §1, docs/06 §2.5a) — full-bleed map with a pinned search/tab header
 * floating over it and a floating primary CTA docked above the tab bar. Content overlays (business
 * profile, filters) are bottom sheets rendered by the caller (see SheetStack). Used by the customer
 * map home, seller inventory discovery, and Block Party view.
 */
import type { ReactNode } from 'react';
import styled from 'styled-components';

export interface MapShellProps {
  /** Pinned header — search field + category tab row. */
  header?: ReactNode;
  /** The map canvas (fills the shell). */
  children: ReactNode;
  /** Floating primary CTA (e.g. "Serve Near Me") docked bottom-center. */
  floatingAction?: ReactNode;
  /**
   * Extra px to lift the floating CTA — e.g. above a persistent Discovery Sheet peek so the intent
   * CTA sits clear of the browse layer (§8.2). Defaults to 0.
   */
  floatingActionBottomOffset?: number;
  /** Optional overlays (bottom sheets) rendered above everything. */
  overlay?: ReactNode;
}

export function MapShell({
  header,
  children,
  floatingAction,
  floatingActionBottomOffset = 0,
  overlay,
}: MapShellProps) {
  return (
    <Root>
      <Canvas>{children}</Canvas>
      {header ? <Header>{header}</Header> : null}
      {floatingAction ? <Fab $offset={floatingActionBottomOffset}>{floatingAction}</Fab> : null}
      {overlay}
    </Root>
  );
}

const Root = styled.div`
  position: relative;
  height: 100%;
  min-height: 100dvh;
  overflow: hidden;
`;
const Canvas = styled.div`
  position: absolute;
  inset: 0;
  /*
   * z-index: 0 here is load-bearing, not cosmetic.
   *
   * Without it this element is z-index: auto, which does NOT create a stacking context — so Mapbox
   * markers, which carry z-indexes of their own for latitude ordering, escape into the ROOT
   * context and can paint over the Header (z-index 10). That is exactly what happened: a vendor
   * pin drew on top of the open Layers panel.
   *
   * Pinning the canvas to its own layer confines every marker below the chrome, for this panel and
   * for anything else the header ever holds.
   */
  z-index: 0;
`;
const Header = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: calc(${({ theme }) => theme.space[3]}px + env(safe-area-inset-top, 0px))
    ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[4]}px;
  /* No opaque wash (was linear-gradient(surfaceBase 55%, transparent)). That slab desaturated the
     top third of the map before it was ever seen (§2.3), undoing the basemap. The chrome carries its
     own separation now: each surface is true glass (§8.1) whose two-layer shadow is its scrim (§8.3).
     A hairline top-edge fade keeps status-bar glyphs legible without matting the map. */
  background: linear-gradient(
    ${({ theme }) => `color-mix(in srgb, ${theme.color.surfaceBase} 22%, transparent)`} 0%,
    transparent 64px
  );
  pointer-events: none;
  > * {
    pointer-events: auto;
  }
`;
const Fab = styled.div<{ $offset: number }>`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  /* Dock above the fixed bottom tab bar (78px + safe area) so the CTA never overlaps the tabs.
     Matches the 90px bottom padding the tab-bar layouts reserve for content. The offset lifts it
     further to clear a persistent Discovery Sheet peek. */
  bottom: calc(
    78px + env(safe-area-inset-bottom, 0px) + ${({ theme }) => theme.space[3]}px +
      ${({ $offset }) => $offset}px
  );
  z-index: 10;
`;
