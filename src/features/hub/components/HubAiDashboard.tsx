'use client';

/**
 * H-06 AI business dashboard (docs/12 §4, FR-9) — real sell-through per product, plus reallocation
 * advice when there is enough evidence to justify one.
 *
 * ## What changed, and why it mattered
 *
 * This component used to render hardcoded sample data. Its `queryFn` was:
 *
 *     isMapDemo ? Promise.resolve(demoHubForecast()) : Promise.resolve(demoHubForecast())
 *
 * Both branches identical — so demo mode on or off, every hub operator saw the same three invented
 * products and the same invented instruction to move candle cases to Graceada. The endpoints it
 * should have been calling already existed and were simply never wired.
 *
 * On most screens fake data is embarrassing. Here it is worse: a hub operator physically relocates
 * stock on the strength of this page, so an invented recommendation costs them a van journey.
 *
 * ## The rule this component now follows
 *
 * **Say nothing rather than fill space.** The backend deliberately returns an empty array from
 * `reallocationAdvice` when the evidence is thin — its own comment says recommending a move "on one
 * lucky sale elsewhere would be worse than silence". This UI honours that: no advice, no card. The
 * same goes for a hub with no sales yet, which gets an honest empty state instead of zeroes
 * arranged to look like insight.
 */
import styled from 'styled-components';
import { Sparkles, TrendingUp, ArrowRightLeft, Info as InfoIcon } from 'lucide-react';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useReallocationAdvice } from '@/features/ai/hooks/useCoach';
import { useHubAiDashboard, type HubAiProduct } from '../hooks/useHubAi';

export function HubAiDashboard({ hubId }: { hubId: string }) {
  const { data, isLoading, isError, refetch } = useHubAiDashboard(hubId);
  /**
   * Reallocation is a SEPARATE query on purpose: it is the slower of the two (it aggregates outcome
   * facts across tiles) and it is the one most likely to return nothing. Coupling them would mean a
   * quiet reallocation result delayed the product list, or an error in one blanked the other.
   */
  const { data: advice } = useReallocationAdvice(hubId);

  if (isLoading) {
    return (
      <Wrap>
        <Skeleton $h="96px" $radius={16} />
        <Skeleton $h="64px" $radius={16} />
        <Skeleton $h="64px" $radius={16} />
      </Wrap>
    );
  }

  if (isError || !data) {
    return (
      <Wrap>
        <ErrorState
          title="We couldn’t load your hub figures"
          message="This page reports real sales, so we would rather show nothing than guess."
          onRetry={() => void refetch()}
        />
      </Wrap>
    );
  }

  // Busiest first — the products an operator would act on are the ones actually moving.
  const products = [...data.products].sort((a, b) => b.sellThrough - a.sellThrough);
  const topAdvice = advice?.[0] ?? null;

  return (
    <Wrap>
      {topAdvice ? (
        <Reco>
          <Sparkles size={18} aria-hidden />
          <div>
            <RecoTitle>Reallocation suggestion</RecoTitle>
            <RecoBody>{topAdvice.advice}</RecoBody>
            {/* The numbers behind the claim, so it can be judged rather than just believed. */}
            <RecoEvidence>
              {topAdvice.category}: {Math.round(topAdvice.hereRate * 100)}% sell-through here vs{' '}
              {Math.round(topAdvice.bestRate * 100)}% in the busiest area nearby.
            </RecoEvidence>
          </div>
        </Reco>
      ) : null}

      <SectionTitle>
        Demand · last {data.windowDays} days
      </SectionTitle>

      {products.length === 0 ? (
        <EmptyState
          title="No stock to report on yet"
          description="Once sellers take products from this hub and they start selling, sell-through shows up here."
        />
      ) : (
        products.map((p) => <ProductRow key={p.productId} product={p} />)
      )}

      {/**
       * Surfaced, not hidden. These are rule-based observations over a short window; calling them
       * forecasts would claim more than the platform can support.
       */}
      {data.advisoryOnly && products.length > 0 ? (
        <Advisory>
          <InfoIcon size={13} aria-hidden />
          <span>
            Based on the last {data.windowDays} days at this hub. Guidance only — you know your
            customers better than we do.
          </span>
        </Advisory>
      ) : null}
    </Wrap>
  );
}

function ProductRow({ product }: { product: HubAiProduct }) {
  const pct = Math.round(product.sellThrough * 100);
  /**
   * The badge follows the BACKEND's suggestion rather than a threshold invented here. Two rules for
   * the same thing in two places is how the UI ends up saying "Restock" while the API says "Hold".
   */
  const restocking = product.suggestion?.startsWith('Restock') ?? false;

  return (
    <Card>
      <Info>
        <Name>{product.name}</Name>
        <Rate>
          <TrendingUp size={12} aria-hidden /> {pct}% sell-through
          {/* Stock on hand is the context that makes a percentage actionable. */}
          {product.quantityAvailable > 0 ? <Muted> · {product.quantityAvailable} left</Muted> : null}
        </Rate>
      </Info>
      {product.suggestion ? (
        restocking ? (
          <Restock>
            <ArrowRightLeft size={13} aria-hidden /> Restock
          </Restock>
        ) : (
          <Hold>Slow mover</Hold>
        )
      ) : (
        <Hold>Steady</Hold>
      )}
    </Card>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 640px;
`;
const Reco = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusDiscount} 12%, ${theme.color.surfaceRaised})`};
  border: 1px solid ${({ theme }) => `color-mix(in srgb, ${theme.color.statusDiscount} 30%, transparent)`};
  color: ${({ theme }) => theme.color.statusDiscount};
`;
const RecoTitle = styled.p`
  font-weight: 800;
  font-size: 13px;
`;
const RecoBody = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const RecoEvidence = styled.p`
  margin-top: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
const Card = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Info = styled.div``;
const Name = styled.p`
  font-weight: 600;
  font-size: 14px;
`;
const Rate = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Muted = styled.span`
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Restock = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  color: ${({ theme }) => theme.color.statusWarning};
`;
const Hold = styled.span`
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Advisory = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: ${({ theme }) => theme.space[1]}px;
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.color.textTertiary};
`;
