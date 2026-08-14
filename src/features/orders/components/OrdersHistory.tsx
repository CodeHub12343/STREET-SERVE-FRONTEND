'use client';

/**
 * C-25 Orders tab (docs/13 C-25) — one unified history of direct orders + wave-down transactions +
 * bookings, with filter chips (rather than three separate lists). Demo merges the sample sets; in
 * production this composes /orders/mine + /transactions/mine + /bookings.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Receipt, Hand, CalendarClock } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Chip } from '@/components/primitives/Chip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCents } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import { type HistoryKind } from '@/lib/demo';
import { useOrderHistory } from '../hooks/useOrders';

const FILTERS: { value: HistoryKind | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'order', label: 'Orders' },
  { value: 'wave', label: 'Wave-downs' },
  { value: 'booking', label: 'Bookings' },
];
const ICON: Record<HistoryKind, React.ReactNode> = {
  order: <Receipt size={16} />,
  wave: <Hand size={16} />,
  booking: <CalendarClock size={16} />,
};

export function OrdersHistory() {
  const router = useRouter();
  const [filter, setFilter] = useState<HistoryKind | 'all'>('all');
  const { data: items, isLoading } = useOrderHistory();

  const filtered = useMemo(() => (items ?? []).filter((i) => filter === 'all' || i.kind === filter), [items, filter]);

  return (
    <TabPage title="Orders">
      <Filters>
        {FILTERS.map((f) => (
          <Chip key={f.value} selected={filter === f.value} onClick={() => setFilter(f.value)}>{f.label}</Chip>
        ))}
      </Filters>
      {isLoading ? (
        <List><Skeleton $h="64px" $radius={16} /><Skeleton $h="64px" $radius={16} /></List>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🧾" title="Nothing here yet" description="Your orders, wave-downs, and bookings will show up here." />
      ) : (
        <List>
          {filtered.map((i) => (
            <Row key={i.id} onClick={() => router.push(i.deeplink)}>
              <Icon aria-hidden>{ICON[i.kind]}</Icon>
              <Info>
                <Name>{i.title}</Name>
                <Sub>{i.subtitle}</Sub>
                <When>{formatDateTime(i.at)} · {i.status}</When>
              </Info>
              {i.amountCents > 0 ? <Amount className="tnum">{formatCents(i.amountCents)}</Amount> : null}
            </Row>
          ))}
        </List>
      )}
    </TabPage>
  );
}

const Filters = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
  overflow-x: auto;
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  text-align: left;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.color.accentSecondary};
  }
`;
const Icon = styled.span`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Info = styled.div`
  flex: 1;
  min-width: 0;
`;
const Name = styled.p`
  font-weight: 700;
  font-size: 14px;
`;
const Sub = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const When = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Amount = styled.span`
  font-weight: 800;
  font-size: 15px;
`;
