'use client';

/**
 * C-22 Payment page — restates the total (it appears on the cart, here, and the Pay button by
 * design, since a mismatch here breaks trust instantly) and mounts the PaymentSheet. On success the
 * webhook/socket is the authoritative settle; we advance the order and route to the receipt (window)
 * or the tracker (order-ahead). Missing/expired intent → a recoverable error, never a stuck screen.
 */
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

  if (isLoading) {
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
