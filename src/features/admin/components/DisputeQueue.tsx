'use client';

/**
 * A-02 Dispute queue (docs/13 A-02) — the arbitration queue with per-case SLA timers (5 business
 * days, FR-10.2). Tap a case to open its detail with the evidence viewer + resolution actions.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Countdown } from '@/components/primitives/Countdown';
import { StatusChip } from '@/components/primitives/StatusChip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCents } from '@/lib/money';
import { useDisputes } from '../hooks/useAdmin';

export function DisputeQueue() {
  const router = useRouter();
  const { data: disputes, isLoading } = useDisputes();
  const open = (disputes ?? []).filter((d) => d.status !== 'resolved');

  if (isLoading) return <Wrap><Skeleton $h="96px" $radius={16} /><Skeleton $h="96px" $radius={16} /></Wrap>;
  if (open.length === 0) return <EmptyState icon="⚖️" title="No open disputes" description="Resolved cases are archived; the queue is clear." />;

  return (
    <Wrap>
      {open.map((d) => (
        <Row key={d.id} onClick={() => router.push(`/admin/disputes/${d.id}`)}>
          <Left>
            <IdLine>#{d.id} · {d.type}</IdLine>
            <Subject>{d.subject}</Subject>
            <Parties>{d.claimant} vs {d.respondent} · {formatCents(d.amountCents)}</Parties>
          </Left>
          <Right>
            <Sla><Countdown deadline={d.slaDeadline} urgentAtMs={24 * 3_600_000} /></Sla>
            <StatusChip status={d.status === 'open' ? 'popup' : 'discount'} label={d.status} size="sm" />
          </Right>
        </Row>
      ))}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 720px;
`;
const Row = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  text-align: left;
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.color.accentSecondary};
  }
`;
const Left = styled.div`
  display: grid;
  gap: 3px;
  min-width: 0;
`;
const IdLine = styled.p`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Subject = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Parties = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Right = styled.div`
  display: grid;
  justify-items: end;
  gap: 6px;
  flex: none;
`;
const Sla = styled.div`
  font-size: 18px;
`;
