'use client';

/**
 * C-36 Verification Center — the durable home for verification status. Shows the tier ladder plus
 * each requirement (ID, selfie, bank) with its async status (required/pending/approved/rejected)
 * and a CTA that launches the provider-hosted flow. Rejected requirements show the reason + retry.
 */
import styled from 'styled-components';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { StatusChip } from '@/components/primitives/StatusChip';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Banner } from '@/components/feedback/Banner';
import { useMe } from '@/lib/auth/useMe';
import { useStartVerification, useVerificationStatus } from '../hooks/useVerification';
import { VerificationTierLadder } from './VerificationTierLadder';
import type { VerificationRequirement, VerificationStatus } from '../types';

const DEFAULT_REQUIREMENTS: VerificationRequirement[] = [
  { key: 'id-document', label: 'Government ID', status: 'required' },
  { key: 'selfie-liveness', label: 'Selfie liveness check', status: 'required' },
  { key: 'bank-account', label: 'Bank account (for payouts)', status: 'required' },
];

export function VerificationCenter() {
  const { principal } = useMe();
  const { data, isLoading, isError, refetch } = useVerificationStatus();
  const start = useStartVerification();

  // Fall back to the principal's tier + default requirements when the status endpoint is unset.
  const status: VerificationStatus = data ?? {
    tier: principal?.verificationTier ?? 'tier0',
    requirements: DEFAULT_REQUIREMENTS,
  };

  return (
    <TabPage title="Verification" backHref="/profile" backLabel="Back to profile">
      {isLoading ? (
        <Loading>
          <Skeleton $h="72px" $radius={16} />
          <Skeleton $h="72px" $radius={16} />
          <Skeleton $h="72px" $radius={16} />
        </Loading>
      ) : isError ? (
        <ErrorState
          title="Couldn’t load verification"
          message="Check your connection and try again."
          onRetry={() => void refetch()}
        />
      ) : (
        <Content>
          <Intro>Unlock more as you verify — you only verify when you’re about to touch money.</Intro>
          <VerificationTierLadder current={status.tier} />

          <SectionTitle>Steps</SectionTitle>
          <Steps>
            {status.requirements.map((req) => (
              <Step key={req.key}>
                <StepMain>
                  <StepLabel>{req.label}</StepLabel>
                  <ReqStatus status={req.status} />
                </StepMain>
                {req.status === 'rejected' && req.reason ? (
                  <Banner tone="danger">{req.reason}</Banner>
                ) : null}
                {req.actionable === false ? (
                  // Satisfied by another step — say which, instead of offering a button that
                  // cannot go anywhere.
                  <StepNote>Captured during the Government ID check.</StepNote>
                ) : (req.status === 'required' || req.status === 'rejected') ? (
                  <Button
                    size="compact"
                    variant="secondary"
                    loading={start.isPending && start.variables === req.key}
                    onClick={() => start.mutate(req.key)}
                  >
                    {req.status === 'rejected' ? 'Try again' : 'Start'}
                  </Button>
                ) : null}
              </Step>
            ))}
          </Steps>
        </Content>
      )}
    </TabPage>
  );
}

function ReqStatus({ status }: { status: VerificationRequirement['status'] }) {
  switch (status) {
    case 'approved':
      return <StatusChip status="free" label="Verified" size="sm" />;
    case 'pending':
      return <StatusChip status="popup" label="Pending" size="sm" />;
    case 'rejected':
      return <StatusChip status="discount" label="Rejected" size="sm" />;
    default:
      return <StatusChip status="parked" label="Required" size="sm" />;
  }
}

const Loading = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Content = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
`;
const Intro = styled.p`
  color: ${({ theme }) => theme.color.textSecondary};
  font-size: 14px;
`;
const SectionTitle = styled.h2`
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Steps = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const StepNote = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Step = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  justify-items: start;
`;
const StepMain = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
`;
const StepLabel = styled.span`
  font-weight: 600;
  font-size: 15px;
`;
