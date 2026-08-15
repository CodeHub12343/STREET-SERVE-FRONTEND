'use client';

/**
 * Admin / Trust & Safety console shell (internal). Requires admin or ops_finance
 * (ROUTING_STRUCTURE.md Â§8).
 */
import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Scale,
  Tags,
  Flag,
  Users,
  Megaphone,
  Home,
  BookOpen,
  ShieldCheck,
  FileSignature,
  MailWarning,
  Image as ImageIcon,
} from 'lucide-react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { OrbitNav, OrbitDockButton, OrbitDockSlot } from '@/components/navigation';
import { RoleSwitcher } from '@/features/identity';
import { NotificationBell } from '@/features/notifications';
import { useRequireAnyRole } from '@/lib/auth/guards';
import { useAdminOverview } from '@/features/admin/hooks/useAdmin';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Ops Overview', icon: <LayoutDashboard size={18} /> },
  { href: '/admin/disputes', label: 'Disputes', icon: <Scale size={18} /> },
  { href: '/admin/categories', label: 'Categories', icon: <Tags size={18} /> },
  { href: '/admin/fraud', label: 'Fraud', icon: <Flag size={18} /> },
  { href: '/admin/users', label: 'Users', icon: <Users size={18} /> },
  // Counts are attached at render from the live overview — see `navWithCounts` below.
  { href: '/admin/shelters', label: 'Shelters', icon: <Home size={18} /> },
  { href: '/admin/sponsors', label: 'Sponsors', icon: <Megaphone size={18} /> },
  // Â§43/Â§60.3 â€” approvals, opened cities, eligible categories: the three RTO compliance switches.
  { href: '/admin/rto', label: 'Rent to Own', icon: <FileSignature size={18} /> },
  // 7.1 â€” contractual notices (Â§38/Â§49/Â§53) that reached nobody. A compliance queue, not a log.
  { href: '/admin/notices', label: 'Notices', icon: <MailWarning size={18} /> },
  /**
   * The artwork review queue. Nothing linked to it, which for a MANUAL gate is the worst kind of
   * orphan: the queue still fills, orders still wait on a human decision, and no reviewer can find
   * the screen where that decision is made.
   */
  { href: '/admin/postcard-artwork', label: 'Postcard Artwork', icon: <ImageIcon size={18} /> },
  // Finance surface (Phase 1 ledger). Reconciliation is the daily integrity check.
  { href: '/admin/ledger', label: 'Ledger', icon: <BookOpen size={18} /> },
  { href: '/admin/reconciliation', label: 'Reconciliation', icon: <ShieldCheck size={18} /> },
];

/** Screens promoted to the dock leave the orbit ring â€” one home each (same rule as the dashboard). */
const DOCK_HREFS = new Set(['/admin', '/admin/disputes', '/admin/users']);

export default function AdminLayout({ children }: { children: ReactNode }) {
  useRequireAnyRole('admin', 'ops_finance');
  /**
   * The queues, on the navigation itself.
   *
   * The counts existed only on the Ops Overview: an admin could read "3 disputes waiting", move one
   * screen away, and the signal was gone — visible solely from the screen they had just left. The
   * console then looked identical whether four queues were empty or forty items were stacked up.
   *
   * Read from the same aggregate the dashboard uses, so the nav and the dashboard cannot disagree.
   * Shared React Query cache, so this costs no extra request.
   */
  const { data: o } = useAdminOverview();
  const counts: Record<string, number | undefined> = {
    '/admin/disputes': o?.openDisputes,
    '/admin/fraud': o?.fraudFlags,
    // Licence review lives on the categories screen — the badge points where the work is done.
    '/admin/categories': o?.pendingLicenses,
    '/admin/users': o?.pendingVerifications,
  };
  const navWithCounts = NAV.map((n) => ({ ...n, badge: counts[n.href] || undefined }));

  return (
    <DashboardShell
      title="Trust & Safety"
      nav={navWithCounts}
      orbit={
        <OrbitNav
          items={navWithCounts.filter((n) => !DOCK_HREFS.has(n.href))}
          ariaLabel="Admin navigation"
          left={
            <>
              {/* `/admin` prefixes every admin route, so it must match exactly or it stays lit. */}
              <OrbitDockButton href="/admin" label="Overview" icon={<LayoutDashboard size={18} />} exact />
              <OrbitDockButton href="/admin/disputes" label="Disputes" icon={<Scale size={18} />} badge={o?.openDisputes} />
            </>
          }
          right={
            <>
              <OrbitDockButton href="/admin/users" label="Users" icon={<Users size={18} />} badge={o?.pendingVerifications} />
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
