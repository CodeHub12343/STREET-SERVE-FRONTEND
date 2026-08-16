'use client';

/**
 * Notification bell with an unread badge.
 *
 * **It opens a sheet, it does not navigate.** The bell used to push to `/notifications`, which lives
 * in the `(customer)` route group — so a vendor or admin who tapped it was dropped into the customer
 * shell, bottom tab bar and all. It read as being silently switched into customer mode, and the only
 * way back was the browser's back button.
 *
 * A sheet is also just the right shape for this: notifications are something you glance at and
 * dismiss, not a destination. You keep your place, and your role, either way.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { Sheet } from '@/components/primitives/Sheet';
import { useMarkRead, useUnreadCount } from '../hooks/useNotifications';
import { NotificationList } from './NotificationCenter';

export function NotificationBell() {
  const unread = useUnreadCount();
  const [open, setOpen] = useState(false);
  const { all } = useMarkRead();

  return (
    <>
      <Wrap
        type="button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Bell size={18} aria-hidden />
        {unread > 0 ? (
          <BadgeWrap>
            <Badge count={unread} tone="accent" />
          </BadgeWrap>
        ) : null}
      </Wrap>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Notifications"
        initialSnap="half"
      >
        <Head>
          <Title>Notifications</Title>
          {unread > 0 ? (
            <Button size="compact" variant="tertiary" onClick={() => all.mutate()}>
              Mark all read
            </Button>
          ) : null}
        </Head>
        {/* Tapping through closes the sheet first, so the deep link isn't left behind it. */}
        <NotificationList onNavigate={() => setOpen(false)} />
      </Sheet>
    </>
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
const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;
const Title = styled.h2`
  font-size: 18px;
  font-weight: 800;
`;
