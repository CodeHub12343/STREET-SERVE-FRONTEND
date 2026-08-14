'use client';

/**
 * Step 3 — how many, and when.
 *
 * ## No price is shown here, on purpose
 *
 * It would be easy to multiply a quantity by a rate and render a running total. It would also be
 * wrong: the vendor prices in volume bands, so the per-card cost changes as the quantity crosses a
 * break, and a number computed in the browser would disagree with the real quote. Every price in
 * this feature comes from the server, which gets it from the vendor (audit F-9). The buyer sees the
 * real figure one step later, before paying anything.
 *
 * ## The mail date is a date, not "soon"
 *
 * The vendor batches at the end of each day, so the chosen date decides which batch the order joins
 * — and it is also the deadline for cancelling. Saying that here is cheaper than explaining it
 * afterwards.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { Input } from '@/components/primitives/Input';
import type { PostcardOrder, PostcardProduct } from '../../types';

/** Tomorrow, in the `yyyy-mm-dd` an `<input type="date">` expects. */
function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function QuantityStep({
  order,
  product,
  busy,
  onConfirm,
}: {
  order: PostcardOrder;
  product: PostcardProduct | undefined;
  busy: boolean;
  onConfirm: (quantity: number, mailDate: string) => void;
}) {
  const min = product?.minQuantity ?? 1;
  const max = product?.maxQuantity ?? 50_000;

  const [quantity, setQuantity] = useState<number>(order.quantity ?? min);
  const [mailDate, setMailDate] = useState<string>(order.mailDate?.slice(0, 10) ?? tomorrowIso());

  const tooFew = quantity < min;
  const tooMany = quantity > max;
  const invalid = tooFew || tooMany || !Number.isFinite(quantity);

  return (
    <section aria-labelledby="pc-qty-heading">
      <Heading id="pc-qty-heading">How many cards, and when</Heading>

      <Fields>
        <Input
          label="Number of postcards"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={String(quantity)}
          onChange={(e) => setQuantity(Number(e.target.value))}
          hint={`Between ${min.toLocaleString()} and ${max.toLocaleString()} for this size.`}
          error={
            tooFew
              ? `The printer's minimum for this size is ${min.toLocaleString()} cards.`
              : tooMany
                ? `The most you can send in one order is ${max.toLocaleString()} cards.`
                : undefined
          }
        />

        <Input
          label="Mail date"
          type="date"
          min={tomorrowIso()}
          value={mailDate}
          onChange={(e) => setMailDate(e.target.value)}
          hint="Your order joins the printer's batch for this day."
        />
      </Fields>

      <Banner tone="info" title="Price comes next">
        Printing is priced in volume bands, so we ask the printer for the exact figure rather than
        estimating it here. You will see the full cost before you pay.
      </Banner>

      <Actions>
        <Button onClick={() => onConfirm(quantity, mailDate)} disabled={invalid || busy} loading={busy}>
          Continue
        </Button>
      </Actions>
    </section>
  );
}

const Heading = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[3]}px;
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.scale[3]}px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.space[4]}px;
`;
