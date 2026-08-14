'use client';

/**
 * V-05 Order Queue (docs/13 V-05) — the accept → preparing → ready pipeline as a kanban. Each card
 * advances one step; "ready" while Away/Closed is blocked server-side (422). Responsive: three
 * columns on desktop, stacked on mobile.
 */
import styled from 'styled-components';
import { formatCents } from '@/lib/money';
import { Button } from '@/components/primitives/Button';
import { RequestDriverButton } from '@/features/delivery';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useAdvanceOrder, useVendorOrders } from '../hooks/useVendorData';
import type { VendorOrder, VendorOrderStatus } from '../types';

const COLUMNS: { status: VendorOrderStatus; title: string; cta: string }[] = [
  { status: 'pending', title: 'New', cta: 'Accept' },
  { status: 'preparing', title: 'Preparing', cta: 'Mark ready' },
  { status: 'ready', title: 'Ready', cta: 'Complete' },
];

export function OrderQueue({ businessId }: { businessId: string }) {
  const { data: orders, isLoading } = useVendorOrders(businessId);
  const advance = useAdvanceOrder(businessId);

  if (isLoading) {
    return <Board><Skeleton $h="200px" $radius={16} /><Skeleton $h="200px" $radius={16} /><Skeleton $h="200px" $radius={16} /></Board>;
  }
  const active = (orders ?? []).filter((o) => o.status !== 'completed');
  if (active.length === 0) {
    return <EmptyState icon="🧾" title="No open orders" description="Order-ahead tickets land here for you to accept and prepare." />;
  }

  return (
    <Board>
      {COLUMNS.map((col) => {
        const items = active.filter((o) => o.status === col.status);
        return (
          <Column key={col.status}>
            <ColHead>
              {col.title} <Count className="tnum">{items.length}</Count>
            </ColHead>
            <Cards>
              {items.map((o) => (
                <OrderCard key={o.id} order={o} cta={col.cta} pending={advance.isPending && advance.variables?.id === o.id} onAdvance={() => advance.mutate({ id: o.id, status: o.status })} />
              ))}
            </Cards>
          </Column>
        );
      })}
    </Board>
  );
}

function OrderCard({ order, cta, pending, onAdvance }: { order: VendorOrder; cta: string; pending: boolean; onAdvance: () => void }) {
  return (
    <Card>
      <CardHead>
        <b>{order.customerName}</b>
        <span className="tnum">{formatCents(order.totalCents)}</span>
      </CardHead>
      <Items>
        {order.items.map((it, i) => (
          <li key={i}>
            {it.qty}× {it.name}
          </li>
        ))}
      </Items>
      <Button size="compact" fullWidth loading={pending} onClick={onAdvance}>
        {cta}
      </Button>
      {/*
        DAN-1 — only once the vendor has accepted the order. Asking for a driver before you have
        agreed to make the food would put an offer in front of drivers for a job that may not happen.
      */}
      {order.status === 'preparing' ? <RequestDriverButton orderId={order.id} /> : null}
    </Card>
  );
}

const Board = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space[4]}px;
  ${({ theme }) => theme.media.md} {
    grid-template-columns: repeat(3, 1fr);
  }
`;
const Column = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  align-content: start;
`;
const ColHead = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Count = styled.span`
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 11px;
`;
const Cards = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const CardHead = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  b {
    font-weight: 700;
  }
`;
const Items = styled.ul`
  list-style: none;
  display: grid;
  gap: 2px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
