'use client';

/**
 * V-03 Wave-Down Inbox (docs/13 V-03) — incoming wave requests, each with a per-request SLA
 * countdown and Accept / Decline. Accepting notifies the customer (wave:accepted) and adds them to
 * the line. Empty state when the line's quiet.
 */
import styled from 'styled-components';
import { Check, X, MapPin } from 'lucide-react';
import { Countdown } from '@/components/primitives/Countdown';
import { Button } from '@/components/primitives/Button';
import { Avatar } from '@/components/primitives/Avatar';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { useRespondWave, useWaveInbox } from '../hooks/useVendorData';

export function WaveInbox({ businessId }: { businessId: string }) {
  const { show } = useToast();
  const { data: waves, isLoading } = useWaveInbox(businessId);
  const { accept, decline } = useRespondWave(businessId);

  if (isLoading) return <List><Skeleton $h="96px" $radius={16} /><Skeleton $h="96px" $radius={16} /></List>;
  if (!waves || waves.length === 0) {
    return <EmptyState icon="👋" title="No wave-downs right now" description="When someone waves you down, they’ll show up here with a countdown." />;
  }

  return (
    <List>
      {waves.map((w) => (
        <Card key={w.id}>
          <Head>
            <Avatar name={w.customerName} size={44} />
            <Info>
              <Name>{w.customerName}</Name>
              <Meta>
                <MapPin size={13} aria-hidden /> {w.distanceLabel} away
              </Meta>
            </Info>
            <Timer>
              <Countdown deadline={w.slaDeadline} urgentAtMs={60_000} />
            </Timer>
          </Head>
          {w.note ? <Note>“{w.note}”</Note> : null}
          <Actions>
            <Button
              fullWidth
              loading={accept.isPending && accept.variables === w.id}
              onClick={() => accept.mutate(w.id, { onSuccess: () => show(`Accepted ${w.customerName} — they’re in your line`, 'success') })}
            >
              <Check size={16} /> Accept
            </Button>
            <Button
              variant="secondary"
              loading={decline.isPending && decline.variables === w.id}
              onClick={() => decline.mutate(w.id)}
            >
              <X size={16} /> Decline
            </Button>
          </Actions>
        </Card>
      ))}
    </List>
  );
}

const List = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 560px;
`;
const Card = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Info = styled.div`
  flex: 1;
  min-width: 0;
`;
const Name = styled.p`
  font-weight: 700;
  font-size: 15px;
`;
const Meta = styled.p`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Timer = styled.div`
  font-size: 20px;
`;
const Note = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
  font-style: italic;
`;
const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: ${({ theme }) => theme.space[2]}px;
`;
