'use client';

/**
 * OrbitNav — the mobile dashboard navigation (Orbit concept, LANDING of the vendor-nav
 * exploration: radial, thumb-anchored, gesture-light). Below the `md` breakpoint the
 * DashboardShell sidebar is display:none, so this orb IS the navigation there; at `md`+ the
 * component renders nothing and the sidebar takes over.
 *
 * Closed: a floating core orb bottom-center with an aggregate unread badge.
 * Open:   a scrim + ONE orbit ring centered in the thumb zone. The ring holds up to eight items;
 *         a larger module set (BUSINESS_MODULE_SYSTEM.md §5) pages through the ring behind a More
 *         node rather than adding a second ring, because a circle's capacity is fixed by its
 *         circumference. The item list is the caller's concern; this component only arranges.
 *
 * A11y: the open orbit is a modal dialog (scrim, Escape, focus moves to the first item and
 * returns to the orb on close). Motion collapses under prefers-reduced-motion.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, MoreHorizontal, X } from 'lucide-react';
import styled, { css, keyframes } from 'styled-components';

export interface OrbitNavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Live count (unread waves, open orders…). 0/undefined hides the badge. */
  badge?: number;
}

export interface OrbitNavProps {
  items: OrbitNavItem[];
  ariaLabel?: string;
  /** Dock slot left of the orb (e.g. messages shortcut). Closed state only. */
  left?: ReactNode;
  /** Dock slot right of the orb (e.g. notification bell). Closed state only. */
  right?: ReactNode;
  /**
   * By default the orbit hides at `md`+ where the dashboard sidebar takes over. Surfaces that are
   * mobile-styled at every width (the customer shell) set this so the orbit IS the nav everywhere.
   */
  showOnDesktop?: boolean;
  /** Cap the dock's width (px) to match a centered shell (e.g. the 560px customer column). */
  dockMaxWidth?: number;
  /**
   * Rendered above the ring when open, visually separated from the destinations. Used for the mode
   * switch: it isn't another place to go, it's a change of which app you're in, so it must not read
   * as a twelfth orbit item.
   */
  topSlot?: ReactNode;
  /**
   * Marks the orb when the account has somewhere else to be (more than one mode). Persistent and
   * silent — it answers "is there more here?" without taking any space from the map.
   */
  showModeHint?: boolean;
}

/** Even radial distribution: n points on a circle of radius r, starting at startDeg. */
function ring(n: number, r: number, startDeg: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((startDeg + (360 / n) * i) * Math.PI) / 180;
    return { x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) };
  });
}

/**
 * How many nodes one ring holds before its labels start touching.
 *
 * This is arithmetic, not taste. A label is ~68px wide, so n items need 68n of circumference and a
 * radius of 68n/2π. Twelve items would need r≈130 — a 260px circle whose labels reach 328px wide,
 * already tight on a 360px phone. Sixteen needs r≈173, i.e. 414px wide: physically impossible.
 *
 * So the ring is capped at 8 (r≈132 leaves ~100px of arc per item, comfortably clear) and any
 * overflow pages instead of being crammed in or spilled into a second ring.
 */
const RING_MAX = 8;

/** With overflow, one slot on the ring belongs to the More control. */
const PER_PAGE = RING_MAX - 1;

/** Radius that keeps the widest label inside the viewport on a narrow phone. */
function orbitRadius(vw: number): number {
  return Math.max(96, Math.min(132, vw / 2 - 46));
}

const badgeText = (n: number) => (n > 99 ? '99+' : String(n));

export interface OrbitDockButtonProps {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  /** Match only the exact path — for hrefs that are a prefix of sibling routes (e.g. /seller). */
  exact?: boolean;
}

/** A dock shortcut flanking the orb. Screens promoted here should be omitted from `items`. */
export function OrbitDockButton({ href, label, icon, badge, exact = false }: OrbitDockButtonProps) {
  const pathname = usePathname();
  const active = pathname === href || (!exact && pathname.startsWith(`${href}/`));
  return (
    <DockBtn
      href={href}
      aria-label={badge ? `${label}, ${badge} new` : label}
      aria-current={active ? 'page' : undefined}
      $active={active}
    >
      <DockIcon aria-hidden>
        {icon}
        {badge ? <ItemBadge>{badgeText(badge)}</ItemBadge> : null}
      </DockIcon>
      <DockBtnLabel aria-hidden>{label}</DockBtnLabel>
    </DockBtn>
  );
}

