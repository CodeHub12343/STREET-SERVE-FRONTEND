'use client';

/**
 * Stripe Identity return page (KYC_RETURN_URL).
 *
 * ## Why this exists
 *
 * `KYC_RETURN_URL` pointed at `/verify/complete` and the route was never built, so finishing an ID
 * check — photographing a government document and a selfie, the most exposing thing this product
 * asks of anyone — ended on "Nothing here. This page moved or never existed." A person who has just
 * handed over their identity documents and is told the page does not exist has no way to know
 * whether their documents went anywhere at all.
 *
 * `/payouts/complete` and `/payouts/refresh` were both built. This one was missed.
 *
 * ## Why it polls rather than declaring success
 *
 * Approval is NOT decided here. Stripe reviews asynchronously and the outcome arrives on the
 * `identity.verification_session.verified` webhook, so a return page that said "You're verified"
 * would be guessing — and would be wrong for every rejection.
 *
 * So it states the true thing ("submitted"), then polls the real status for a short window and
 * updates itself if the answer lands while the person is still looking. Most checks resolve in
 * seconds, and watching it turn green is worth more than a promise that it will.
 *
 * The poll STOPS after ~30s rather than running forever: a review that has not returned by then is
 * a genuine manual review, and a spinner that never ends reads as a broken page.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled, { css } from 'styled-components';
import { CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/primitives/Button';
import { keys } from '@/lib/query/keys';
import { useVerificationStatus } from '@/features/verification/hooks/useVerification';

/** Long enough for the common case, short enough that a real review does not spin forever. */
const POLL_WINDOW_MS = 30_000;
const POLL_EVERY_MS = 3_000;

export default function VerifyCompletePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data } = useVerificationStatus();
  const [polling, setPolling] = useState(true);

  const idCheck = data?.requirements?.find((r) => r.key === 'id-document');
  const status = idCheck?.status ?? 'pending';
  const settled = status === 'approved' || status === 'rejected';

  useEffect(() => {
    if (settled) {
      setPolling(false);
      return;
    }
    const tick = setInterval(() => {
      void qc.invalidateQueries({ queryKey: keys.verification });
    }, POLL_EVERY_MS);
    const stop = setTimeout(() => {
      clearInterval(tick);
      setPolling(false);
    }, POLL_WINDOW_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(stop);
    };
  }, [qc, settled]);

  const tone = status === 'approved' ? 'ok' : status === 'rejected' ? 'bad' : 'wait';

  return (
    <Screen>
      <Center>
        <Glyph $tone={tone} aria-hidden>
          {status === 'approved' ? (
            <CheckCircle2 size={36} />
          ) : status === 'rejected' ? (
            <XCircle size={36} />
          ) : (
            <ShieldCheck size={36} />
          )}
        </Glyph>

        {status === 'approved' ? (
          <>
            <h1>You’re verified</h1>
            <p>Your ID was accepted. Everything that needed verifying is now unlocked.</p>
          </>
        ) : status === 'rejected' ? (
          <>
            <h1>We couldn’t verify that</h1>
            <p>
              The check didn’t pass — usually a blurred photo or a document that had expired. You can
              try again with a clearer picture.
            </p>
          </>
        ) : (
          <>
            <h1>Documents received</h1>
            {/*
              "Submitted", not "verified". The decision is made by Stripe and arrives on a webhook,
              so claiming success here would be a guess — and wrong for everyone who gets rejected.
            */}
            <p>
              Your ID is being checked. This usually takes under a minute, and you don’t have to wait
              here — we’ll update your profile as soon as it clears.
            </p>
            <Waiting aria-live="polite">
              <Clock size={14} aria-hidden />
              {polling ? 'Checking…' : 'Still in review — this one needs a person.'}
            </Waiting>
          </>
        )}
      </Center>

      <Actions>
        {status === 'rejected' ? (
          <Button fullWidth onClick={() => router.replace('/profile/verification')}>
            Try again
          </Button>
        ) : (
          <Button fullWidth onClick={() => router.replace('/profile')}>
            {status === 'approved' ? 'Continue' : 'Done for now'}
          </Button>
        )}
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
const Glyph = styled.div<{ $tone: 'ok' | 'bad' | 'wait' }>`
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  color: #fff;
  ${({ theme, $tone }) =>
    $tone === 'ok'
      ? css`
          background: ${theme.color.statusLive};
        `
      : $tone === 'bad'
        ? css`
            background: ${theme.color.statusDanger};
          `
        : css`
            background: ${theme.color.accentSecondary};
          `}
`;
const Waiting = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Actions = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
