'use client';

/**
 * C-17 Block Party cluster view (docs/12 §2, FR-4.2) — a multi-vendor cluster surfaced from a
 * Block Party alert (≥2 vendors in a radius+time window). Lists the vendors at the event.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { PartyPopper } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Avatar } from '@/components/primitives/Avatar';
import { StatusChip, type StatusVariant } from '@/components/primitives/StatusChip';
import { DEMO_BUSINESSES } from '@/lib/demo';

export function BlockParty() {
  const router = useRouter();
  const vendors = DEMO_BUSINESSES.filter((b) => b.status !== 'away').slice(0, 4);

  return (
    <TabPage title="Block Party" backHref="/map" backLabel="Back to the map">
      <Hero>
        <PartyPopper size={28} aria-hidden />
        <div>
          <h2>Graceada Park Block Party</h2>
          <p>{vendors.length} vendors gathered nearby — grab something while they’re all out.</p>
        </div>
      </Hero>
      <List>
        {vendors.map((v) => (
          <Row key={v.id} onClick={() => router.push(`/business/${v.id}`)}>
            <Avatar name={v.name} src={v.logoUrl} size={44} />
            <Info>
              <Name>{v.name}</Name>
              <Cat>{v.category}</Cat>
            </Info>
            <StatusChip status={v.status as StatusVariant} size="sm" />
          </Row>
        ))}
      </List>
    </TabPage>
  );
}

const Hero = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.accentPrimary} 12%, transparent)`};
  color: ${({ theme }) => theme.color.accentPrimary};
  margin-bottom: ${({ theme }) => theme.space[4]}px;
  h2 {
    font-size: 18px;
    color: ${({ theme }) => theme.color.textPrimary};
  }
  p {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  text-align: left;
  cursor: pointer;
`;
const Info = styled.div`
  flex: 1;
`;
const Name = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Cat = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
  text-transform: capitalize;
`;
