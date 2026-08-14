'use client';

/**
 * C-19 Wave Active (docs/13 C-19) — three sub-states: Waiting (server-deadline countdown, calm
 * until expiry), Accepted (ETA + locked discount + join the line), Declined/Expired (empathetic,
 * with an explicit "nothing was charged" and a one-tap alternate). All timers are server-authoritative.
 */
import { useRouter } from 'next/navigation';
import styled, { keyframes } from 'styled-components';
import { Check, X } from 'lucide-react';
import { Countdown } from '@/components/primitives/Countdown';
import { Button } from '@/components/primitives/Button';
import { StatusChip } from '@/components/primitives/StatusChip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useWave, useCancelWave } from '../hooks/useWave';

export function WaveActive({ id }: { id: string }) {
  const router = useRouter();
  const { data: wave, isLoading } = useWave(id);
  const cancel = useCancelWave();

  if (isLoading || !wave) {
    return (
      <Screen>
        <Skeleton $h="160px" $radius={16} />
      </Screen>
    );
  }

  if (wave.status === 'declined' || wave.status === 'expired') {
    return (
      <Screen>
        <Center>
          <BadGlyph aria-hidden>
            <X size={32} />
          </BadGlyph>
          <h1>{wave.status === 'expired' ? 'No response in time' : 'Not right now'}</h1>
          <p>{wave.reason ?? 'They couldn’t take your wave. It happens — someone else nearby probably can.'}</p>
          <NoCharge>Nothing was charged.</NoCharge>
        </Center>
        <Actions>
          <Button fullWidth onClick={() => router.replace('/map')}>
            Find someone nearby
          </Button>
          <Button variant="tertiary" fullWidth onClick={() => router.replace(`/business/${wave.businessId}/wave`)}>
            Wave them again
          </Button>
        </Actions>
      </Screen>
    );
  }

  const accepted = wave.status === 'accepted' || wave.status === 'arrived';

  return (
    <Screen>
      <Center>
        {accepted ? (
          <GoodGlyph aria-hidden>
            <Check size={32} />
          </GoodGlyph>
        ) : (
          <Pulse aria-hidden />
        )}

        {accepted ? (
          <>
            <h1>{wave.businessName} is on the way</h1>
            <SubRow>
              <StatusChip status="driving" label={wave.status === 'arrived' ? 'Here now' : 'Accepted'} size="sm" />
              {wave.discountPercent ? <StatusChip status="discount" label={`${wave.discountPercent}% locked`} size="sm" /> : null}
            </SubRow>
            {wave.status !== 'arrived' && wave.etaSeconds != null ? (
              <Eta>
                <span>Arriving in</span>
                <b className="tnum">~{Math.round(wave.etaSeconds / 60)} min</b>
              </Eta>
            ) : (
              <Eta>
                <b>Head to the window</b>
              </Eta>
            )}
          </>
        ) : (
          <>
            <h1>Waving down {wave.businessName}…</h1>
            <p>Hang tight — they have up to</p>
            <Big>
              <Countdown deadline={wave.slaDeadline} />
            </Big>
            <p>to accept.</p>
          </>
        )}
      </Center>

      <Actions>
        {accepted ? (
          <>
            <Button fullWidth onClick={() => router.replace(`/queue/${wave.businessId}`)}>
              Join the line
            </Button>
            <Button variant="tertiary" fullWidth onClick={() => router.push('/messages')}>
              Message them
            </Button>
          </>
        ) : (
          <Button
            variant="tertiary"
            fullWidth
            loading={cancel.isPending}
            onClick={() => cancel.mutate(id, { onSuccess: () => router.replace('/map') })}
          >
            Cancel wave
          </Button>
        )}
      </Actions>
    </Screen>
  );
}

const pulse = keyframes`
  0% { transform: scale(0.9); opacity: 0.9; box-shadow: 0 0 0 0 var(--glow); }
  70% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 28px transparent; }
  100% { transform: scale(0.9); opacity: 0.9; box-shadow: 0 0 0 0 transparent; }
`;

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
  gap: ${({ theme }) => theme.space[3]}px;
  text-align: center;
  h1 {
    font-size: clamp(24px, 6vw, 30px);
  }
  p {
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const Pulse = styled.div`
  --glow: ${({ theme }) => `color-mix(in srgb, ${theme.color.accentPrimary} 45%, transparent)`};
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accentPrimary};
  animation: ${pulse} 1.8s ease-out infinite;
`;
const GoodGlyph = styled.div`
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  color: #fff;
  background: ${({ theme }) => theme.color.statusLive};
`;
const BadGlyph = styled.div`
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  color: ${({ theme }) => theme.color.textSecondary};
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const SubRow = styled.div`
  display: flex;
  gap: 8px;
`;
const Big = styled.div`
  font-size: 48px;
`;
const Eta = styled.div`
  display: grid;
  gap: 2px;
  span {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
  b {
    font-size: 24px;
  }
`;
const NoCharge = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary} !important;
`;
const Actions = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
