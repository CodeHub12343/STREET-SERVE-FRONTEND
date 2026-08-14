'use client';

/**
 * A-02 Dispute case detail (docs/13 A-02) — summary, parties, evidence viewer, SLA timer, and the
 * resolution actions (admin-only; triggers the post-resolution Trust Score change, FR-10.3). Every
 * resolution writes an immutable audit log server-side.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { FileText } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { StatusChip } from '@/components/primitives/StatusChip';
import { Countdown } from '@/components/primitives/Countdown';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Banner } from '@/components/feedback/Banner';
import { useToast } from '@/components/feedback/ToastProvider';
import { formatCents } from '@/lib/money';
import { useDispute, useResolveDispute } from '../hooks/useAdmin';

export function DisputeCase({ id }: { id: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: d, isLoading, isError } = useDispute(id);
  const resolve = useResolveDispute(id);

  // Keep the way out on the failure states too — a case that won't load is otherwise a dead end.
  if (isLoading)
    return (
      <TabPage title={`Dispute #${id}`} backHref="/admin/disputes" backLabel="Back to the dispute queue">
        <Skeleton $h="260px" $radius={16} />
      </TabPage>
    );
  if (isError || !d)
    return (
      <TabPage title="Dispute" backHref="/admin/disputes" backLabel="Back to the dispute queue">
        <ErrorState title="Case not found" />
      </TabPage>
    );

  const resolved = d.status === 'resolved';
  const decide = (winner: 'claimant' | 'respondent') =>
    resolve.mutate(winner, { onSuccess: () => show(`Resolved in favor of the ${winner}`, 'success') });

  return (
    <TabPage
      title={`Dispute #${d.id}`}
      backHref="/admin/disputes"
      backLabel="Back to the dispute queue"
      actions={<Sla><Countdown deadline={d.slaDeadline} urgentAtMs={24 * 3_600_000} /></Sla>}
    >
      {resolved ? <Banner tone="success">This case is resolved. A Trust Score adjustment and audit-log entry were recorded.</Banner> : null}

      <Card>
        <Head>
          <Subject>{d.subject}</Subject>
          <StatusChip status={resolved ? 'free' : 'popup'} label={d.status} size="sm" />
        </Head>
        <Meta>{d.type} · {formatCents(d.amountCents)} · opened {new Date(d.openedAt).toLocaleDateString()}</Meta>
        <Parties>
          <Party><Role>Claimant</Role>{d.claimant}</Party>
          <Party><Role>Respondent</Role>{d.respondent}</Party>
        </Parties>
        <Summary>{d.summary}</Summary>
      </Card>

      <SectionTitle>Evidence ({d.evidence.length})</SectionTitle>
      {d.evidence.length === 0 ? (
        <Empty>No evidence submitted yet — case is awaiting evidence.</Empty>
      ) : (
        <Evidence>
          {d.evidence.map((e) => (
            <Item key={e.id}>
              <FileText size={16} aria-hidden />
              <div>
                <By>{e.by}</By>
                <Note>{e.note}</Note>
              </div>
            </Item>
          ))}
        </Evidence>
      )}

      {!resolved ? (
        <Actions>
          <Button loading={resolve.isPending} onClick={() => decide('claimant')}>Rule for claimant</Button>
          <Button variant="secondary" loading={resolve.isPending} onClick={() => decide('respondent')}>Rule for respondent</Button>
        </Actions>
      ) : (
        <Button fullWidth variant="secondary" onClick={() => router.replace('/admin/disputes')}>Back to queue</Button>
      )}
    </TabPage>
  );
}

const Sla = styled.div`
  font-size: 16px;
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  margin: ${({ theme }) => theme.space[4]}px 0;
  max-width: 720px;
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Subject = styled.h2`
  font-size: 18px;
`;
const Meta = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Parties = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Party = styled.div`
  display: grid;
  gap: 2px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  font-weight: 600;
`;
const Role = styled.span`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Summary = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const SectionTitle = styled.h3`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
  margin-bottom: ${({ theme }) => theme.space[2]}px;
`;
const Evidence = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  max-width: 720px;
`;
const Item = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.textSecondary};
`;
const By = styled.p`
  font-weight: 700;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textPrimary};
`;
const Note = styled.p`
  font-size: 13px;
`;
const Empty = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-top: ${({ theme }) => theme.space[4]}px;
`;
