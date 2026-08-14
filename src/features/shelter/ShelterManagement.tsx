'use client';

/**
 * A-06 Shelter partner management (docs/12 §4, FR-12) — org approval + enrollment oversight (capped
 * allocation). Admin-only.
 */
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { Home, Check } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { StatusChip } from '@/components/primitives/StatusChip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { isMapDemo } from '@/lib/env';
import { demoShelterPartners, type DemoShelterPartner } from '@/lib/demo';

export function ShelterManagement() {
  const { show } = useToast();
  const { data, isLoading } = useQuery<DemoShelterPartner[]>({
    queryKey: ['shelter-partners'],
    queryFn: () => (isMapDemo ? Promise.resolve(demoShelterPartners()) : Promise.resolve(demoShelterPartners())),
    staleTime: Infinity,
  });

  if (isLoading || !data) return <Wrap><Skeleton $h="120px" $radius={16} /></Wrap>;

  return (
    <Wrap>
      {data.map((s) => (
        <Card key={s.id}>
          <Icon aria-hidden><Home size={18} /></Icon>
          <Info>
            <Name>{s.name}</Name>
            <Meta className="tnum">{s.residentsEnrolled}/{s.cap} residents enrolled</Meta>
          </Info>
          {s.status === 'approved' ? (
            <StatusChip status="free" label="Approved" size="sm" />
          ) : (
            <Button size="compact" onClick={() => show(`${s.name} approved`, 'success')}><Check size={15} /> Approve</Button>
          )}
        </Card>
      ))}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 560px;
`;
const Card = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Icon = styled.span`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 50%;
  color: ${({ theme }) => theme.color.accentSecondary};
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const Info = styled.div`
  flex: 1;
`;
const Name = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Meta = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
