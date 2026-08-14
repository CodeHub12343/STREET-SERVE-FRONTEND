'use client';

/**
 * PUBLIC customer payment page (Phase 2). No account, no app install — a street customer buying a
 * $5 item will not sign up first, and requiring it would simply lose the sale. Wallet buttons come
 * first because they are one tap.
 *
 * Mobile-first and deliberately sparse: this loads on a poor connection, outdoors, on a stranger's
 * phone. Everything the customer needs to decide is above the fold.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { ShieldCheck, Check } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Spinner } from '@/components/feedback/Spinner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { formatCents } from '@/lib/money';
import { usePayPage } from '../hooks/useSalePayment';
import { useRequestRefund } from '@/features/refunds';
import { PaymentSheet } from './PaymentSheet';

export function PayPage({ token }: { token: string }) {
  // After the card is confirmed with Stripe, the DB status flips via webhook — poll until it does.
  const [sent, setSent] = useState(false);
  const { data, isLoading, isError } = usePayPage(token, { poll: sent });

  if (isLoading) {
    return (
      <Shell>
        <Card><Skeleton $h="220px" $radius={16} /></Card>
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell>
        <Card>
          <ErrorState
            title="Payment link not found"
            message="Ask the seller to show you a new code."
          />
        </Card>
      </Shell>
    );
  }

  if (data.status === 'succeeded') {
    return (
      <Shell>
        <Card>
          <Paid>
            <Check size={44} aria-hidden />
            <PaidAmount className="tnum">{formatCents(data.amountCents)}</PaidAmount>
            <p>Paid to {data.businessName}. Thank you!</p>
          </Paid>
          <Receipt>
            <ReceiptRow><span>{data.quantity} × {data.productName}</span><span className="tnum">{formatCents(data.amountCents)}</span></ReceiptRow>
          </Receipt>
          {/* Consumer refund right — a request, reviewed by the seller or hub. */}
          <RefundRequest token={token} />
        </Card>
      </Shell>
    );
  }

  if (data.expired || data.status === 'expired' || data.status === 'cancelled') {
    return (
      <Shell>
        <Card>
          <ErrorState
            title="This payment code expired"
            message="Ask the seller to show you a new one."
          />
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <Seller>{data.businessName}</Seller>
        <Item>
          {data.quantity} × {data.productName}
        </Item>
        <Amount className="tnum">{formatCents(data.totalCents)}</Amount>

        {/* Tax must be visible, not folded into the price. */}
        {data.taxCents > 0 ? (
          <Breakdown>
            <BreakdownRow>
              <span>Subtotal</span>
              <span className="tnum">{formatCents(data.amountCents)}</span>
            </BreakdownRow>
            <BreakdownRow>
              <span>Sales tax</span>
              <span className="tnum">{formatCents(data.taxCents)}</span>
            </BreakdownRow>
          </Breakdown>
        ) : null}

        <Methods>
          {sent ? (
            // The card was confirmed with Stripe; the authoritative "paid" flip arrives via the
            // webhook, which the poll above is watching for. Never claim success before it lands.
            <Confirming role="status">
              <Spinner $size={18} />
              Payment sent — waiting for confirmation…
            </Confirming>
          ) : (
            // Stripe Payment Element (wallets + card) against the intent's clientSecret; falls back
            // to the demo form when Stripe isn't configured.
            <PaymentSheet
              clientSecret={data.clientSecret ?? 'demo'}
              amountCents={data.totalCents}
              onSuccess={() => setSent(true)}
            />
          )}
        </Methods>

        <Secure>
          <ShieldCheck size={14} aria-hidden /> Secured by Stripe
        </Secure>
      </Card>
    </Shell>
  );
}

/**
 * A customer's refund right, exercised straight from the receipt with no account. It files a
 * REQUEST rather than issuing a refund — anyone holding this link could otherwise drain a seller.
 */
function RefundRequest({ token }: { token: string }) {
  const request = useRequestRefund(token);
  const [open, setOpen] = useState(false);

  if (request.isSuccess) {
    return <Filed>Refund requested — the seller will be in touch.</Filed>;
  }

  if (!open) {
    return (
      <LinkButton type="button" onClick={() => setOpen(true)}>
        Something wrong? Request a refund
      </LinkButton>
    );
  }

  return (
    <Reasons>
      {(
        [
          ['defective', 'It’s damaged or faulty'],
          ['not_received', 'I didn’t get it'],
          ['customer_request', 'Something else'],
        ] as const
      ).map(([reason, label]) => (
        <Button
          key={reason}
          variant="secondary"
          fullWidth
          loading={request.isPending}
          onClick={() => request.mutate(reason)}
        >
          {label}
        </Button>
      ))}
    </Reasons>
  );
}

const Reasons = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding-top: ${({ theme }) => theme.space[2]}px;
`;
const LinkButton = styled.button`
  border: 0;
  background: none;
  padding: 0;
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
  color: ${({ theme }) => theme.color.textSecondary};
  justify-self: center;
`;
const Filed = styled.p`
  font-size: 13px;
  text-align: center;
  color: ${({ theme }) => theme.color.statusLive};
`;
const Shell = styled.main`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space[4]}px;
  background: ${({ theme }) => theme.color.surfaceBase};
`;
const Card = styled.div`
  width: 100%;
  max-width: 420px;
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Seller = styled.p`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Item = styled.p`
  font-size: 17px;
  font-weight: 700;
`;
const Amount = styled.p`
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;
const Breakdown = styled.div`
  display: grid;
  gap: 4px;
  padding-top: ${({ theme }) => theme.space[2]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;
const BreakdownRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Methods = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-top: ${({ theme }) => theme.space[2]}px;
`;
const Confirming = styled.p`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[3]}px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Secure = styled.p`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Paid = styled.div`
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  color: ${({ theme }) => theme.color.statusLive};
  p {
    font-size: 14px;
    color: ${({ theme }) => theme.color.textSecondary};
    text-align: center;
  }
`;
const PaidAmount = styled.p`
  font-size: 36px;
  font-weight: 800;
`;
const Receipt = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding-top: ${({ theme }) => theme.space[3]}px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
`;
const ReceiptRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
