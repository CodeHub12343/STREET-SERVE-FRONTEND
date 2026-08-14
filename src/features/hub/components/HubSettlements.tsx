'use client';

/**
 * H-05 Settlements (docs/13 H-05) — per-checkout reconciliation: gross, the hub's share, and when
 * it settled. Server-computed from the immutable settlements ledger; this reconciles what sold
 * against what's owed.
 *
 * Responsive: a 6-column table can't fit a phone, so below `sm` each settlement renders as a
 * stacked card; the table appears from the `sm` breakpoint up. Same data, two presentations.
 */
import styled from 'styled-components';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCents } from '@/lib/money';
import { useHubSettlements } from '../hooks/useHub';

export function HubSettlements({ hubId }: { hubId: string }) {
  const { data: rows, isLoading } = useHubSettlements(hubId);

  if (isLoading) return <Wrap><Skeleton $h="160px" $radius={16} /></Wrap>;
  if (!rows || rows.length === 0) {
    return <EmptyState icon="🧾" title="No settlements yet" description="Reconciliations appear here as sellers sell and return." />;
  }

  const status = (r: (typeof rows)[number]) =>
    r.hubPayoutStatus === 'paid' ? (
      <>Paid · {new Date(r.settledAt).toLocaleDateString()}</>
    ) : (
      // A cash sale never reached the platform, so this share is owed by the seller
      // directly — the hub must know that rather than expect a transfer.
      <Owed title="Paid in cash — collect from the seller">Owed by seller</Owed>
    );

  return (
    <Wrap>
      {/* Phone: stacked cards */}
      <Cards>
        {rows.map((r) => (
          <Card key={r.checkoutId}>
            <CardTop>
              <b>{r.sellerName}</b>
              <span className="tnum">{r.soldQty}/{r.quantity} sold</span>
            </CardTop>
            <CardProduct>{r.productName}</CardProduct>
            <CardMoney>
              <div>
                <label>Gross</label>
                <span className="tnum">{formatCents(r.grossCents)}</span>
              </div>
              <div>
                <label>Hub share</label>
                <span className="tnum">{formatCents(r.hubShareCents)}</span>
              </div>
            </CardMoney>
            <CardStatus>{status(r)}</CardStatus>
          </Card>
        ))}
      </Cards>

      {/* Tablet & up: the reconciliation table */}
      <TableScroll>
        <Table>
          <thead>
            <tr><Th>Seller</Th><Th>Product</Th><Th>Sold</Th><Th>Gross</Th><Th>Hub share</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.checkoutId}>
                <Td><b>{r.sellerName}</b></Td>
                <Td>{r.productName}</Td>
                <Td className="tnum">{r.soldQty}/{r.quantity}</Td>
                <Td className="tnum">{formatCents(r.grossCents)}</Td>
                <Td className="tnum">{formatCents(r.hubShareCents)}</Td>
                <Td>{status(r)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>
    </Wrap>
  );
}

const Wrap = styled.div`
  max-width: 800px;
  min-width: 0;
`;
const Cards = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  ${({ theme }) => theme.media.sm} {
    display: none;
  }
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const CardTop = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]}px;
  b {
    font-size: 15px;
    font-weight: 700;
    color: ${({ theme }) => theme.color.textPrimary};
  }
  span {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textTertiary};
  }
`;
const CardProduct = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const CardMoney = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[2]}px;
  div {
    display: grid;
    gap: 2px;
  }
  label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.color.textTertiary};
  }
  span {
    font-size: 15px;
    font-weight: 700;
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const CardStatus = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const TableScroll = styled.div`
  display: none;
  ${({ theme }) => theme.media.sm} {
    display: block;
    /* Wide content scrolls inside its own container — the page never scrolls sideways. */
    overflow-x: auto;
  }
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card}px;
  overflow: hidden;
`;
const Owed = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.color.statusWarning};
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
