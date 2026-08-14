'use client';

/**
 * V-11 Analytics (docs/13 V-11) — sales, queue conversion, and a category benchmark, with a simple
 * weekly bar chart. Lightweight (no chart lib) — dashboards lazy-load a richer chart later.
 */
import styled from 'styled-components';
import { Users, Clock } from 'lucide-react';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { formatCents } from '@/lib/money';
import { useVendorAnalytics } from '../hooks/useVendorAnalytics';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function VendorAnalytics({ businessId }: { businessId: string }) {
  const { data, isLoading, isError, refetch } = useVendorAnalytics(businessId);

  if (isLoading) return <Wrap><Skeleton $h="120px" $radius={16} /></Wrap>;
  if (isError || !data) {
    return (
      <Wrap>
        <ErrorState title="Couldn’t load analytics" message="Please try again." onRetry={() => void refetch()} />
      </Wrap>
    );
  }

  const max = Math.max(...data.weekSeries, 1); // never divide by zero on a quiet week
  const hasSales = data.weekSeries.some((v) => v > 0);
  // Label each bar with its real weekday, since the window is the last 7 days ending today.
  const start = new Date(data.weekStart);
  const dayLabels = data.weekSeries.map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return DAY_INITIALS[d.getDay()] ?? '';
  });

  return (
    <Wrap>
      <Stats>
        <Stat>
          <Small>Today</Small>
          <b className="tnum">{formatCents(data.salesTodayCents)}</b>
          <Small>{data.ordersToday} {data.ordersToday === 1 ? 'order' : 'orders'}</Small>
        </Stat>
        <Stat>
          <Small>Last 7 days</Small>
          <b className="tnum">{formatCents(data.salesWeekCents)}</b>
          <Small>{hasSales ? 'Paid sales' : 'No sales yet'}</Small>
        </Stat>
      </Stats>

      <Grid>
        <Mini>
          <Users size={16} aria-hidden />
          <b className="tnum">{Math.round(data.queueConversion * 100)}%</b>
          <Small>
            {data.queueJoined > 0 ? `Queue conversion · ${data.queueJoined} joined` : 'No queue activity'}
          </Small>
        </Mini>
        <Mini>
          <Clock size={16} aria-hidden />
          <b className="tnum">{data.avgWaitMin}m</b>
          <Small>Avg wait</Small>
        </Mini>
      </Grid>

      <ChartCard>
        <Small>Sales this week</Small>
        {hasSales ? (
          <Chart>
            {data.weekSeries.map((v, i) => (
              <Col key={i}>
                <Bar style={{ height: `${Math.round((v / max) * 100)}%` }} title={formatCents(v)} />
                <Day>{dayLabels[i]}</Day>
              </Col>
            ))}
          </Chart>
        ) : (
          <EmptyChart>Your daily sales will chart here once money starts coming in.</EmptyChart>
        )}
      </ChartCard>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 720px;
`;
const Stats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Stat = styled.div`
  display: grid;
  gap: 2px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  b {
    font-size: 26px;
  }
`;
const Small = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const EmptyChart = styled.p`
  display: grid;
  place-items: center;
  height: 120px;
  padding: 0 ${({ theme }) => theme.space[4]}px;
  font-size: 13px;
  text-align: center;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Mini = styled.div`
  display: grid;
  gap: 2px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.accentSecondary};
  b {
    font-size: 22px;
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const ChartCard = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Chart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space[2]}px;
  height: 120px;
`;
const Col = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
`;
const Bar = styled.div`
  width: 100%;
  min-height: 4px;
  border-radius: 6px 6px 0 0;
  background: ${({ theme }) => theme.color.accentPrimary};
`;
const Day = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
