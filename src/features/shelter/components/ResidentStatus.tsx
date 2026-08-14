'use client';

/**
 * B-2 — the resident's own view of what they can do right now.
 *
 * This renders nothing at all for anyone who isn't an enrolled resident, so it can be dropped onto
 * shared seller screens without branching at every call site.
 *
 * The allocation bar is the important part. A resident refused at checkout used to see only a
 * limit error; showing the same number here, continuously, is what turns "you can't" into "here's
 * what you have left". It reads from the same server field the checkout guard enforces, so the two
 * can never disagree.
 */
import styled from 'styled-components';
import { GraduationCap, Package, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/feedback/Skeleton';
import { formatCents } from '@/lib/money';
import { useResidentCapabilities } from '../hooks/useShelter';

export function ResidentStatus() {
  const { data, isLoading } = useResidentCapabilities();

  if (isLoading) return <Skeleton $h="120px" $radius={16} />;
  // Not a resident — this component is simply absent, not an empty state.
  if (!data) return null;

  const usedPct =
    data.cosignedAllocationCents > 0
      ? Math.min(100, (data.allocationUsedCents / data.cosignedAllocationCents) * 100)
      : 0;

  return (
    <Wrap>
      <Head>
        <Icon aria-hidden><ShieldCheck size={16} /></Icon>
        <div>
          <Org>{data.organizationName}</Org>
          <Sub>is cosigning your stock</Sub>
        </div>
      </Head>

      {!data.trainingComplete ? (
        <Gate href="/seller/training">
          <GraduationCap size={16} aria-hidden />
          <GateText>
            <b>Finish the starter course</b>
            <span>A few minutes, then you can pick up stock.</span>
          </GateText>
        </Gate>
      ) : null}

      <Allocation>
        <AllocHead>
          <AllocLabel>
            <Package size={13} aria-hidden /> Stock you can take
          </AllocLabel>
          <AllocValue className="tnum">
            {formatCents(data.allocationRemainingCents)} left
          </AllocValue>
        </AllocHead>
        <Rail
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={data.cosignedAllocationCents}
          aria-valuenow={data.allocationUsedCents}
          aria-label="Cosigned allocation used"
        >
          <RailFill style={{ width: `${usedPct}%` }} />
        </Rail>
        <AllocFoot>
          Holding {formatCents(data.allocationUsedCents)} of{' '}
          {formatCents(data.cosignedAllocationCents)}. Returning stock frees it up again.
        </AllocFoot>
      </Allocation>

      {data.starterGrantAvailable ? (
        // The single most reassuring fact available to someone about to take their first stock.
        <Grant>
          Your first pickup is covered — if it doesn’t sell, bring it back and you won’t owe
          anything.
        </Grant>
      ) : null}
    </Wrap>
  );
}

const Wrap = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Icon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border-radius: 50%;
  color: ${({ theme }) => theme.color.statusLive};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 14%, transparent)`};
`;
const Org = styled.b`
  display: block;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Sub = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Gate = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) =>
    `color-mix(in srgb, ${theme.color.statusLive} 12%, ${theme.color.surfaceBase})`};
  border: 1px solid
    ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 30%, transparent)`};
  color: ${({ theme }) => theme.color.statusLive};
  text-decoration: none;
`;
const GateText = styled.span`
  display: grid;
  gap: 1px;

  b {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textPrimary};
  }
  span {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const Allocation = styled.div`
  display: grid;
  gap: 6px;
`;
const AllocHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const AllocLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const AllocValue = styled.b`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Rail = styled.div`
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.line2};
  overflow: hidden;
`;
const RailFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.statusLive};
`;
const AllocFoot = styled.span`
  font-size: 11px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Grant = styled.p`
  font-size: 12px;
  line-height: 1.5;
  font-weight: 600;
  color: ${({ theme }) => theme.color.statusLive};
  margin: 0;
`;
