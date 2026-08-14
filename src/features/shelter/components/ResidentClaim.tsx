'use client';

/**
 * B-1 — the resident's first screen.
 *
 * Someone standing at a front desk was given a six-character code. That is the entire input. No ID
 * upload, no bank details, no address — every one of those was a wall the old flow put in front of
 * exactly the people the program exists for.
 *
 * Design notes that matter more here than on most screens:
 *  • The input is large, uppercase-normalised, and tolerant of spaces, because it's being typed on
 *    a borrowed phone by someone reading a slip of paper.
 *  • The error is deliberately identical for every failure mode (the server does this too) — but
 *    the recovery instruction is concrete: go back to the person who enrolled you.
 *  • No "create an account first" step is implied. By the time this renders they have one.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { useClaimEnrollment } from '../hooks/useShelter';

export function ResidentClaim() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const claim = useClaimEnrollment();

  const canSubmit = code.replace(/\s/g, '').length >= 4 && !claim.isPending;

  return (
    <Wrap>
      <Icon aria-hidden>
        <KeyRound size={22} />
      </Icon>
      <Title>Enter your code</Title>
      <Lede>
        The staff member who signed you up gave you a six-character code. Type it below to get
        started — there’s nothing else to fill in.
      </Lede>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          claim.mutate(code, {
            onSuccess: () => router.push('/seller/training'),
          });
        }}
      >
        <CodeInput
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          aria-label="Your enrollment code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          maxLength={16}
        />

        {claim.isError ? (
          <Banner tone="warning" title="That code didn’t work">
            Ask the staff member who enrolled you to check it or give you a new one. Codes stop
            working after they’re used once.
          </Banner>
        ) : null}

        <Button type="submit" disabled={!canSubmit} loading={claim.isPending} fullWidth>
          Continue
        </Button>
      </form>

      <Help>
        Don’t have a code? Any StreetServe shelter partner can enroll you in person — it takes a
        couple of minutes and you don’t need ID or a bank account.
      </Help>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 420px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[5]}px ${({ theme }) => theme.space[4]}px;

  form {
    display: grid;
    gap: ${({ theme }) => theme.space[3]}px;
  }
`;
const Icon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  color: ${({ theme }) => theme.color.statusLive};
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 14%, transparent)`};
`;
const Title = styled.h1`
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.textPrimary};
  margin: 0;
`;
const Lede = styled.p`
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
  margin: 0;
`;
/**
 * Oversized and letter-spaced on purpose: this is transcription from paper, often one-handed,
 * often outdoors. Wide tracking makes a mistyped character visible before submitting.
 */
const CodeInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceRaised};
  color: ${({ theme }) => theme.color.textPrimary};
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.25em;
  text-align: center;
  text-transform: uppercase;

  &::placeholder {
    color: ${({ theme }) => theme.color.textTertiary};
    letter-spacing: 0.25em;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.statusLive};
    outline-offset: 2px;
  }
`;
const Help = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
  margin: 0;
`;
