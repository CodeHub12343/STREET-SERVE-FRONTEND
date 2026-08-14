'use client';

/**
 * C-38 dispute open (docs/12 §H, FR-10.2) — opens a formal dispute case (a first-class object with
 * a 5-business-day SLA). Reachable from Help. Evidence can be added after opening.
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from 'styled-components';
import { useMutation } from '@tanstack/react-query';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { TextArea } from '@/components/primitives/TextArea';
import { Banner } from '@/components/feedback/Banner';
import { useToast } from '@/components/feedback/ToastProvider';
import { PhotoCapture } from '@/components/media/PhotoCapture';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isMapDemo } from '@/lib/env';

const REF_TYPE_LABEL: Record<string, string> = {
  transaction: 'a charge or order',
  checkout: 'a consignment checkout',
  spot_me: 'a Spot Me',
};

/**
 * A dispute is always about a specific thing (a transaction / checkout / spot_me) against a specific
 * counterparty. The backend requires subjectType/subjectId + refType/refId, so this screen is entered
 * WITH that context in the URL (e.g. from the order receipt). Without context it can't be submitted.
 */
export function DisputeOpen() {
  const router = useRouter();
  const { show } = useToast();
  const params = useSearchParams();
  const refType = params.get('refType') ?? undefined; // 'transaction' | 'checkout' | 'spot_me'
  const refId = params.get('refId') ?? undefined;
  const subjectType = params.get('subjectType') ?? undefined; // 'business' | 'seller' | 'hub'
  const subjectId = params.get('subjectId') ?? undefined;
  const subjectName = params.get('subjectName') ?? undefined;
  const hasContext = Boolean(refType && refId && subjectType && subjectId);

  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [, setEvidence] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  const open = useMutation({
    mutationFn: () => {
      if (isMapDemo) return Promise.resolve({ id: '4480' });
      const note = [subject.trim(), details.trim()].filter(Boolean).join(' — ') || undefined;
      return api.post<{ id: string }>(endpoints.disputes, {
        subjectType,
        subjectId,
        refType,
        refId,
        note,
      });
    },
    onSuccess: () => {
      show('Dispute opened — we’ll respond within 5 business days', 'success');
      router.replace('/help');
    },
    onError: () => show('Could not open the dispute', 'danger'),
  });

  const submit = () => {
    if (!hasContext && !isMapDemo) return; // guarded by the banner + disabled button
    if (!subject.trim()) return setError('Add a short subject');
    setError(undefined);
    open.mutate();
  };

  const canSubmit = hasContext || isMapDemo;

  return (
    <WizardFlow
      totalSteps={1}
      currentStep={1}
      title="Open a dispute"
      onBack={() => router.back()}
      footer={
        <Button fullWidth disabled={!canSubmit} loading={open.isPending} onClick={submit}>
          Submit dispute
        </Button>
      }
    >
      <Banner tone="info">Disputes get a dedicated case with a 5-business-day SLA. Nothing is decided automatically — a person reviews the evidence.</Banner>
      {canSubmit ? (
        <About>
          Disputing {refType ? REF_TYPE_LABEL[refType] ?? 'an item' : 'an item'}
          {subjectName ? ` with ${subjectName}` : ''}.
        </About>
      ) : (
        <Banner tone="warning" title="Open this from the item">
          To open a dispute, start from the specific order, checkout, or Spot Me you want to dispute —
          that links the case to the right transaction.
        </Banner>
      )}
      <Input label="Subject" placeholder="e.g. Charged after I cancelled" required value={subject} error={error} onChange={(e) => setSubject(e.target.value)} />
      <TextArea label="What happened?" placeholder="Describe the issue…" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
      <PhotoLabel>Evidence (optional)</PhotoLabel>
      <PhotoCapture purpose="evidence" onChange={setEvidence} label="Add evidence" />
    </WizardFlow>
  );
}

const About = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const PhotoLabel = styled.p`
  font-size: 13px;
  font-weight: 600;
`;
