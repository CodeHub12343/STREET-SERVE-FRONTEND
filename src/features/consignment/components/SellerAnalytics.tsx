'use client';

/**
 * S-15 Seller analytics — the street seller's performance view.
 *
 * Deliberately not a second earnings ledger: /seller/earnings already reports payouts and
 * /seller/balance what's owed. This answers what those can't — what actually sells, which hub is
 * worth the walk, how fast stock moves, and what's capping how much inventory you can carry.
 *
 * For someone selling with no capital of their own, those are the whole business: take the wrong
 * stock and it sits; carry too much and the tier limit blocks the next pickup.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle, Boxes, Clock, Coins, Package, TrendingUp } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCents } from '@/lib/money';
import { useSellerAnalytics } from '../hooks/useSellerAnalytics';

const RANGES = [7, 30, 90];

export function SellerAnalytics() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, refetch } = useSellerAnalytics(days);

  if (isLoading) {
    return (
      <TabPage title="Analytics">
        <Skeleton $h="140px" $radius={16} />
      </TabPage>
    );
  }
  if (isError || !data) {
    return (
      <TabPage title="Analytics">
        <ErrorState title="Couldn’t load analytics" message="Please try again." onRetry={() => void refetch()} />
      </TabPage>
    );
  }

  const { earnings, movement, rail, credit, attention, series, topProducts, topHubs } = data;
  const maxDay = Math.max(...series.map((d) => d.grossCents), 1);
  const hasSales = series.some((d) => d.grossCents > 0);
  const creditPct =
    credit.maxInventoryValueCents > 0
      ? Math.min(100, Math.round((credit.heldValueCents / credit.maxInventoryValueCents) * 100))
      : 0;
  const attentionCount =
    attention.overdue + attention.returnPending + attention.pendingApproval + attention.expiringSoon;

  return (
    <TabPage
      title="Analytics"
      actions={
        <Ranges role="radiogroup" aria-label="Date range">
          {RANGES.map((r) => (
            <RangeBtn
              key={r}
              type="button"
              role="radio"
              aria-checked={days === r}
              $active={days === r}
              onClick={() => setDays(r)}
            >
              {r}d
            </RangeBtn>
          ))}
        </Ranges>
      }
    >
      {movement.unitsTaken === 0 ? (
        <EmptyState
          icon="📈"
          title="No sales history yet"
          description="Take stock from a hub and start selling — your best products, best hubs and sell-through will show up here."
        />
      ) : (
        <>
          <Hero>
            <HeroLabel>You earned · last {data.windowDays} days</HeroLabel>
            <HeroValue className="tnum">{formatCents(earnings.netTotalCents)}</HeroValue>
            <HeroSplit>
              <Chip $tone="good">{formatCents(earnings.netPaidCents)} paid</Chip>
              {earnings.netPendingCents > 0 ? (
                <Chip $tone="warn">{formatCents(earnings.netPendingCents)} pending</Chip>
              ) : null}
              <Muted>on {formatCents(earnings.grossCents)} of sales</Muted>
            </HeroSplit>
          </Hero>

          <Grid>
            <Stat>
              <StatIcon><TrendingUp size={16} aria-hidden /></StatIcon>
              <StatValue className="tnum">{Math.round(movement.sellThrough * 100)}%</StatValue>
              <StatLabel>Sell-through</StatLabel>
              <StatHint>{movement.unitsSold} of {movement.unitsTaken} units</StatHint>
            </Stat>
            <Stat>
              <StatIcon><Clock size={16} aria-hidden /></StatIcon>
              <StatValue className="tnum">
                {movement.avgDaysToSell > 0 ? `${movement.avgDaysToSell.toFixed(1)}d` : '—'}
              </StatValue>
              <StatLabel>Avg time to sell</StatLabel>
              <StatHint>from pickup to sale</StatHint>
            </Stat>
            <Stat>
              <StatIcon><Boxes size={16} aria-hidden /></StatIcon>
              <StatValue className="tnum">{formatCents(movement.holdingValueCents)}</StatValue>
              <StatLabel>Stock on hand</StatLabel>
              <StatHint>{movement.holdingUnits} units · {movement.holdingCount} pickups</StatHint>
            </Stat>
            <Stat>
              <StatIcon><Coins size={16} aria-hidden /></StatIcon>
              <StatValue className="tnum">{Math.round(rail.cashRatio * 100)}%</StatValue>
              <StatLabel>Sold for cash</StatLabel>
              <StatHint>becomes a balance to clear</StatHint>
            </Stat>
          </Grid>

          {/* What's capping the next pickup — the single most actionable number for a seller. */}
          <Card>
            <CardTitle>How much more you can carry</CardTitle>
            <CreditRow>
              <CreditValue className="tnum">{formatCents(credit.availableCents)}</CreditValue>
              <CreditOf>
                of {formatCents(credit.maxInventoryValueCents)} · {credit.tier}
              </CreditOf>
            </CreditRow>
            <Meter aria-hidden>
              <MeterFill style={{ width: `${creditPct}%` }} $full={creditPct >= 100} />
            </Meter>
            <Quiet>
              {credit.availableCents === 0
                ? 'You’re at your limit — sell or return stock, or verify to raise it.'
                : `Holding ${formatCents(credit.heldValueCents)}. Verifying further raises this ceiling.`}
            </Quiet>
            {credit.outstandingDebtCents > 0 ? (
              <Quiet>
                {formatCents(credit.outstandingDebtCents)} owed from cash sales — comes out of your
                next card sale.
              </Quiet>
            ) : null}
          </Card>

          {attentionCount > 0 ? (
            <Attention>
              <AttentionHead>
                <AlertTriangle size={15} aria-hidden /> Needs attention
              </AttentionHead>
              <AttentionRows>
                {attention.expiringSoon > 0 ? (
                  <AttentionRow><span>Consignments ending within 3 days</span><b className="tnum">{attention.expiringSoon}</b></AttentionRow>
                ) : null}
                {attention.overdue > 0 ? (
                  <AttentionRow><span>Overdue returns</span><b className="tnum">{attention.overdue}</b></AttentionRow>
                ) : null}
                {attention.returnPending > 0 ? (
                  <AttentionRow><span>Awaiting your return</span><b className="tnum">{attention.returnPending}</b></AttentionRow>
                ) : null}
                {attention.pendingApproval > 0 ? (
                  <AttentionRow><span>Waiting on hub approval</span><b className="tnum">{attention.pendingApproval}</b></AttentionRow>
                ) : null}
              </AttentionRows>
            </Attention>
          ) : null}

          <Card>
            <CardTitle>Your sales</CardTitle>
            {hasSales ? (
              <Chart>
                {series.map((d) => (
                  <Col key={d.date} title={`${d.date} · ${formatCents(d.grossCents)}`}>
                    <Bar style={{ height: `${Math.round((d.grossCents / maxDay) * 100)}%` }} />
                  </Col>
                ))}
              </Chart>
            ) : (
              <Quiet>No sales in this window.</Quiet>
            )}
            <Axis>
              <span>{series[0]?.date.slice(5)}</span>
              <span>{series[series.length - 1]?.date.slice(5)}</span>
            </Axis>
          </Card>

          <Two>
            <Card>
              <CardTitle><Package size={13} aria-hidden /> Your best sellers</CardTitle>
              {topProducts.length === 0 ? (
                <Quiet>Nothing sold yet.</Quiet>
              ) : (
                <Leaders>
                  {topProducts.map((p) => (
                    <Leader key={p.id}>
                      <LeaderName>{p.name}</LeaderName>
                      <LeaderMeta>{p.units} sold</LeaderMeta>
                      <LeaderValue className="tnum">{formatCents(p.grossCents)}</LeaderValue>
                    </Leader>
                  ))}
                </Leaders>
              )}
            </Card>

            <Card>
              <CardTitle>Best hubs for you</CardTitle>
              {topHubs.length === 0 ? (
                <Quiet>No hub history yet.</Quiet>
              ) : (
                <Leaders>
                  {topHubs.map((h) => (
                    <Leader key={h.id}>
                      <LeaderName>{h.name}</LeaderName>
                      <LeaderMeta>{h.units} units sold</LeaderMeta>
                      <LeaderValue className="tnum">{formatCents(h.grossCents)}</LeaderValue>
                    </Leader>
                  ))}
                </Leaders>
              )}
            </Card>
          </Two>

          <Footnote>
            Card sales pay out automatically. Cash sales are yours to hold, with the hub’s share
            settled against your next card sale — so a high cash share means a bigger balance to clear.
          </Footnote>
        </>
      )}
    </TabPage>
  );
}

