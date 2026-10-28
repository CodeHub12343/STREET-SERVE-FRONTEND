'use client';

/**
 * ═══ 2026-10-28 — Brand context banner. ═══
 *
 * Lives at the top of every vendor dashboard screen. Three self-adapting states, so the user
 * always knows what they are and what their next action is without having to go find it:
 *
 *   • **No brand yet (and not an operator of one)** — nudge: "Running more than one truck?
 *     Enable Franchise Mode →". One-tap entry to /vendor/franchise.
 *
 *   • **Brand owner** — status + quick actions. "Managing James's Ice Cream · N trucks · M
 *     pending invites" with buttons to open the overview or invite a new operator.
 *
 *   • **Operator of someone else's brand** — "You're driving North truck for James's Ice
 *     Cream." Confirms their role and surfaces their campaign dashboard link.
 *
 * The whole thing is lightweight — one row at the top of the dashboard, dismissible for the
 * nudge case (sessionStorage) so it doesn't nag an owner who really is a single-truck business.
 */
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { ChevronRight, Radio, Rocket, Store, UserPlus, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

interface MembershipRow {
  membershipId: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  brandLogoUrl: string | null;
  role: 'owner' | 'manager' | 'operator';
  isOwner: boolean;
  operators?: { operatorId: string; businessId: string; displayName: string }[];
}

const DISMISS_KEY = 'ss-franchise-nudge-dismissed-v1';

export function BrandContextBanner() {
  const [dismissed, setDismissed] = useState(false);

  /** sessionStorage read is only safe after mount; SSR has no window. */
  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      /** sessionStorage can throw in private mode; absence just means "show the nudge". */
    }
  }, []);

  const memberships = useQuery<MembershipRow[]>({
    queryKey: ['me', 'brand-memberships'],
    queryFn: () => api.get<MembershipRow[]>(endpoints.myBrandMemberships),
    staleTime: 60_000,
    retry: false,
  });

  const picture = useMemo(() => {
    const rows = memberships.data ?? [];
    const ownedBrand = rows.find((m) => m.isOwner);
    if (ownedBrand) return { kind: 'owner' as const, brand: ownedBrand };
    const operatorMembership = rows.find((m) => m.role === 'operator' && !m.isOwner);
    if (operatorMembership) return { kind: 'operator' as const, brand: operatorMembership };
    return { kind: 'none' as const, brand: null };
  }, [memberships.data]);

  // Nothing to show while loading — the banner is secondary chrome, not the main content.
  if (memberships.isLoading) return null;

  // ─── Owner state ─────────────────────────────────────────────────────────────
  if (picture.kind === 'owner' && picture.brand) {
    const b = picture.brand;
    const truckCount = b.operators?.length ?? 0;
    return (
      <Bar $tone="owner">
        <BarMain>
          <IconDot $tone="owner">
            <Store size={14} aria-hidden />
          </IconDot>
          <BarText>
            <strong>Managing {b.brandName}</strong>
            <small>
              {truckCount === 0
                ? 'No trucks seated yet — invite your first partner to get going.'
                : `${truckCount} truck${truckCount === 1 ? '' : 's'} active.`}
            </small>
          </BarText>
        </BarMain>
        <BarActions>
          <BarLink href={`/brand/${b.brandId}/overview`}>
            Brand overview <ChevronRight size={13} aria-hidden />
          </BarLink>
          <BarPrimary href="/vendor/franchise">
            <UserPlus size={13} aria-hidden /> Invite a partner
          </BarPrimary>
        </BarActions>
      </Bar>
    );
  }

  // ─── Operator state ──────────────────────────────────────────────────────────
  if (picture.kind === 'operator' && picture.brand) {
    const b = picture.brand;
    const myTruck = b.operators?.[0]?.displayName;
    return (
      <Bar $tone="operator">
        <BarMain>
          <IconDot $tone="operator">
            <Radio size={14} aria-hidden />
          </IconDot>
          <BarText>
            <strong>
              You&apos;re driving{myTruck ? ` ${myTruck}` : ''} for {b.brandName}
            </strong>
            <small>Go live from this dashboard; your earnings route to your own account.</small>
          </BarText>
        </BarMain>
        <BarActions>
          <BarLink href="/sponsor/campaign">
            Your campaign <ChevronRight size={13} aria-hidden />
          </BarLink>
        </BarActions>
      </Bar>
    );
  }

  // ─── Nudge for a single-owner profile ────────────────────────────────────────
  if (dismissed) return null;
  return (
    <Bar $tone="nudge">
      <BarMain>
        <IconDot $tone="nudge">
          <Rocket size={14} aria-hidden />
        </IconDot>
        <BarText>
          <strong>Running more than one truck?</strong>
          <small>Franchise Mode lets you add partners, split payouts, and keep one brand.</small>
        </BarText>
      </BarMain>
      <BarActions>
        <BarPrimary href="/vendor/franchise">
          Try Franchise Mode <ChevronRight size={13} aria-hidden />
        </BarPrimary>
        <DismissBtn
          type="button"
          aria-label="Hide this suggestion"
          onClick={() => {
            setDismissed(true);
            try {
              window.sessionStorage.setItem(DISMISS_KEY, '1');
            } catch {
              /** sessionStorage unavailable → the dismiss is session-only via state. */
            }
          }}
        >
          <X size={13} aria-hidden />
        </DismissBtn>
      </BarActions>
    </Bar>
  );
}

const Bar = styled.div<{ $tone: 'owner' | 'operator' | 'nudge' }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: 10px 16px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme, $tone }) =>
    $tone === 'owner'
      ? `color-mix(in srgb, ${theme.color.accentPrimary} 10%, ${theme.color.surfaceRaised})`
      : $tone === 'operator'
        ? `color-mix(in srgb, ${theme.color.statusLive} 10%, ${theme.color.surfaceRaised})`
        : theme.color.surfaceRaised};
  border: 1px solid
    ${({ theme, $tone }) =>
      $tone === 'owner'
        ? theme.color.accentPrimary
        : $tone === 'operator'
          ? theme.color.statusLive
          : theme.color.line};
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;

const BarMain = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  flex: 1;
  min-width: 240px;
`;

const IconDot = styled.span<{ $tone: 'owner' | 'operator' | 'nudge' }>`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex: none;
  color: #fff;
  background: ${({ theme, $tone }) =>
    $tone === 'owner'
      ? theme.color.accentPrimary
      : $tone === 'operator'
        ? theme.color.statusLive
        : theme.color.accentPrimary};
`;

const BarText = styled.div`
  display: grid;
  gap: 2px;
  strong {
    font-size: 13.5px;
    font-weight: 700;
    color: ${({ theme }) => theme.color.textPrimary};
  }
  small {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textSecondary};
    line-height: 1.4;
  }
`;

const BarActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const BarLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
  &:hover {
    text-decoration: underline;
  }
`;

const BarPrimary = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
  font-weight: 700;
  font-size: 12.5px;
  &:hover {
    filter: brightness(1.05);
  }
`;

const DismissBtn = styled.button`
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.color.textSecondary};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
