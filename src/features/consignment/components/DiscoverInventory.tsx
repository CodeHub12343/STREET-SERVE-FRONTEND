'use client';

/**
 * S-03 Discover Inventory (docs/13 S-03) — nearby hubs + consignment product listings. MapShell
 * variant; this milestone ships the accessible list (the map layer shares the M3 Map when a token
 * is set). Tap a product → its terms + Seller Agreement gate.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Store, Percent, Lock, Unlock, GraduationCap } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Tabs } from '@/components/primitives/Tabs';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useFiltersStore, type CategoryTab } from '@/stores/filters.store';
import { formatCents } from '@/lib/money';
import { useTrustBenefits } from '@/features/finance';
import { ResidentStatus } from '@/features/shelter';
import { useCredentials } from '@/features/academy';
import { useProductsNearby } from '../hooks/useConsignment';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'food', label: 'Food' },
  { value: 'shopping', label: 'Goods' },
];

export function DiscoverInventory() {
  const router = useRouter();
  const category = useFiltersStore((s) => s.category);
  const setCategory = useFiltersStore((s) => s.setCategory);
  const { data: products, isLoading, isError, refetch } = useProductsNearby(category);
  // A-3: the viewer's own band, so premium stock can be marked locked or unlocked on the card.
  const { data: trust } = useTrustBenefits();
  // D-5: which certifications they hold, so a gated item shows the course rather than a dead end.
  const { data: creds } = useCredentials();
  const certified = new Set((creds?.certifications ?? []).filter((c) => c.current).map((c) => c.key));
  // Defensive: never call .map on a non-array. A shape drift (e.g. a paginated envelope leaking
  // through) must degrade to an empty/error state, not throw and white-screen the whole surface.
  const items = Array.isArray(products) ? products : [];

  return (
    <TabPage title="Discover inventory">
      {/* B-2/B-5: a resident sees their cosigned allowance and any outstanding training gate here,
          BEFORE browsing — discovering a limit at the QR screen means a wasted trip to the hub.
          Renders nothing for anyone who isn't an enrolled resident. */}
      <ResidentStatus />
      <Filters>
        <Tabs ariaLabel="Category" items={TABS} value={category} onChange={(v) => setCategory(v as CategoryTab)} />
      </Filters>
      {isLoading ? (
        <List><Skeleton $h="96px" $radius={16} /><Skeleton $h="96px" $radius={16} /></List>
      ) : isError ? (
        <ErrorState title="Couldn’t load inventory" message="Something went wrong fetching nearby stock." onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="📦" title="No inventory nearby" description="Try another category or widen your area." />
      ) : (
        <List>
          {items.map((p) => {
            /**
             * A-3: a hub can reserve stock for sellers who've earned it. Show that on the card —
             * discovering it only at the QR screen means a wasted trip to the hub. Still tappable:
             * the detail screen explains what the score unlocks, which is the point of showing it.
             */
            const required = p.minSellerTrustScore ?? null;
            const locked = required !== null && (trust?.score ?? 0) < required;
            return (
              <Card key={p.id} onClick={() => router.push(`/seller/product/${p.id}`)}>
                <Info>
                  <Name>{p.name}</Name>
                  <Hub><Store size={13} aria-hidden /> {p.hubName} · {p.distanceLabel}</Hub>
                  <Terms>
                    <span><Percent size={12} aria-hidden /> {p.sellerSplitPercent}% yours</span>
                    <span>{p.quantityAvailable} available</span>
                    <span>{p.returnWindowDays}-day return</span>
                  </Terms>
                  {required !== null ? (
                    <Premium $locked={locked}>
                      {locked ? <Lock size={11} aria-hidden /> : <Unlock size={11} aria-hidden />}
                      {locked ? `Needs Trust ${required} — you're at ${trust?.score ?? 0}` : `Premium · Trust ${required}+`}
                    </Premium>
                  ) : null}
                  {/* D-5: a certification lock names the way through, because there IS one today —
                      unlike a Trust shortfall, which takes weeks of good behaviour. */}
                  {p.requiredCertification && !certified.has(p.requiredCertification) ? (
                    <Premium $locked>
                      <GraduationCap size={11} aria-hidden />
                      Take the free course to unlock
                    </Premium>
                  ) : null}
                </Info>
                <Value className="tnum">{formatCents(Math.round(p.declaredValueCents / p.quantityAvailable))}<small>/unit</small></Value>
              </Card>
            );
          })}
        </List>
      )}
    </TabPage>
  );
}

const Filters = styled.div`
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Premium = styled.span<{ $locked: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $locked }) => ($locked ? theme.color.statusAway : theme.color.statusLive)};
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Card = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  text-align: left;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.color.statusDiscount};
  }
`;
const Info = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1;
`;
const Name = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Hub = styled.p`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Terms = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
`;
const Value = styled.p`
  flex: none;
  font-weight: 800;
  font-size: 16px;
  small {
    font-size: 11px;
    color: ${({ theme }) => theme.color.textTertiary};
    font-weight: 600;
  }
`;
