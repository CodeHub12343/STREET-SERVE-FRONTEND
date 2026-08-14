'use client';

/**
 * BackLink — the app's single back affordance.
 *
 * ── Why an explicit `href` and not `router.back()` ──────────────────────────────────────────────
 * Most screens that need this are reachable from OUTSIDE the app: a push notification opens
 * /booking/[id], a scanned QR opens a checkout, an emailed link opens /rto/[id]. In those sessions
 * `history` either is empty (back does nothing — a dead control the user taps twice) or points at
 * whatever they were browsing before (back leaves StreetServe entirely).
 *
 * An explicit parent route is hierarchical rather than chronological: "up one level" is the same
 * destination however the user arrived, which is the behaviour they can actually learn. It matches
 * the platform convention (iOS navigation bar, Android Up) that these screens are imitating.
 *
 * ── Why an anchor ───────────────────────────────────────────────────────────────────────────────
 * This navigates, so it is a link: it gets link semantics for screen readers, a real focus ring,
 * and long-press / middle-click behaviour. A <button> would announce as an action.
 */
import Link from 'next/link';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';

export interface BackLinkProps {
  /** The parent screen. Hierarchical ("up"), not chronological ("back"). */
  href: string;
  /**
   * Announced to screen readers — name the destination ("Back to orders"), never bare "Back",
   * which tells someone navigating by link list nothing about where they'd land.
   */
  label: string;
}

export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Root href={href} aria-label={label} title={label}>
      <ArrowLeft size={20} aria-hidden />
    </Root>
  );
}

/** Mirrors IconButton variant="outline" at 40px, including its 44px minimum touch target. */
const Root = styled(Link)`
  position: relative;
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textPrimary};

  &::after {
    content: '';
    position: absolute;
    inset: 50%;
    width: max(44px, 100%);
    height: max(44px, 100%);
    transform: translate(-50%, -50%);
  }
  &:active {
    filter: brightness(0.92);
  }
`;
