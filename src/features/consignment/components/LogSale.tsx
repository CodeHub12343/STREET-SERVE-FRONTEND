'use client';

/**
 * S-08 Log a Sale (docs/13 S-08) — quantity + method. Guarded against overselling: the server
 * returns 409 if you try to sell more than you hold, surfaced as a specific block (not a generic
 * error). 💳 with an idempotency key so a double-tap can't double-count.
 */
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Stepper } from '@/components/primitives/Stepper';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { newIdempotencyKey } from '@/lib/idempotency';
import { formatCents } from '@/lib/money';
import { AppApiError } from '@/lib/api/errors';
import { useCheckout, useLogSale } from '../hooks/useConsignment';

export function LogSale({ checkoutId }: { checkoutId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: checkout, isLoading } = useCheckout(checkoutId);
  const logSale = useLogSale(checkoutId);
  const idemKey = useRef(newIdempotencyKey());
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<'cash' | 'card'>('cash');
  const [oversell, setOversell] = useState<string>();

  const remaining = checkout ? checkout.quantity - checkout.soldQty : 0;

  const submit = () => {
    setOversell(undefined);
    logSale.mutate(
      {
        qty,
        saleAmountCents: qty * (checkout?.unitPriceCents ?? 0),
        paymentRail: method === 'card' ? 'digital' : 'cash',
        idempotencyKey: idemKey.current,
      },
      {
        onSuccess: (result) => {
          // A cash sale creates a real obligation. The seller must learn that HERE, not discover it
          // later when a payout comes up short.
          const owed = result?.debtCents ?? 0;
          show(
            owed > 0
              ? `Logged. You keep the cash — ${formatCents(owed)} comes out of your next card sale.`
              : `Logged ${qty} sale${qty > 1 ? 's' : ''}`,
            owed > 0 ? 'default' : 'success',
          );
          router.replace('/seller/inventory');
        },
        onError: (e) => {
          if (e instanceof AppApiError && e.isOversell) setOversell(e.message);
          else show('Could not log the sale', 'danger');
        },
      },
    );
  };

  return (
    <WizardFlow
      totalSteps={1}
      currentStep={1}
      title="Log a sale"
      onBack={() => router.back()}
      footer={
        <Button fullWidth disabled={!checkout || remaining === 0} loading={logSale.isPending} onClick={submit}>
          Log sale
        </Button>
      }
    >
      {isLoading || !checkout ? (
        <Skeleton $h="160px" $radius={16} />
      ) : (
        <>
          <Product>{checkout.productName}</Product>
          <Left className="tnum">{remaining} left to sell</Left>

          {oversell ? <Banner tone="danger" title="Can’t sell that many">{oversell}</Banner> : null}

          <Row>
            <Label>Quantity sold</Label>
            <Stepper value={qty} min={1} max={Math.max(1, remaining)} onChange={setQty} ariaLabel="Quantity sold" />
          </Row>

          <Row>
            <Label>Payment method</Label>
            <SegmentedControl ariaLabel="Method" value={method} onChange={setMethod} segments={[{ value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }]} />
          </Row>
        </>
      )}
    </WizardFlow>
  );
}

const Product = styled.h1`
  font-size: 22px;
`;
const Left = styled.p`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Label = styled.span`
  font-size: 15px;
  font-weight: 600;
`;
