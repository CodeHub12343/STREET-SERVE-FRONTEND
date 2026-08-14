'use client';

/**
 * H-01 Hub Registration (docs/13 H-01) — extends vendor registration with a hub location/hours and
 * the QR check-in/out station setup. Registers the operator's business as a consignment hub via
 * POST /hubs, then surfaces the returned check-in/out QR secret before landing on live inventory.
 *
 * A consignment hub *is* a business, so registration requires an existing vendor business. Operators
 * who haven't registered one yet are routed to vendor registration first.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useMutation } from '@tanstack/react-query';
import { QrCode } from 'lucide-react';
import { WizardFlow } from '@/components/layout/WizardFlow';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Banner } from '@/components/feedback/Banner';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { api } from '@/lib/api/client';
import { AppApiError } from '@/lib/api/errors';
import { endpoints } from '@/lib/api/endpoints';
import { isMapDemo } from '@/lib/env';
import { useVendorBusiness } from '@/features/vendor/hooks/useVendorBusinessId';

const TOTAL = 2;

interface RegisterHubResponse {
  id: string;
  businessId: string;
  /** A short-lived rotating check-in token — NOT a permanent secret to write down. */
  token: string;
  expiresAt: string;
  rotateSeconds: number;
}

export function HubRegister() {
  const router = useRouter();
  const { show } = useToast();
  const { businessId, isLoading, isError } = useVendorBusiness();
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState('');
  const [error, setError] = useState<string>();
  const [qrSecret, setQrSecret] = useState<string>();

  const register = useMutation({
    mutationFn: (): Promise<RegisterHubResponse> =>
      isMapDemo
        ? Promise.resolve({
            id: 'demo-hub',
            businessId: businessId ?? 'demo',
            token: 'ssq1.demo.token',
            expiresAt: new Date(Date.now() + 30_000).toISOString(),
            rotateSeconds: 30,
          })
        : api.post<RegisterHubResponse>(endpoints.hubs, { businessId, address: address.trim() || undefined }),
    onSuccess: (res) => {
      setQrSecret(res.token);
      show('Your hub is set up', 'success');
    },
    onError: (e) => show(e instanceof AppApiError ? e.message : 'Could not register the hub', 'danger'),
  });

  // Resolving the operator's business.
  if (isLoading) {
    return (
      <WizardFlow totalSteps={TOTAL} currentStep={1} title="Your hub location" onBack={() => router.back()}>
        <Skeleton $h="180px" $radius={16} />
      </WizardFlow>
    );
  }

  // A hub is a business — no business, nothing to register as a hub yet.
  if (isError || !businessId) {
    return (
      <WizardFlow totalSteps={TOTAL} currentStep={1} title="Register your business first" onBack={() => router.back()}>
        <EmptyState
          icon="🏪"
          title="A hub is a business"
          description="Register your business first, then turn it into a consignment hub so street sellers can stock from you."
          action={<Button onClick={() => router.push('/vendor/register')}>Register your business</Button>}
        />
      </WizardFlow>
    );
  }

  // Registered — show the QR secret before entering the dashboard.
  if (qrSecret) {
    return (
      <WizardFlow
        totalSteps={TOTAL}
        currentStep={TOTAL}
        title="Your check-in station is live"
        onBack={() => router.replace('/hub')}
        footer={<Button fullWidth onClick={() => router.replace('/hub/station')}>Open my check-in station</Button>}
      >
        <Station>
          <QrCode size={64} aria-hidden />
          <p>
            Open the check-in station on a phone or tablet at your counter. Sellers scan the code
            there to check inventory in and out.
          </p>
          <Code>{qrSecret}</Code>
        </Station>
        {/*
          Deliberately NOT "save this code" — it rotates every 30 seconds, which is what stops a
          photographed poster being reusable forever.
        */}
        <Banner tone="info">
          There&apos;s nothing to write down — this code refreshes every 30 seconds, so a photo of it
          stops working almost immediately. Chain-of-custody is tracked from every scan.
        </Banner>
      </WizardFlow>
    );
  }

  const next = () => {
    if (step === 1) {
      if (!address.trim()) return setError('Enter your hub address');
      setError(undefined);
    }
    if (step < TOTAL) setStep((s) => s + 1);
    else register.mutate();
  };

  return (
    <WizardFlow
      totalSteps={TOTAL}
      currentStep={step}
      title={step === 1 ? 'Your hub location' : 'QR check-in station'}
      onBack={step > 1 ? () => setStep((s) => s - 1) : () => router.back()}
      footer={<Button fullWidth loading={register.isPending} onClick={next}>{step < TOTAL ? 'Continue' : 'Finish hub setup'}</Button>}
    >
      {step === 1 ? (
        <>
          <Input label="Hub address" placeholder="1010 10th St, Modesto CA" required value={address} error={error} onChange={(e) => setAddress(e.target.value)} />
          <Input label="Hours" placeholder="Mon–Sat 9am–6pm" value={hours} onChange={(e) => setHours(e.target.value)} />
        </>
      ) : (
        <>
          <Station>
            <QrCode size={64} aria-hidden />
            <p>We&apos;ll generate a unique QR check-in code for your station. Sellers scan it to check inventory in and out.</p>
          </Station>
          <Banner tone="info">Chain-of-custody is tracked from every scan — you always know who holds what.</Banner>
        </>
      )}
    </WizardFlow>
  );
}

const Station = styled.div`
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => theme.space[3]}px;
  /* Tighter padding on phones so the wrapping token gets the width it needs; roomier from sm up. */
  padding: ${({ theme }) => theme.space[5]}px;
  ${({ theme }) => theme.media.sm} {
    padding: ${({ theme }) => theme.space[6]}px;
  }
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 2px dashed ${({ theme }) => theme.color.line2};
  color: ${({ theme }) => theme.color.textSecondary};
  text-align: center;
  p {
    font-size: 14px;
    max-width: 32ch;
  }
`;

const Code = styled.code`
  font-family: monospace;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: ${({ theme }) => theme.space[2]}px ${({ theme }) => theme.space[3]}px;
  /* Rounded rect, not a pill: the token is one unbroken 40-char string that must wrap on narrow
     screens, and a wrapping pill reads as broken. */
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  color: ${({ theme }) => theme.color.textPrimary};
  user-select: all;
  /* Never overflow the card on mobile: cap to the container and let the token break anywhere so
     it wraps to multiple lines instead of forcing horizontal scroll / being clipped. */
  max-width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-align: center;
`;
