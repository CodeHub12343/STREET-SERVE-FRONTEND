'use client';

/**
 * Step 5 — review, and the point of no return.
 *
 * ## The one screen in this feature that has to be unambiguous
 *
 * Everything before this is reversible. This is not: once the printer's batch for the mail date
 * closes, the paper exists and no refund brings it back. The audit made the irreversibility a
 * first-class rule (F-4, ADR-007 §2), and the honest way to honour it in a UI is to state it in
 * plain words directly above the pay button — not in terms, not in a tooltip, and not afterwards.
 *
 * ## An expired quote is shown, not silently re-priced
 *
 * The vendor publishes prices but does not reserve them, so a quote goes stale (audit F-8).
 * Quietly refreshing the number while someone is looking at it would change the price under them;
 * hiding the staleness would let us charge yesterday's figure. So the price is shown WITH its
 * expiry, and a lapsed one has to be refreshed by a deliberate press.
 *
 * ## Every line of the money is itemised
 *
 * Printing, postage and our margin are one figure to the buyer because that is what a retail price
 * is — but tax is separate, and what was QUOTED is separate from what was CHARGED. Conflating them
 * would hide the difference at exactly the moment someone is checking a receipt.
 */
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { useCheckoutOrder, useQuoteOrder } from '../../hooks/usePostcards';
import type { PostcardOrder } from '../../types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ReviewStep({
  order,
  businessId,
}: {
  order: PostcardOrder;
  businessId: string;
}) {
  const { show } = useToast();
  const quote = useQuoteOrder(order.id);
  const checkout = useCheckoutOrder(order.id, businessId);

  const price = order.price;
  const expired = price?.isExpired ?? false;
  const alreadyPaid = order.status !== 'draft' && order.status !== 'quoted';

  async function pay(): Promise<void> {
    try {
      await checkout.mutateAsync();
      show('Payment started. We will email your receipt.', 'success');
    } catch (err) {
      show(
        err instanceof AppApiError ? err.message : 'We could not take that payment.',
        'danger',
      );
    }
  }

  return (
    <section aria-labelledby="pc-review-heading">
      <Heading id="pc-review-heading">Check everything, then pay</Heading>

      <Summary>
        <Row>
          <dt>Postcards</dt>
          <dd>{order.quantity?.toLocaleString() ?? '—'}</dd>
        </Row>
        <Row>
          <dt>Mail date</dt>
          <dd>{formatDate(order.mailDate)}</dd>
        </Row>
        <Row>
          <dt>Class</dt>
          <dd>{order.mailClass === 'first_class' ? 'First Class' : 'Standard'}</dd>
        </Row>
      </Summary>

      {price ? (
        <Money>
          <Row>
            <dt>Printing, postage and service</dt>
            <dd>{formatCents(price.totalCents)}</dd>
          </Row>
          {order.payment?.taxCents ? (
            <Row>
              <dt>Tax</dt>
              <dd>{formatCents(order.payment.taxCents)}</dd>
            </Row>
          ) : null}
          <TotalRow>
            <dt>Total</dt>
            <dd>{formatCents((order.payment?.chargedCents ?? price.totalCents))}</dd>
          </TotalRow>
        </Money>
      ) : (
        <Banner tone="warning">This order has not been priced yet.</Banner>
      )}

      {expired ? (
        <Banner
          tone="warning"
          title="This price has expired"
          action={
            <Button
              size="compact"
              variant="secondary"
              onClick={() => void quote.mutateAsync()}
              loading={quote.isPending}
            >
              Get an up-to-date price
            </Button>
          }
        >
          Printing and postage rates move, so we only hold a price for a short time. Refresh it
          before paying — the new figure may differ.
        </Banner>
      ) : null}

      {/**
       * The irreversibility notice. `role="note"` and placed immediately before the pay control, so
       * it is read in the same breath as the button rather than as decoration further up the page.
       */}
      <PointOfNoReturn role="note" aria-labelledby="pc-ponr-title">
        <PonrTitle id="pc-ponr-title">Once this is printed, it cannot be undone</PonrTitle>
        <p>
          You can cancel free of charge up until your mail date, {formatDate(order.mailDate)}. After
          the printer starts that day&rsquo;s batch, your cards are physically printed and posted —
          they cannot be recalled, changed or refunded.
        </p>
        <p>
          A person reviews your design before printing. If we cannot print it, you get a full refund.
        </p>
      </PointOfNoReturn>

      {alreadyPaid ? (
        <Banner tone="success" title="This order is paid">
          Nothing more to do — you can follow its progress from your orders list.
        </Banner>
      ) : (
        <Actions>
          <Button
            onClick={() => void pay()}
            disabled={!price || expired || checkout.isPending}
            loading={checkout.isPending}
            fullWidth
          >
            {price ? `Pay ${formatCents(price.totalCents)} and send` : 'Pay and send'}
          </Button>
        </Actions>
      )}
    </section>
  );
}

const Heading = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[3]}px;
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.scale[3]}px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const Summary = styled.dl`
  margin: 0 0 ${({ theme }) => theme.space[4]}px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const Money = styled.dl`
  margin: 0 0 ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceRaised};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]}px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  /* An audience description can be a long unbroken string; let it wrap rather than widen the page. */
  flex-wrap: wrap;

  dt {
    color: ${({ theme }) => theme.color.textSecondary};
    min-width: 0;
  }
  dd {
    margin: 0;
    color: ${({ theme }) => theme.color.textPrimary};
    font-variant-numeric: tabular-nums;
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: right;
  }
`;

const TotalRow = styled(Row)`
  padding-top: ${({ theme }) => theme.space[2]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line2};

  dt,
  dd {
    color: ${({ theme }) => theme.color.textPrimary};
    font-weight: 700;
  }
`;

const PointOfNoReturn = styled.div`
  margin: ${({ theme }) => theme.space[4]}px 0;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.statusWarning};
  background: ${({ theme }) => theme.color.surfaceRaised};

  p {
    margin: 0 0 ${({ theme }) => theme.space[2]}px;
    color: ${({ theme }) => theme.color.textSecondary};
    font-size: ${({ theme }) => theme.typography.scale[1]}px;
    line-height: ${({ theme }) => theme.typography.lineBody};

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const PonrTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space[2]}px;
  font-size: ${({ theme }) => theme.typography.scale[2]}px;
  color: ${({ theme }) => theme.color.textPrimary};
`;

const Actions = styled.div`
  display: flex;
`;
