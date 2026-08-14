'use client';

/**
 * PIF-4 — the offer at checkout. **This is the hardest screen in the feature**, and the audit says
 * so: accepting help in a queue, in public, on a phone somebody might be able to see, is the barrier
 * the whole product has to clear. Everything here is shaped by that.
 *
 * What it deliberately does NOT do:
 *
 *  • **No celebration.** No confetti, no hearts, no "🎉 Someone bought your lunch!". A person who is
 *    short of money this week does not want their phone to throw a party about it.
 *  • **No qualification.** It never asks whether you need it, and there is no "are you sure?".
 *    Asking someone to justify taking help is how you make sure they don't.
 *  • **No charity words.** Not "free", not "donated", not "help for those in need". The framing is
 *    that a neighbour already paid, and it's there to be used — a fact, not a favour.
 *  • **No loud colour.** It reads as an ordinary line in the summary, at a glance indistinguishable
 *    from a discount row to anyone glancing over a shoulder.
 *
 * It is a plain checkbox because a checkbox is the quietest control there is. One tap, no dialog,
 * reversible before you pay.
 */
import styled from 'styled-components';
import { formatCents } from '@/lib/money';
import type { PayForwardOffer, PayForwardReason } from '../types';

/**
 * Reasons the fund did not apply, in the customer's language. `daily_limit` is the one that must
 * never leak untranslated — and its wording avoids implying the person did anything wrong.
 */
function explain(reason: PayForwardReason): string | null {
  switch (reason) {
    case 'daily_limit':
      return 'The fund has already covered an order for you here today.';
    case 'verification_required':
      return 'Verify your account to use the community fund.';
    case 'exhausted':
      return null; // Nothing in the pot. Saying so at checkout helps nobody.
    default:
      return null;
  }
}

export function PayItForwardOffer({
  offer,
  checked,
  onChange,
}: {
  offer: PayForwardOffer | undefined;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  if (!offer) return null;

  if (offer.availableCents <= 0) {
    const note = explain(offer.reason);
    return note ? <Unavailable role="note">{note}</Unavailable> : null;
  }

  return (
    <Row>
      <Check
        type="checkbox"
        id="pay-it-forward-offer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Label htmlFor="pay-it-forward-offer">
        <Line1>
          Use {formatCents(offer.availableCents)} from the community fund
        </Line1>
        {/*
          Who knows: nobody. Stated explicitly because it is the actual question in the reader's
          head, and leaving them to guess is what stops them tapping.
        */}
        <Line2>Someone already paid this forward. The business isn&rsquo;t told who uses it.</Line2>
      </Label>
    </Row>
  );
}

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Check = styled.input`
  margin-top: 2px;
  width: 20px;
  height: 20px;
  flex: none;
  accent-color: ${({ theme }) => theme.color.statusDiscount};
`;
const Label = styled.label`
  display: grid;
  gap: 2px;
  cursor: pointer;
`;
const Line1 = styled.span`
  font-size: 14px;
  font-weight: 600;
`;
const Line2 = styled.span`
  font-size: 12.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Unavailable = styled.p`
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
