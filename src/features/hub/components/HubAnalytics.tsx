'use client';

/**
 * H-08 Hub analytics — the consignment operator's performance view.
 *
 * A hub does not sell to customers; it stocks sellers and earns a share of what they move. So this
 * answers the hub's questions, not a vendor's: is my stock actually selling, who is selling it,
 * how much value is out on the street right now, and how much am I owed.
 *
 * Cash is surfaced prominently on purpose — a cash sale never reaches the platform, so the hub's
 * share arrives as a seller debt to collect rather than an automatic transfer. That ratio is a
 * risk number, not a curiosity.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle, Boxes, Coins, TrendingUp, Users, Wallet } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCents } from '@/lib/money';
import { useHubAnalytics } from '../hooks/useHubAnalytics';

const RANGES = [7, 30, 90];

export function HubAnalytics({ hubId }: { hubId: string }) {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, refetch } = useHubAnalytics(hubId, days);

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

  const { earnings, movement, rail, attention, series, topProducts, topSellers } = data;
  const maxDay = Math.max(...series.map((d) => d.grossCents), 1);
  const hasSales = series.some((d) => d.grossCents > 0);
  const nothingYet = movement.unitsOut === 0;

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
      {nothingYet ? (
        <EmptyState
          icon="📦"
          title="No consignment activity yet"
          description="Once sellers check stock out of your hub, their sales and your share will appear here."
        />
      ) : (
        <>
          {/* What the hub has earned, and how much of it has actually arrived. */}
          <Hero>
            <HeroLabel>Your share · last {data.windowDays} days</HeroLabel>
            <HeroValue className="tnum">{formatCents(earnings.hubShareTotalCents)}</HeroValue>
            <HeroSplit>
              <Chip $tone="good">{formatCents(earnings.hubSharePaidCents)} paid</Chip>
              {earnings.hubShareAwaitingCents > 0 ? (
                <Chip $tone="warn">{formatCents(earnings.hubShareAwaitingCents)} awaiting</Chip>
              ) : null}
              <Muted>on {formatCents(earnings.grossCents)} of sales</Muted>
            </HeroSplit>
          </Hero>

          <Grid>
            <Stat>
              <StatIcon><TrendingUp size={16} aria-hidden /></StatIcon>
              <StatValue className="tnum">{Math.round(movement.sellThrough * 100)}%</StatValue>
              <StatLabel>Sell-through</StatLabel>
              <StatHint>{movement.unitsSold} of {movement.unitsOut} units</StatHint>
            </Stat>
            <Stat>
              <StatIcon><Boxes size={16} aria-hidden /></StatIcon>
              <StatValue className="tnum">{formatCents(movement.valueAtRiskCents)}</StatValue>
              <StatLabel>Out on consignment</StatLabel>
              <StatHint>{movement.liveCheckouts} live checkouts</StatHint>
            </Stat>
            <Stat>
              <StatIcon><Users size={16} aria-hidden /></StatIcon>
              <StatValue className="tnum">{movement.activeSellers}</StatValue>
              <StatLabel>Active sellers</StatLabel>
              <StatHint>holding your stock now</StatHint>
            </Stat>
            <Stat>
              <StatIcon><Coins size={16} aria-hidden /></StatIcon>
              <StatValue className="tnum">{Math.round(rail.cashRatio * 100)}%</StatValue>
              <StatLabel>Sold for cash</StatLabel>
              <StatHint>collected from sellers, not auto-paid</StatHint>
            </Stat>
          </Grid>

          {attention.owedBySellersCents > 0 ||
          attention.overdue > 0 ||
          attention.pendingApproval > 0 ||
          attention.returnPending > 0 ? (
            <Attention>
              <AttentionHead>
                <AlertTriangle size={15} aria-hidden /> Needs attention
              </AttentionHead>
              <AttentionRows>
                {attention.owedBySellersCents > 0 ? (
                  <AttentionRow>
                    <span>Owed by sellers (cash sales)</span>
                    <b className="tnum">{formatCents(attention.owedBySellersCents)}</b>
                  </AttentionRow>
                ) : null}
                {attention.pendingApproval > 0 ? (
                  <AttentionRow>
                    <span>Checkouts awaiting your approval</span>
                    <b className="tnum">{attention.pendingApproval}</b>
                  </AttentionRow>
                ) : null}
                {attention.overdue > 0 ? (
                  <AttentionRow>
                    <span>Overdue consignments</span>
                    <b className="tnum">{attention.overdue}</b>
                  </AttentionRow>
                ) : null}
                {attention.returnPending > 0 ? (
                  <AttentionRow>
                    <span>Awaiting return</span>
                    <b className="tnum">{attention.returnPending}</b>
                  </AttentionRow>
                ) : null}
              </AttentionRows>
            </Attention>
          ) : null}

          <Card>
            <CardTitle>Sales through your hub</CardTitle>
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
              <CardTitle>Top products</CardTitle>
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
              <CardTitle>Top sellers</CardTitle>
              {topSellers.length === 0 ? (
                <Quiet>No seller activity yet.</Quiet>
              ) : (
                <Leaders>
                  {topSellers.map((s) => (
                    <Leader key={s.id}>
                      <LeaderName>{s.name}</LeaderName>
                      <LeaderMeta>{s.units} units</LeaderMeta>
                      <LeaderValue className="tnum">{formatCents(s.grossCents)}</LeaderValue>
                    </Leader>
                  ))}
                </Leaders>
              )}
            </Card>
          </Two>

          <Footnote>
            <Wallet size={13} aria-hidden />
            Your share is transferred automatically for card sales. Cash sales are collected from
            the seller and settled against their next card sale.
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
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
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
  font-size: 13px;
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
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
  svg {
    flex: none;
    margin-top: 2px;
  }
`;
