'use client';

/**
 * 7.1 — contractual notices that reached nobody.
 *
 * This screen is what makes the notice record worth keeping. §38 consignment expiry, §49 RTO payment
 * reminders, and §53 completion are obligations a signed agreement creates; a notice no channel
 * accepted is a compliance problem, and without somewhere to see it, it is a fact nobody learns
 * until a dispute.
 *
 * The two failure kinds are shown apart on purpose, because they need different responses: a user
 * with no email and no phone is a **data** problem (ask them for one), and a provider rejection is
 * an **integration** problem (fix the sending). Collapsing them into "failed" sends whoever is on
 * duty chasing the wrong thing.
 */
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { MailWarning, UserX } from 'lucide-react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Banner } from '@/components/feedback/Banner';

interface UndeliveredNotice {
  _id: string;
  user_id: string;
  notice_type: string;
  entity_type: string;
  entity_id: string;
  subject: string;
  undeliverable: boolean;
  created_at: string;
  channels: { channel: string; delivered: boolean; error: string | null }[];
}

const NOTICE_LABEL: Record<string, string> = {
  consignment_expiry: '§38 consignment expiry',
  consignment_terminated: '§37 consignment ended',
  rto_payment_reminder: '§49 payment reminder',
  rto_late: '§49 payment late',
  rto_completed: '§53 ownership transferred',
  rto_return_confirmed: '§51 return confirmed',
};

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Card = styled.div<{ $data: boolean }>`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border-left: 3px solid
    ${({ theme, $data }) => ($data ? theme.color.statusWarning : theme.color.statusDanger)};
  border-top: 1px solid ${({ theme }) => theme.color.line2};
  border-right: 1px solid ${({ theme }) => theme.color.line2};
  border-bottom: 1px solid ${({ theme }) => theme.color.line2};
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Muted = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Mono = styled.code`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
`;

export function UndeliveredNotices() {
  const { data, isLoading } = useQuery<UndeliveredNotice[]>({
    queryKey: keys.undeliveredNotices,
    queryFn: () => api.get<UndeliveredNotice[]>(endpoints.undeliveredNotices, { query: { days: 30 } }),
  });

  if (isLoading) return <Skeleton $h="120px" $radius={16} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<MailWarning size={28} aria-hidden />}
        title="Every notice reached someone"
        description="Contractual notices from the last 30 days were all accepted by at least one channel."
      />
    );
  }

  const noContact = data.filter((n) => n.undeliverable).length;

  return (
    <Wrap>
      <Banner tone="warning">
        {data.length} contractual notice{data.length === 1 ? '' : 's'} reached nobody in the last 30
        days. These are obligations under the §60 agreements — an in-app notification alone does not
        satisfy them.
      </Banner>
      {noContact > 0 ? (
        <Banner tone="info">
          {noContact} of them went to someone with no email and no phone number. That is a data
          problem, not a sending problem — they cannot be reached until they add one.
        </Banner>
      ) : null}

      {data.map((notice) => (
        <Card key={notice._id} $data={notice.undeliverable}>
          <Row>
            {notice.undeliverable ? <UserX size={16} aria-hidden /> : <MailWarning size={16} aria-hidden />}
            <strong>{NOTICE_LABEL[notice.notice_type] ?? notice.notice_type}</strong>
          </Row>
          <Muted>{notice.subject}</Muted>
          <Muted>
            {notice.undeliverable
              ? 'No email or phone on the account'
              : notice.channels
                  .filter((c) => c.channel !== 'in_app' && !c.delivered)
                  .map((c) => `${c.channel}: ${c.error ?? 'rejected'}`)
                  .join(' · ') || 'No outbound channel accepted it'}
          </Muted>
          <Muted>
            <Mono>
              {notice.entity_type} {notice.entity_id}
            </Mono>{' '}
            · user <Mono>{notice.user_id}</Mono> ·{' '}
            {new Date(notice.created_at).toLocaleString()}
          </Muted>
        </Card>
      ))}
    </Wrap>
  );
}
