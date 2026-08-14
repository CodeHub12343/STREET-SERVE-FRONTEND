'use client';

/**
 * Setup checklist (BP-4, BUSINESS_REGISTRATION_REDESIGN.md §4) — the counterpart to a short
 * registration: anything skipped resurfaces here instead of being lost.
 *
 * DERIVED FROM LIVE STATE, never a stored "onboarding_step" flag. A stored flag drifts the moment
 * a vendor deletes their last menu item, and then lies forever. Everything here is computed from
 * the same queries the rest of the dashboard uses, so it self-heals: add a menu item and the item
 * disappears; delete it and the item returns — with no extra bookkeeping.
 *
 * Go-live blockers sort first: the checklist's job is to get the business live, not to be tidy.
 */
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Check, ChevronRight, AlertTriangle } from 'lucide-react';
import { useVendorBusinessDetail } from '../hooks/useVendorBusinessDetail';
import { useBusinessModules } from '../hooks/useBusinessModules';
import { useVendorMenu } from '../hooks/useVendorMenu';
import { useVendorServices } from '../hooks/useVendorServices';

export interface ChecklistItem {
  id: string;
  label: string;
  hint: string;
  href: string;
  /** True when this is what stands between the business and going live. */
  blocksGoLive: boolean;
}

export function SetupChecklist({ businessId }: { businessId: string }) {
  const router = useRouter();
  const { data: business } = useVendorBusinessDetail(businessId);
  const { data: modules } = useBusinessModules(businessId);
  // Memoised: a fresh [] each render would defeat the useMemo below.
  const enabled = useMemo(() => modules?.enabled ?? [], [modules]);

  // Only ask for what this business actually uses — a mechanic is never nagged about a menu.
  const { data: menu } = useVendorMenu(enabled.includes('menu') ? businessId : '');
  const { data: services } = useVendorServices(
    enabled.includes('services') ? businessId : undefined,
  );

  const items = useMemo<ChecklistItem[]>(() => {
    if (!business || !modules) return [];
    const out: ChecklistItem[] = [];

    // Licence — the one true hard blocker (the backend rejects go-live without it).
    if (enabled.includes('licensing') && !business.canGoLive) {
      out.push({
        id: 'licence',
        label: 'Upload your licence',
        hint: 'Your category is regulated — an approved licence is required before you can go live.',
        href: '/vendor/license',
        blocksGoLive: true,
      });
    }

    if (enabled.includes('menu') && (menu?.length ?? 0) === 0) {
      out.push({
        id: 'menu',
        label: 'Add your first menu item',
        hint: 'Customers can’t order until there’s something on the menu.',
        href: '/vendor/menu',
        blocksGoLive: false,
      });
    }

    if (enabled.includes('services') && (services?.length ?? 0) === 0) {
      out.push({
        id: 'services',
        label: 'Add your first service',
        hint: 'This is what customers book or wave you down for.',
        href: '/vendor/services',
        blocksGoLive: false,
      });
    }

    if (!business.payoutAccountLinked) {
      out.push({
        id: 'payouts',
        label: 'Connect payouts',
        hint: 'Money can’t reach you until Stripe is connected.',
        href: '/vendor/payouts',
        blocksGoLive: false,
      });
    }

    if ((business.hours?.length ?? 0) === 0) {
      out.push({
        id: 'hours',
        label: 'Set your opening hours',
        hint: 'Tells customers when to expect you.',
        href: '/vendor/settings',
        blocksGoLive: false,
      });
    }

    if (!business.serviceArea) {
      out.push({
        id: 'area',
        label: 'Set where you operate',
        hint: 'Helps nearby customers find you on the map.',
        href: '/vendor/settings',
        blocksGoLive: false,
      });
    }

    // Blockers first — everything else is improvement, this is the wall.
    return out.sort((a, b) => Number(b.blocksGoLive) - Number(a.blocksGoLive));
  }, [business, modules, enabled, menu, services]);

  if (!business || !modules) return null;

  if (items.length === 0) {
    return (
      <Done>
        <DoneIcon aria-hidden>
          <Check size={16} />
        </DoneIcon>
        You’re all set up — nothing left to configure.
      </Done>
    );
  }

  return (
    <Card aria-labelledby="setup-heading">
      <Head>
        <h2 id="setup-heading">Finish setting up</h2>
        <Count className="tnum">
          {items.length} {items.length === 1 ? 'thing' : 'things'} left
        </Count>
      </Head>
      <List>
        {items.map((item) => (
          <Row key={item.id} onClick={() => router.push(item.href)} data-checklist={item.id}>
            <Mark $blocking={item.blocksGoLive} aria-hidden>
              {item.blocksGoLive ? <AlertTriangle size={13} /> : null}
            </Mark>
            <RowText>
              <RowLabel>
                {item.label}
                {item.blocksGoLive ? <Blocking>Blocks going live</Blocking> : null}
              </RowLabel>
              <RowHint>{item.hint}</RowHint>
            </RowText>
            <ChevronRight size={16} aria-hidden />
          </Row>
        ))}
      </List>
    </Card>
  );
}

const Card = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Head = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  h2 {
    font-size: 16px;
  }
`;
const Count = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const List = styled.div`
  display: grid;
  gap: 6px;
`;
const Row = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  text-align: left;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  cursor: pointer;
  background: ${({ theme }) => theme.color.surfaceBase};
  border: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.textPrimary};
  &:hover {
    border-color: ${({ theme }) => theme.color.line2};
  }
`;
const Mark = styled.span<{ $blocking: boolean }>`
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid
    ${({ theme, $blocking }) => ($blocking ? theme.color.statusWarning : theme.color.line2)};
  color: ${({ theme }) => theme.color.statusWarning};
`;
const RowText = styled.span`
  display: grid;
  gap: 1px;
  flex: 1;
  min-width: 0;
`;
const RowLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 650;
`;
const Blocking = styled.span`
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  color: ${({ theme }) => theme.color.statusWarning};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusWarning} 14%, transparent)`};
`;
const RowHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Done = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const DoneIcon = styled.span`
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  background: ${({ theme }) => theme.color.statusLive};
`;
