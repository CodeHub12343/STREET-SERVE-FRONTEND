'use client';

/**
 * S-13 Seller Earnings (docs/13 S-13, GAP-6) — the real screen that replaced the "depends on GAP"
 * placeholder. Three server-computed reads: settled net + pending totals (tiles), a recent daily
 * gross-sales series (bars), and settled payout history. Single seller only.
 */
import Link from 'next/link';
import styled from 'styled-components';
import { TrendingUp, Clock, Wallet, FileText, ChevronRight } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCents } from '@/lib/money';
import { FundsAvailability } from '@/features/finance';
import { ResidentWallet } from '@/features/shelter';
import { useSellerEarnings } from '../hooks/useConsignment';
import { FeeCalculator } from './FeeCalculator';

const dayLabel = (iso: string) =>
  new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

export function SellerEarnings() {
  const { data, isLoading, isError } = useSellerEarnings();

  if (isLoading) {
    return (
      <TabPage title="Earnings">
        <Skeleton $h="120px" $radius={16} />
        <div style={{ height: 12 }} />
        <Skeleton $h="200px" $radius={16} />
      </TabPage>
    );
  }
  if (isError || !data) {
    return (
      <TabPage title="Earnings">
        <ErrorState title="Couldn’t load your earnings" message="Please try again in a moment." />
      </TabPage>
    );
  }

  const { totals, dailyGross, payouts, windowDays } = data;
  const hasActivity = dailyGross.length > 0 || payouts.length > 0 || totals.lifetimeGrossCents > 0;
  const maxGross = Math.max(1, ...dailyGross.map((d) => d.grossCents));

  if (!hasActivity) {
    return (
      <TabPage title="Earnings">
        {/* Most useful for a brand-new seller: model a payout before the first sale. */}
        <FeeCalculator />
        {/* B-3: for a resident with no bank account, this is where their money actually is —
          above the platform-payout explainer, because it's the answer to the same question. */}
      <ResidentWallet />
      <FundsAvailability />
        <EmptyState
          icon="💸"
          title="No earnings yet"
          description="Once you check out inventory and log sales, your payouts and daily totals show up here."
        />
      </TabPage>
    );
  }

  return (
    <TabPage title="Earnings">
      {/* B-3: for a resident with no bank account, this is where their money actually is —
          above the platform-payout explainer, because it's the answer to the same question. */}
      <ResidentWallet />
      <FundsAvailability />

      {/* Pre-publish calculator (R12) — plan an item's payout before listing it. */}
      <FeeCalculator />

      {/* ── Headline tiles ─────────────────────────────────────────────── */}
      <Tiles>
        <Tile $accent>
          <TileIcon>
            <Wallet size={16} aria-hidden />
          </TileIcon>
          <TileLabel>Earned</TileLabel>
          <TileValue className="tnum">{formatCents(totals.settledNetCents)}</TileValue>
          <TileHint>
            {/* "Payouts" only counts money that actually moved. */}
            {(totals.paidCount ?? 0) > 0
              ? `${formatCents(totals.paidNetCents ?? 0)} paid out`
              : `${totals.settledCount} settlement${totals.settledCount === 1 ? '' : 's'} · paid in cash`}
          </TileHint>
        </Tile>
        <Tile>
          <TileIcon>
            <Clock size={16} aria-hidden />
          </TileIcon>
          <TileLabel>Pending</TileLabel>
          <TileValue className="tnum">{formatCents(totals.pendingGrossCents)}</TileValue>
          <TileHint>
            {totals.pendingCheckoutCount} active checkout{totals.pendingCheckoutCount === 1 ? '' : 's'}
          </TileHint>
        </Tile>
        <Tile>
          <TileIcon>
            <TrendingUp size={16} aria-hidden />
          </TileIcon>
          <TileLabel>Lifetime gross</TileLabel>
          <TileValue className="tnum">{formatCents(totals.lifetimeGrossCents)}</TileValue>
          <TileHint>all sales</TileHint>
        </Tile>
      </Tiles>

      {/* ── Daily gross series ─────────────────────────────────────────── */}
      <SectionTitle>Last {windowDays} days</SectionTitle>
      {dailyGross.length === 0 ? (
        <Muted>No sales in this window yet.</Muted>
      ) : (
        <Bars role="img" aria-label={`Daily gross sales over the last ${windowDays} days`}>
          {dailyGross.map((d) => (
            <BarCol key={d.date} title={`${dayLabel(d.date)}: ${formatCents(d.grossCents)} (${d.count} sold)`}>
              <BarTrack>
                <BarFill style={{ height: `${Math.max(6, Math.round((d.grossCents / maxGross) * 100))}%` }} />
              </BarTrack>
              <BarDay>{dayLabel(d.date)}</BarDay>
            </BarCol>
          ))}
        </Bars>
      )}

      {/* ── Payout history ─────────────────────────────────────────────── */}
      <SectionTitle>Settlement history</SectionTitle>
      {payouts.length === 0 ? (
        <Muted>No settled payouts yet — they appear here once your checkouts settle.</Muted>
      ) : (
        <Payouts>
          {payouts.map((p) => (
            <Payout key={p.checkoutId}>
              <PayoutMain>
                <PayoutNet className="tnum">{formatCents(p.sellerNetCents)}</PayoutNet>
                <PayoutMeta>
                  {dayLabel(p.settledAt)} · gross {formatCents(p.grossSalesCents)}
                </PayoutMeta>
              </PayoutMain>
              <PayoutBreak>
                <span>fee −{formatCents(p.platformFeeCents)}</span>
                <span>hub −{formatCents(p.hubShareCents)}</span>
              </PayoutBreak>
            </Payout>
          ))}
        </Payouts>
      )}

      {/*
        The tax statement declares this screen as its parent (`backHref="/seller/earnings"`) but
        nothing here ever linked TO it — so the only way in was to type the URL. A seller looking
        for their year-end figures looks here, which is exactly where the link belongs.
      */}
      <TaxLink href="/seller/tax">
        <FileText size={16} aria-hidden />
        <span>
          <b>Tax statement</b>
          <em>Your yearly totals, ready for filing</em>
        </span>
        <ChevronRight size={16} aria-hidden />
      </TaxLink>
    </TabPage>
  );
}

const TaxLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  color: inherit;
  text-decoration: none;

  span {
    display: grid;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }
  b {
    font-size: 14px;
  }
  em {
    font-style: normal;
    font-size: 12px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Tile = styled.div<{ $accent?: boolean }>`
  display: grid;
  gap: 3px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme, $accent }) =>
    $accent ? `color-mix(in srgb, ${theme.color.statusLive} 12%, ${theme.color.surfaceRaised})` : theme.color.surfaceRaised};
  border: 1px solid
    ${({ theme, $accent }) =>
      $accent ? `color-mix(in srgb, ${theme.color.statusLive} 30%, transparent)` : theme.color.line2};
`;
const TileIcon = styled.span`
  color: ${({ theme }) => theme.color.textTertiary};
`;
const TileLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const TileValue = styled.b`
  font-size: 20px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const TileHint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: ${({ theme }) => theme.space[2]}px 0;
`;
const Muted = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Bars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space[2]}px;
  height: 160px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
  overflow-x: auto;
`;
const BarCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 34px;
  height: 100%;
`;
const BarTrack = styled.div`
  display: flex;
  align-items: flex-end;
  width: 100%;
  flex: 1;
`;
const BarFill = styled.div`
  width: 100%;
  border-radius: ${({ theme }) => theme.radius.control}px ${({ theme }) => theme.radius.control}px 0 0;
  background: ${({ theme }) => theme.color.statusLive};
  min-height: 4px;
`;
const BarDay = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.color.textTertiary};
  white-space: nowrap;
`;
const Payouts = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Payout = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const PayoutMain = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
`;
const PayoutNet = styled.span`
  font-size: 16px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.statusLive};
`;
const PayoutMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const PayoutBreak = styled.div`
  display: grid;
  gap: 2px;
  text-align: right;
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
