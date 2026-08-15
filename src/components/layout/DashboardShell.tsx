'use client';

/**
 * DashboardShell template (docs/12 §1, docs/06 §2.6i) — collapsible sidebar + topbar + content.
 * Responsive: full sidebar ≥1280, icon rail 1024–1279, hidden behind a top bar <1024
 * (RESPONSIVE_STRATEGY.md §3). Content max-width 1440. Used by the vendor, hub, and admin
 * dashboards. Topbar accepts action slots (role switcher, notifications) at the feature level.
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styled from 'styled-components';

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /**
   * How many things are waiting behind this destination. 0/undefined shows nothing.
   *
   * The navigation carried no operational state at all: an admin could see "3 disputes waiting" on
   * the dashboard, navigate one screen away, and lose the signal entirely — the queue was only
   * visible from the one screen they had just left. A count on the destination is what makes the
   * nav a status surface rather than a list of links.
   */
  badge?: number;
}

export interface DashboardShellProps {
  title: string;
  nav: NavItem[];
  /** Optional topbar action slot (role switcher, notifications bell). */
  actions?: ReactNode;
  /**
   * Mobile navigation slot (OrbitNav). The sidebar is display:none below `md`, so without this
   * slot small screens have no navigation at all; when present, the content gains bottom
   * clearance so the orb never covers the last row.
   */
  orbit?: ReactNode;
  children: ReactNode;
}

export function DashboardShell({ title, nav, actions, orbit, children }: DashboardShellProps) {
  const pathname = usePathname();
  return (
    <Shell>
      <Sidebar aria-label="Dashboard navigation">
        <Brand>StreetServe</Brand>
        {nav.map((n) => {
          const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
          return (
            <Link key={n.href} href={n.href}>
              <NavRow $active={active} aria-current={active ? 'page' : undefined}>
                <span aria-hidden>{n.icon}</span>
                <label>{n.label}</label>
                {/* Announced in the label, not only drawn — a count nobody can hear is not a count. */}
                {n.badge ? (
                  <NavCount aria-label={`${n.badge} waiting`}>
                    {n.badge > 99 ? '99+' : n.badge}
                  </NavCount>
                ) : null}
              </NavRow>
            </Link>
          );
        })}
      </Sidebar>
      <Main>
        <TopBar>
          <strong>{title}</strong>
          {actions ? <Actions>{actions}</Actions> : null}
        </TopBar>
        <Content $orbitClearance={Boolean(orbit)}>{children}</Content>
      </Main>
      {orbit ?? null}
    </Shell>
  );
}

const Shell = styled.div`
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 1fr;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: 72px 1fr;
  }
  ${({ theme }) => theme.media.lg} {
    grid-template-columns: 248px 1fr;
  }
`;
const Sidebar = styled.nav`
  display: none;
  ${({ theme }) => theme.media.md} {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: ${({ theme }) => theme.space[4]}px;
    border-right: 1px solid ${({ theme }) => theme.color.line};
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;
const Brand = styled.div`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-weight: 800;
  padding: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
  white-space: nowrap;
  overflow: hidden;
`;
/**
 * Sits at the end of the row on the wide sidebar; on the icon-only rail it rides the icon's corner,
 * since there is no label for it to follow.
 */
const NavCount = styled.span`
  /*
   * The narrow rail hides labels, so the count would otherwise sit alone in dead space to the right
   * of an icon. Pinned to the icon's corner until the sidebar is wide enough to have a row to end.
   */
  position: absolute;
  top: 4px;
  left: 26px;
  min-width: 20px;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.statusDanger};
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-align: center;
  line-height: 1.5;
  ${({ theme }) => theme.media.lg} {
    position: static;
    margin-left: auto;
  }
`;

const NavRow = styled.div<{ $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  color: ${({ theme, $active }) => ($active ? theme.color.textPrimary : theme.color.textSecondary)};
  background: ${({ theme, $active }) => ($active ? theme.color.surfaceRaised2 : 'transparent')};
  font-weight: 600;
  font-size: 14px;
  span {
    display: inline-flex;
  }
  label {
    display: none;
    cursor: pointer;
  }
  ${({ theme }) => theme.media.lg} {
    label {
      display: inline;
    }
  }
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Main = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;
const TopBar = styled.header`
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${({ theme }) => theme.space[5]}px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;
const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Content = styled.div<{ $orbitClearance: boolean }>`
  flex: 1;
  min-width: 0;
  /* No dashboard screen may drag the viewport sideways — wide content scrolls internally. */
  overflow-x: clip;
  padding: ${({ theme }) => theme.space[5]}px;
  /* Room for the OrbitNav orb on small screens; the sidebar takes over at md. */
  padding-bottom: ${({ theme, $orbitClearance }) =>
    $orbitClearance ? '124px' : `${theme.space[5]}px`};
  ${({ theme }) => theme.media.md} {
    padding-bottom: ${({ theme }) => theme.space[5]}px;
  }
  max-width: 1440px;
  width: 100%;
`;
