'use client';

/**
 * 7.6 — a running flash sale, told to the customer.
 *
 * The discount always reached the price at checkout (orders.service resolves flash-sale candidates
 * through the A-7 contest), but no customer surface ever mentioned one was on. The buyer discovered
 * it by noticing the total was lower than expected — which is the wrong half of a marketing
 * instrument to ship. A sale nobody can see pulls nobody in; it just reduces what the customers you
 * would have had anyway pay you.
 *
 * Renders nothing when no sale is live, so it costs a business without one nothing.
 */
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { Tag } from 'lucide-react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isMapDemo } from '@/lib/env';

interface LiveFlashSale {
  id: string;
  percent: number;
  label?: string | null;
  menuItemId?: string | null;
  endsAt: string;
}

export function FlashSaleBanner({ businessId }: { businessId: string }) {
  const { data } = useQuery<LiveFlashSale[]>({
    queryKey: ['business', businessId, 'flash-sales'],
    enabled: Boolean(businessId) && !isMapDemo,
    queryFn: () => api.get<LiveFlashSale[]>(endpoints.flashSales(businessId)),
    staleTime: 60_000,
  });

  const sales = data ?? [];
  if (sales.length === 0) return null;

  /**
   * The best one, not a list. Discounts never stack (A-7), so showing two would imply a total that
   * nobody will be charged — and the customer would be right to feel misled at checkout.
   */
  const best = sales.reduce((a, b) => (b.percent > a.percent ? b : a));
  const wholeMenu = !best.menuItemId;

  return (
    <Banner>
      <Tag size={16} aria-hidden />
      <div>
        <Headline>
          {best.percent}% off{best.label ? ` · ${best.label}` : ''}
        </Headline>
        {/*
          Say what it covers. An item-scoped sale advertised as a flat "20% off" sends someone
          across town for a discount their order will not get.
        */}
        <Sub>{wholeMenu ? 'On everything, right now' : 'On a selected item, right now'}</Sub>
      </div>
    </Banner>
  );
}

const Banner = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.accentPrimary};
  color: #fff;
  min-width: 0;

  svg {
    flex: none;
  }
`;
const Headline = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 800;
`;
const Sub = styled.p`
  margin: 1px 0 0;
  font-size: 12px;
  opacity: 0.9;
`;
