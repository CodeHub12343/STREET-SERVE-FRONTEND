'use client';

/**
 * C-22 Payment page — restates the total (it appears on the cart, here, and the Pay button by
 * design, since a mismatch here breaks trust instantly) and mounts the PaymentSheet. On success the
 * webhook/socket is the authoritative settle; we advance the order and route to the receipt (window)
 * or the tracker (order-ahead). Missing/expired intent → a recoverable error, never a stuck screen.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { PaymentSheet } from '@/features/payments';
import { useCartStore } from '@/stores/cart.store';
import { formatCents } from '@/lib/money';
import { useMarkPaid, useOrder } from '../hooks/useOrders';

export function PaymentPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: txn, isLoading } = useOrder(id);
  const markPaid = useMarkPaid(id);
  const clearCart = useCartStore((s) => s.clear);

  const nothingToPay = Boolean(txn) && (txn!.amountDueCents ?? txn!.breakdown.totalCents) <= 0;

  useEffect(() => {
    if (!nothingToPay || !txn) return;
    clearCart();
    router.replace(txn.context === 'window' ? `/order/${id}/receipt` : `/order/${id}`);
  }, [nothingToPay, txn, id, clearCart, router]);

  if (isLoading) {
    return (
      <Screen>
        <Skeleton $h="220px" $radius={16} />
      </Screen>
    );
  }

  /**
   * ═══ Nothing left to pay is a SUCCESS, not a dead session. ═══
   *
   * A fully covered Pay It Forward order has no charge at all, so there is no client secret — and
   * this screen used to read that as expiry and tell the customer "this payment session expired,
   * nothing was charged". The order had in fact been placed and the vendor was already making it.
   * The customer was told their order failed at the exact moment the community had paid for it in
   * full, and the likely response is to order again, or to walk away from food someone had bought
   * them.
   *
   * `amountDueCents` is the server's own answer to "is anything owed?", so it is the thing to read.
   * `OrderReview` no longer routes here in this case at all; this handles a refresh or a
   * bookmarked URL, which is exactly when a customer is already unsure whether it worked.
   */
  if (nothingToPay) {
    return (
      <Screen>
        <Skeleton $h="220px" $radius={16} />
      </Screen>
    );
  }

  if (!txn || !txn.clientSecret) {
    return (
      <Screen>
        <ErrorState
          title="This payment session expired"
          message="Head back and start your order again — nothing was charged."
          onRetry={() => router.replace('/map')}
        />
      </Screen>
    );
  }

  const onSuccess = () => {
    markPaid();
    clearCart();
    router.replace(txn.context === 'window' ? `/order/${id}/receipt` : `/order/${id}`);
  };

  return (
    <WizardFlow totalSteps={1} currentStep={1} title="Payment" onBack={() => router.back()}>
      <TotalLine>
        Paying <b className="tnum">{formatCents(txn.breakdown.totalCents)}</b> to {txn.businessName}
      </TotalLine>
      <PaymentSheet clientSecret={txn.clientSecret} amountCents={txn.breakdown.totalCents} onSuccess={onSuccess} />
    </WizardFlow>
  );
}

const Screen = styled.div`
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px;
`;
const TotalLine = styled.p`
  font-size: 15px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    color: ${({ theme }) => theme.color.textPrimary};
    font-size: 18px;
  }
`;
