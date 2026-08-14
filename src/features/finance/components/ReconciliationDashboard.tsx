'use client';

/**
 * Reconciliation dashboard (Phase 1). The operational early-warning system for the ledger:
 * does every account still equal the sum of its entries, and does every transaction still net to
 * zero? Anything non-zero here is a financial bug, and the guidance is deliberately blunt —
 * feature work should stop until it's green.
 */
import styled from 'styled-components';
import { ShieldCheck, TriangleAlert, RefreshCw } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Banner } from '@/components/feedback/Banner';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { useReconciliation } from '../hooks/useFinance';

export function ReconciliationDashboard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useReconciliation();

  if (isLoading) {
    return (
      <TabPage title="Reconciliation">
        <Skeleton $h="140px" $radius={16} />
      </TabPage>
    );
  }
  if (isError || !data) {
    /**
     * "Try again in a moment" was shown for every failure, including a flat refusal. Being told to
     * retry something that can never succeed sends you round the same loop indefinitely — and it
     * hid a real permissions gap on this page for as long as it existed.
     */
    const denied = error instanceof AppApiError && error.status === 403;
    return (
      <TabPage title="Reconciliation">
        <ErrorState
          title={denied ? 'You don’t have access to reconciliation' : 'Couldn’t run reconciliation'}
          message={
            denied
              ? 'This report is limited to finance ops and admins. Ask an admin to grant your account the role — retrying won’t change it.'
              : 'Try again in a moment.'
          }
        />
      </TabPage>
    );
  }

  return (
    <TabPage title="Reconciliation">
      <Head>
        <Status $healthy={data.healthy}>
          {data.healthy ? <ShieldCheck size={22} aria-hidden /> : <TriangleAlert size={22} aria-hidden />}
          <div>
            <StatusTitle>{data.healthy ? 'Books balance' : 'Integrity failure'}</StatusTitle>
            <StatusHint>
              {data.accountsChecked} account{data.accountsChecked === 1 ? '' : 's'} checked
            </StatusHint>
          </div>
        </Status>
        <Button size="compact" variant="secondary" loading={isFetching} onClick={() => void refetch()}>
          <RefreshCw size={15} /> Re-run
        </Button>
      </Head>

      {!data.healthy ? (
        <Banner tone="danger" title="Stop feature work and investigate">
          The ledger disagrees with its own entries. Until this is green, no financial figure in the
          product can be trusted — including payouts, fees, and what the platform believes it owes.
        </Banner>
      ) : null}

      <Cards>
        <Card $bad={data.drifted.length > 0}>
          <CardLabel>Drifted balances</CardLabel>
          <CardValue className="tnum">{data.drifted.length}</CardValue>
          <CardHint>Cached balance ≠ sum of entries</CardHint>
        </Card>
        <Card $bad={data.unbalancedTransactions.length > 0}>
          <CardLabel>Unbalanced transactions</CardLabel>
          <CardValue className="tnum">{data.unbalancedTransactions.length}</CardValue>
          <CardHint>Entry sets that don’t net to zero</CardHint>
        </Card>
        <Card>
          <CardLabel>Repaired</CardLabel>
          <CardValue className="tnum">{data.repaired}</CardValue>
          <CardHint>Caches rebuilt from entries</CardHint>
        </Card>
      </Cards>

      {data.drifted.length > 0 ? (
        <>
          <SectionTitle>Drifted accounts</SectionTitle>
          <Table>
            <thead>
              <tr><Th>Account</Th><Th>Cached</Th><Th>Computed</Th><Th>Difference</Th></tr>
            </thead>
            <tbody>
              {data.drifted.map((d) => (
                <tr key={d.accountId}>
                  <Td><Mono>{d.accountId}</Mono></Td>
                  <Td className="tnum">{formatCents(d.cached)}</Td>
                  <Td className="tnum">{formatCents(d.computed)}</Td>
                  <Td className="tnum"><Bad>{formatCents(d.deltaCents)}</Bad></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      ) : null}

      {data.unbalancedTransactions.length > 0 ? (
        <>
          <SectionTitle>Unbalanced transactions</SectionTitle>
          <List>
            {data.unbalancedTransactions.map((t) => (
              <Mono key={t}>{t}</Mono>
            ))}
          </List>
        </>
      ) : null}
    </TabPage>
  );
}

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Status = styled.div<{ $healthy: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  color: ${({ $healthy, theme }) => ($healthy ? theme.color.statusLive : theme.color.statusDanger)};
`;
const StatusTitle = styled.p`
  font-size: 18px;
  font-weight: 800;
`;
const StatusHint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;
const Card = styled.div<{ $bad?: boolean }>`
  display: grid;
  gap: 2px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ $bad, theme }) => ($bad ? theme.color.statusDanger : theme.color.line)};
`;
const CardLabel = styled.p`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const CardValue = styled.p`
  font-size: 28px;
  font-weight: 800;
`;
const CardHint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: ${({ theme }) => theme.space[4]}px 0 ${({ theme }) => theme.space[2]}px;
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
`;
const Mono = styled.code`
  font-family: monospace;
  font-size: 12px;
`;
const Bad = styled.span`
  color: ${({ theme }) => theme.color.statusDanger};
  font-weight: 700;
`;
const List = styled.div`
  display: grid;
  gap: 4px;
`;
