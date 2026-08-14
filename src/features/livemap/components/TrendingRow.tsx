'use client';

/**
 * Trending row (R1b) — the customer-facing half of the discount incentive. A horizontal rail of
 * live vendors ranked server-side; the discount is the largest ranking weight AND the loudest thing
 * on each card, so a vendor who discounts is visibly rewarded and a customer can see why.
 *
 * Renders nothing when there's nothing trending — never an empty shell above the list.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { TrendingUp, Users } from 'lucide-react';
import { Avatar } from '@/components/primitives/Avatar';
import { Skeleton } from '@/components/feedback/Skeleton';
import type { LngLat } from '@/types';
import { useTrending } from '../hooks/useTrending';

export function TrendingRow({ center }: { center: LngLat }) {
  const router = useRouter();
  const { data, isLoading } = useTrending(center);

  if (isLoading) {
    return (
      <Section aria-busy="true">
        <Head>
          <TrendingUp size={15} aria-hidden /> Trending now
        </Head>
        <Skeleton $h="104px" $radius={16} />
      </Section>
    );
  }
  if (!data || data.length === 0) return null;

  return (
    <Section aria-labelledby="trending-heading">
      <Head id="trending-heading">
        <TrendingUp size={15} aria-hidden /> Trending now
      </Head>
      <Rail>
        {data.map((t) => (
          <Card
            key={t.sessionId}
            onClick={() => router.push(`/business/${t.businessId}`)}
            aria-label={`${t.name}. ${t.reasonSummary}`}
            title={t.reasonSummary}
          >
            <Avatar name={t.name} src={t.logoUrl ?? undefined} size={36} />
            <CardName>{t.name}</CardName>
            {t.discountPercent > 0 ? <Discount>Up to {t.discountPercent}% off</Discount> : null}
            <CardMeta>
              {t.queueCount > 0 ? (
                <>
                  <Users size={12} aria-hidden /> {t.queueCount} in line
                </>
              ) : (
                <Status $driving={t.status === 'driving'}>
                  {t.status === 'driving' ? 'Driving' : 'Parked'}
                </Status>
              )}
            </CardMeta>
          </Card>
        ))}
      </Rail>
    </Section>
  );
}

const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Head = styled.h2`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  svg {
    color: ${({ theme }) => theme.color.statusDiscount};
  }
`;
const Rail = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
  overflow-x: auto;
  padding-bottom: 4px;
  scroll-snap-type: x mandatory;
  /* The rail scrolls, the page never does horizontally. */
  > * {
    scroll-snap-align: start;
  }
`;
const Card = styled.button`
  display: grid;
  justify-items: start;
  gap: 4px;
  flex: none;
  width: 148px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  cursor: pointer;
  text-align: left;
  &:hover {
    border-color: ${({ theme }) => theme.color.accentSecondary};
  }
`;
const CardName = styled.span`
  font-weight: 700;
  font-size: 14px;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Discount = styled.span`
  font-size: 11px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  color: ${({ theme }) =>
    `color-mix(in srgb, ${theme.color.statusDiscount} 55%, ${theme.color.textPrimary})`};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusDiscount} 16%, transparent)`};
`;
const CardMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Status = styled.span<{ $driving: boolean }>`
  font-weight: 700;
  color: ${({ theme, $driving }) => ($driving ? theme.color.statusDriving : theme.color.statusParked)};
`;
