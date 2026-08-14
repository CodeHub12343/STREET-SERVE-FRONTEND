'use client';

/**
 * C-31 Favorites (docs/13 C-31) — followed businesses with at-a-glance live status chips. In demo
 * mode the followed set is drawn from the sample businesses.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { TabPage } from '@/components/layout/TabPage';
import { Avatar } from '@/components/primitives/Avatar';
import { StatusChip, type StatusVariant } from '@/components/primitives/StatusChip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/primitives/Button';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { DEMO_BUSINESSES } from '@/lib/demo';

interface Favorite {
  id: string;
  name: string;
  logoUrl?: string;
  status: 'driving' | 'parked' | 'away';
  locationLine: string;
}

export function FavoritesList() {
  const router = useRouter();
  const { data: favorites, isLoading } = useQuery<Favorite[]>({
    queryKey: keys.favorites,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(DEMO_BUSINESSES.slice(0, 3).map((b) => ({ id: b.id, name: b.name, logoUrl: b.logoUrl, status: b.status, locationLine: b.locationLine })))
        : api.get<Favorite[]>(endpoints.favorites),
    staleTime: isMapDemo ? Infinity : 15_000,
  });

  return (
    <TabPage title="Favorites">
      {isLoading ? (
        <List><Skeleton $h="72px" $radius={16} /><Skeleton $h="72px" $radius={16} /></List>
      ) : !favorites || favorites.length === 0 ? (
        <EmptyState icon="⭐" title="No favorites yet" description="Follow a business to see it here with live status." action={<Button size="compact" onClick={() => router.push('/map')}>Explore the map</Button>} />
      ) : (
        <List>
          {favorites.map((f) => (
            <Row key={f.id} onClick={() => router.push(`/business/${f.id}`)}>
              <Avatar name={f.name} src={f.logoUrl} size={48} />
              <Info>
                <Name>{f.name}</Name>
                <Loc>{f.locationLine}</Loc>
              </Info>
              <StatusChip status={f.status as StatusVariant} size="sm" />
            </Row>
          ))}
        </List>
      )}
    </TabPage>
  );
}

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  text-align: left;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.color.accentSecondary};
  }
`;
const Info = styled.div`
  flex: 1;
  min-width: 0;
`;
const Name = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Loc = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