/** Labels arbitrary dock content (e.g. the NotificationBell) to match OrbitDockButton. */
export function OrbitDockSlot({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DockSlotWrap>
      {children}
      <DockBtnLabel aria-hidden>{label}</DockBtnLabel>
    </DockSlotWrap>
  );
}

export function OrbitNav({
  items,
  ariaLabel = 'Dashboard navigation',
  left,
  right,
  showOnDesktop = false,
  dockMaxWidth,
  topSlot,
  showModeHint = false,
}: OrbitNavProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [vw, setVw] = useState(360);
  const pathname = usePathname();
  const orbRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  // Navigating anywhere collapses the orbit (the tapped page is now the context).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    // Every opening starts at the first page; resuming mid-set would hide the primary destinations.
    setPage(0);
    setVw(window.innerWidth);
    requestAnimationFrame(() => firstItemRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);

    /**
     * Lock the page while the orbit is open. It's a modal dialog, but the document underneath was
     * still scrollable — so a drag on the scrim slid the page behind the ring, leaving the orbit
     * floating over a half-scrolled screen. Restores the exact previous value rather than assuming
     * the default, so a surface that sets its own overflow isn't clobbered.
     */
    const { overflow, touchAction } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      document.body.style.touchAction = touchAction;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    orbRef.current?.focus();
  };

  const totalBadge = items.reduce((sum, it) => sum + (it.badge ?? 0), 0);

  /**
   * One ring, always — paged when the item set outgrows it.
   *
   * The alternative layouts both failed on the same arithmetic. A wider ring cannot fit sixteen
   * labels on a phone (see RING_MAX), and a second concentric ring put two labels on nearly the same
   * bearing, which is what turned the vendor menu into confetti. Paging keeps every disc on one
   * clean circle at any item count, and costs one tap to reach the overflow.
   */
  const paged = items.length > RING_MAX;
  const pageCount = paged ? Math.ceil(items.length / PER_PAGE) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = paged ? items.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE) : items;

  /**
   * Anything unread on a page you cannot see rides on the More control, so paging never buries a
   * notification — the reason the overflow is a visible count rather than a silent remainder.
   */
  const hiddenBadge = paged
    ? items.reduce((sum, it, i) => {
        const onThisPage = i >= safePage * PER_PAGE && i < safePage * PER_PAGE + PER_PAGE;
        return onThisPage ? sum : sum + (it.badge ?? 0);
      }, 0)
    : 0;

  const nodeCount = pageItems.length + (paged ? 1 : 0);
  const positions = ring(nodeCount, orbitRadius(vw), -90);

  const nextPage = () => {
    setPage((p) => (p + 1) % pageCount);
    // Focus follows the ring, so paging by keyboard lands you in the new set rather than nowhere.
    requestAnimationFrame(() => firstItemRef.current?.focus());
  };

  return (
    <Root $showOnDesktop={showOnDesktop}>
      {open ? (
        <>
          <Scrim onClick={close} aria-hidden />
          {/* Above the ring, not in it: changing mode is not "another destination". */}
          {topSlot ? <TopSlot>{topSlot}</TopSlot> : null}
          <Orbit role="dialog" aria-modal="true" aria-label={ariaLabel}>
            {pageItems.map((it, i) => {
              const active = pathname === it.href || pathname.startsWith(`${it.href}/`);
              const { x, y } = positions[i] ?? { x: 0, y: 0 };
              return (
                /* Keyed by page too, so paging replays the entrance rather than morphing in place. */
                <OrbitItem
                  key={`${safePage}:${it.href}`}
                  href={it.href}
                  ref={i === 0 ? firstItemRef : undefined}
                  aria-current={active ? 'page' : undefined}
                  $x={x}
                  $y={y}
                  $delay={i * 22}
                >
                  <ItemDisc $active={active}>
                    <span aria-hidden>{it.icon}</span>
                    {it.badge ? <ItemBadge aria-hidden>{badgeText(it.badge)}</ItemBadge> : null}
                  </ItemDisc>
                  <ItemLabel>
                    {it.label}
                    {it.badge ? <VisuallyHidden>, {it.badge} new</VisuallyHidden> : null}
                  </ItemLabel>
                </OrbitItem>
              );
            })}

            {paged ? (
              <MoreNode
                type="button"
                onClick={nextPage}
                $x={positions[pageItems.length]?.x ?? 0}
                $y={positions[pageItems.length]?.y ?? 0}
                $delay={pageItems.length * 22}
                aria-label={
                  hiddenBadge > 0
                    ? `More destinations, page ${safePage + 1} of ${pageCount}, ${hiddenBadge} new`
                    : `More destinations, page ${safePage + 1} of ${pageCount}`
                }
              >
                <MoreDisc>
                  <MoreHorizontal size={20} aria-hidden />
                  {hiddenBadge > 0 ? <ItemBadge aria-hidden>{badgeText(hiddenBadge)}</ItemBadge> : null}
                </MoreDisc>
                <ItemLabel aria-hidden>More</ItemLabel>
              </MoreNode>
            ) : null}

            <Core type="button" onClick={close} aria-label="Close navigation">
              <X size={22} />
            </Core>

            {/* Where you are in the set — the ring alone can't say "there is more behind this". */}
            {paged ? (
              <Pager aria-hidden $top={orbitRadius(vw) + 56}>
                {Array.from({ length: pageCount }, (_, i) => (
                  <PageDot key={i} $on={i === safePage} />
                ))}
              </Pager>
            ) : null}
          </Orbit>
        </>
      ) : (
        <Dock $maxWidth={dockMaxWidth}>
          <Slot>{left}</Slot>
          <Orb
            ref={orbRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label={totalBadge > 0 ? `Open navigation, ${totalBadge} new` : 'Open navigation'}
          >
            <LayoutGrid size={22} />
            {totalBadge > 0 ? <OrbBadge aria-hidden>{badgeText(totalBadge)}</OrbBadge> : null}
            {/* Only when a count isn't already claiming that corner — two dots would just be noise. */}
            {showModeHint && totalBadge === 0 ? <ModeDot aria-hidden /> : null}
          </Orb>
          <Slot>{right}</Slot>
        </Dock>
      )}
    </Root>
  );
}

