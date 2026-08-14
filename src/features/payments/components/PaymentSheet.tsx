'use client';

/**
 * C-22 Payment sheet (PAYMENTS_IMPLEMENTATION.md §2,§4). Confirms a PaymentIntent with Stripe
 * Elements when configured; otherwise a simulated form so the money path is walkable in demo/dev.
 * Money-safety states: processing (a real Spinner — the sanctioned exception), a failure banner
 * that names what actually went wrong, never a silent retry. The amount is restated on the button.
 *
 * **A failure is classified before it is worded.** An incomplete form, a refused card, and an
 * outage are three different things to the person paying, and only one of them means "try a
 * different card" — see `toFailure`.
 */
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { Spinner } from '@/components/feedback/Spinner';
import { getStripe } from '@/lib/stripe/loadStripe';
import { isStripeConfigured } from '@/lib/env';
import { formatCents } from '@/lib/money';
import type { Cents } from '@/types';

export interface PaymentSheetProps {
  clientSecret: string;
  amountCents: Cents;
  onSuccess: () => void;
}

export function PaymentSheet({ clientSecret, amountCents, onSuccess }: PaymentSheetProps) {
  const useReal = isStripeConfigured && clientSecret !== 'demo';
  const stripePromise = useMemo(() => (useReal ? getStripe() : null), [useReal]);

  if (useReal && stripePromise) {
    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <RealPaymentForm amountCents={amountCents} onSuccess={onSuccess} />
      </Elements>
    );
  }
  return <DemoPaymentForm amountCents={amountCents} onSuccess={onSuccess} />;
}

// ---- Real Stripe path ----
/**
 * Not every failure is a decline.
 *
 * `confirmPayment` returns an error for incomplete fields just as it does for a refused card, and
 * this form used to discard the error object and report BOTH as "Payment declined — try a different
 * method". That is actively misleading in the most common case: someone presses Pay before finishing
 * the card number, nothing is ever sent to their bank, and they are told their bank said no. They
 * then go hunting for another card to fix a typo.
 *
 * Stripe documents `card_error` and `validation_error` messages as safe to show a user, and they are
 * better written than anything we would invent ("Your card's security code is incomplete."). Every
 * other type is an internal problem the buyer can do nothing about, so it gets a generic line.
 */
export type PayFailure = { kind: 'declined' | 'incomplete' | 'error'; message: string };

const FAILURE_TITLE: Record<PayFailure['kind'], string> = {
  declined: 'Payment declined',
  incomplete: 'Check your card details',
  error: 'Payment could not be completed',
};

export function toFailure(error: { type?: string; message?: string }): PayFailure {
  if (error.type === 'validation_error') {
    return {
      kind: 'incomplete',
      // No "nothing was taken" here — nothing was even attempted, and saying so implies it was.
      message: error.message ?? 'Some card details are missing or incomplete.',
    };
  }
  if (error.type === 'card_error') {
    return {
      kind: 'declined',
      message: `${error.message ?? 'Your card was declined.'} Nothing was taken — your order is held, not lost.`,
    };
  }
  return {
    kind: 'error',
    message: 'Something went wrong on our side. Nothing was taken — please try again.',
  };
}

function RealPaymentForm({ amountCents, onSuccess }: { amountCents: Cents; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [failure, setFailure] = useState<PayFailure | null>(null);

  const pay = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    setFailure(null);

    /**
     * `confirmPayment` reports incomplete fields itself, as a `validation_error`. An explicit
     * `elements.submit()` first is only REQUIRED for deferred-intent mode; this sheet passes a
     * client secret up front, so adding that call would risk a working path for nothing.
     */
    const { error } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    if (error) {
      setFailure(toFailure(error));
      setProcessing(false);
      return;
    }
    // The webhook/socket is the authoritative settle; the POST/confirm is the ticket.
    onSuccess();
  };

  return (
    <Form>
      {failure ? (
        <Banner tone="danger" title={FAILURE_TITLE[failure.kind]}>
          {failure.message}
        </Banner>
      ) : null}
      <PaymentElement />
      <PayButton amountCents={amountCents} processing={processing} onClick={() => void pay()} />
    </Form>
  );
}

// ---- Demo path (no Stripe key) ----
function DemoPaymentForm({ amountCents, onSuccess }: { amountCents: Cents; onSuccess: () => void }) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'declined'>('idle');
  const [simulateDecline, setSimulateDecline] = useState(false);

  const pay = () => {
    setStatus('processing');
    setTimeout(() => {
      if (simulateDecline) {
        setStatus('declined');
      } else {
        onSuccess();
      }
    }, 1400);
  };

  return (
    <Form>
      {status === 'declined' ? (
        <Banner tone="danger" title="Payment declined">
          Nothing was taken — your order is held, not lost. Try a different method.
        </Banner>
      ) : null}
      <DemoCard>
        <CreditCard size={18} aria-hidden />
        <span>•••• •••• •••• 4242</span>
        <em>Demo card</em>
      </DemoCard>
      <DeclineToggle>
        <input type="checkbox" checked={simulateDecline} onChange={(e) => setSimulateDecline(e.target.checked)} />
        Simulate a declined card
      </DeclineToggle>
      <PayButton amountCents={amountCents} processing={status === 'processing'} onClick={pay} />
      <DemoNote>Demo mode — no real charge. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for live Stripe Elements.</DemoNote>
    </Form>
  );
}

function PayButton({ amountCents, processing, onClick }: { amountCents: Cents; processing: boolean; onClick: () => void }) {
  return (
    <Button fullWidth loading={processing} onClick={onClick}>
      {processing ? <Spinner $size={18} /> : `Pay ${formatCents(amountCents)}`}
    </Button>
  );
}

const Form = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const DemoCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  em {
    margin-left: auto;
    font-style: normal;
    font-size: 12px;
    color: ${({ theme }) => theme.color.textTertiary};
  }
`;
const DeclineToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const DemoNote = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  text-align: center;
`;
