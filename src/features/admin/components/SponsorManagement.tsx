'use client';

/**
 * A-07 Sponsor management (docs/13 A-07) — record-keeping for the pilot (per Q9 default): sponsor
 * records + manual attribution. The full attribution dashboard is deferred.
 */
import styled from 'styled-components';
import { Skeleton } from '@/components/feedback/Skeleton';
import { formatCents } from '@/lib/money';
import { useSponsors } from '../hooks/useAdmin';

export function SponsorManagement() {
  const { data: sponsors, isLoading } = useSponsors();
  if (isLoading || !sponsors) return <Wrap><Skeleton $h="120px" $radius={16} /></Wrap>;

  return (
    <Wrap>
      <Table>
        <thead>
          <tr><Th>Sponsor</Th><Th>Tier</Th><Th>Spend</Th><Th>Impressions</Th></tr>
        </thead>
        <tbody>
          {sponsors.map((s) => (
            <tr key={s.id}>
              <Td><b>{s.name}</b></Td>
              <Td>{s.tier}</Td>
              <Td className="tnum">{formatCents(s.spendCents)}</Td>
              <Td className="tnum">{s.impressions.toLocaleString()}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Wrap>
  );
}

const Wrap = styled.div`
  max-width: 720px;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card}px;
  overflow: hidden;
`;
const Th = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;
const Td = styled.td`
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  font-size: 14px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    color: ${({ theme }) => theme.color.textPrimary};
    font-weight: 600;
  }
`;
