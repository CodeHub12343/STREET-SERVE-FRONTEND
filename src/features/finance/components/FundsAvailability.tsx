'use client';

/**
 * A-2 — "Where's my money?"
 *
 * The platform holds payouts by verification tier, cannot pay out cash it never collected, strands
 * funded payouts when there's no Connect account, and freezes everything during a dispute. Every one
 * of those is the right call. Until now the seller was told none of them — they saw "settled" and no
 * money, which reads as a bug or a theft rather than a policy.
 *
 * So this screen answers the question in the seller's own terms: what's moving, what's stuck, WHY,
 * and what they can do about it. Blocked money is separated from delayed money throughout, because
 * conflating them is what made the old copy dishonest — "pending" implies waiting, and cash
 * proceeds are not waiting for anything.
 */
import styled from 'styled-components';
import { AlertCircle, ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { Banner } from '@/components/feedback/Banner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Button } from '@/components/primitives/Button';
import { formatCents } from '@/lib/money';
import { useConnectPayouts } from '@/features/consignment/hooks/useConsignment';
import { useFundsAvailability } from '../hooks/useFinance';
import type { FundsBucket } from '../types';

const TIER_LABEL: Record<string, string> = {
  tier0: 'Unverified',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

export function FundsAvailability() {
  const { data, isLoading, isError } = useFundsAvailability();
  const connect = useConnectPayouts();

  if (isLoading) return <Skeleton $h="220px" $radius={16} />;
  if (isError || !data) {
    return (
      <ErrorState
        title="Couldn’t load your payout status"
        message="Please try again in a moment."
      />
    );
  }

  const { buckets, totals, nextStep, holdDays, tier, frozen } = data;
  const tierLabel = TIER_LABEL[tier] ?? tier;

  return (
    <Wrap>
      <Header>
        <SectionTitle>Where your money is</SectionTitle>
        {/* State the policy up front rather than letting the seller discover it as a delay. */}
        <HoldNote>
          {frozen
            ? 'Payouts paused'
            : holdDays === 0
              ? `${tierLabel} · paid out as soon as it settles`
              : `${tierLabel} · held ${holdDays} day${holdDays === 1 ? '' : 's'}`}
        </HoldNote>
      </Header>

      {frozen ? (
        <Banner tone="warning" title="Payouts are paused while a dispute is open">
          Nothing is lost — they resume automatically once it’s resolved.
        </Banner>
      ) : null}

      {/* Two totals, never one. "Delayed" and "can't move at all" are different facts. */}
      <Totals>
        <Total>
          <TotalLabel>On the way</TotalLabel>
          <TotalValue className="tnum">{formatCents(totals.movingCents)}</TotalValue>
        </Total>
        <Total $blocked>
          <TotalLabel>Can’t be paid out</TotalLabel>
          <TotalValue className="tnum">{formatCents(totals.blockedCents)}</TotalValue>
        </Total>
      </Totals>

      {buckets.length === 0 ? (
        <Muted>
          Nothing is held right now. Money from card sales lands here as soon as a checkout settles.
        </Muted>
      ) : (
        <List>
          {buckets.map((b) => (
            <BucketRow key={b.key} bucket={b} />
          ))}
        </List>
      )}

      {nextStep ? (
        <NextStep>
          <NextStepIcon aria-hidden>
            {nextStep.action === 'await_dispute' ? <Lock size={16} /> : <ShieldCheck size={16} />}
          </NextStepIcon>
          <NextStepBody>
            <NextStepLabel>{nextStep.label}</NextStepLabel>
            <NextStepDetail>{nextStep.detail}</NextStepDetail>
          </NextStepBody>
          {nextStep.action === 'connect_payout_account' ? (
            <Button size="compact" loading={connect.isPending} onClick={() => connect.mutate()}>
              {data.connected ? 'Finish setup' : 'Connect'}
            </Button>
          ) : nextStep.action === 'verify_identity' ? (
            <LinkButton href="/profile/verification">
              Verify <ArrowRight size={14} aria-hidden />
            </LinkButton>
          ) : null}
        </NextStep>
      ) : null}
    </Wrap>
  );
}

function BucketRow({ bucket }: { bucket: FundsBucket }) {
  return (
    <Item $blocked={bucket.blocked}>
      <ItemHead>
        <ItemLabel>
          {bucket.blocked ? <AlertCircle size={13} aria-hidden /> : null}
          {bucket.label}
        </ItemLabel>
        <ItemAmount className="tnum">{formatCents(bucket.amountCents)}</ItemAmount>
      </ItemHead>
      <ItemReason>{bucket.reason}</ItemReason>
      {bucket.remedy ? <ItemRemedy>{bucket.remedy}</ItemRemedy> : null}
    </Item>
  );
}

const Wrap = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Header = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]}px;
  flex-wrap: wrap;
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: 0;
`;
const HoldNote = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Totals = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Total = styled.div<{ $blocked?: boolean }>`
  display: grid;
  gap: 3px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid
    ${({ theme, $blocked }) =>
      $blocked ? `color-mix(in srgb, ${theme.color.statusAway} 34%, transparent)` : theme.color.line2};
`;
const TotalLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const TotalValue = styled.b`
  font-size: 20px;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Item = styled.div<{ $blocked: boolean }>`
  display: grid;
  gap: 4px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-left: 3px solid
    ${({ theme, $blocked }) => ($blocked ? theme.color.statusAway : theme.color.statusLive)};
`;
const ItemHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const ItemLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const ItemAmount = styled.b`
  font-size: 15px;
  color: ${({ theme }) => theme.color.textPrimary};
  white-space: nowrap;
`;
const ItemReason = styled.p`
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0;
`;
const ItemRemedy = styled.p`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: 0;
`;
const Muted = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: 0;
`;
const NextStep = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.color.statusLive} 10%, ${theme.color.surfaceRaised})`};
  border: 1px solid
    ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 28%, transparent)`};
`;
const NextStepIcon = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.color.statusLive};
`;
const NextStepBody = styled.div`
  display: grid;
  gap: 2px;
  flex: 1;
  min-width: 0;
`;
const NextStepLabel = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const NextStepDetail = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const LinkButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme }) => theme.color.statusLive};
  text-decoration: none;
`;
