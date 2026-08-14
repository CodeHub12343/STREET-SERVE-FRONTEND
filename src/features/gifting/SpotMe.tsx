'use client';

/**
 * C-30 Spot Me request (docs/12 §2, FR-6.3) — amount, repay-by date, and the counterparty's trust
 * context. Age/tier gated server-side (<30d / <bronze → 422); shown as a prompt, not a dead end.
 */
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Stepper } from '@/components/primitives/Stepper';
import { Select } from '@/components/primitives/Select';
import { Skeleton } from '@/components/feedback/Skeleton';
import { TrustScoreBadge } from '@/components/data/TrustScoreBadge';
import { useToast } from '@/components/feedback/ToastProvider';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isMapDemo } from '@/lib/env';
import { demoSpotMeContext } from '@/lib/demo';
import { newIdempotencyKey } from '@/lib/idempotency';
import { formatCents } from '@/lib/money';
import { AppApiError } from '@/lib/api/errors';

const REPAY = [
  { value: '3', label: 'In 3 days' },
  { value: '7', label: 'In a week' },
  { value: '14', label: 'In 2 weeks' },
];

export function SpotMe({ businessId }: { businessId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const idemKey = useRef(newIdempotencyKey());
  const [amount, setAmount] = useState(5);
  const [repay, setRepay] = useState('7');

  const ctx = useQuery({
    queryKey: ['spot-me-context', businessId],
    queryFn: () => (isMapDemo ? Promise.resolve(demoSpotMeContext(businessId)) : api.get<ReturnType<typeof demoSpotMeContext>>(`/spot-me/context/${businessId}`)),
  });

  const request = useMutation({
    mutationFn: () => (isMapDemo ? Promise.resolve() : api.post(endpoints.spotMe, { businessId, amountCents: amount * 100, repayDays: Number(repay) }, { idempotencyKey: idemKey.current })),
    onSuccess: () => {
      show('Spot Me request sent', 'success');
      router.replace(`/business/${businessId}`);
    },
    onError: (e) => {
      if (e instanceof AppApiError && e.isBusinessRule) show(e.message, 'warning');
      else show('Could not send request', 'danger');
    },
  });

  const maxDollars = Math.floor((ctx.data?.maxCents ?? 2000) / 100);

  return (
    <WizardFlow
      totalSteps={1}
      currentStep={1}
      title="Spot Me"
      onBack={() => router.back()}
      footer={<Button fullWidth loading={request.isPending} onClick={() => request.mutate()}>Request {formatCents(amount * 100)}</Button>}
    >
      {ctx.isLoading || !ctx.data ? (
        <Skeleton $h="120px" $radius={16} />
      ) : (
        <Context>
          <span>Requesting from</span>
          <Party>
            <b>{ctx.data.businessName}</b>
            <TrustScoreBadge score={ctx.data.trustScore} size="sm" />
          </Party>
          <Small>Up to {formatCents(ctx.data.maxCents)} · you’ve been active {ctx.data.historyDays} days</Small>
        </Context>
      )}
      <Row>
        <Label>Amount</Label>
        <Stepper value={amount} min={1} max={maxDollars} onChange={setAmount} ariaLabel="Amount" />
      </Row>
      <Select label="Repay by" options={REPAY} value={repay} onChange={(e) => setRepay(e.target.value)} />
      <Reassure>Spot Me is trust-based. Repaying on time raises your Trust Score; missing it lowers it.</Reassure>
    </WizardFlow>
  );
}

const Context = styled.div`
  display: grid;
  gap: 4px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
  span {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
const Party = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  b {
    font-size: 16px;
  }
`;
const Small = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;
const Label = styled.span`
  font-weight: 600;
`;
const Reassure = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
