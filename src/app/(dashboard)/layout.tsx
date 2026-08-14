'use client';

/**
 * Vendor + Hub dashboards shell (DashboardShell template). Requires auth; per-page role guards
 * enforce vendor vs hub (ROUTING_STRUCTURE.md §6–7).
 *
 * The nav is filtered to the business's resolved modules (BUSINESS_MODULE_SYSTEM.md §5), so a
 * mechanic is never offered "Menu" and a non-hub never sees the Hub screens. Filtering is
 * presentation only — the API enforces the same set via `requireModule`.
 */
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Radio, Users, Receipt, ClipboardList, Store, CheckSquare, Package, Coins, CalendarClock, MessageCircle, BarChart3, Wallet, Share2, Gift, Sparkles, FileCheck, SlidersHorizontal, Hand, Wrench, Megaphone, FileSignature, Settings, LayoutDashboard, Undo2, QrCode, HeartHandshake, Mail, Zap, Briefcase, Rocket, Map as MapIcon } from 'lucide-react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { OrbitNav, OrbitDockButton, OrbitDockSlot } from '@/components/navigation';
import { RoleSwitcher } from '@/features/identity';
import { NotificationBell } from '@/features/notifications';
import { useBusinessModules, useVendorBusiness, useVendorDashboard, type BusinessModule } from '@/features/vendor';
import { useRequireAuth } from '@/lib/auth/guards';

/** Mirrors the server's CORE_MODULES — always enabled, so safe to render before resolution. */
const CORE_FALLBACK: BusinessModule[] = [
  'live_presence',
  'profile',
  'reviews',
  'messaging',
  'payouts',
  'analytics',
];

/** Every nav item declares the module it belongs to. `null` = always shown. */
const NAV: (NavItem & { module: BusinessModule | null })[] = [
  { href: '/vendor', label: 'Live Status', icon: <Radio size={18} />, module: 'live_presence' },
  // `/vendor/wave-downs` has always existed as a route but was never in this list — so the
  // wave-down inbox (an on-demand vendor's core loop) was unreachable from the dashboard.
  { href: '/vendor/wave-downs', label: 'Wave-downs', icon: <Hand size={18} />, module: 'wave_down' },
  { href: '/vendor/queue', label: 'Queue', icon: <Users size={18} />, module: 'queue' },
  { href: '/vendor/orders', label: 'Orders', icon: <Receipt size={18} />, module: 'ordering' },
  { href: '/vendor/menu', label: 'Menu', icon: <ClipboardList size={18} />, module: 'menu' },
  { href: '/vendor/services', label: 'Services', icon: <Wrench size={18} />, module: 'services' },
  { href: '/vendor/bookings', label: 'Bookings', icon: <CalendarClock size={18} />, module: 'booking' },
  { href: '/vendor/license', label: 'License', icon: <FileCheck size={18} />, module: 'licensing' },
  { href: '/vendor/messages', label: 'Messages', icon: <MessageCircle size={18} />, module: 'messaging' },
  { href: '/vendor/analytics', label: 'Analytics', icon: <BarChart3 size={18} />, module: 'analytics' },
  { href: '/vendor/payouts', label: 'Payouts', icon: <Wallet size={18} />, module: 'payouts' },
  { href: '/vendor/ping-budget', label: 'Ping Sharing', icon: <Share2 size={18} />, module: 'ping_sharing' },
  // Promotions is always available: it is how a business buys reach, so gating it behind a module
  // would hide the product from exactly the people being sold it.
  { href: '/vendor/ads', label: 'Promotions', icon: <Megaphone size={18} />, module: null },
  // Rent-to-own: always listed, but publishing is approval-gated per business server-side (§60.3).
  { href: '/vendor/rto', label: 'Rent to Own', icon: <FileSignature size={18} />, module: null },
  { href: '/vendor/giveaways', label: 'Giveaways', icon: <Gift size={18} />, module: 'giveaways' },
  {
    href: '/vendor/pay-it-forward',
    label: 'Pay It Forward',
    icon: <HeartHandshake size={18} />,
    module: 'pay_it_forward',
  },
  // No module gate: any business may crowdfund a mailing — there is no capability to enable.
  { href: '/vendor/boost', label: 'Boost My Marketing', icon: <Megaphone size={18} />, module: null },
  // V-13 employer side of S-14 — post shifts and manage who takes them.
  { href: '/vendor/jobs', label: 'Gigs', icon: <Wrench size={18} />, module: null },
  /**
   * These four were built and then left with no way in — every one of them was reachable only by
   * typing the URL. `postcards` is a paid feature nobody could buy, and `upgrade` is the paywall
   * itself, which is a strange thing to hide.
   */
  { href: '/vendor/postcards', label: 'Postcards', icon: <Mail size={18} />, module: null },
  { href: '/vendor/flash-sales', label: 'Flash Sales', icon: <Zap size={18} />, module: null },
  { href: '/vendor/back-office', label: 'Back Office', icon: <Briefcase size={18} />, module: null },
  { href: '/vendor/upgrade', label: 'Upgrade', icon: <Rocket size={18} />, module: null },
  { href: '/vendor/modules', label: 'Modules', icon: <SlidersHorizontal size={18} />, module: null },
  { href: '/vendor/settings', label: 'Settings', icon: <Settings size={18} />, module: null },
  // On /vendor the hub workspace is a single entry; the hub screens get their own nav below.
  { href: '/hub', label: 'Consignment Hub', icon: <Store size={18} />, module: 'hub_operations' },
];

