'use client';

/**
 * A-3 — what a seller's Trust Score is actually WORTH.
 *
 * The score was computed carefully and consumed by almost nothing, which is the worst of both
 * worlds: sellers were measured without being paid, so the number read as surveillance rather than
 * credit. This screen states the three concrete benefits — a bigger inventory ceiling, a discount on
 * the platform's fee, and access to premium stock — and how far the next band is.
 *
 * Every number here comes from the server's own band table, the same one `checkout` and `settle`
 * read. The screen must never be able to promise something the enforcement path won't grant.
 */
import styled from 'styled-components';
import { Lock, Package, TrendingDown, Unlock } from 'lucide-react';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useTrustBenefits } from '../hooks/useFinance';

const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
const mult = (m: number) => `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}×`;

export function TrustBenefits() {
  const { data, isLoading, isError } = useTrustBenefits();

  if (isLoading) return <Skeleton $h="200px" $radius={16} />;
  if (isError || !data) {
    return <ErrorState title="Couldn’t load your Trust Score" message="Please try again shortly." />;
  }

  const { score, band, nextBand, howToImprove } = data;

  return (
    <Wrap>
      <Head>
        <div>
          <BandLabel>{band.label}</BandLabel>
          <Score className="tnum">
            {score}
            <ScoreMax>/100</ScoreMax>
          </Score>
        </div>
        {nextBand ? (
          <ToNext>
            <ToNextPoints className="tnum">{nextBand.pointsAway}</ToNextPoints>
            <ToNextLabel>
              point{nextBand.pointsAway === 1 ? '' : 's'} to {nextBand.label}
            </ToNextLabel>
          </ToNext>
        ) : (
          <ToNext>
            <ToNextLabel>Top band — everything unlocked</ToNextLabel>
          </ToNext>
        )}
      </Head>

      {nextBand ? (
        <Rail
          role="progressbar"
          aria-valuemin={band.minScore}
          aria-valuemax={nextBand.minScore}
          aria-valuenow={score}
          aria-label={`Trust progress from ${band.label} to ${nextBand.label}`}
        >
          <RailFill
            style={{
              width: `${Math.min(
                100,
                Math.max(
                  0,
                  ((score - band.minScore) / Math.max(1, nextBand.minScore - band.minScore)) * 100,
                ),
              )}%`,
            }}
          />
        </Rail>
      ) : null}

      <SectionTitle>What this earns you</SectionTitle>
      <Benefits>
        <Benefit>
          <BenefitIcon aria-hidden>
            <Package size={15} />
          </BenefitIcon>
          <BenefitBody>
            <BenefitValue>{mult(band.inventoryMultiplier)} stock limit</BenefitValue>
            <BenefitNote>
              {band.inventoryMultiplier > 1
                ? 'On top of your verification level’s limit.'
                : 'Your verification level’s standard limit.'}
            </BenefitNote>
          </BenefitBody>
        </Benefit>

        <Benefit>
          <BenefitIcon aria-hidden>
            <TrendingDown size={15} />
          </BenefitIcon>
          <BenefitBody>
            <BenefitValue>
              {band.feeDiscountBps > 0 ? `${pct(band.feeDiscountBps)} off our fee` : 'Standard fee'}
            </BenefitValue>
            {/* Say plainly whose money this is. It comes out of the platform's cut, not the hub's. */}
            <BenefitNote>
              {band.feeDiscountBps > 0
                ? 'Comes off StreetServe’s cut and goes to you — the hub still gets its full share.'
                : 'Reach Trusted and we take less of every sale.'}
            </BenefitNote>
          </BenefitBody>
        </Benefit>

        <Benefit>
          <BenefitIcon aria-hidden>
            {band.premiumEligible ? <Unlock size={15} /> : <Lock size={15} />}
          </BenefitIcon>
          <BenefitBody>
            <BenefitValue>
              {band.premiumEligible ? 'Premium stock unlocked' : 'Premium stock locked'}
            </BenefitValue>
            <BenefitNote>
              {band.premiumEligible
                ? 'You can take items hubs reserve for trusted sellers.'
                : 'Some hubs reserve their best items for trusted sellers.'}
            </BenefitNote>
          </BenefitBody>
        </Benefit>
      </Benefits>

      <SectionTitle>How to raise it</SectionTitle>
      <Improve>
        {howToImprove.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </Improve>
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
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const BandLabel = styled.span`
  display: block;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.statusLive};
`;
const Score = styled.b`
  font-size: 28px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const ScoreMax = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const ToNext = styled.div`
  display: grid;
  gap: 2px;
  text-align: right;
  max-width: 45%;
`;
const ToNextPoints = styled.b`
  font-size: 18px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const ToNextLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
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
const SectionTitle = styled.h3`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: 0;
`;
const Benefits = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Benefit = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const BenefitIcon = styled.span`
  display: inline-flex;
  padding-top: 1px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const BenefitBody = styled.div`
  display: grid;
  gap: 1px;
  min-width: 0;
`;
const BenefitValue = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const BenefitNote = styled.span`
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Improve = styled.ul`
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
