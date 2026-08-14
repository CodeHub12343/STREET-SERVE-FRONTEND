'use client';

/**
 * S-05 Reservation Confirm (docs/13 S-05) — quantity, pickup window, hub directions. Continues to
 * the QR checkout, carrying the product + quantity.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Navigation2 } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Stepper } from '@/components/primitives/Stepper';
import { Select } from '@/components/primitives/Select';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useProduct } from '../hooks/useConsignment';

const WINDOWS = [
  { value: 'now', label: 'Pick up now' },
  { value: 'today-pm', label: 'Today, afternoon' },
  { value: 'tomorrow-am', label: 'Tomorrow, morning' },
];

export function ReserveConfirm({ productId }: { productId: string }) {
  const router = useRouter();
  const { data: product, isLoading } = useProduct(productId);
  const [qty, setQty] = useState(1);
  const [pickup, setPickup] = useState('now');

  const directions = () => {
    if (!product) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${product.lngLat[1]},${product.lngLat[0]}`, '_blank', 'noopener');
  };

  return (
    <WizardFlow
      totalSteps={2}
      currentStep={1}
      title="Reserve inventory"
      onBack={() => router.back()}
      footer={
        <Button fullWidth disabled={!product} onClick={() => router.push(`/seller/checkout?productId=${productId}&qty=${qty}`)}>
          Continue to checkout
        </Button>
      }
    >
      {isLoading || !product ? (
        <Skeleton $h="160px" $radius={16} />
      ) : (
        <>
          <Row>
            <Label>How many units?</Label>
            <Stepper value={qty} min={1} max={product.quantityAvailable} onChange={setQty} ariaLabel="Quantity" />
          </Row>
          <MaxHint>{product.quantityAvailable} available at {product.hubName}</MaxHint>

          <Select label="Pickup window" options={WINDOWS} value={pickup} onChange={(e) => setPickup(e.target.value)} />

          <Directions type="button" onClick={directions}>
            <Navigation2 size={18} aria-hidden /> Directions to {product.hubName}
          </Directions>
        </>
      )}
    </WizardFlow>
  );
}

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
const MaxHint = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Directions = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]}px;
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.accentSecondary};
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
`;