// By default the orbit exists only where the sidebar doesn't.
const Root = styled.nav<{ $showOnDesktop: boolean }>`
  ${({ theme, $showOnDesktop }) =>
    $showOnDesktop
      ? ''
      : css`
          ${theme.media.md} {
            display: none;
          }
        `}
`;

/** The bottom dock bar (reference: orb centered, messages left, bell right). */
const Dock = styled.div<{ $maxWidth?: number }>`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: ${({ $maxWidth }) => ($maxWidth ? `${$maxWidth}px` : 'none')};
  bottom: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(12px, 4vw, 40px);
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px
    calc(${({ theme }) => theme.space[3]}px + env(safe-area-inset-bottom, 0px));
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;

/* Equal-width slots keep the orb dead-center; buttons spread evenly across each side so the
   whole bar reads as one balanced row (no clustering against the orb). */
const Slot = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  gap: ${({ theme }) => theme.space[2]}px;
  & > * {
    flex: 1 1 0;
    min-width: 0;
  }
`;

const DockBtn = styled(Link)<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 0;
  max-width: 100%;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  color: ${({ theme, $active }) =>
    $active ? theme.color.accentPrimary : theme.color.textSecondary};
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
  }
`;

const DockIcon = styled.span`
  position: relative;
  display: inline-flex;
`;

const DockBtnLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DockSlotWrap = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const orbIn = keyframes`
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
`;

/**
 * The mode switch sits above the ring, in its own band. Pointer-events are scoped to the child so
 * the surrounding area still dismisses the orbit like the rest of the scrim.
 */
const TopSlot = styled.div`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  /**
   * Clear of the ring, not inside it. The orbit is anchored at 210px and each item disc is 48px, so
   * the topmost item reaches 210 + radius + 24 = 366px at the widest ring (r=132). 400px clears it
   * with air to spare; an earlier 300px put this pill straight over the top item and buried its label.
   */
  bottom: calc(400px + env(safe-area-inset-bottom, 0px));
  z-index: 902;
  display: grid;
  justify-items: center;
  width: 100%;
  padding: 0 16px;
  pointer-events: none;
  > * {
    pointer-events: auto;
  }
