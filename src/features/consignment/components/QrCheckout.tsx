'use client';

/**
 * S-06 QR Checkout (docs/13 S-06) — scan the hub station QR, capture a condition photo, review the
 * summary, and confirm. The confirm is a 💳 POST /checkouts with a stable idempotency key
 * (PAYMENTS_IMPLEMENTATION.md §3). Reassures "you owe nothing until you sell" at the pickup moment.
 */
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { QRScanner } from '@/components/media/QRScanner';
import { PhotoCapture } from '@/components/media/PhotoCapture';
import { useToast } from '@/components/feedback/ToastProvider';
import { newIdempotencyKey } from '@/lib/idempotency';
import { AppApiError } from '@/lib/api/errors';
import { endpoints } from '@/lib/api/endpoints';
import { isMapDemo } from '@/lib/env';
import { useMe } from '@/lib/auth/useMe';
import { useOnlineStatus } from '@/lib/pwa/useOnlineStatus';
import { useOfflineQueueStore } from '@/stores/offlineQueue.store';
import { useFinalizeCheckout, useProduct } from '../hooks/useConsignment';

// Checkout requires at least Bronze verification (backend `checkout:create`, minTier bronze). Below
// that, the POST 403s with TIER_TOO_LOW — so we gate the UI on the same rule and point the seller to
// verification instead of letting them scan, photograph, and only then hit a dead-end error.
const TIER_RANK: Record<string, number> = { tier0: 0, bronze: 1, silver: 2, gold: 3 };
const BRONZE_RANK = 1;

export function QrCheckout({ productId, quantity }: { productId: string; quantity: number }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: product, isLoading } = useProduct(productId);
  const { tier } = useMe();
  const needsVerification = !isMapDemo && (TIER_RANK[tier ?? 'tier0'] ?? 0) < BRONZE_RANK;
  const finalize = useFinalizeCheckout();
  const online = useOnlineStatus();
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const idemKey = useRef(newIdempotencyKey());
  const [scanned, setScanned] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  const confirm = () => {
    if (!product || !scanned) return;
    // The backend requires a condition photo (not optional). Enforce it outside demo mode.
    const conditionPhotoUrl = photos[0];
    if (!isMapDemo && !conditionPhotoUrl) {
      show('Add a condition photo before checking out', 'warning');
      return;
    }

    // Offline: queue the checkout for idempotent replay on reconnect (never lose a pickup).
    if (!online) {
      enqueue({
        kind: 'checkout',
        label: `${product.name} ×${quantity}`,
        endpoint: endpoints.checkouts,
        body: { productId: product.id, quantity, qrToken: scanned, conditionPhotoUrl },
        idempotencyKey: idemKey.current,
      });
      if (isMapDemo) finalize.mutate({ product, quantity, qrToken: scanned, conditionPhotoUrl: conditionPhotoUrl ?? '', idempotencyKey: idemKey.current });
      show('Saved offline — it’ll sync when you reconnect', 'default');
      router.replace('/seller/inventory');
      return;
    }

    finalize.mutate(
      { product, quantity, qrToken: scanned, conditionPhotoUrl: conditionPhotoUrl ?? '', idempotencyKey: idemKey.current },
      {
        onSuccess: (checkout) => {
          // H-03: unless the hub's auto-approve rule cleared it, the goods stay put until the
          // owner decides — saying "checked out" there would be a lie the seller acts on.
          show(
            checkout.status === 'pending_approval'
              ? 'Sent to the hub for approval — you’ll be notified when they respond'
              : 'Checked out — good luck out there!',
            checkout.status === 'pending_approval' ? 'default' : 'success',
          );
          router.replace('/seller/inventory');
        },
        onError: (e) => {
          // Safety net if the tier lapsed between load and confirm: send them to verification
          // rather than leaving a bare "forbidden" toast they can't act on.
          if (e instanceof AppApiError && e.code === 'TIER_TOO_LOW') {
            show('Verify your identity (Bronze) to check out inventory', 'warning');
            router.push('/profile/verification');
            return;
          }
          show(e instanceof AppApiError ? e.message : 'Checkout failed', 'danger');
        },
      },
    );
  };

  return (
    <WizardFlow
      totalSteps={2}
      currentStep={2}
      title="Check out inventory"
      onBack={() => router.back()}
      footer={
        needsVerification ? (
          <Button fullWidth onClick={() => router.push('/profile/verification')}>
            Verify your identity
          </Button>
        ) : (
          <Button
            fullWidth
            disabled={!scanned || !product || (!isMapDemo && photos.length === 0)}
            loading={finalize.isPending}
            onClick={confirm}
          >
            {!scanned
              ? 'Scan the station QR first'
              : !isMapDemo && photos.length === 0
                ? 'Add a condition photo'
                : 'Confirm checkout'}
          </Button>
        )
      }
    >
      {isLoading || !product ? (
        <Skeleton $h="240px" $radius={16} />
      ) : needsVerification ? (
        // Gate the whole flow: no point scanning + photographing stock they can't yet take. Explain
        // the requirement and hand them straight to verification.
        <Banner
          tone="warning"
          title="Verify your identity to check out"
          action={
            <Button size="compact" onClick={() => router.push('/profile/verification')}>
              <ShieldCheck size={15} aria-hidden /> Verify now
            </Button>
          }
        >
          Taking hub inventory needs at least <b>Bronze</b> verification (a government ID). It’s a
          one-time step that protects the hub’s stock — once you’re verified you can check out and
          you owe nothing until you sell.
        </Banner>
      ) : (
        <>
          {!scanned ? (
            <>
              <Step>1 · Scan the hub’s station QR</Step>
              <QRScanner onScan={(code) => setScanned(code)} expectedCode="SS-STATION-01" />
            </>
          ) : (
            <>
              <Scanned>
                <CheckCircle2 size={18} aria-hidden /> Station verified
              </Scanned>
              <Step>2 · Condition photo{isMapDemo ? ' (recommended)' : ' (required)'}</Step>
              <PhotoCapture purpose="condition" onChange={setPhotos} label="Photo of the goods" />

              <Summary>
                <Line><span>{product.name}</span><b className="tnum">×{quantity}</b></Line>
                <Line><span>From</span><span>{product.hubName}</span></Line>
                <Line><span>Your split</span><span>{product.sellerSplitPercent}%</span></Line>
                <Line><span>Return by</span><span>{product.returnWindowDays} days</span></Line>
              </Summary>

              <Reassure>You owe nothing until you sell. {photos.length > 0 ? `${photos.length} photo(s) attached.` : ''}</Reassure>
            </>
          )}
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
const Summary = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Line = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
  b {
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;
const Reassure = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
