'use client';

/**
 * S-10 Settlement Breakdown (docs/13 S-10) — gross − platform fee − hub share = your net, with the
 * tier-based payout timing and the Trust Score delta. All server-computed.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { TrendingUp } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Banner } from '@/components/feedback/Banner';
import { formatCents } from '@/lib/money';
import { useSettlement } from '../hooks/useConsignment';

export function SettlementView({ checkoutId }: { checkoutId: string }) {
  const router = useRouter();
  const { data: s, isLoading, isError } = useSettlement(checkoutId);

  if (isLoading) return <TabPage title="Settlement"><Skeleton $h="260px" $radius={16} /></TabPage>;
  if (isError || !s) return <TabPage title="Settlement"><ErrorState title="Settlement not ready" /></TabPage>;

  // Money is only "paid" once a transfer actually executed. A cash sale never reached the platform,
  // so the seller's share is genuinely OWED but not yet payable — saying "payout" there is a lie.
  const isPaid = s.sellerPayoutStatus === 'paid';

  return (
    <TabPage title="Settlement">
      {!isPaid ? (
        <Banner tone="info" title="Recorded — not yet paid out">
          This sale was paid in cash, so the money went directly to you at the point of sale. Your
          share below is what you’ve earned on paper; in-app card payments (which pay out
          automatically) are coming soon.
        </Banner>
      ) : null}
      <Card>
        <Net>
          <span>{isPaid ? 'Your net payout' : 'Your net share (owed)'}</span>
          <b className="tnum">{formatCents(s.sellerNetCents)}</b>
        </Net>
        <Rows>
          <Line><span>Sold ({s.soldQty} units)</span><span className="tnum">{formatCents(s.grossCents)}</span></Line>
          <Line><span>Platform fee</span><span className="tnum">−{formatCents(s.platformFeeCents)}</span></Line>
          <Line><span>Hub share</span><span className="tnum">−{formatCents(s.hubShareCents)}</span></Line>
          <Total><span>Your net</span><span className="tnum">{formatCents(s.sellerNetCents)}</span></Total>
        </Rows>
        <Meta>
          <Payout>{s.payoutTiming}</Payout>
          <Trust><TrendingUp size={14} aria-hidden /> Trust +{s.trustDelta}</Trust>
        </Meta>
        <Returned>{s.returnedQty} unit(s) returned — no charge.</Returned>
      </Card>
      <Button fullWidth variant="secondary" onClick={() => router.replace('/seller/earnings')}>
        View earnings
      </Button>
    </TabPage>
  );
}

const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Net = styled.div`
  display: grid;
  gap: 4px;
  span {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
  b {
    font-size: 40px;
    letter-spacing: -0.02em;
    color: ${({ theme }) => theme.color.statusLive};
  }
`;
const Rows = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Line = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Total = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 16px;
  font-weight: 800;
  padding-top: ${({ theme }) => theme.space[2]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;
const Meta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Payout = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Trust = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.statusLive};
`;
const Returned = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