`;
/** Quiet identity marker: this account has somewhere else to be. */
const ModeDot = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid ${({ theme }) => theme.color.accentPrimary};
  box-shadow: 0 0 0 2px ${({ theme }) => theme.color.accentPrimary};
`;
const Orb = styled.button`
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: radial-gradient(
    circle at 32% 28%,
    color-mix(in srgb, ${({ theme }) => theme.color.accentPrimary} 78%, #ffffff),
    ${({ theme }) => theme.color.accentPrimary} 68%
  );
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow:
    0 0 0 6px color-mix(in srgb, ${({ theme }) => theme.color.accentPrimary} 18%, transparent),
    ${({ theme }) => theme.color.shadow};
  animation: ${orbIn} ${({ theme }) => theme.motion.standard}ms ${({ theme }) => theme.motion.easeOut};
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const badgeStyle = css`
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.statusDanger};
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
`;

const OrbBadge = styled.span`
  ${badgeStyle}
`;

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
`;

const Orbit = styled.div`
  position: fixed;
  left: 50%;
  bottom: calc(210px + env(safe-area-inset-bottom, 0px));
  z-index: 901;
  width: 0;
  height: 0;
`;

const itemIn = keyframes`
  from { opacity: 0; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.3); }
  to   { opacity: 1; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1); }
`;

const OrbitItem = styled(Link)<{ $x: number; $y: number; $delay: number }>`
  --tx: ${({ $x }) => $x}px;
  --ty: ${({ $y }) => $y}px;
  position: absolute;
  left: 0;
  top: 0;
  width: 68px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty)));
  animation: ${itemIn} 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: ${({ $delay }) => $delay}ms;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/**
 * The overflow control. It sits ON the ring in the last slot rather than floating beside it, so the
 * circle stays a circle — and it is a button, not a link, because it changes what the ring shows
 * instead of navigating anywhere.
 */
const MoreNode = styled.button<{ $x: number; $y: number; $delay: number }>`
  --tx: ${({ $x }) => $x}px;
  --ty: ${({ $y }) => $y}px;
  position: absolute;
  left: 0;
  top: 0;
  width: 68px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty)));
  animation: ${itemIn} 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: ${({ $delay }) => $delay}ms;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* Dashed, to read as "there is more of this" rather than as another destination. */
const MoreDisc = styled.span`
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  border: 1px dashed ${({ theme }) => theme.color.accentPrimary};
  color: ${({ theme }) => theme.color.accentPrimary};
  box-shadow: ${({ theme }) => theme.color.shadow};
`;

/**
 * Position in the set, clear of the ring's lowest item. Offset is derived from the live radius —
 * a fixed value sat inside the circle and collided with the bottom label on wider viewports.
 */
const Pager = styled.div<{ $top: number }>`
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, ${({ $top }) => $top}px);
  display: flex;
  gap: 6px;
`;

const PageDot = styled.span<{ $on: boolean }>`
  width: ${({ $on }) => ($on ? '18px' : '6px')};
  height: 6px;
  border-radius: 3px;
  background: ${({ theme, $on }) => ($on ? theme.color.accentPrimary : 'rgba(255,255,255,0.45)')};
  transition: width 160ms ease;
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ItemDisc = styled.span<{ $active: boolean }>`
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.color.accentPrimary : theme.color.line2)};
  color: ${({ theme, $active }) =>
    $active ? theme.color.accentPrimary : theme.color.textPrimary};
  box-shadow: ${({ theme, $active }) =>
    $active
      ? `0 0 0 4px color-mix(in srgb, ${theme.color.accentPrimary} 24%, transparent)`
      : theme.color.shadow};
  span {
    display: inline-flex;
  }
`;

const ItemBadge = styled.span`
  ${badgeStyle}
`;

const ItemLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #f4f4f5;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  text-align: center;
  white-space: nowrap;
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
`;

const Core = styled.button`
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: radial-gradient(
    circle at 32% 28%,
    color-mix(in srgb, ${({ theme }) => theme.color.accentPrimary} 78%, #ffffff),
    ${({ theme }) => theme.color.accentPrimary} 68%
  );
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 0 0 8px color-mix(in srgb, ${({ theme }) => theme.color.accentPrimary} 16%, transparent);
`;
