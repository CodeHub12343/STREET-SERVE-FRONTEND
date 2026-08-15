'use client';

/**
 * C-35 Wallet (docs/13 C-35).
 *
 * This screen previously rendered invented data: a hard-coded $3.40 balance, a fake "•••• 4242"
 * saved card, and an unverified "no Spot-Me obligations" line. Showing someone a balance and a
 * stored card that do not exist is worse than showing nothing — they are financial claims the user
 * may act on. Everything here is now either read from the API or stated as unavailable.
 *
 * What is real: ping-tip earnings (GET /pings/mine). What is deliberately NOT claimed: saved cards
 * (there is no card vault — Stripe collects details per payment) and Spot-Me obligations (the API
 * exposes only request/decide/repay, with no way to list them).
 */
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { CreditCard, ChevronRight, Info } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Skeleton } from '@/components/feedback/Skeleton';
import { formatCents } from '@/lib/money';
import { useMe } from '@/lib/auth/useMe';
import { usePingEarnings } from './hooks/usePingEarnings';
import { useMyTransactions, useSpotMeObligations } from './hooks/useWalletData';
import { RtoObligationCard } from '@/features/rto';

export function Wallet() {
  const router = useRouter();
  const { roles } = useMe();
  const { data, isLoading } = usePingEarnings();
  const { data: spotMe, isLoading: spotMeLoading } = useSpotMeObligations();
  const { data: txns, isLoading: txnsLoading } = useMyTransactions();

  const outstanding = (spotMe ?? []).filter((s) => s.outstanding);
  const recent = (txns ?? []).slice(0, 5);

  // Where this user's money actually lives, by role. The wallet's real job is to route them there.
  const destinations = [
    ...(roles.includes('seller')
      ? [
          { href: '/seller/balance', label: 'Seller balance', hint: 'What comes out of your next sale' },
          { href: '/seller/earnings', label: 'Seller earnings', hint: 'Sales, payouts and history' },
        ]
      : []),
    ...(roles.includes('vendor') ? [{ href: '/vendor/payouts', label: 'Business payouts', hint: 'Bank account and payout status' }] : []),
    ...(roles.includes('hub') ? [{ href: '/hub/settlements', label: 'Hub settlements', hint: 'What each seller owes your hub' }] : []),
  ];

  return (
    <TabPage title="Wallet">
      {/*
        Above the balance on purpose: a due date outranks a number you are only looking at. An
        agreement renders nothing when there is none, so this costs a non-RTO customer no space.
      */}
      <RtoObligationCard />
      <Balance>
        <span>Ping-tip earnings</span>
        {isLoading ? (
          <Skeleton $w="120px" $h="38px" />
        ) : (
          <b className="tnum">{formatCents(data?.earnedCents ?? 0)}</b>
        )}
        <small>
          {(data?.earnedCents ?? 0) > 0
            ? 'Earned from shares that brought in a new customer.'
            : 'Share a business — when a new customer buys, your tip lands here.'}
        </small>
      </Balance>

      {destinations.length > 0 ? (
        <>
          <SectionTitle>Your money</SectionTitle>
          <List>
            {destinations.map((d) => (
              <Row key={d.href} type="button" onClick={() => router.push(d.href)}>
                <RowMain>
                  <RowTitle>{d.label}</RowTitle>
                  <RowHint>{d.hint}</RowHint>
                </RowMain>
                <ChevronRight size={16} aria-hidden />
              </Row>
            ))}
          </List>
        </>
      ) : null}

      <SectionTitle>Payment methods</SectionTitle>
      <Note>
        <CreditCard size={16} aria-hidden />
        <span>
          Cards aren’t stored on StreetServe. You enter your card — or use Apple&nbsp;/ Google Pay —
          on the payment screen each time, handled by Stripe.
        </span>
      </Note>

      <SectionTitle>Spot Me</SectionTitle>
      {spotMeLoading ? (
        <Skeleton $h="52px" $radius={16} />
      ) : outstanding.length === 0 ? (
        <Note>
          <Info size={16} aria-hidden />
          <span>No outstanding Spot-Me obligations.</span>
        </Note>
      ) : (
        <List>
          {outstanding.map((s) => (
            <Line key={s.id}>
              <RowMain>
                <RowTitle>{formatCents(s.amountCents)}</RowTitle>
                <RowHint>
                  {s.status === 'defaulted' ? 'Overdue · ' : 'Repay by '}
                  {s.repayBy ? new Date(s.repayBy).toLocaleDateString() : '—'}
                </RowHint>
              </RowMain>
              <Tag $warn={s.status === 'defaulted'}>{s.status}</Tag>
            </Line>
          ))}
        </List>
      )}

      <SectionTitle>Recent activity</SectionTitle>
      {txnsLoading ? (
        <Skeleton $h="52px" $radius={16} />
      ) : recent.length === 0 ? (
        <Note>
          <Info size={16} aria-hidden />
          <span>Payments you make will appear here.</span>
        </Note>
      ) : (
        <List>
          {recent.map((t) => (
            <Line key={t.id}>
              <RowMain>
                <RowTitle className="tnum">{formatCents(t.amountCents)}</RowTitle>
                <RowHint>
                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                  {t.tipCents > 0 ? ` · incl. ${formatCents(t.tipCents)} tip` : ''}
                </RowHint>
              </RowMain>
              <Tag $warn={t.status === 'failed'}>{t.status}</Tag>
            </Line>
          ))}
        </List>
      )}
    </TabPage>
  );
}

const Balance = styled.div`
  display: grid;
  gap: 2px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
  span {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
  b {
    font-size: 32px;
  }
  small {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textTertiary};
  }
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: ${({ theme }) => theme.space[4]}px 0 ${({ theme }) => theme.space[2]}px;
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
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.textSecondary};
  text-align: left;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
  }
`;
const RowMain = styled.div`
  flex: 1;
  min-width: 0;
`;
const RowTitle = styled.p`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const RowHint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Line = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Tag = styled.span<{ $warn?: boolean }>`
  flex: none;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
  color: ${({ theme, $warn }) => ($warn ? theme.color.statusWarning : theme.color.textTertiary)};
`;
const Note = styled.p`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[2]}px;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
  svg {
    flex: none;
    margin-top: 2px;
    color: ${({ theme }) => theme.color.textTertiary};
  }
`;
