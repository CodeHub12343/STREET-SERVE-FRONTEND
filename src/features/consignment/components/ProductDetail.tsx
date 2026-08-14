'use client';

/**
 * S-04 Product / Consignment Detail (docs/13 S-04) — terms (split %, return window, declared value,
 * condition) + the Seller Agreement clickwrap gate (bailment, G10). Reserve is blocked until the
 * agreement is accepted.
 */
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Banner } from '@/components/feedback/Banner';
import { formatCents } from '@/lib/money';
import { useProduct, useSellerAgreement } from '../hooks/useConsignment';

export function ProductDetail({ productId }: { productId: string }) {
  const router = useRouter();
  const { data: product, isLoading } = useProduct(productId);
  const { accepted, accept } = useSellerAgreement();

  return (
    <WizardFlow
      totalSteps={1}
      currentStep={1}
      onBack={() => router.back()}
      footer={
        <Button fullWidth disabled={!product || !accepted} onClick={() => router.push(`/seller/product/${productId}/reserve`)}>
          {accepted ? 'Reserve inventory' : 'Accept the agreement to reserve'}
        </Button>
      }
    >
      {isLoading || !product ? (
        <Skeleton $h="200px" $radius={16} />
      ) : (
        <>
          <h1>{product.name}</h1>
          <Sub>{product.hubName} · {product.distanceLabel} away</Sub>

          {product.photos?.length ? (
            <PhotoStrip aria-label="Product photos">
              {product.photos.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <Photo key={url} src={url} alt={`${product.name} photo ${i + 1}`} $lead={i === 0} />
              ))}
            </PhotoStrip>
          ) : null}

          <Terms>
            <Term><b className="tnum">{product.sellerSplitPercent}%</b><span>Your split</span></Term>
            <Term><b className="tnum">{product.returnWindowDays}d</b><span>Return window</span></Term>
            <Term><b className="tnum">{formatCents(Math.round(product.declaredValueCents / product.quantityAvailable))}</b><span>Per unit</span></Term>
            <Term><b className="tnum">{product.quantityAvailable}</b><span>Available</span></Term>
          </Terms>

          <Condition>
            <SectionTitle>Condition</SectionTitle>
            <p>{product.conditionNotes}</p>
          </Condition>

          <Reassure>You owe nothing until you sell. Return anything unsold for $0 within the return window.</Reassure>

          {!accepted ? (
            <Agreement>
              <SectionTitle>Seller Agreement</SectionTitle>
              <p>
                You’re taking these goods on consignment (bailment): you’re responsible for them while
                you hold them, you sell at the listed terms, and you return unsold items in good
                condition by the deadline.
              </p>
              <Button variant="secondary" loading={accept.isPending} onClick={() => accept.mutate()}>
                I understand &amp; agree
              </Button>
            </Agreement>
          ) : (
            <Banner tone="success">Seller Agreement accepted — you can reserve inventory.</Banner>
          )}
        </>
      )}
    </WizardFlow>
  );
}

const Sub = styled.p`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
`;
const PhotoStrip = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
`;
const Photo = styled.img<{ $lead: boolean }>`
  width: ${({ $lead }) => ($lead ? '200px' : '120px')};
  height: 160px;
  flex: none;
  object-fit: cover;
  scroll-snap-align: start;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line};
`;
const Terms = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Term = styled.div`
  display: grid;
  gap: 2px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  b {
    font-size: 22px;
    color: ${({ theme }) => theme.color.statusDiscount};
  }
  span {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const Condition = styled.div`
  display: grid;
  gap: 4px;
  p {
    font-size: 14px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const SectionTitle = styled.h2`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Reassure = styled.p`
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.control}px;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.color.statusLive} 12%, transparent)`};
  color: ${({ theme }) => theme.color.textPrimary};
  font-size: 14px;
`;
const Agreement = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  p {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
