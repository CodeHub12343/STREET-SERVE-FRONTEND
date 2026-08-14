'use client';

/**
 * V-12 Payouts (docs/13 V-12) — real connection status, Stripe balance, and the earnings ledger.
 * Every value here is server-sourced; there is no placeholder data. Three account states drive the
 * top card: not connected (→ connect), connected-but-verifying (Stripe still checking), and active.
 */
import styled from 'styled-components';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isMapDemo } from '@/lib/env';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatCents } from '@/lib/money';
import { formatRelativeMinutes } from '@/lib/format';
import { useVendorPayouts } from '../hooks/useVendorPayouts';

const TIER_LABEL: Record<string, string> = {
  tier0: 'Standard payouts',
  bronze: 'Bronze · 3-day hold',
  silver: 'Silver · next-day payouts',
  gold: 'Gold · same-day payouts',
};

export function VendorPayouts({ businessId }: { businessId: string }) {
  const { show } = useToast();
  const { data, isLoading, isError, refetch } = useVendorPayouts(businessId);

  const connect = async () => {
    if (isMapDemo) {
      show('Payouts are simulated in demo mode', 'default');
      return;
    }
    try {
      const { url } = await api.post<{ url: string }>(endpoints.business(businessId).payoutsOnboard);
      window.location.assign(url);
    } catch {
      show('Couldn’t open Stripe. Please try again.', 'danger');
    }
  };

  if (isLoading) {
    return (
      <Wrap>
        <Skeleton $h="160px" $radius={16} />
        <Skeleton $h="64px" $radius={16} />
        <Skeleton $h="64px" $radius={16} />
      </Wrap>
    );
  }
  if (isError || !data) {
    return (
      <Wrap>
        <ErrorState title="Couldn’t load payouts" onRetry={() => void refetch()} />
      </Wrap>
    );
  }

  const { account, balance, earnings, summary } = data;
  const active = account.connected && account.chargesEnabled && account.payoutsEnabled;
  const verifying = account.connected && !active;
  // What of the lifetime earnings is still sitting in the Stripe balance (vs already banked).
  const atStripeCents = balance ? balance.availableCents + balance.pendingCents : 0;

  return (
    <Wrap>
      <BalanceCard>
        <span>Available to pay out</span>
        <b className="tnum">{balance ? formatCents(balance.availableCents) : '—'}</b>
        {balance && balance.pendingCents > 0 ? (
          <Pending className="tnum">{formatCents(balance.pendingCents)} still settling</Pending>
        ) : null}

        {active ? (
          <Status $tone="ok">
            <CheckCircle2 size={14} /> Stripe active · {TIER_LABEL[account.payoutTier] ?? 'payouts enabled'}
          </Status>
        ) : verifying ? (
          <Status $tone="warn">
            <Clock size={14} /> Stripe is verifying your details — payouts unlock once it clears
          </Status>
        ) : (
          <Status $tone="warn">
            <AlertCircle size={14} /> Connect a payout account to get paid
          </Status>
        )}

        {!active ? (
          <Button size="compact" onClick={() => void connect()}>
            {verifying ? 'Finish setup on Stripe' : 'Connect payouts'}
          </Button>
        ) : null}

        {/* $0 available with money settling isn't "missing" money — Stripe holds new sales briefly
            then releases them on your schedule. Say so, or it reads as lost. */}
        {active && balance && balance.availableCents === 0 && balance.pendingCents > 0 ? (
          <SettleNote>
            Your recent sales are still clearing with Stripe. They’ll move to “available” and pay out
            on your {TIER_LABEL[account.payoutTier]?.toLowerCase() ?? 'payout'} schedule — nothing is lost.
          </SettleNote>
        ) : null}
      </BalanceCard>

      <Summary>
        <b className="tnum">{formatCents(summary.netEarnedCents)}</b>
        <span>earned from {summary.salesCount} completed {summary.salesCount === 1 ? 'sale' : 'sales'}</span>
      </Summary>
      {/* Two money numbers on one screen invite "why don't these match?". Say where the earnings
          currently sit — and once payouts start, why lifetime earned outgrows the Stripe balance. */}
      {balance ? (
        <Reconcile>
          {atStripeCents >= summary.netEarnedCents - 1
            ? `All of it is still at Stripe: ${formatCents(balance.availableCents)} available + ${formatCents(balance.pendingCents)} clearing.`
            : `${formatCents(atStripeCents)} of it is still at Stripe (${formatCents(balance.availableCents)} available + ${formatCents(balance.pendingCents)} clearing); the rest has already been paid out to your bank.`}
        </Reconcile>
      ) : null}

      <SectionTitle>Recent earnings</SectionTitle>
      {earnings.length === 0 ? (
        <EmptyState icon="🧾" title="No earnings yet" description="Sales you make will show up here with their net after fees." />
      ) : (
        <List>
          {earnings.map((e) => (
            <Row key={e.transactionId}>
              <div>
                <Label>Sale</Label>
                <When>{formatRelativeMinutes(e.createdAt)}</When>
              </div>
              <Right>
                <Amount className="tnum">{formatCents(e.netCents)}</Amount>
                <StatusText $tone={e.status === 'completed' ? 'ok' : e.status === 'refunded' ? 'muted' : 'warn'}>
                  {e.status === 'completed' ? 'Net' : e.status === 'pending' ? 'Pending' : e.status}
                </StatusText>
              </Right>
            </Row>
          ))}
        </List>
      )}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 560px;
`;
const BalanceCard = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  span {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
  b {
    font-size: 32px;
  }
`;
const Pending = styled.p`
  font-size: 12px !important;
  color: ${({ theme }) => theme.color.textTertiary} !important;
  margin-top: -6px;
`;
const Reconcile = styled.p`
  font-size: 12px;
  line-height: 1.4;
  padding: 0 ${({ theme }) => theme.space[1]}px;
  margin-top: -8px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const SettleNote = styled.p`
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Status = styled.p<{ $tone: 'ok' | 'warn' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme, $tone }) =>
    $tone === 'ok' ? theme.color.statusLive : theme.color.statusWarning} !important;
`;
const Summary = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 ${({ theme }) => theme.space[1]}px;
  b {
    font-size: 18px;
    font-weight: 800;
  }
  span {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Label = styled.p`
  font-weight: 600;
  font-size: 14px;
`;
const When = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Right = styled.div`
  text-align: right;
`;
const Amount = styled.p`
  font-weight: 800;
  font-size: 15px;
`;
const StatusText = styled.p<{ $tone: 'ok' | 'warn' | 'muted' }>`
  font-size: 12px;
  color: ${({ theme, $tone }) =>
    $tone === 'ok'
      ? theme.color.statusLive
      : $tone === 'muted'
        ? theme.color.textTertiary
        : theme.color.statusWarning};
`;
