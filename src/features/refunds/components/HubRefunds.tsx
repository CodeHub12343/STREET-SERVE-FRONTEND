'use client';

/**
 * H-06 Refunds (Phase 4). Every refund touching this hub's stock, showing which party absorbed
 * what — the hub needs to see that its share came back, and when it couldn't.
 */
import styled from 'styled-components';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCents } from '@/lib/money';
import { useHubRefunds } from '../hooks/useRefunds';

const REASON_LABEL: Record<string, string> = {
  customer_request: 'Customer request',
  defective: 'Defective',
  not_received: 'Not received',
  seller_error: 'Seller error',
  dispute_resolution: 'Dispute',
  chargeback: 'Chargeback',
};

export function HubRefunds({ hubId }: { hubId: string }) {
  const { data: refunds, isLoading } = useHubRefunds(hubId);

  if (isLoading) return <Wrap><Skeleton $h="160px" $radius={16} /></Wrap>;
  if (!refunds || refunds.length === 0) {
    return (
      <EmptyState
        icon="↩️"
        title="No refunds"
        description="Refunds on your stock appear here, showing exactly what came back from each party."
      />
    );
  }

  return (
    <Wrap>
      <Table>
        <thead>
          <tr>
            <Th>Date</Th><Th>Reason</Th><Th>Refunded</Th><Th>From your share</Th><Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {refunds.map((r) => (
            <tr key={r.id}>
              <Td>{new Date(r.createdAt).toLocaleDateString()}</Td>
              <Td>{REASON_LABEL[r.reason] ?? r.reason}</Td>
              <Td className="tnum">{formatCents(r.amountCents)}</Td>
              <Td className="tnum">−{formatCents(r.reversedHubCents)}</Td>
              <Td>
                {r.clawbackDebtId ? (
                  // The seller had already spent their share; the platform fronted it and is
                  // recovering it from their future sales.
                  <Pending title="Recovering the seller's share from future sales">
                    Recovering
                  </Pending>
                ) : (
                  <Done>Settled</Done>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Wrap>
  );
}

const Wrap = styled.div`
  max-width: 900px;
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
`;
const Pending = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.color.statusWarning};
`;
const Done = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.color.statusLive};
`;
