'use client';

/**
 * PIF-3 — give to a business's community fund.
 *
 * Two deliberate choices about tone, because this screen is asking for money for a stranger:
 *
 *  • **Anonymous is the default**, and the toggle is phrased as opting IN to being named rather than
 *    opting out of privacy. A name given by accident cannot be taken back off a public wall.
 *  • **No charity language anywhere.** A vendor is not a charity and a contribution is not
 *    tax-deductible (CR-6). The words are "give", "contribution", "community fund" — never "donate
 *    to", "charitable", or anything implying a deduction.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Sheet } from '@/components/primitives/Sheet';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { Input } from '@/components/primitives/Input';
import { Switch } from '@/components/primitives/Switch';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { useContribute } from '../hooks/usePayForward';

/** Mirrors the backend bounds ($1–$500). The server re-checks; this only avoids a pointless round trip. */
const MIN_CENTS = 100;
const MAX_CENTS = 50_000;
const PRESETS = [500, 1000, 2000, 5000];

export function ContributeSheet({
  businessId,
  businessName,
  open,
  onClose,
}: {
  businessId: string;
  businessName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { show } = useToast();
  const contribute = useContribute(businessId);
  const [amountCents, setAmountCents] = useState<number>(PRESETS[1]!);
  const [custom, setCustom] = useState('');
  const [beNamed, setBeNamed] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [note, setNote] = useState('');

  const customCents = Math.round(Number(custom.replace(/[^0-9.]/g, '')) * 100);
  const effectiveCents = custom.trim() ? customCents : amountCents;
  const amountValid =
    Number.isFinite(effectiveCents) && effectiveCents >= MIN_CENTS && effectiveCents <= MAX_CENTS;
  const nameValid = !beNamed || displayName.trim().length > 0;

  const submit = () => {
    if (!amountValid || !nameValid) return;
    contribute.mutate(
      {
        amountCents: effectiveCents,
        // Only ever send `anonymous: false` deliberately. Omitting it means anonymous server-side too.
        ...(beNamed ? { anonymous: false, displayName: displayName.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: () => {
          show('Thank you — your gift is on its way', 'success');
          onClose();
        },
        onError: (e) =>
          show(e instanceof AppApiError ? e.message : 'Could not complete your gift', 'danger'),
      },
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      ariaLabel={`Pay it forward at ${businessName}`}
      initialSnap="half"
      footer={
        <Button
          fullWidth
          disabled={!amountValid || !nameValid}
          loading={contribute.isPending}
          onClick={submit}
        >
          {amountValid ? `Give ${formatCents(effectiveCents)}` : 'Choose an amount'}
        </Button>
      }
    >
      <Head>
        <Title>Pay it forward</Title>
        <Sub>
          Your gift goes into {businessName}&rsquo;s community fund. The next customer who needs it
          can use it — you won&rsquo;t know who, and they won&rsquo;t know you.
        </Sub>
      </Head>

      <Section>
        <Label id="pf-amount-label">Amount</Label>
        <Presets role="group" aria-labelledby="pf-amount-label">
          {PRESETS.map((cents) => (
            <Chip
              key={cents}
              selected={!custom.trim() && amountCents === cents}
              onClick={() => {
                setAmountCents(cents);
                setCustom('');
              }}
            >
              {formatCents(cents)}
            </Chip>
          ))}
        </Presets>
        <Input
          label="Or another amount"
          hint={`Between ${formatCents(MIN_CENTS)} and ${formatCents(MAX_CENTS)}`}
          error={custom.trim() && !amountValid ? 'Enter an amount in that range' : undefined}
          inputMode="decimal"
          placeholder="0.00"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
      </Section>

      <Section>
        <Switch
          label="Add my name"
          checked={beNamed}
          onChange={() => setBeNamed((v) => !v)}
        />
        <Quiet>
          {beNamed
            ? 'Your name will be shown with your gift.'
            : 'Your gift will be shown as anonymous.'}
        </Quiet>
        {beNamed ? (
          <Input
            label="Name to show"
            required
            error={!nameValid ? 'Add a name, or turn this off' : undefined}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
          />
        ) : null}
        <Input
          label="Message (optional)"
          hint="Shown with your gift. Keep it kind."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="For whoever needs it today."
        />
      </Section>

      {/*
        CR-6. The one place the phrase may appear is negated — the rule is against CLAIMING a
        deduction, not against saying plainly that there is none. Better here, before payment, than
        in a support ticket in April.
      */}
      <FinePrint>
        This is a gift to a local business&rsquo;s community fund, not a charitable donation. It is
        not tax-deductible. Unused money is passed on to other community funds in this city after{' '}
        {'12 months'} — it never goes back to the business or to StreetServe.
      </FinePrint>
    </Sheet>
  );
}

const Head = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Title = styled.h2`
  font-size: 20px;
  font-weight: 800;
`;
const Sub = styled.p`
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-top: ${({ theme }) => theme.space[5]}px;
`;
const Label = styled.p`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Presets = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Quiet = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  margin-top: -${({ theme }) => theme.space[2]}px;
`;
const FinePrint = styled.p`
  margin-top: ${({ theme }) => theme.space[5]}px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
`;
