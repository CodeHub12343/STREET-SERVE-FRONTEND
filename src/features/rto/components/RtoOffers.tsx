'use client';

/**
 * Browse rent-to-own offers (roadmap 2.7/2.8).
 *
 * Each card leads with the instalment — that is the number people shop on — and puts the total cost
 * to own directly beneath it, at readable size. §47 requires the customer to understand RTO may
 * cost more than buying outright, and a browse list that shows only "$25/week" defers that
 * understanding to a screen they may never reach.
 */
import Link from 'next/link';
import styled from 'styled-components';
import { PackageOpen } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { formatCents } from '@/lib/money';
import { useRtoListings } from '../hooks/useRto';

const FREQUENCY_SHORT: Record<string, string> = {
  daily: '/day',
  weekly: '/wk',
  biweekly: '/2wks',
  twice_monthly: '/half-month',
  monthly: '/mo',
  custom: ' per payment',
};

export function RtoOffers({ citySlug }: { citySlug?: string }) {
  const { data, isLoading, isError, refetch } = useRtoListings(citySlug ? { citySlug } : {});

  return (
    <TabPage title="Rent to own" backHref="/map" backLabel="Back to the map">
      <Intro>
        Pay in instalments and own it at the end. Every offer shows the full cost before you agree
        to anything.
      </Intro>

      {isLoading ? (
        <List>
          <Skeleton $h="104px" $radius={16} />
          <Skeleton $h="104px" $radius={16} />
        </List>
      ) : isError ? (
        <ErrorState title="Couldn’t load offers" onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={<PackageOpen size={28} aria-hidden />}
          title="No offers near you yet"
          description="Rent-to-own opens area by area. Check back soon."
        />
      ) : (
        <List>
          {(data ?? []).map((l) => (
            <Card key={l.id} href={`/rto/offers/${l.id}`}>
              <Name>{l.productName}</Name>
              <Row>
                <Instalment className="tnum">
                  {formatCents(Math.round(l.cashPriceCents / Math.max(1, l.installmentCount)))}
                  <Per>{FREQUENCY_SHORT[l.frequency] ?? ''}</Per>
                </Instalment>
                {/* The total is never smaller than the instalment. §47 in the layout. */}
                <Total className="tnum">
                  {formatCents(
                    l.cashPriceCents + Math.floor((l.cashPriceCents * l.markupBps) / 10000),
                  )}{' '}
                  total
                </Total>
              </Row>
              <Cash className="tnum">{formatCents(l.cashPriceCents)} if you buy it outright</Cash>
            </Card>
          ))}
        </List>
      )}
    </TabPage>
  );
}

const Intro = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Card = styled(Link)`
  display: grid;
  gap: 4px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  text-decoration: none;
  color: inherit;
  &:hover {
    border-color: ${({ theme }) => theme.color.accentSecondary};
  }
`;
const Name = styled.h2`
  font-size: 15px;
  font-weight: 800;
`;
const Row = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  flex-wrap: wrap;
`;
const Instalment = styled.span`
  font-size: 20px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Per = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Total = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.statusWarning};
`;
const Cash = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
