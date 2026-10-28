'use client';

/**
 * ═══ FRANCHISE / MULTI-VENDOR — Phase 3 invite accept. ═══
 *
 * Public page. Reads the invite preview without auth so a visitor can see what they've been
 * invited to; the Accept button triggers the authenticated backend endpoint, with a sign-in
 * detour (returning to this page) when the user isn't signed in yet. Idempotent — re-accepting
 * an already-accepted invite returns the existing membership with a diagnostic flag.
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Mail, Store } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useToast } from '@/components/feedback/ToastProvider';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { AppApiError } from '@/lib/api/errors';
import { useAuthCompat } from '@/lib/auth/useAuthCompat';
import { isAuthConfigured } from '@/lib/env';

interface InvitePreview {
  brandName: string;
  inviteeEmail: string;
  role: 'manager' | 'operator';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expired: boolean;
  seatOperator: { displayName: string } | null;
}

interface AcceptResponse {
  inviteId: string;
  brandId: string;
  role: 'manager' | 'operator';
  membershipId: string | null;
  operatorId: string | null;
  alreadyAccepted: boolean;
}

export function BrandAcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const { show } = useToast();
  const { isLoaded, isSignedIn } = useAuthCompat();
  const needsSignIn = isAuthConfigured && isLoaded && !isSignedIn;
  const [accepted, setAccepted] = useState<AcceptResponse | null>(null);

  const preview = useQuery<InvitePreview>({
    queryKey: ['brand-invite', token, 'preview'],
    queryFn: () => api.get<InvitePreview>(endpoints.brandInvitePreview(token)),
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => api.post<AcceptResponse>(endpoints.brandInviteAccept(token), {}),
    onSuccess: (data) => {
      setAccepted(data);
      show(
        data.alreadyAccepted
          ? 'You were already a member of this brand.'
          : `Welcome to ${preview.data?.brandName ?? 'the brand'}.`,
        'success',
      );
    },
    onError: (err) => {
      show(
        err instanceof AppApiError ? err.message : 'Could not accept this invite.',
        'danger',
      );
    },
  });

  if (preview.isLoading) {
    return (
      <Page>
        <Skeleton $h="320px" $radius={16} />
      </Page>
    );
  }
  if (preview.isError || !preview.data) {
    return (
      <Page>
        <Panel>
          <h1>Invite not found</h1>
          <p>
            This invite link doesn&apos;t resolve to anything. If the brand owner sent you a new
            link, open the newest one.
          </p>
        </Panel>
      </Page>
    );
  }
  if (preview.data.expired) {
    return (
      <Page>
        <Panel>
          <h1>This invite has expired</h1>
          <p>
            Invites are valid for 7 days. Ask {preview.data.brandName} to send a fresh invite to{' '}
            <strong>{preview.data.inviteeEmail}</strong>.
          </p>
        </Panel>
      </Page>
    );
  }
  if (preview.data.status === 'revoked') {
    return (
      <Page>
        <Panel>
          <h1>This invite was withdrawn</h1>
          <p>
            {preview.data.brandName} revoked this invitation. Ask them to send a new one if that
            was in error.
          </p>
        </Panel>
      </Page>
    );
  }

  if (accepted) {
    return (
      <Page>
        <Panel>
          <SuccessIcon>
            <CheckCircle2 size={48} aria-hidden />
          </SuccessIcon>
          <h1>You&apos;re in</h1>
          <p>
            {accepted.alreadyAccepted
              ? 'You were already a member of this brand.'
              : `You've joined ${preview.data.brandName} as a ${preview.data.role}.`}
          </p>
          <Button
            fullWidth
            /*
              2026-10-28 — route operators to `/vendor/welcome` first (a short "here's how
              to go live + connect Stripe" page) rather than straight into the vendor
              dashboard with no context. Managers/owners go straight to their brand overview.
            */
            onClick={() =>
              router.push(
                accepted.role === 'operator'
                  ? '/vendor/welcome'
                  : `/brand/${accepted.brandId}/overview`,
              )
            }
          >
            {accepted.role === 'operator' ? 'Open your dashboard' : 'Open the brand overview'}
          </Button>
        </Panel>
      </Page>
    );
  }

  return (
    <Page>
      <Panel>
        <Eyebrow>
          <Store size={16} aria-hidden /> Brand invitation
        </Eyebrow>
        <h1>{preview.data.brandName} invited you</h1>
        <RoleLine>
          You&apos;ve been invited to join as a <RoleBadge>{preview.data.role}</RoleBadge>
          {preview.data.seatOperator ? (
            <>
              {' '}
              running <strong>{preview.data.seatOperator.displayName}</strong>
            </>
          ) : null}
          .
        </RoleLine>
        <EmailLine>
          <Mail size={14} aria-hidden /> Invited email: <code>{preview.data.inviteeEmail}</code>
        </EmailLine>
        <Divider />
        <WhatYouGet>
          <WhatYouGetHead>What this gives you</WhatYouGetHead>
          <ul>
            {preview.data.role === 'operator' ? (
              <>
                <li>Go live from your truck and serve orders under {preview.data.brandName}.</li>
                <li>See your own earnings and your own live status.</li>
                <li>No access to other operators&apos; orders, payouts, or the brand menu.</li>
              </>
            ) : (
              <>
                <li>Help run {preview.data.brandName}: menu, hours, promotions.</li>
                <li>See every truck&apos;s live status and the brand&apos;s aggregated earnings.</li>
                <li>Invite + manage operators and other managers.</li>
              </>
            )}
          </ul>
        </WhatYouGet>
        {needsSignIn ? (
          <SignInNote>
            To accept, sign in with <strong>{preview.data.inviteeEmail}</strong>. We&apos;ll bring
            you back here after.
          </SignInNote>
        ) : null}
        <Button
          fullWidth
          loading={acceptMutation.isPending}
          onClick={() => {
            if (needsSignIn) {
              router.push(
                `/sign-in?redirect_url=${encodeURIComponent(`/brand/accept/${token}`)}`,
              );
              return;
            }
            acceptMutation.mutate();
          }}
        >
          {needsSignIn ? 'Sign in to accept' : 'Accept invitation'}
        </Button>
      </Panel>
    </Page>
  );
}

