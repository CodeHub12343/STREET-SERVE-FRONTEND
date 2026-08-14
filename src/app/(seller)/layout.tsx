'use client';

/**
 * Street Seller surface shell — mobile-viewport, on the same OrbitNav system as the map/customer
 * shell: a bottom dock (Discover · Inventory · orb · Earnings · Alerts) plus an orbit ring for the
 * rest (AI, Jobs, Balance, Map, Profile). Replaces the former six-tab bar, which overflowed its
 * five-column grid. Guarded by useRequireRole('seller') → add-role flow if missing.
 */
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import styled from 'styled-components';
import {
  Compass, Package, Sparkles, Wrench, Wallet, Scale, Map, User, BarChart3,
  Coins, Car, Target, GraduationCap, BadgeCheck, KeyRound,
} from 'lucide-react';
import { OrbitNav, OrbitDockButton, OrbitDockSlot } from '@/components/navigation';
import { ModeSwitchRow, useHasMultipleModes } from '@/features/identity';
import { NotificationBell } from '@/features/notifications';
import { useRequireRole } from '@/lib/auth/guards';

/**
 * Everything not promoted to the dock lives in the orbit ring.
 *
 * `Earn` was missing entirely, which made `/seller/earn` unreachable — a whole hub built and then
 * left with no way in. It is listed FIRST here on purpose: on a surface for someone with no capital,
 * "what can I earn today" outranks every other secondary destination.
 */
const ORBIT_ITEMS = [
  { href: '/seller/earn', label: 'Earn', icon: <Coins size={18} /> },
  { href: '/seller/jobs', label: 'Jobs', icon: <Wrench size={18} /> },
  { href: '/drive', label: 'Drive', icon: <Car size={18} /> },
  { href: '/seller/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { href: '/seller/ai', label: 'AI', icon: <Sparkles size={18} /> },
  { href: '/seller/plan', label: 'Income plan', icon: <Target size={18} /> },
  { href: '/seller/coaching', label: 'Coaching', icon: <GraduationCap size={18} /> },
  { href: '/seller/balance', label: 'Balance', icon: <Scale size={18} /> },
  { href: '/seller/membership', label: 'Membership', icon: <BadgeCheck size={18} /> },
  /**
   * Where someone types the six-character code they were handed at a shelter front desk. It is
   * invite-driven, but an invite still needs somewhere to land: a worker saying "open the app and
   * find Shelter code" only works if the words are on screen.
   */
  { href: '/seller/enroll', label: 'Shelter code', icon: <KeyRound size={18} /> },
  { href: '/map', label: 'Map', icon: <Map size={18} /> },
  { href: '/profile', label: 'Profile', icon: <User size={18} /> },
];

/** Product / reserve / checkout / sale / return / settlement + intro render full-screen. */
function isSellerFlowRoute(pathname: string): boolean {
  return (
    pathname.includes('/seller/product') ||
    pathname.includes('/seller/checkout') ||
    pathname === '/seller/start'
  );
}

export default function SellerLayout({ children }: { children: ReactNode }) {
  useRequireRole('seller');
  const hasMultipleModes = useHasMultipleModes();
  const pathname = usePathname();

  if (isSellerFlowRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <Shell>
      <Content>{children}</Content>
      <OrbitNav
        items={ORBIT_ITEMS}
        ariaLabel="Seller navigation"
        showOnDesktop
        dockMaxWidth={560}
        topSlot={<ModeSwitchRow />}
        showModeHint={hasMultipleModes}
        left={
          <>
            <OrbitDockButton href="/seller" label="Discover" icon={<Compass size={18} />} exact />
            <OrbitDockButton href="/seller/inventory" label="Inventory" icon={<Package size={18} />} />
          </>
        }
        right={
          <>
            <OrbitDockButton href="/seller/earnings" label="Earnings" icon={<Wallet size={18} />} />
            <OrbitDockSlot label="Alerts">
              <NotificationBell />
            </OrbitDockSlot>
          </>
        }
      />
    </Shell>
  );
}

const Shell = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  max-width: 560px;
  margin: 0 auto;
`;
const Content = styled.div`
  flex: 1;
  padding-bottom: 90px;
`;
