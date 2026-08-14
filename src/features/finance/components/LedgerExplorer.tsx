'use client';

/**
 * Ledger explorer (Phase 1). Accounts on the left, their entries on the right — the finance team's
 * window into the books. Read-only by design: the ledger is written only by services posting
 * balanced entry sets.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { TabPage } from '@/components/layout/TabPage';
import { Select } from '@/components/primitives/Select';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCents } from '@/lib/money';
import { useLedgerAccounts, useLedgerEntries } from '../hooks/useFinance';
import type { LedgerAccount } from '../types';

const OWNER_TYPES = [
  { value: '', label: 'All owners' },
  { value: 'platform', label: 'Platform' },
  { value: 'user', label: 'Users' },
  { value: 'business', label: 'Businesses' },
];

const ACCOUNT_TYPES = [
  { value: '', label: 'All accounts' },
  { value: 'cash', label: 'Cash' },
  { value: 'payable', label: 'Payable (we owe)' },
  { value: 'receivable', label: 'Receivable (owed to us)' },
  { value: 'fee_revenue', label: 'Fee revenue' },
  { value: 'reserve', label: 'Reserve' },
  { value: 'write_off', label: 'Write-off' },
];

const label = (a: LedgerAccount) =>
  `${a.accountType.replace('_', ' ')} · ${a.ownerType}${a.ownerId ? ` ${a.ownerId.slice(-6)}` : ''}`;

export function LedgerExplorer() {
  const [ownerType, setOwnerType] = useState('');
  const [accountType, setAccountType] = useState('');
  const [selected, setSelected] = useState<string>();

  const { data: accounts, isLoading } = useLedgerAccounts({
    ownerType: ownerType || undefined,
    accountType: accountType || undefined,
  });
  const { data: entries, isLoading: entriesLoading } = useLedgerEntries({ accountId: selected });

  return (
    <TabPage title="Ledger">
      <Filters>
        <Select aria-label="Owner type" options={OWNER_TYPES} value={ownerType} onChange={(e) => setOwnerType(e.target.value)} />
        <Select aria-label="Account type" options={ACCOUNT_TYPES} value={accountType} onChange={(e) => setAccountType(e.target.value)} />
      </Filters>

      {isLoading ? (
        <Skeleton $h="200px" $radius={16} />
      ) : !accounts || accounts.length === 0 ? (
        <EmptyState icon="📒" title="No ledger accounts" description="Accounts open automatically as money moves." />
      ) : (
        <Split>
          <Accounts>
            {accounts.map((a) => (
              <AccountRow
                key={a.id}
                type="button"
                $active={a.id === selected}
                onClick={() => setSelected(a.id === selected ? undefined : a.id)}
              >
                <AccountName>{label(a)}</AccountName>
                <AccountBalance className="tnum">{formatCents(a.balanceCents)}</AccountBalance>
              </AccountRow>
            ))}
          </Accounts>

          <Entries>
            {!selected ? (
              <Hint>Select an account to see its entries.</Hint>
            ) : entriesLoading ? (
              <Skeleton $h="160px" $radius={12} />
            ) : !entries || entries.items.length === 0 ? (
              <Hint>No entries on this account yet.</Hint>
            ) : (
              <Table>
                <thead>
                  <tr><Th>Date</Th><Th>Type</Th><Th>Dr</Th><Th>Cr</Th></tr>
                </thead>
                <tbody>
                  {entries.items.map((e) => (
                    <tr key={e.id}>
                      <Td>{new Date(e.createdAt).toLocaleDateString()}</Td>
                      <Td>
                        {e.entryType.replace(/_/g, ' ')}
                        {e.memo ? <Memo>{e.memo}</Memo> : null}
                      </Td>
                      <Td className="tnum">{e.direction === 'debit' ? formatCents(e.amountCents) : '—'}</Td>
                      <Td className="tnum">{e.direction === 'credit' ? formatCents(e.amountCents) : '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Entries>
        </Split>
      )}
    </TabPage>
  );
}

const Filters = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Split = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 2fr;
  gap: ${({ theme }) => theme.space[4]}px;
  align-items: start;
  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;
const Accounts = styled.div`
  display: grid;
  gap: 2px;
`;
const AccountRow = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  padding: ${({ theme }) => theme.space[3]}px;
  text-align: left;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ $active, theme }) => ($active ? theme.color.surfaceRaised2 : theme.color.surfaceRaised)};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.color.accentSecondary : theme.color.line)};
`;
const AccountName = styled.span`
  font-size: 13px;
  text-transform: capitalize;
`;
const AccountBalance = styled.span`
  font-size: 13px;
  font-weight: 700;
  flex: none;
`;
const Entries = styled.div`
  min-width: 0;
`;
const Hint = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  padding: ${({ theme }) => theme.space[4]}px;
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
  padding: ${({ theme }) => theme.space[3]}px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`;
const Td = styled.td`
  padding: ${({ theme }) => theme.space[3]}px;
  font-size: 13px;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  text-transform: capitalize;
`;
const Memo = styled.small`
  display: block;
  color: ${({ theme }) => theme.color.textTertiary};
  font-size: 11px;
  text-transform: none;
`;
