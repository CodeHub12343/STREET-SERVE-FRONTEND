'use client';

/**
 * The customer's rent-to-own agreements (roadmap 2.10). `GET /rto/agreements/mine` and
 * `RtoDashboard` both existed; nothing listed them, so an agreement was only reachable by keeping
 * the URL from the moment it was created.
 *
 * Each row leads with ownership progress rather than "payments made", because the question someone
 * in an RTO agreement actually has is "how much of this is mine yet?"
 */
import Link from 'next/link';
import styled from 'styled-components';
import { FileSignature } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { formatCents } from '@/lib/money';
import { useRtoAgreements } from '../hooks/useRto';
import type { RtoStatus } from '../types';

const STATUS_COPY: Record<RtoStatus, { label: string; tone: 'ok' | 'warn' | 'bad' | 'done' }> = {
  active: { label: 'On track', tone: 'ok' },
  grace: { label: 'Payment due', tone: 'warn' },
  late: { label: 'Payment late', tone: 'bad' },
  arrangement: { label: 'Arrangement agreed', tone: 'warn' },
  paused: { label: 'Paused', tone: 'warn' },
  return_pending: { label: 'Return pending', tone: 'warn' },
  completed: { label: 'Owned', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
  disputed: { label: 'In dispute', tone: 'bad' },
};

export function RtoAgreementsList() {
  const { data, isLoading, isError, refetch } = useRtoAgreements();

  return (
    <TabPage title="Rent to own" backHref="/profile" backLabel="Back to profile">
      {isLoading ? (
        <List>
          <Skeleton $h="96px" $radius={16} />
          <Skeleton $h="96px" $radius={16} />
        </List>
      ) : isError ? (
        <ErrorState title="Couldn’t load your agreements" onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={<FileSignature size={28} aria-hidden />}
          title="No rent-to-own agreements"
          description="When you take something on rent-to-own, it shows up here with what you still owe."
          action={<Link href="/rto">Browse offers</Link>}
        />
      ) : (
        <List>
          {(data ?? []).map((a) => {
            const status = STATUS_COPY[a.status] ?? STATUS_COPY.active;
            const pct = a.cashPriceCents > 0
              ? Math.min(100, Math.round((a.ownershipCreditedCents / a.cashPriceCents) * 100))
              : 0;
            return (
              <Card key={a.id} href={`/rto/${a.id}`}>
                <Head>
                  <Name>{a.productName}</Name>
                  <Status $tone={status.tone}>{status.label}</Status>
                </Head>
                {/* Ownership first: "how much of this is mine?" is the question people have. */}
                <Bar aria-hidden>
                  <Fill style={{ width: `${pct}%` }} />
                </Bar>
                <Meta>
                  <b className="tnum">{pct}% owned</b>
                  <span className="tnum">
                    {a.installmentsPaid} of {a.installmentCount} payments ·{' '}
                    {formatCents(a.installmentAmountCents)} each
                  </span>
                </Meta>
              </Card>
            );
          })}
        </List>
      )}
    </TabPage>
  );
}

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Card = styled(Link)`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  text-decoration: none;
  color: inherit;
  &:hover {
    border-color: ${({ theme }) => theme.color.accentSecondary};
  }
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Name = styled.h2`
  font-size: 15px;
  font-weight: 800;
`;
const Status = styled.span<{ $tone: 'ok' | 'warn' | 'bad' | 'done' }>`
  flex: none;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme, $tone }) =>
    $tone === 'ok'
      ? theme.color.statusLive
      : $tone === 'warn'
        ? theme.color.statusWarning
        : $tone === 'bad'
          ? theme.color.statusDanger
          : theme.color.accentSecondary};
`;
const Bar = styled.div`
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  overflow: hidden;
`;
const Fill = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.color.statusLive};
`;
const Meta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
