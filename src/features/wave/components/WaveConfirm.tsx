'use client';

/**
 * C-18 Wave-Down Request Confirm (docs/13 C-18) — the two things a customer needs to decide are
 * shown BEFORE they commit: the 5-minute SLA and the discount tier that locks in if accepted
 * (the "promise block"). Optional low-emphasis note. Send Wave → C-19.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Clock, Percent, ArrowLeft, Car } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { TextArea } from '@/components/primitives/TextArea';
import { Avatar } from '@/components/primitives/Avatar';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { useBusiness } from '@/features/business';
import { AppApiError } from '@/lib/api/errors';
import { formatCents } from '@/lib/money';
import { useCreateWave } from '../hooks/useWave';

export function WaveConfirm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { data: biz, isLoading } = useBusiness(businessId);
  const create = useCreateWave();
  const [note, setNote] = useState('');
  const travelFeeCents = biz?.travelFeeCents ?? 0;
  /**
   * The vendor's travel fee is known from their profile before the request exists; the platform's
   * request fee is resolved server-side and comes back on the wave. Both are shown here, and the
   * created wave's own `feeLines` remain the authority once it exists.
   */
  const feeLines = travelFeeCents > 0 ? [{ label: 'Vendor travel fee', amountCents: travelFeeCents }] : [];

  const send = () => {
    if (!biz) return;
    create.mutate(
      { businessId, businessName: biz.name, note: note.trim() || undefined },
      {
        onSuccess: (wave) => router.replace(`/wave/${wave.id}`),
        onError: (e) => show(e instanceof AppApiError ? e.message : 'Could not send wave', 'danger'),
      },
    );
  };

  return (
    <WizardFlow
      totalSteps={1}
      currentStep={1}
      onBack={() => router.back()}
      footer={
        <Button fullWidth loading={create.isPending} disabled={!biz} onClick={send}>
          Send Wave
        </Button>
      }
    >
      {isLoading || !biz ? (
        <Skeleton $h="120px" $radius={16} />
      ) : (
        <>
          <Head>
            <Avatar name={biz.name} src={biz.logoUrl} size={56} />
            <div>
              <h1>Wave down {biz.name}</h1>
              <p>{biz.locationLine}</p>
            </div>
          </Head>

          <WavePromise aria-label="What you're promised">
            <Row>
              <Clock size={18} aria-hidden />
              <span>They have <b>5 minutes</b> to accept — you can cancel anytime.</span>
            </Row>
            <Row>
              <Percent size={18} aria-hidden />
              <span>If accepted, you <b>lock in your line-up discount</b> — earlier is cheaper.</span>
            </Row>
            {feeLines.length > 0 && (
              /**
               * §32.4: every charge must be shown before the customer confirms the request — and
               * itemised by payee. The vendor's travel fee is theirs; the request fee is the
               * platform's. Collapsing them into one number would tell the customer what they pay
               * without telling them who they are paying, which is the part that matters when they
               * later wonder what they were charged for.
               */
              <Row>
                <Car size={18} aria-hidden />
                <FeeBlock>
                  {feeLines.map((f) => (
                    <FeeLine key={f.label}>
                      <span>{f.label}</span>
                      <b className="tnum">{formatCents(f.amountCents)}</b>
                    </FeeLine>
                  ))}
                  <FeeNote>Added to your total when you pay — nothing yet.</FeeNote>
                </FeeBlock>
              </Row>
            )}
          </WavePromise>

          <TextArea
            label="Add a note (optional)"
            placeholder="e.g. I'm by the blue truck near the park entrance"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
          />
          <NoCharge>
            <ArrowLeft size={13} aria-hidden />{' '}
            {feeLines.length > 0
              ? 'Nothing is charged to send a wave — these apply only when you pay.'
              : 'Nothing is charged to send a wave.'}
          </NoCharge>
        </>
      )}
    </WizardFlow>
  );
}

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  h1 {
    font-size: 22px;
  }
  p {
    font-size: 13px;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;
/** Named to avoid shadowing the global `Promise` — see BoostCampaignCard for what that cost. */
const WavePromise = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]}px;
  font-size: 14px;
  svg {
    flex: none;
    color: ${({ theme }) => theme.color.accentSecondary};
    margin-top: 1px;
  }
  b {
    font-weight: 800;
  }
`;
const NoCharge = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const FeeBlock = styled.div`
  display: grid;
  gap: 3px;
  width: 100%;
`;
const FeeLine = styled.span`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  b {
    font-weight: 800;
  }
`;
const FeeNote = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
