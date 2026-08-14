'use client';

/**
 * S-09 Return Flow (docs/13 S-09) — QR scan-in at the hub, condition photos, and a reconcile
 * preview (sold vs returning) before confirming. On confirm → settlement.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { CheckCircle2 } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { QRScanner } from '@/components/media/QRScanner';
import { PhotoCapture } from '@/components/media/PhotoCapture';
import { useToast } from '@/components/feedback/ToastProvider';
import { useCheckout, useReturnCheckout } from '../hooks/useConsignment';

export function ReturnFlow({ checkoutId }: { checkoutId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: checkout, isLoading } = useCheckout(checkoutId);
  const doReturn = useReturnCheckout(checkoutId);
  const [scanned, setScanned] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const returning = checkout ? checkout.quantity - checkout.soldQty : 0;

  const confirm = () => {
    doReturn.mutate({ quantityReturned: returning, conditionPhotoUrl: photos[0] }, {
      onSuccess: () => {
        show('Returned — settlement ready', 'success');
        router.replace(`/seller/checkout/${checkoutId}/settlement`);
      },
      onError: () => show('Could not process the return', 'danger'),
    });
  };

  return (
    <WizardFlow
      totalSteps={1}
      currentStep={1}
      title="Return unsold items"
      onBack={() => router.back()}
      footer={
        <Button fullWidth disabled={!scanned || !checkout} loading={doReturn.isPending} onClick={confirm}>
          {scanned ? 'Confirm return' : 'Scan the station QR first'}
        </Button>
      }
    >
      {isLoading || !checkout ? (
        <Skeleton $h="220px" $radius={16} />
      ) : !scanned ? (
        <>
          <Step>Scan the hub’s return station QR</Step>
          <QRScanner onScan={() => setScanned(true)} expectedCode="SS-STATION-01" />
        </>
      ) : (
        <>
          <Scanned><CheckCircle2 size={18} aria-hidden /> Station verified</Scanned>
          <Step>Condition photos (recommended)</Step>
          <PhotoCapture purpose="condition" onChange={setPhotos} label="Photo of returned goods" />

          <Reconcile>
            <Line><span>Checked out</span><b className="tnum">{checkout.quantity}</b></Line>
            <Line><span>Sold</span><b className="tnum">{checkout.soldQty}</b></Line>
            <Line $highlight><span>Returning now</span><b className="tnum">{returning}</b></Line>
          </Reconcile>
        </>
      )}
    </WizardFlow>
  );
}

const Step = styled.h2`
  font-size: 14px;
  font-weight: 700;
`;
const Scanned = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.color.statusLive};
  font-weight: 700;
  font-size: 14px;
`;
const Reconcile = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Line = styled.div<{ $highlight?: boolean }>`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: ${({ theme, $highlight }) => ($highlight ? theme.color.textPrimary : theme.color.textSecondary)};
  font-weight: ${({ $highlight }) => ($highlight ? 700 : 400)};
`;