const Ranges = styled.div`
  display: flex;
  gap: 4px;
`;
const RangeBtn = styled.button<{ $active: boolean }>`
  height: 30px;
  padding: 0 10px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? theme.color.textPrimary : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.color.surfaceBase : theme.color.textSecondary)};
  border: 1px solid ${({ theme, $active }) => ($active ? 'transparent' : theme.color.line2)};
`;
const Hero = styled.div`
  display: grid;
  gap: 4px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;
const HeroLabel = styled.p`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const HeroValue = styled.p`
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;
const HeroSplit = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: 2px;
`;
const Chip = styled.span<{ $tone: 'good' | 'warn' }>`
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  color: ${({ theme, $tone }) => ($tone === 'good' ? theme.color.statusLive : theme.color.statusWarning)};
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const Muted = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
  ${({ theme }) => theme.media.sm} {
    grid-template-columns: repeat(4, 1fr);
  }
`;
const Stat = styled.div`
  display: grid;
  gap: 1px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  min-width: 0;
`;
const StatIcon = styled.div`
  color: ${({ theme }) => theme.color.accentSecondary};
  margin-bottom: 2px;
`;
const StatValue = styled.p`
  font-size: 22px;
  font-weight: 800;
  overflow-wrap: anywhere;
`;
const StatLabel = styled.p`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const StatHint = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin-bottom: ${({ theme }) => theme.space[3]}px;
  min-width: 0;
`;
const CardTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const CreditRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space[2]}px;
  flex-wrap: wrap;
