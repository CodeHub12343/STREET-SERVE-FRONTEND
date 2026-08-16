'use client';

/**
 * Notification center (docs/12 §K, GAP-3) — the in-app inbox. Tapping a notification marks it read
 * and deep-links to the right screen (ROUTING_STRUCTURE.md §9).
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Hand, Receipt, Coins, ShieldAlert, BadgeCheck, MessageCircle, Bell } from 'lucide-react';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatRelativeMinutes } from '@/lib/format';
import { useMarkRead, useNotifications, type AppNotification } from '../hooks/useNotifications';

const ICON: Record<AppNotification['category'], React.ReactNode> = {
  wave: <Hand size={16} />,
  order: <Receipt size={16} />,
  payout: <Coins size={16} />,
  dispute: <ShieldAlert size={16} />,
  verification: <BadgeCheck size={16} />,
  message: <MessageCircle size={16} />,
  system: <Bell size={16} />,
};

/**
 * The inbox itself, with no page chrome — so the same list can be a full screen for customers and a
 * sheet over whatever a vendor or admin is doing.
 *
 * It was only ever a page, living in the `(customer)` route group, and the bell pushed to it from
 * every shell. A vendor tapping the bell was therefore dropped into the customer layout, bottom tab
 * bar and all: it read as being silently switched into customer mode, and the only way back was the
 * browser's back button.
 */
export function NotificationList({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications();
  const { one } = useMarkRead();

  const open = (n: AppNotification) => {
    one.mutate(n.id);
    if (n.deeplink) {
      // Close the sheet first when there is one, so the deep link doesn't land behind it.
      onNavigate?.();
      router.push(n.deeplink);
    }
  };

  return (
    <>
      {isLoading ? (
        <List><Skeleton $h="64px" $radius={16} /><Skeleton $h="64px" $radius={16} /></List>
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState icon="🔔" title="You’re all caught up" description="Wave-downs, orders, payouts and alerts show up here." />
      ) : (
        <List>
          {notifications.map((n) => (
            <Row key={n.id} $unread={!n.read} onClick={() => open(n)}>
              <Icon $unread={!n.read} aria-hidden>{ICON[n.category]}</Icon>
              <Info>
                <Title>{n.title}</Title>
                <Body>{n.body}</Body>
                <When>{formatRelativeMinutes(n.at)}</When>
              </Info>
              {!n.read ? <Dot aria-label="Unread" /> : null}
            </Row>
          ))}
        </List>
      )}
    </>
  );
}

/** The customer's full-screen inbox. */
export function NotificationCenter() {
  const { all } = useMarkRead();
  return (
    <TabPage
      title="Notifications"
      actions={
        <Button size="compact" variant="tertiary" onClick={() => all.mutate()}>
          Mark all read
        </Button>
      }
    >
      <NotificationList />
    </TabPage>
  );
}

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Row = styled.button<{ $unread: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme, $unread }) => ($unread ? theme.color.surfaceRaised : 'transparent')};
  border: 1px solid ${({ theme, $unread }) => ($unread ? theme.color.line2 : 'transparent')};
  text-align: left;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;
const Icon = styled.span<{ $unread: boolean }>`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme, $unread }) => ($unread ? theme.color.accentPrimary : theme.color.textSecondary)};
`;
const Info = styled.div`
  flex: 1;
  min-width: 0;
`;
const Title = styled.p`
  font-weight: 700;
  font-size: 14px;
`;
const Body = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const When = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Dot = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
  margin-top: 6px;
  background: ${({ theme }) => theme.color.accentPrimary};
`;
