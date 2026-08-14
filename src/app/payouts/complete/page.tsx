'use client';

/**
 * Stripe Connect return page (CONNECT_RETURN_URL). Stripe's hosted onboarding redirects here when
 * the vendor finishes. Whether payouts are fully enabled is confirmed server-side via the
 * account.updated webhook, so this page just refreshes the vendor's business state (which drives
 * payoutAccountLinked / canGoLive) and sends them on. Without this route the return 404'd.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { keys } from '@/lib/query/keys';

export default function PayoutsCompletePage() {
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    // Re-read the business so payoutAccountLinked / canGoLive reflect the just-finished onboarding.
    void qc.invalidateQueries({ queryKey: keys.myBusinesses });
    void qc.invalidateQueries({ queryKey: ['business'] });
    const t = setTimeout(() => router.replace('/vendor/payouts'), 2500);
    return () => clearTimeout(t);
  }, [qc, router]);

  return (
    <Screen>
      <Center>
        <Glyph aria-hidden>
          <CheckCircle2 size={36} />
        </Glyph>
        <h1>You’re all set</h1>
        <p>
          Your payout account is connected. It can take a moment for Stripe to finish verifying —
          you’ll be able to go live and get paid once it clears.
        </p>
      </Center>
      <Actions>
        <Button fullWidth onClick={() => router.replace('/vendor/payouts')}>
          Continue
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
  gap: ${({ theme }) => theme.space[3]}px;
  text-align: center;
  h1 {
    font-size: 28px;
  }
  p {
    color: ${({ theme }) => theme.color.textSecondary};
    max-width: 36ch;
  }
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
