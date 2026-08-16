'use client';

/**
 * ═══ A street seller going live. ═══
 *
 * **This did not exist.** `LiveStatusControl` hardcoded `actorType: 'business'` and only ever
 * rendered on the vendor dashboard, so nothing in the product could create a session for a seller —
 * even though the backend has always supported one (including the fuzzed-precision path built
 * specifically for sellers, who are people rather than premises).
 *
 * That is why the hub's "where my stock is" map was permanently empty: it queries for
 * `actor_type: 'seller'` sessions, and no such row could ever be written. The map was not broken;
 * the thing it reads was never being produced.
 *
 * Two things this must be honest about, because a seller is a person carrying stock around:
 *
 *  1. **Who can see them.** Going live puts them on the public customer map AND tells the hub whose
 *     stock they hold where that stock is. Both, stated before the switch is flipped — a seller who
 *     discovers the second one later has been tracked without being asked.
 *  2. **How to stop.** Ending the session is one tap and takes effect immediately.
 */
import styled from 'styled-components';
import { MapPin, Radio, EyeOff } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import {
  useLiveSession,
  useLiveLocationTracking,
  useSessionHeartbeat,
  useStartSession,
  useStopSession,
} from '@/features/vendor/hooks/useLiveSession';

export function SellerLiveControl({ userId }: { userId: string }) {
  const { show } = useToast();
  const { data: session } = useLiveSession(userId, 'seller');
  const start = useStartSession(userId, 'seller');
  const stop = useStopSession(userId);

  /**
   * Keep the session alive and the position current while it runs. Without these a session goes
   * stale within minutes and the hub is shown a pin that has stopped meaning anything — worse than
   * no pin, because it looks current.
   */
  const lastLocationPushAt = useLiveLocationTracking(session?.id, session?.status);
  // Heartbeat is the FALLBACK for when tracking cannot run (permission denied, no geolocation);
  // passing the tracker's clock stops the two saying the same thing twice.
  useSessionHeartbeat(session?.id, lastLocationPushAt);

  if (session) {
    return (
      <Card $live>
        <Head>
          <Radio size={16} aria-hidden />
          <b>You&rsquo;re live</b>
        </Head>
        <Body>
          Customers can see you on the map, and any hub whose stock you&rsquo;re carrying can see
          where it is.
        </Body>
        <Button
          size="compact"
          variant="secondary"
          loading={stop.isPending}
          onClick={() =>
            stop.mutate(session.id, {
              onSuccess: () => show('You’re no longer sharing your location', 'default'),
              onError: (e) =>
                show(e instanceof AppApiError ? e.message : 'Couldn’t stop the session', 'danger'),
            })
          }
        >
          <EyeOff size={15} /> Stop sharing
        </Button>
      </Card>
    );
  }

  return (
    <Card $live={false}>
      <Head>
        <MapPin size={16} aria-hidden />
        <b>Go live to be found</b>
      </Head>
      {/* Both audiences named BEFORE the tap, not discovered afterwards. */}
      <Body>
        Customers nearby can see where you are, and any hub whose stock you&rsquo;re carrying can see
        where it is. You can stop at any time.
      </Body>
      <Button
        size="compact"
        loading={start.isPending}
        onClick={() =>
          start.mutate(undefined, {
            onSuccess: () => show('You’re live — customers nearby can see you', 'success'),
            onError: (e) =>
              show(
                e instanceof AppApiError
                  ? e.message
                  : 'Couldn’t start — check that location is allowed for this site',
                'danger',
              ),
          })
        }
      >
        <Radio size={15} /> Go live
      </Button>
    </Card>
  );
}

const Card = styled.section<{ $live: boolean }>`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  justify-items: start;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme, $live }) =>
    $live
      ? `color-mix(in srgb, ${theme.color.statusLive} 8%, ${theme.color.surfaceRaised})`
      : theme.color.surfaceRaised};
  border: 1px solid
    ${({ theme, $live }) =>
      $live
        ? `color-mix(in srgb, ${theme.color.statusLive} 30%, transparent)`
        : theme.color.line2};
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  font-size: 15px;
  svg {
    color: ${({ theme }) => theme.color.statusLive};
  }
`;
const Body = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
