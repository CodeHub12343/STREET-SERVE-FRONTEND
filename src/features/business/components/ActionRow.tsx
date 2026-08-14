'use client';

/**
 * C-14 action row — Directions · Follow · Notify Me · Message (docs/13 C-14). Follow toggles in
 * place (filled = following, feeds Favorites); Notify Me is a one-shot with a toast (deliberately a
 * different interaction shape than Follow so users learn the distinction).
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Navigation2, Heart, Bell, MessageCircle } from 'lucide-react';
import { IconButton } from '@/components/primitives/IconButton';
import { useToast } from '@/components/feedback/ToastProvider';
import { useStartThread } from '@/features/messaging';
import type { LngLat } from '@/types';
import { useFollow, useNotifyMe } from '../hooks/useBusiness';

export function ActionRow({
  businessId,
  following,
  lngLat,
}: {
  businessId: string;
  following: boolean;
  lngLat?: LngLat;
}) {
  const router = useRouter();
  const { show } = useToast();
  const follow = useFollow(businessId);
  const notify = useNotifyMe(businessId);
  const startThread = useStartThread();

  /**
   * Open the conversation with THIS business. This used to push to /messages, which dropped the
   * business entirely and landed the user in an inbox telling them to "message a business from its
   * profile" — the thing they had just done.
   */
  const message = () => {
    startThread.mutate(
      { businessId },
      {
        onSuccess: ({ id }) => router.push(`/messages/${id}`),
        onError: () => show('Couldn’t open the conversation. Please try again.', 'danger'),
      },
    );
  };

  const directions = () => {
    // Silently doing nothing here made the button look broken — say why instead.
    if (!lngLat) {
      show('This business hasn’t shared a location yet.', 'default');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lngLat[1]},${lngLat[0]}`;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <Row>
      <Action>
        <IconButton label="Directions" variant="filled" icon={<Navigation2 size={20} />} onClick={directions} />
        <span>Directions</span>
      </Action>
      <Action>
        <IconButton
          label={following ? 'Unfollow' : 'Follow'}
          variant={following ? 'outline' : 'filled'}
          icon={<Heart size={20} fill={following ? 'currentColor' : 'none'} />}
          onClick={() =>
            follow.mutate(following, {
              onSuccess: () => show(following ? 'Unfollowed' : 'Following — they’ll show in your Favorites', 'success'),
              onError: () => show('Couldn’t update follow. Please try again.', 'danger'),
            })
          }
        />
        <span>{following ? 'Following' : 'Follow'}</span>
      </Action>
      <Action>
        <IconButton
          label="Notify me"
          variant="filled"
          icon={<Bell size={20} />}
          onClick={() =>
            notify.mutate(undefined, {
              onSuccess: () => show('We’ll alert you next time they’re nearby', 'success'),
              onError: () => show('Couldn’t set the alert. Please try again.', 'danger'),
            })
          }
        />
        <span>Notify Me</span>
      </Action>
      <Action>
        <IconButton
          label="Message"
          variant="filled"
          disabled={startThread.isPending}
          icon={<MessageCircle size={20} />}
          onClick={message}
        />
        <span>Message</span>
      </Action>
    </Row>
  );
}

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Action = styled.div`
  display: grid;
  justify-items: center;
  gap: 4px;
  span {
    font-size: 11px;
    font-weight: 600;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
