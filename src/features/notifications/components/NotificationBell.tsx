'use client';

/**
 * Notification bell with an unread badge — for dashboard topbars. Routes to the notification center.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/primitives/Badge';
import { useUnreadCount } from '../hooks/useNotifications';

export function NotificationBell() {
  const router = useRouter();
  const unread = useUnreadCount();
  return (
    <Wrap type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => router.push('/notifications')}>
      <Bell size={18} aria-hidden />
      {unread > 0 ? (
        <BadgeWrap>
          <Badge count={unread} tone="accent" />
        </BadgeWrap>
      ) : null}
    </Wrap>
  );
}

const Wrap = styled.button`
  position: relative;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.color.textPrimary};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised2};
  }
`;
const BadgeWrap = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
`;
