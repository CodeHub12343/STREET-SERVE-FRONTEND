'use client';

/**
 * S-15 Tax statement (Phase 5). A seller's annual summary, in the language of the form they'll
 * actually file — and explicit that sales tax was the platform's obligation, not theirs, because
 * that is the single most confusing line for a first-time filer.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { TabPage } from '@/components/layout/TabPage';
import { Select } from '@/components/primitives/Select';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Banner } from '@/components/feedback/Banner';
import { formatCents } from '@/lib/money';
import { useSellerTaxStatement } from '../hooks/useTax';

const CURRENT = new Date().getUTCFullYear();
const YEARS = [CURRENT, CURRENT - 1, CURRENT - 2].map((y) => ({
  value: String(y),
  label: String(y),
}));

export function TaxStatement() {
  const [year, setYear] = useState(CURRENT);
  const { data, isLoading, isError } = useSellerTaxStatement(year);

  return (
    <TabPage title="Tax statement" backHref="/seller/earnings" backLabel="Back to earnings">
      <Filters>
        <Select
          aria-label="Tax year"
          options={YEARS}
          value={String(year)}
          onChange={(e) => setYear(Number(e.target.value))}
        />
      </Filters>

      {isLoading ? (
        <Skeleton $h="240px" $radius={16} />
      ) : isError || !data ? (
        <ErrorState title="Couldn’t load your statement" message="Please try again in a moment." />
      ) : (
        <>
          <Card>
            <Row><span>Gross sales</span><b className="tnum">{formatCents(data.grossSalesCents)}</b></Row>
            <Row><span>Platform fees</span><span className="tnum">−{formatCents(data.platformFeesCents)}</span></Row>
            {data.refundsCents > 0 ? (
              <Row><span>Refunds</span><span className="tnum">−{formatCents(data.refundsCents)}</span></Row>
            ) : null}
            {data.inventoryLiabilitiesCents > 0 ? (
              <Row><span>Lost / damaged stock</span><span className="tnum">−{formatCents(data.inventoryLiabilitiesCents)}</span></Row>
            ) : null}
            <Total><span>Net earnings</span><b className="tnum">{formatCents(data.netEarningsCents)}</b></Total>
          </Card>

          {data.salesTaxCollectedByPlatformCents > 0 ? (
            <Banner tone="info" title="Sales tax was handled for you">
              {formatCents(data.salesTaxCollectedByPlatformCents)} of sales tax was collected from
              customers and paid to the state by StreetServe as marketplace facilitator. It is not
              your income and you don’t owe it — it’s shown here so your books reconcile.
            </Banner>
          ) : null}

          <Note>{data.note}</Note>
          <Meta>
            {data.settlementCount} settlement{data.settlementCount === 1 ? '' : 's'} · generated{' '}
            {new Date(data.generatedAt).toLocaleDateString()}
          </Meta>
        </>
      )}
    </TabPage>
  );
}

const Filters = styled.div`
  margin-bottom: ${({ theme }) => theme.space[4]}px;
  max-width: 160px;
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Row = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Total = styled(Row)`
  padding-top: ${({ theme }) => theme.space[3]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  font-size: 16px;
  b {
    font-size: 22px;
    color: ${({ theme }) => theme.color.statusLive};
  }
`;
const Note = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  margin-top: ${({ theme }) => theme.space[3]}px;
`;
const Meta = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
