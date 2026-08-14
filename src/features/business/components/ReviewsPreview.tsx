'use client';

/**
 * C-14 reviews preview — aggregate rating + a couple of cards. The full list + transaction-gated
 * composer (C-16) lands with reviews in a later milestone.
 */
import styled from 'styled-components';
import { Star } from 'lucide-react';
import { formatRelativeMinutes } from '@/lib/format';
import type { Review } from '../types';

export function ReviewsPreview({
  rating,
  count,
  reviews,
}: {
  rating?: number;
  count?: number;
  reviews: Review[];
}) {
  // Fall back to the reviews list when the profile doesn't carry aggregates.
  const total = count ?? reviews.length;
  const avg =
    rating ?? (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : undefined);
  if (!total || avg === undefined) {
    return <Empty>No reviews yet — be the first after your first visit.</Empty>;
  }
  return (
    <Wrap>
      <Summary>
        <Star size={16} fill="currentColor" />
        <b className="tnum">{avg.toFixed(1)}</b>
        <span>({total})</span>
      </Summary>
      {reviews.slice(0, 2).map((r) => (
        <Card key={r.id}>
          <CardHead>
            <b>{r.author}</b>
            <Stars role="img" aria-label={`${r.rating} of 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={12} fill={i < r.rating ? 'currentColor' : 'none'} />
              ))}
            </Stars>
          </CardHead>
          <Body>{r.body}</Body>
          <When>{formatRelativeMinutes(r.createdAt)}</When>
        </Card>
      ))}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Summary = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  /* Same-hue mix toward text color for WCAG AA on the rating number. */
  color: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusWarning} 55%, ${theme.color.textPrimary})`};
  b {
    font-size: 16px;
  }
  span {
    color: ${({ theme }) => theme.color.textSecondary};
    font-size: 13px;
  }
`;
const Card = styled.div`
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  display: grid;
  gap: 4px;
`;
const CardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
`;
const Stars = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.color.statusWarning};
`;
const Body = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const When = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Empty = styled.p`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
`;
