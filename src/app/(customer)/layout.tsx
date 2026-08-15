'use client';

/**
 * Customer surface shell — mobile-viewport with the OrbitNav system (same navigation as the
 * vendor dashboard): a bottom dock (Messages · Map · orb · Orders · Bell) plus an orbit ring for
 * the rest (Rent to Own, Favorites, Profile, Wallet, Settings, Help). Replaces the former five-tab bar.
 * Guarded by useRequireAuth (UX only). The shell is phone-styled at every width, so the orbit
 * stays on at desktop too (showOnDesktop) and the dock caps at the shell's 560px column.
 */
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import styled from 'styled-components';
import { Star, User, Wallet, Settings, LifeBuoy, MessageCircle, Map, Receipt, FileSignature } from 'lucide-react';
import { OrbitNav, OrbitDockButton, OrbitDockSlot } from '@/components/navigation';
import { ModeSwitchRow, useHasMultipleModes } from '@/features/identity';
import { NotificationBell } from '@/features/notifications';
import { useRequireAuth } from '@/lib/auth/guards';

/** Focused flows (wave/queue/order + business sub-actions) render full-screen without the nav. */
function isFlowRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/wave/') ||
    pathname.startsWith('/queue/') ||
    pathname.startsWith('/order/') ||
    pathname.startsWith('/messages/') ||
    pathname.startsWith('/disputes/') ||
    pathname.startsWith('/gift/') ||
    pathname.endsWith('/wave') ||
    pathname.endsWith('/order') ||
    pathname.endsWith('/book') ||
    pathname.endsWith('/reviews') ||
    pathname.endsWith('/gift') ||
    pathname.endsWith('/spot-me')
  );
}

/** Everything not promoted to the dock lives in the orbit ring. */
const ORBIT_ITEMS = [
  { href: '/favorites', label: 'Favorites', icon: <Star size={18} /> },
  /**
   * Rent to Own had no way in at all. Four customer screens existed — browse, offer detail, my
   * agreements, and the payment dashboard — and nothing in the app linked to any of them, so the
   * whole marketplace was reachable only by typing the URL.
   *
   * Above Profile because it is a place to GO, not a setting: a self-contained marketplace belongs
   * with the destinations, not with the account plumbing.
   */
  { href: '/rto', label: 'Rent to Own', icon: <FileSignature size={18} /> },
  { href: '/profile', label: 'Profile', icon: <User size={18} /> },
  { href: '/profile/wallet', label: 'Wallet', icon: <Wallet size={18} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  { href: '/help', label: 'Help', icon: <LifeBuoy size={18} /> },
];

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hasMultipleModes = useHasMultipleModes();
  // The map owns the whole viewport and scrolls nothing; every other tab is a normal scroll page.
  const isFullViewport = pathname.startsWith('/map');
  // Map browse is a public read (middleware public matcher + landing "Explore the live map" CTA);
  // every other customer tab requires a session. Actions on the map still gate server-side.
  useRequireAuth(!pathname.startsWith('/map'));

  if (isFlowRoute(pathname)) {
    // Full-screen focused flow — no nav (each flow screen owns its own layout).
    return <>{children}</>;
  }

  return (
    <Shell $fixed={isFullViewport}>
      <Content $fixed={isFullViewport}>{children}</Content>
      <OrbitNav
        items={ORBIT_ITEMS}
        ariaLabel="Customer navigation"
        showOnDesktop
        dockMaxWidth={560}
        /**
         * The map has no room for the topbar RoleSwitcher the dashboards carry, and it's also the
         * only public surface — so mode switching lives in the orbit instead. Both render nothing
         * for a single-mode account.
         */
        topSlot={<ModeSwitchRow />}
        showModeHint={hasMultipleModes}
        left={
          <>
            <OrbitDockButton href="/map" label="Map" icon={<Map size={18} />} />
            <OrbitDockButton href="/messages" label="Messages" icon={<MessageCircle size={18} />} />
          </>
        }
        right={
          <>
            <OrbitDockButton href="/orders" label="Orders" icon={<Receipt size={18} />} />
            <OrbitDockSlot label="Alerts">
              <NotificationBell />
            </OrbitDockSlot>
          </>
        }
      />
    </Shell>
  );
}

/**
 * `$fixed` = a full-viewport surface (the map). It must be exactly one screen tall and must not
 * scroll: the map fills the viewport itself and hangs its own chrome off it (header, FAB, discovery
 * sheet are all absolutely/fixed positioned), so the page has nothing to scroll TO.
 *
 * Without this the map rendered at 100dvh *plus* Content's 110px dock padding — 110px of dead space
 * below the fold that the page happily scrolled into, taking the search bar and category tabs off
 * the top of the screen with it.
 */
const Shell = styled.div<{ $fixed: boolean }>`
  ${({ $fixed }) =>
    $fixed
      ? `height: 100dvh; overflow: hidden;`
      : `min-height: 100dvh;`}
  display: flex;
  flex-direction: column;
  max-width: 560px;
  margin: 0 auto;
`;
const Content = styled.div<{ $fixed: boolean }>`
  flex: 1;
  min-height: 0;
  /* The dock floats over a fixed surface, so only scrollable pages need to clear it. */
  ${({ $fixed }) => ($fixed ? `overflow: hidden;` : `padding-bottom: 110px;`)}
`;
