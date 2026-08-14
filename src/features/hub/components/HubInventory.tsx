'use client';

/**
 * H-04 Live Inventory (docs/13 H-04) — which sellers hold what, with a recall action. The map layer
 * (seller pins) shares the M3 Map when a token is set; this ships the accessible holder list.
 */
import styled from 'styled-components';
import { Avatar } from '@/components/primitives/Avatar';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { useHubHolders } from '../hooks/useHub';

function overdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export function HubInventory({ hubId }: { hubId: string }) {
  const { show } = useToast();
  const { data: holders, isLoading } = useHubHolders(hubId);

  if (isLoading) return <Wrap><Skeleton $h="120px" $radius={16} /></Wrap>;
  if (!holders || holders.length === 0) {
    return <EmptyState icon="🏪" title="No inventory out" description="When sellers check out your products, you’ll see who holds what here." />;
  }

  return (
    <Wrap>
      {holders.map((h) => (
        <Card key={h.checkoutId} $overdue={overdue(h.returnDeadline)}>
          <Avatar name={h.sellerName} size={40} />
          <Info>
            <Seller>{h.sellerName}</Seller>
            <Prod>{h.quantity - h.soldQty} of {h.quantity} {h.productName} remaining</Prod>
          </Info>
          {overdue(h.returnDeadline) ? <Overdue>Overdue</Overdue> : null}
          <Button size="compact" variant="secondary" onClick={() => show(`Recall requested from ${h.sellerName}`, 'warning')}>
            Recall
          </Button>
        </Card>
      ))}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 640px;
`;
const Card = styled.div<{ $overdue: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme, $overdue }) => ($overdue ? theme.color.statusDanger : theme.color.line)};
`;
const Info = styled.div`
  flex: 1;
  min-width: 0;
`;
const Seller = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Prod = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Overdue = styled.span`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.statusDanger};
`;
