'use client';

/**
 * MB-3 — chip in to a campaign.
 *
 * **The unmet-goal outcome is disclosed before payment, not after.** That is an ADR-006 exit
 * criterion rather than a nicety, and it drives the whole layout: missing the goal is the LIKELY
 * outcome of any crowdfunding campaign, so a contributor who only learns what happens next once it
 * has already happened has been misled by ordering.
 *
 * Three things are therefore stated above the pay button:
 *
 *  1. the deadline, as a date rather than "soon";
 *  2. that a missed goal refunds them **in full, automatically, without asking**;
 *  3. their own choice between that refund and rolling the money into the next campaign — presented
 *     as a real choice with refund preselected, never as a pre-ticked upsell.
 *
 * **Two steps, because there are two steps.** POSTing the contribution does not move money: the
 * server creates a PENDING contribution plus a Stripe PaymentIntent and hands back a `clientSecret`,
 * and the campaign is only credited when the webhook settles that intent. This sheet used to drop
 * the secret on the floor and toast "your contribution is in" — so no card was ever collected, no
 * money ever moved, the progress bar never rose, and the person had been told the opposite. Step 2
 * exists to actually collect the card.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Sheet } from '@/components/primitives/Sheet';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { Input } from '@/components/primitives/Input';
import { Switch } from '@/components/primitives/Switch';
import { useToast } from '@/components/feedback/ToastProvider';
import { PaymentSheet } from '@/features/payments/components/PaymentSheet';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { useContributeToCampaign, usePostcardEstimate } from '../hooks/useBoost';
import type { BoostCampaign, BoostContributeResult, OnUnmet } from '../types';

/** Mirrors the backend bounds ($5–$1,000). The server re-checks. */
const MIN_CENTS = 500;
const MAX_CENTS = 100_000;
const PRESETS = [1000, 2500, 5000, 10_000];

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ContributeToCampaignSheet({
  campaign,
  businessName,
  open,
  onClose,
}: {
  campaign: BoostCampaign;
  businessName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { show } = useToast();
  const contribute = useContributeToCampaign(campaign.id, campaign.businessId);
  const [amountCents, setAmountCents] = useState<number>(PRESETS[1]!);
  const [custom, setCustom] = useState('');
  const [beNamed, setBeNamed] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [onUnmet, setOnUnmet] = useState<OnUnmet>('refund');
  /** Non-null once the contribution is created and a card is owed. Drives step 2. */
  const [awaitingPay, setAwaitingPay] = useState<BoostContributeResult | null>(null);

  const customCents = Math.round(Number(custom.replace(/[^0-9.]/g, '')) * 100);
  const effectiveCents = custom.trim() ? customCents : amountCents;
  const amountValid =
    Number.isFinite(effectiveCents) && effectiveCents >= MIN_CENTS && effectiveCents <= MAX_CENTS;
  const nameValid = !beNamed || displayName.trim().length > 0;

  const { data: estimate } = usePostcardEstimate(amountValid ? effectiveCents : 0);

  const submit = () => {
    if (!amountValid || !nameValid) return;
    contribute.mutate(
      {
        amountCents: effectiveCents,
        onUnmet,
        ...(beNamed ? { anonymous: false, displayName: displayName.trim() } : {}),
      },
      {
        onSuccess: (res) => {
          if (!res.clientSecret) {
            /**
             * Created, needs paying, but no secret came back to pay with. Saying "thanks, you're
             * in" here would be the original bug in miniature: they are not in, and nothing has
             * been charged. Say what actually happened instead.
             */
            show(
              'We recorded your contribution but could not start the payment. Nothing has been charged — try again.',
              'warning',
            );
            onClose();
            return;
          }
          setAwaitingPay(res);
        },
        onError: (e) =>
          show(e instanceof AppApiError ? e.message : 'Could not complete your contribution', 'danger'),
      },
    );
  };

  /**
   * The card was accepted. **Not the same as the campaign being credited.**
   *
   * `creditContribution` runs off Stripe's webhook, so the client is never the thing that says the
   * money arrived. The wording therefore promises the payment, not the progress bar, and the
   * mutation's own invalidation lets the raised total move on its own once the webhook lands.
   */
  const onPaid = () => {
    show('Payment received — thank you for chipping in', 'success');
    setAwaitingPay(null);
    onClose();
  };

  /**
   * Step 2 — pay. `PaymentSheet` owns its own submit button, processing state and decline copy, so
   * this step passes no footer rather than adding a second button to compete with it.
   */
  if (awaitingPay) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        ariaLabel={`Pay your contribution to ${businessName}'s campaign`}
        initialSnap="full"
      >
        <Head>
          <Title>Pay {formatCents(awaitingPay.amountCents)}</Title>
          <Sub>
            Your contribution to {campaign.title} is reserved. It counts toward the goal once this
            payment goes through.
          </Sub>
        </Head>

        <Section>
          <PaymentSheet
            clientSecret={awaitingPay.clientSecret ?? 'demo'}
            amountCents={awaitingPay.amountCents}
            onSuccess={onPaid}
          />
        </Section>

        {/* The refund promise again, at the moment the card is actually handed over. */}
        <FinePrint>
          If the goal isn&rsquo;t reached by {formatDeadline(campaign.deadlineAt)}, this is{' '}
          {onUnmet === 'refund'
            ? 'refunded to you in full, automatically.'
            : 'put toward their next campaign — or refunded in full if they don’t start one within 60 days.'}
        </FinePrint>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      ariaLabel={`Chip in to ${businessName}'s campaign`}
      initialSnap="full"
      footer={
        <Button fullWidth disabled={!amountValid || !nameValid} loading={contribute.isPending} onClick={submit}>
          {amountValid ? `Chip in ${formatCents(effectiveCents)}` : 'Choose an amount'}
        </Button>
      }
    >
      <Head>
        <Title>{campaign.title}</Title>
        <Sub>
          Help {businessName} reach {formatCents(campaign.goalCents)} for a postcard drop in this
          neighbourhood. {formatCents(campaign.raisedCents)} raised so far.
        </Sub>
      </Head>

      <Section>
        <Label id="boost-amount-label">Amount</Label>
        <Presets role="group" aria-labelledby="boost-amount-label">
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
        {/*
          MB-4 — shown only when the server could establish a real mailing rate. It now reads that
          rate from the contracted print vendor, but the rule is unchanged: if the rate cannot be
          established the server returns null and we show nothing. Inventing "≈ 250 postcards" would
          be presenting a guess as a quote.

          ADR-006 §6 — the count is already net of the campaign service fee, and the fee is named
          here rather than buried, because it is deducted from what contributors give and this is
          the last screen before they give it.
        */}
        {estimate?.postcards ? (
          <Estimate>
            Roughly <b>{estimate.postcards.toLocaleString()}</b> postcards — an estimate, based on
            current mailing costs
            {estimate.serviceFeeCents > 0
              ? ` and after the ${formatCents(estimate.serviceFeeCents)} campaign service fee`
              : ''}
            .
          </Estimate>
        ) : null}
      </Section>

      {/*
        ═══ The disclosure. Above the pay button, always, whatever the amount. ═══
      */}
      <Disclosure>
        <DisclosureTitle>If the goal isn’t reached by {formatDeadline(campaign.deadlineAt)}</DisclosureTitle>
        <DisclosureBody>
          You get your money back <b>in full and automatically</b>. You don&rsquo;t need to ask, and
          nothing is deducted.
        </DisclosureBody>

        <Choice role="radiogroup" aria-label="If the campaign doesn’t reach its goal">
          <Option $selected={onUnmet === 'refund'}>
            <input
              type="radio"
              name="on-unmet"
              value="refund"
              checked={onUnmet === 'refund'}
              onChange={() => setOnUnmet('refund')}
            />
            <div>
              <OptionTitle>Refund me</OptionTitle>
              <OptionNote>The money comes back to your card.</OptionNote>
            </div>
          </Option>
          <Option $selected={onUnmet === 'roll_forward'}>
            <input
              type="radio"
              name="on-unmet"
              value="roll_forward"
              checked={onUnmet === 'roll_forward'}
              onChange={() => setOnUnmet('roll_forward')}
            />
            <div>
              <OptionTitle>Put it toward their next campaign</OptionTitle>
              {/* The time-box, stated. Otherwise this option is an open-ended hold on their money. */}
              <OptionNote>
                If they don&rsquo;t start one within 60 days, you&rsquo;re refunded anyway.
              </OptionNote>
            </div>
          </Option>
        </Choice>
      </Disclosure>

      <Section>
        <Switch label="Add my name" checked={beNamed} onChange={() => setBeNamed((v) => !v)} />
        <Quiet>
          {beNamed
            ? 'Your name will be shown with your contribution.'
            : 'Your contribution will be shown as anonymous.'}
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
      </Section>

      {/*
        CR-6 + ADR-006. Said before payment, in the negative: the rule is against CLAIMING a
        deduction or an investment, not against saying plainly that it is neither.
      */}
      <FinePrint>
        This is a contribution toward advertising for a local business. It is not a charitable
        donation, not an investment, and not tax-deductible — it gives you no ownership or share of
        the business. No fee is taken from your contribution; if the campaign funds, a service fee
        shown on the campaign page comes out of the total raised.
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
const Estimate = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Disclosure = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-top: ${({ theme }) => theme.space[5]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const DisclosureTitle = styled.h3`
  font-size: 14px;
  font-weight: 800;
`;
const DisclosureBody = styled.p`
  font-size: 13.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Choice = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Option = styled.label<{ $selected: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  cursor: pointer;
  background: ${({ theme, $selected }) =>
    $selected ? theme.color.surfaceRaised2 : 'transparent'};
  border: 1px solid ${({ theme, $selected }) => ($selected ? theme.color.line2 : theme.color.line)};
  input {
    margin-top: 2px;
    width: 18px;
    height: 18px;
    flex: none;
    accent-color: ${({ theme }) => theme.color.statusDiscount};
  }
`;
const OptionTitle = styled.p`
  font-size: 14px;
  font-weight: 600;
`;
const OptionNote = styled.p`
  font-size: 12.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textSecondary};
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