const Page = styled.div`
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space[6]}px ${({ theme }) => theme.space[5]}px;
  min-height: 100vh;
`;

const Panel = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  max-width: 480px;
  width: 100%;
  padding: ${({ theme }) => theme.space[6]}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.card}px;
  h1 {
    font-family: ${({ theme }) => theme.typography.fontDisplay};
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  p {
    font-size: 15px;
    line-height: 1.55;
    color: ${({ theme }) => theme.color.textSecondary};
  }
`;

const Eyebrow = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const RoleLine = styled.p`
  font-size: 15px;
  line-height: 1.55;
`;

const RoleBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.color.textPrimary};
  text-transform: uppercase;
  margin: 0 2px;
`;

const EmailLine = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  code {
    padding: 1px 6px;
    border-radius: 4px;
    background: ${({ theme }) => theme.color.surfaceRaised2};
    font-size: 12px;
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  margin: ${({ theme }) => theme.space[2]}px 0;
`;

const WhatYouGet = styled.div`
  ul {
    margin: ${({ theme }) => theme.space[2]}px 0 0;
    padding-left: 20px;
    display: grid;
    gap: ${({ theme }) => theme.space[2]}px;
    font-size: 14px;
    line-height: 1.5;
    color: ${({ theme }) => theme.color.textPrimary};
  }
`;

const WhatYouGetHead = styled.p`
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textTertiary};
`;

const SignInNote = styled.p`
  padding: ${({ theme }) => theme.space[3]}px ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px dashed ${({ theme }) => theme.color.line2};
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const SuccessIcon = styled.div`
  color: ${({ theme }) => theme.color.statusLive};
  justify-self: center;
`;
