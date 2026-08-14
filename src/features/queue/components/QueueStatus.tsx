'use client';

/**
 * C-20 Queue Status (docs/13 C-20). In Line: giant position ordinal, the dot rail, the locked
 * discount (restated for reassurance), the ambient 15-minute geofence-hold notice, and the Pop-Up
 * delay banner (delay + reassurance in one message). Your Turn: a terminal confirmation → order &
 * pay. Leaving is a single tap + toast (no modal), and the toast states the tier was released.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Check } from 'lucide-react';
import { ProgressRail } from '@/components/primitives/ProgressRail';
import { Countdown } from '@/components/primitives/Countdown';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { useCartStore } from '@/stores/cart.store';
import { useJoinQueue, useLeaveQueue, useQueueMembership } from '../hooks/useQueue';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

export function QueueStatus({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const join = useJoinQueue(ownerId);
  const leave = useLeaveQueue(ownerId);
  const setCartContext = useCartStore((s) => s.setContext);
  const { data: m, isLoading } = useQueueMembership(ownerId);

  // Auto-join once the membership lookup settles with "not in line". Must re-evaluate when
  // loading finishes — at first mount the query is still in flight, so a run-once effect
  // would skip the join forever (the stuck-skeleton bug). isError stops a failed join from
  // retry-looping; the user gets an explicit retry below.
  useEffect(() => {
    if (!isLoading && !m && !join.isPending && !join.isError) join.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, m, join.isPending, join.isError]);

  if (join.isError) {
    return (
      <Screen>
        <Center>
          <h1>Couldn’t join the line</h1>
          <p>Something went wrong while joining. Your card wasn’t charged and no spot was taken.</p>
        </Center>
        <Actions>
          <Button fullWidth onClick={() => join.mutate()}>
            Try again
          </Button>
          <Button variant="tertiary" fullWidth onClick={() => router.replace('/map')}>
            Back to the map
          </Button>
        </Actions>
      </Screen>
    );
  }

  if (isLoading || !m) {
    return (
      <Screen>
        <Skeleton $h="200px" $radius={16} />
      </Screen>
    );
  }

  if (m.status === 'your_turn') {
    return (
      <Screen>
        <Center>
          <Glyph aria-hidden>
            <Check size={36} />
          </Glyph>
          <h1>You’re up!</h1>
          <p>
            Head to {m.businessName}. Your <b>{m.discountPercent}% discount</b> is locked and applies
            automatically at checkout — no code needed.
          </p>
        </Center>
        <Actions>
          <Button
            fullWidth
            onClick={() => {
              setCartContext(ownerId, m.discountPercent, m.position);
              router.replace(`/business/${ownerId}/order?from=queue`);
            }}
          >
            Order &amp; pay
          </Button>
        </Actions>
      </Screen>
    );
  }

  return (
    <Screen>
      <Center>
        {m.popup ? (
          <Banner tone="warning" title="Pop-Up — expect a short wait">
            {m.popup.message} Your spot and {m.discountPercent}% discount are unaffected.
          </Banner>
        ) : null}
        <Position>
          <b className="tnum">{ordinal(m.position)}</b>
          <span>in line at {m.businessName}</span>
        </Position>
        <ProgressRail total={m.position + m.nowServing} position={m.position} served={m.nowServing} />
        <Locked>
          🔒 {m.discountPercent}% off — <b>locked at join</b>
        </Locked>
        <Serving>{m.aheadCount === 1 ? '1 person ahead of you' : `${m.aheadCount} people ahead of you`}</Serving>
        {m.holdDeadline ? (
          <Hold>
            We’ll hold your spot if you step away — up to <Countdown deadline={m.holdDeadline} />
          </Hold>
        ) : null}
      </Center>
      <Actions>
        <Button
          variant="tertiary"
          fullWidth
          loading={leave.isPending}
          onClick={() =>
            leave.mutate(undefined, {
              onSuccess: () => {
                show('You left the line — your discount tier was released', 'default');
                router.replace('/map');
              },
            })
          }
        >
          Leave the line
        </Button>
      </Actions>
    </Screen>
  );
}

const Screen = styled.div`
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px
    calc(${({ theme }) => theme.space[6]}px + env(safe-area-inset-bottom, 0px));
  display: grid;
  grid-template-rows: 1fr auto;
  gap: ${({ theme }) => theme.space[5]}px;
`;
const Center = styled.div`
  align-self: center;
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space[4]}px;
  text-align: center;
  h1 {
    font-size: 30px;
  }
  p {
    color: ${({ theme }) => theme.color.textSecondary};
    max-width: 34ch;
  }
`;
const Position = styled.div`
  display: grid;
  justify-items: center;
  gap: 4px;
  b {
    font-size: 72px;
    line-height: 1;
    letter-spacing: -0.03em;
  }
  span {
    font-size: 14px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const Locked = styled.p`
  font-size: 15px;
  b {
    color: ${({ theme }) => theme.color.statusDiscount};
  }
`;
const Serving = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Hold = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Glyph = styled.div`
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  color: #fff;
  background: ${({ theme }) => theme.color.statusLive};
`;
const Actions = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