`;
const CreditValue = styled.p`
  font-size: 26px;
  font-weight: 800;
`;
const CreditOf = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  text-transform: capitalize;
`;
const Meter = styled.div`
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  overflow: hidden;
`;
const MeterFill = styled.div<{ $full: boolean }>`
  height: 100%;
  background: ${({ theme, $full }) => ($full ? theme.color.statusWarning : theme.color.accentSecondary)};
`;
const Attention = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.statusWarning};
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;
const AttentionHead = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.statusWarning};
`;
const AttentionRows = styled.div`
  display: grid;
  gap: 4px;
`;
const AttentionRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Chart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 120px;
`;
const Col = styled.div`
  flex: 1;
  min-width: 2px;
  height: 100%;
  display: flex;
  align-items: flex-end;
`;
const Bar = styled.div`
  width: 100%;
  min-height: 2px;
  border-radius: 3px 3px 0 0;
  background: ${({ theme }) => theme.color.accentPrimary};
`;
const Axis = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Quiet = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Two = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  ${({ theme }) => theme.media.sm} {
    grid-template-columns: 1fr 1fr;
  }
`;
const Leaders = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Leader = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0 ${({ theme }) => theme.space[2]}px;
  align-items: baseline;
`;
const LeaderName = styled.p`
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
`;
const LeaderValue = styled.p`
  font-size: 14px;
  font-weight: 800;
  grid-row: span 2;
  align-self: center;
`;
const LeaderMeta = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Footnote = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
`;
