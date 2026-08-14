'use client';

/**
 * DAN-1 — the vendor's "Need Delivery Help" control, on an order they have already accepted.
 *
 * ## The vendor names the price
 *
 * ADR-004 §2: a platform-set rate a driver only discovers after accepting is the kind of control
 * that stops an engagement being one. So this asks the vendor what the trip is worth to them, shows
 * that number to every driver in range, and snapshots it — it cannot move once the offer is out.
 *
 * The presets exist so the common case is one tap; the custom field exists because a vendor two
 * miles from anywhere knows something the platform does not.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Bike } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { Input } from '@/components/primitives/Input';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { useRequestDelivery } from '../hooks/useDelivery';

/** Mirrors the backend bounds ($2–$50). */
const MIN_CENTS = 200;
const MAX_CENTS = 5_000;
const PRESETS = [500, 800, 1200, 2000];

export function RequestDriverButton({ orderId }: { orderId: string }) {
  const { show } = useToast();
  const request = useRequestDelivery();
  const [open, setOpen] = useState(false);
  const [payout, setPayout] = useState(PRESETS[1]!);
  const [custom, setCustom] = useState('');

  const customCents = Math.round(Number(custom.replace(/[^0-9.]/g, '')) * 100);
  const effective = custom.trim() ? customCents : payout;
  const valid = Number.isFinite(effective) && effective >= MIN_CENTS && effective <= MAX_CENTS;

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Bike size={16} aria-hidden /> Need delivery help
      </Button>
    );
  }

  return (
    <Card>
      <Title>What will you pay a driver?</Title>
      {/* Said plainly, because it is the thing that makes an offer get taken or ignored. */}
      <Quiet>
        Drivers nearby see this amount before they decide. The first one to take it collects from
        you.
      </Quiet>

      <Presets role="group" aria-label="Driver payment">
        {PRESETS.map((cents) => (
          <Chip
            key={cents}
            selected={!custom.trim() && payout === cents}
            onClick={() => {
              setPayout(cents);
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
        error={custom.trim() && !valid ? 'Enter an amount in that range' : undefined}
        inputMode="decimal"
        placeholder="0.00"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
      />

      <Actions>
        <Button
          disabled={!valid}
          loading={request.isPending}
          onClick={() =>
            request.mutate(
              { orderId, driverPayoutCents: effective },
              {
                onSuccess: () => {
                  show('Asking drivers nearby', 'success');
                  setOpen(false);
                },
                onError: (e) =>
                  show(
                    e instanceof AppApiError ? e.message : 'Could not request a driver',
                    'danger',
                  ),
              },
            )
          }
        >
          Ask drivers · {valid ? formatCents(effective) : '—'}
        </Button>
        <Button variant="tertiary" onClick={() => setOpen(false)}>
          Not now
        </Button>
      </Actions>

      {/*
        DAN-13. The likely outcome, said before they commit — and the fact that costs nothing either
        way. A vendor who thinks requesting a driver might charge their customer will not try it.
      */}
      <FinePrint>
        If nobody&rsquo;s free, nothing happens and your customer isn&rsquo;t charged for delivery.
      </FinePrint>
    </Card>
  );
}

const Card = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Title = styled.h3`
  font-size: 15px;
  font-weight: 800;
`;
const Quiet = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Presets = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const FinePrint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
