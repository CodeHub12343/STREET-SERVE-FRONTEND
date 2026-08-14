'use client';

/**
 * Seller "Collect payment" (Phase 2 digital rail). The seller picks quantity, the server prices it,
 * and a QR appears for the customer to scan with their own phone — no card reader, no app install.
 *
 * Designed to be used one-handed, outdoors, in sunlight: large targets, high contrast, and the
 * seller's own take shown before they choose a rail, because that is the number they think in.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import QRCode from 'qrcode';
import { Banknote, CreditCard, Check, X } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { useCheckout, useFeePreview } from '@/features/consignment/hooks/useConsignment';
import { useCancelSalePayment, useCreateSalePayment, useSalePaymentStatus } from '../hooks/useSalePayment';
import type { SalePaymentIntent } from '../types';

export function CollectPayment({ checkoutId }: { checkoutId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: checkout } = useCheckout(checkoutId);
  const create = useCreateSalePayment();
  const cancel = useCancelSalePayment();

  const [qty, setQty] = useState('1');
  const [error, setError] = useState<string>();
  const [intent, setIntent] = useState<SalePaymentIntent>();
  const idemKey = useRef(`sale_${crypto.randomUUID()}`);

  const quantity = Number.parseInt(qty, 10);
  const unitPrice = checkout?.currentUnitPriceCents ?? checkout?.unitPriceCents ?? 0;
  const remaining = checkout ? checkout.quantity - checkout.soldQty : 0;

  // Server-computed preview so the seller sees their take before choosing a rail.
  const { data: preview } = useFeePreview(
    unitPrice,
    checkout?.sellerSplitPercent ?? 0,
    Number.isFinite(quantity) ? quantity : 0,
  );

  const { data: status } = useSalePaymentStatus(intent?.id, Boolean(intent));
  const paid = status?.status === 'succeeded';

  const start = () => {
    if (!Number.isFinite(quantity) || quantity <= 0) return setError('Enter a quantity');
    if (quantity > remaining) return setError(`Only ${remaining} left to sell`);
    setError(undefined);
    create.mutate(
      { checkoutId, quantity, idempotencyKey: idemKey.current },
      {
        onSuccess: setIntent,
        onError: (e) => show(e instanceof AppApiError ? e.message : 'Could not start the payment', 'danger'),
      },
    );
  };

  const abandon = () => {
    if (!intent) return;
    cancel.mutate(intent.id, {
      onSuccess: () => {
        setIntent(undefined);
        idemKey.current = `sale_${crypto.randomUUID()}`;
      },
    });
  };

  if (paid) {
    return (
      <WizardFlow
        totalSteps={2}
        currentStep={2}
        title="Paid"
        onBack={() => router.replace('/seller/inventory')}
        footer={<Button fullWidth onClick={() => router.replace('/seller/inventory')}>Done</Button>}
      >
        <Success>
          <Check size={48} aria-hidden />
          <SuccessAmount className="tnum">{formatCents(intent!.amountCents)}</SuccessAmount>
          <p>Paid. Your share is on its way to your account.</p>
        </Success>
      </WizardFlow>
    );
  }

  if (intent) {
    return (
      <WizardFlow
        totalSteps={2}
        currentStep={2}
        title="Show this to your customer"
        onBack={abandon}
        footer={
          <Button fullWidth variant="secondary" loading={cancel.isPending} onClick={abandon}>
            <X size={16} /> Cancel this sale
          </Button>
        }
      >
        <QrPanel>
          <QrCanvas value={intent.payUrl} />
          <QrAmount className="tnum">{formatCents(intent.amountCents)}</QrAmount>
          <QrMeta>{intent.quantity} × {formatCents(intent.unitPriceCents)}</QrMeta>
          <Waiting>Waiting for payment…</Waiting>
        </QrPanel>
        <Banner tone="info">
          The customer scans this with their phone camera and pays by card, Apple Pay, or Google Pay.
          No app needed. This code expires in 15 minutes.
        </Banner>
      </WizardFlow>
    );
  }

  return (
    <WizardFlow
      totalSteps={2}
      currentStep={1}
      title="Sell an item"
      onBack={() => router.back()}
      footer={
        <Footer>
          <Button fullWidth loading={create.isPending} onClick={start}>
            <CreditCard size={16} /> Card / QR
          </Button>
          <Button
            variant="tertiary"
            fullWidth
            onClick={() => router.push(`/seller/checkout/${checkoutId}/sale`)}
          >
            <Banknote size={16} /> Paid in cash instead
          </Button>
        </Footer>
      }
    >
      {!checkout ? (
        <Skeleton $h="160px" $radius={16} />
      ) : (
        <>
          <Product>
            <ProductName>{checkout.productName}</ProductName>
            <ProductMeta>{remaining} left · {formatCents(unitPrice)} each</ProductMeta>
          </Product>

          <Input
            label="How many?"
            type="number"
            inputMode="numeric"
            min="1"
            max={String(remaining)}
            value={qty}
            error={error}
            onChange={(e) => setQty(e.target.value)}
          />

          <Totals>
            <Line><span>Customer pays</span><b className="tnum">{formatCents(unitPrice * (quantity || 0))}</b></Line>
            {preview ? (
              <Line $accent>
                <span>You keep</span>
                <b className="tnum">{formatCents(preview.sellerNetCents)}</b>
              </Line>
            ) : null}
          </Totals>

          <Nudge>
            Card sales pay out automatically and cost a lower platform fee than cash.
          </Nudge>
        </>
      )}
    </WizardFlow>
  );
}

/** Renders the payment URL as a scannable QR on a canvas. */
function QrCanvas({ value }: { value: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    // High error-correction + wide margin: the code is read off a phone screen outdoors.
    void QRCode.toCanvas(ref.current, value, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  }, [value]);
  return <Canvas ref={ref} aria-label="Payment QR code" role="img" />;
}

const Footer = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const Product = styled.div`
  display: grid;
  gap: 2px;
`;
const ProductName = styled.p`
  font-size: 18px;
  font-weight: 750;
`;
const ProductMeta = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Totals = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Line = styled.div<{ $accent?: boolean }>`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    font-size: ${({ $accent }) => ($accent ? '22px' : '16px')};
    color: ${({ $accent, theme }) => ($accent ? theme.color.statusLive : theme.color.textPrimary)};
  }
`;
const Nudge = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const QrPanel = styled.div`
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[5]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: #ffffff;
`;
const Canvas = styled.canvas`
  width: 240px;
  height: 240px;
  max-width: 100%;
`;
const QrAmount = styled.p`
  font-size: 32px;
  font-weight: 800;
  color: #14151a;
`;
const QrMeta = styled.p`
  font-size: 13px;
  color: #5b5e68;
`;
const Waiting = styled.p`
  font-size: 13px;
  font-weight: 600;
  color: #5b5e68;
`;
const Success = styled.div`
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[6]}px;
  color: ${({ theme }) => theme.color.statusLive};
  p {
    font-size: 14px;
    color: ${({ theme }) => theme.color.textSecondary};
    text-align: center;
  }
`;
const SuccessAmount = styled.p`
  font-size: 40px;
  font-weight: 800;
`;
