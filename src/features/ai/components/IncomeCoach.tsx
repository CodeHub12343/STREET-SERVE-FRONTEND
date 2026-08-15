'use client';

/**
 * E-9 — the Income Coach.
 *
 * The brief's most concrete AI promise: "To earn $100 today, sell these 12 items at these
 * locations."
 *
 * The single most important behaviour on this screen is that **a shortfall is shown as a
 * shortfall**. When the available stock can't reach the goal, the plan says so in the headline,
 * states the realistic number, and explains what would close the gap. It does not quietly pad the
 * basket to make the arithmetic land on the goal.
 *
 * That is not a UX nicety. The person reading this is deciding how to spend a day they can't get
 * back, and possibly whether they can eat tonight. A plan that over-promises costs them the day.
 */
import { useState } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { AlertTriangle, Check, MapPin, Sparkles, Target } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { formatCents } from '@/lib/money';
import { useAiQuota, useCoachPlan } from '../hooks/useCoach';

/** Round numbers people actually think in. */
const PRESETS = [2_000, 5_000, 10_000, 20_000];

export function IncomeCoach() {
  const [goal, setGoal] = useState(10_000);
  const plan = useCoachPlan();
  const quota = useAiQuota();
  const result = plan.data;

  /**
   * The refusal is an offer, not a fault. Branching on the code rather than the message, per the
   * rule in lib/api/errors.ts — copy changes, codes are the contract.
   */
  const outOfCredit = plan.error?.code === 'AI_QUOTA_EXCEEDED';

  return (
    <TabPage title="Plan my day">
      <Lede>
        Pick what you want to make today. We&rsquo;ll work out what to take and where to go — and
        tell you plainly if it isn&rsquo;t realistic.
      </Lede>

      <GoalRow role="group" aria-label="Today's goal">
        {PRESETS.map((cents) => (
          <GoalChip
            key={cents}
            type="button"
            role="radio"
            aria-checked={goal === cents}
            $on={goal === cents}
            onClick={() => setGoal(cents)}
          >
            {formatCents(cents)}
          </GoalChip>
        ))}
      </GoalRow>

      <Button fullWidth loading={plan.isPending} onClick={() => plan.mutate(goal)}>
        <Target size={16} aria-hidden /> Make me a plan
      </Button>

      {/*
        Shown while there is still credit, not only once it is gone. A seller who discovers the
        limit by hitting it experiences a broken feature; one who watched it count down understands
        an allowance — and has a reason to consider the plan before being annoyed by it.
      */}
      {quota.data && !quota.data.unlimited && !outOfCredit ? (
        <QuotaNote>
          {quota.data.remaining > 0
            ? `${quota.data.remaining} of ${quota.data.limit} free AI suggestions left this month.`
            : 'No free AI suggestions left this month.'}
        </QuotaNote>
      ) : null}

      {outOfCredit ? (
        <Spacer>
          <Banner tone="warning" title="You’ve used this month’s free suggestions">
            The AI Marketing Assistant makes coaching, pricing and recommendations unlimited.
            <UpgradeLink href="/vendor/upgrade">See the plan</UpgradeLink>
          </Banner>
        </Spacer>
      ) : plan.isError ? (
        <Spacer>
          <Banner tone="warning" title="Couldn’t build a plan">
            {plan.error.message}
          </Banner>
        </Spacer>
      ) : null}

      {result ? (
        <Result>
          {/* The headline states the outcome honestly before any of the detail. */}
          <Verdict $ok={result.achievable}>
            <VerdictIcon aria-hidden>
              {result.achievable ? <Check size={20} /> : <AlertTriangle size={20} />}
            </VerdictIcon>
            <VerdictBody>
              <VerdictHead>{result.summary}</VerdictHead>
              {!result.achievable ? (
                <VerdictNumbers>
                  Realistic today: <b>{formatCents(result.projectedCents)}</b> of your{' '}
                  {formatCents(result.goalCents)} goal.
                </VerdictNumbers>
              ) : null}
            </VerdictBody>
          </Verdict>

          {/* What would actually close the gap — not encouragement, information. */}
          {result.advice.length > 0 ? (
            <Advice>
              {result.advice.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </Advice>
          ) : null}

          <SectionTitle>What to take</SectionTitle>
          <Basket>
            {result.basket.map((item) => (
              <Item key={item.productId} href={`/seller/product/${item.productId}`}>
                <ItemHead>
                  <ItemName>{item.name}</ItemName>
                  <ItemQty className="tnum">×{item.suggestedQuantity}</ItemQty>
                </ItemHead>
                <ItemMoney>
                  <b className="tnum">{formatCents(item.expectedContributionCents)}</b> expected ·{' '}
                  {formatCents(item.netPerUnitCents)} each
                </ItemMoney>
                {/* The forecast, in the engine's own words. No oracles. */}
                <ItemWhy>{item.reasonSummary}</ItemWhy>
              </Item>
            ))}
          </Basket>

          {result.locations.length > 0 ? (
            <>
              <SectionTitle>Where to go</SectionTitle>
              <Places>
                {result.locations.map((l) => (
                  <Place key={l.hubId}>
                    <MapPin size={14} aria-hidden />
                    <span>{l.reasonSummary}</span>
                  </Place>
                ))}
              </Places>
            </>
          ) : null}

          {/* Measured, not asserted — what this seller has actually made on recent days. */}
          {result.track.plansMeasured > 0 && result.track.medianActualCents !== null ? (
            <Track>
              <Sparkles size={14} aria-hidden />
              <span>
                Over your last {result.track.plansMeasured} selling days, your typical take was{' '}
                <b>{formatCents(result.track.medianActualCents)}</b>.
              </span>
            </Track>
          ) : null}
        </Result>
      ) : null}
    </TabPage>
  );
}

const Lede = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0 0 ${({ theme }) => theme.space[4]}px;
`;
const GoalRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;
const GoalChip = styled.button<{ $on: boolean }>`
  flex: 0 0 auto;
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  border: 1px solid ${({ theme, $on }) => ($on ? 'transparent' : theme.color.line2)};
  background: ${({ theme, $on }) => ($on ? theme.color.accentPrimary : 'transparent')};
  color: ${({ theme, $on }) => ($on ? '#fff' : theme.color.textSecondary)};
`;
const Spacer = styled.div`
  margin-top: ${({ theme }) => theme.space[3]}px;
`;
/** Quiet by design: an allowance you still have is information, not a warning. */
const QuotaNote = styled.p`
  margin-top: ${({ theme }) => theme.space[2]}px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  text-align: center;
`;
const UpgradeLink = styled(Link)`
  display: inline-block;
  margin-top: ${({ theme }) => theme.space[2]}px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.accentPrimary};
