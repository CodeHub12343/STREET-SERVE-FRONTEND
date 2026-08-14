'use client';

/**
 * Stripe Connect refresh page (CONNECT_REFRESH_URL). Stripe redirects here when an onboarding link
 * expires or is revisited before completion. We can't mint a fresh link without the business id, so
 * send the vendor back to their payouts screen to start again. Without this route the redirect 404'd.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/primitives/Button';

export default function PayoutsRefreshPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/vendor/payouts'), 2500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <Screen>
      <Center>
        <Glyph aria-hidden>
          <RefreshCw size={32} />
        </Glyph>
        <h1>Let’s pick this back up</h1>
        <p>Your setup link expired before you finished. No problem — start again from your payouts screen.</p>
      </Center>
      <Actions>
        <Button fullWidth onClick={() => router.replace('/vendor/payouts')}>
          Back to payouts
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
  color: ${({ theme }) => theme.color.textSecondary};
  background: ${({ theme }) => theme.color.surfaceRaised2};
`;
const Actions = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
