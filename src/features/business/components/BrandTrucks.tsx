'use client';

/**
 * ═══ FRANCHISE / MULTI-VENDOR — Phase 1 brand trucks row. ═══
 *
 * Renders inside BusinessProfileSheet when the business belongs to a brand that has more than one
 * truck. Shows each truck's name, current live status, and a muted "offline" state for trucks
 * that aren't live right now. Hidden when there is only one truck (the current business IS the
 * truck).
 *
 * The source is `/businesses/:id/trucks`, which is a lightweight read specifically shaped for
 * this component (brand + array of trucks with their live status) — see brandOperator.service's
 * `publicTrucksForBusiness`.
 */
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { Store, Radio } from 'lucide-react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

interface TrucksPayload {
  brand: { id: string; name: string; logoUrl: string | null; slug: string } | null;
  trucks: {
    operatorId: string;
    displayName: string;
    businessId: string;
    liveStatus: string | null;
  }[];
}

function statusLabel(status: string | null): string {
  if (status === 'driving') return 'Driving';
  if (status === 'parked') return 'Parked';
  if (status === 'away_closed') return 'Away';
  return 'Offline';
}

export function BrandTrucks({ businessId }: { businessId: string }) {
  const { data } = useQuery<TrucksPayload>({
    queryKey: ['business', businessId, 'trucks'],
    queryFn: () => api.get<TrucksPayload>(endpoints.businessTrucks(businessId)),
    staleTime: 30_000,
    retry: false,
  });

  /** Single-truck brand (or pre-migration row): render nothing. */
  if (!data || !data.brand || data.trucks.length < 2) return null;

  return (
    <Wrap>
      <Head>
        <Store size={14} aria-hidden />
        <span>Part of {data.brand.name}</span>
      </Head>
      <List>
        {data.trucks.map((t) => {
          const live = t.liveStatus === 'driving' || t.liveStatus === 'parked';
          return (
            <Truck key={t.operatorId} $live={live}>
              <TruckName>{t.displayName}</TruckName>
              <TruckStatus $live={live}>
                {live ? <Radio size={12} aria-hidden /> : null}
                {statusLabel(t.liveStatus)}
              </TruckStatus>
            </Truck>
          );
        })}
      </List>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const Head = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const List = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Truck = styled.li<{ $live: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme, $live }) =>
    $live ? theme.color.surfaceRaised2 : theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;

const TruckName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const TruckStatus = styled.span<{ $live: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme, $live }) => ($live ? theme.color.statusLive : theme.color.textSecondary)};
`;