/** The hub workspace nav — shown alone on /hub/* so vendor screens don't crowd the sidebar. */
const HUB_NAV: (NavItem & { module: BusinessModule | null })[] = [
  { href: '/hub', label: 'Hub Inventory', icon: <Store size={18} />, module: null },
  { href: '/hub/station', label: 'Check-in Station', icon: <QrCode size={18} />, module: null },
  { href: '/hub/approvals', label: 'Approvals', icon: <CheckSquare size={18} />, module: null },
  { href: '/hub/products', label: 'Catalog', icon: <Package size={18} />, module: null },
  { href: '/hub/analytics', label: 'Analytics', icon: <BarChart3 size={18} />, module: null },
  { href: '/hub/settlements', label: 'Settlements', icon: <Coins size={18} />, module: null },
  // A hub is a business with its own payout account. Its own route, so the hub workspace nav stays
  // put — linking to /vendor/payouts would flip the shell into the vendor nav mid-session.
  { href: '/hub/payouts', label: 'Payouts', icon: <Wallet size={18} />, module: null },
  { href: '/hub/refunds', label: 'Refunds', icon: <Undo2 size={18} />, module: null },
  { href: '/hub/ai', label: 'Hub AI', icon: <Sparkles size={18} />, module: null },
  // Also had no way in — the map view of hub stock existed but nothing linked to it.
  { href: '/hub/inventory-map', label: 'Inventory Map', icon: <MapIcon size={18} />, module: null },
  { href: '/vendor', label: 'Vendor Dashboard', icon: <LayoutDashboard size={18} />, module: null },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  useRequireAuth();
  const pathname = usePathname();
  const { businessId } = useVendorBusiness();
  const { data: modules } = useBusinessModules(businessId ?? undefined);
  const { data: dash } = useVendorDashboard(businessId ?? '');

  // Registration wizards render full-screen (no dashboard shell).
  if (pathname.endsWith('/register')) {
    return <>{children}</>;
  }

  // While modules resolve, fall back to CORE — which every business has by definition. The nav
  // therefore only ever GROWS as data arrives; it never shows an item and retracts it, which is
  // what makes a sidebar feel broken.
  const isHub = pathname.startsWith('/hub');
  const enabled = modules?.enabled ?? CORE_FALLBACK;
  const nav = isHub ? HUB_NAV : NAV.filter((n) => n.module === null || enabled.includes(n.module));

  // Live counts surface as badges (waves waiting, open orders, people in line).
  const badgeByModule: Partial<Record<BusinessModule, number | undefined>> = {
    wave_down: dash?.waveCount,
    ordering: dash?.orderCount,
    queue: dash?.queueCount,
  };

  // Screens promoted to the dock (around the orb) leave the orbit ring — one home each. The
  // wave/order docks are vendor-floor tools, so the hub workspace keeps only messages + alerts.
  const dockWaves = !isHub && enabled.includes('wave_down');
  const dockOrders = !isHub && enabled.includes('ordering');
  const dockHrefs = new Set([
    '/vendor/messages',
    ...(dockWaves ? ['/vendor/wave-downs'] : []),
    ...(dockOrders ? ['/vendor/orders'] : []),
  ]);
  const orbitItems = nav
    .filter((n) => !dockHrefs.has(n.href))
    .map(({ href, label, icon, module }) => ({
      href,
      label,
      icon,
      badge: module ? badgeByModule[module] : undefined,
    }));

  return (
    <DashboardShell
      title={isHub ? 'Consignment Hub' : 'Dashboard'}
      nav={nav}
      orbit={
        <OrbitNav
          items={orbitItems}
          left={
            <>
              <OrbitDockButton
                href="/vendor/messages"
                label="Messages"
                icon={<MessageCircle size={18} />}
              />
              {dockWaves ? (
                <OrbitDockButton
                  href="/vendor/wave-downs"
                  label="Wave-downs"
                  icon={<Hand size={18} />}
                  badge={dash?.waveCount}
                />
              ) : null}
            </>
          }
          right={
            <>
              {dockOrders ? (
                <OrbitDockButton
                  href="/vendor/orders"
                  label="Orders"
                  icon={<Receipt size={18} />}
                  badge={dash?.orderCount}
                />
              ) : null}
              <OrbitDockSlot label="Alerts">
                <NotificationBell />
              </OrbitDockSlot>
            </>
          }
        />
      }
      actions={
        <>
          <NotificationBell />
          <RoleSwitcher />
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
