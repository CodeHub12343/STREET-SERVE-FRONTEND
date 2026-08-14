'use client';

/**
 * C-32 Messages tab (docs/13 C-32) — thread list with unread badges. Scoped business-inquiry
 * threads.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { TabPage } from '@/components/layout/TabPage';
import { Badge } from '@/components/primitives/Badge';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatRelativeMinutes } from '@/lib/format';
import { useThreads } from '../hooks/useMessaging';
import { PresenceAvatar } from './PresenceAvatar';

export function MessagesList() {
  const router = useRouter();
  const { data: threads, isLoading } = useThreads();

  return (
    <TabPage title="Messages">
      {isLoading ? (
        <List><Skeleton $h="64px" $radius={16} /><Skeleton $h="64px" $radius={16} /></List>
      ) : !threads || threads.length === 0 ? (
        <EmptyState icon="💬" title="No messages yet" description="Message a business from its profile to start a conversation." />
      ) : (
        <List>
          {threads.map((t) => (
            <Row key={t.id} onClick={() => router.push(`/messages/${t.id}`)}>
              <PresenceAvatar name={t.counterpartyName} src={t.avatarUrl} size={44} online={Boolean(t.online)} />
              <Info>
                <Top>
                  <Name>{t.counterpartyName}</Name>
                  <When>{formatRelativeMinutes(t.lastAt)}</When>
                </Top>
                <Last $unread={t.unread > 0}>{t.lastMessage}</Last>
              </Info>
              {t.unread > 0 ? <Badge count={t.unread} tone="accent" /> : null}
            </Row>
          ))}
        </List>
      )}
    </TabPage>
  );
}

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;
const Info = styled.div`
  flex: 1;
  min-width: 0;
`;
const Top = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Name = styled.span`
  font-weight: 700;
  font-size: 15px;
`;
const When = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Last = styled.p<{ $unread: boolean }>`
  font-size: 13px;
  color: ${({ theme, $unread }) => ($unread ? theme.color.textPrimary : theme.color.textSecondary)};
  font-weight: ${({ $unread }) => ($unread ? 600 : 400)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