`;
const Result = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-top: ${({ theme }) => theme.space[4]}px;
`;
const Verdict = styled.div<{ $ok: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme, $ok }) =>
    `color-mix(in srgb, ${$ok ? theme.color.statusLive : theme.color.statusAway} 12%, ${theme.color.surfaceRaised})`};
  border: 1px solid
    ${({ theme, $ok }) =>
      `color-mix(in srgb, ${$ok ? theme.color.statusLive : theme.color.statusAway} 30%, transparent)`};
`;
const VerdictIcon = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  padding-top: 1px;
  color: currentColor;
`;
const VerdictBody = styled.div`
  display: grid;
  gap: 4px;
`;
const VerdictHead = styled.b`
  font-size: 15px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const VerdictNumbers = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Advice = styled.ul`
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: ${({ theme }) => theme.space[2]}px 0 0;
`;
const Basket = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Item = styled(Link)`
  display: grid;
  gap: 3px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  text-decoration: none;
`;
const ItemHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const ItemName = styled.b`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const ItemQty = styled.span`
  font-size: 15px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.accentSecondary};
`;
const ItemMoney = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};

  b {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const ItemWhy = styled.span`
  font-size: 11px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Places = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Place = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textSecondary};

  svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: ${({ theme }) => theme.color.accentSecondary};
  }
`;
const Track = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};

  b {
    color: ${({ theme }) => theme.color.textPrimary};
  }
  svg {
    color: ${({ theme }) => theme.color.accentPrimary};
  }
`;
