'use client';

/**
 * PreRegistrationWizard (component spec §PreRegistrationWizard, journey doc §4) — the landing
 * page's single conversion surface. Sheet on phones / Modal on desktop; steps role → details →
 * confirmation. Role preselect skips straight to details. Duplicate email lands on the friendly
 * "already in line" confirmation (never an error); network failure shows an in-wizard retry
 * banner; offline is detected up front. Confirmation shows the real waitlist position and a
 * share action (Web Share API → clipboard fallback).
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import styled, { css } from 'styled-components';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Modal } from '@/components/primitives/Modal';
import { Sheet } from '@/components/primitives/Sheet';
import { Banner } from '@/components/feedback/Banner';
import { track } from '../analytics';
import { CtaLink } from '../components/CtaLink';
import { marketingConfig } from '../marketing.config';
import { fetchWaitlistCount, submitPreregistration, type PreregRole } from './api';

export interface PreRegistrationWizardProps {
  defaultRole?: PreregRole;
  utmCode?: string;
  onClose: () => void;
}

type Step = 'role' | 'details' | 'done';
type Outcome = { kind: 'created'; position: number | null } | { kind: 'duplicate' };

const roles: { key: PreregRole; icon: string; title: string; body: string }[] = [
  { key: 'customer', icon: '🧭', title: 'Customer', body: 'Find food & services near me' },
  { key: 'vendor', icon: '🚚', title: 'Vendor', body: 'I run a mobile business' },
  { key: 'seller', icon: '💼', title: 'Seller', body: 'I want to start earning' },
  { key: 'hub', icon: '🏪', title: 'Business / Hub', body: 'I supply or host inventory' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PreRegistrationWizard({
  defaultRole,
  utmCode,
  onClose,
}: PreRegistrationWizardProps) {
  const [step, setStepRaw] = useState<Step>(defaultRole ? 'details' : 'role');
  const [role, setRole] = useState<PreregRole | undefined>(defaultRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<'offline' | 'error' | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [shared, setShared] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Live offline awareness — clears the banner the moment the network returns.
  useEffect(() => {
    const onOnline = () => setBanner((b) => (b === 'offline' ? null : b));
    const onOffline = () => setBanner('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const setStep = useCallback((next: Step) => {
    setStepRaw(next);
    track('prereg_step', { step: next });
  }, []);

  const pickRole = (r: PreregRole) => {
    setRole(r);
    setStep('details');
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const errors: typeof fieldErrors = {};
    if (!fullName.trim()) errors.fullName = 'Please tell us your name.';
    if (!EMAIL_RE.test(email.trim())) errors.email = 'That email doesn’t look right.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setBanner(null);
    const result = await submitPreregistration({
      fullName: fullName.trim(),
      email: email.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      intendedRole: role ?? 'customer',
      citySlug: 'modesto-ca',
      ...(utmCode ? { utmCode } : {}),
    });
    setSubmitting(false);

    switch (result.kind) {
      case 'created': {
        const position = await fetchWaitlistCount();
        setOutcome({ kind: 'created', position });
        setStep('done');
        track('prereg_complete', { role: role ?? 'customer', position });
        break;
      }
      case 'duplicate':
        setOutcome({ kind: 'duplicate' });
        setStep('done');
        track('prereg_duplicate', { role: role ?? 'customer' });
        break;
      case 'invalid':
        setFieldErrors({ email: result.message });
        track('prereg_error', { reason: 'invalid' });
        break;
      case 'offline':
        setBanner('offline');
        track('prereg_error', { reason: 'offline' });
        break;
      default:
        setBanner('error');
        track('prereg_error', { reason: 'server' });
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/?register=1`;
    const text = 'I just claimed my spot on StreetServe — the live map of the mobile economy.';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'StreetServe', text, url });
        track('prereg_share', { method: 'web-share' });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShared(true);
        window.setTimeout(() => setShared(false), 2500);
        track('prereg_share', { method: 'clipboard' });
      }
    } catch {
      /* user dismissed the share sheet — not an error */
    }
  };

  const title =
    step === 'role'
      ? 'Which one are you?'
      : step === 'details'
        ? 'Claim your spot'
        : 'You’re in!';

  const body = useMemo(
    () => (
      <Body>
        {step === 'role' && (
          <RoleGrid>
            {roles.map((r) => (
              <RoleCard key={r.key} type="button" onClick={() => pickRole(r.key)}>
                <RoleIcon aria-hidden>{r.icon}</RoleIcon>
                <div>
                  <RoleTitle>{r.title}</RoleTitle>
                  <RoleBody>{r.body}</RoleBody>
                </div>
              </RoleCard>
            ))}
          </RoleGrid>
        )}

        {step === 'details' && (
          <Form onSubmit={(e) => void submit(e)} noValidate>
            {role && (
              <RolePill>
                <span aria-hidden>{roles.find((r) => r.key === role)?.icon}</span>
                {roles.find((r) => r.key === role)?.title}
                <ChangeRole type="button" onClick={() => setStep('role')}>
                  Change
                </ChangeRole>
              </RolePill>
            )}
            {banner === 'offline' && (
              <Banner tone="warning">
                You look offline — we’ll submit as soon as you’re back. Your details stay right
                here.
              </Banner>
            )}
            {banner === 'error' && (
              <Banner
                tone="danger"
                action={
                  <Button size="compact" variant="secondary" onClick={() => void submit()}>
                    Retry
                  </Button>
                }
              >
                Something went wrong on our end — nothing was lost.
              </Banner>
            )}
            <Input
              label="Full name"
              required
              autoComplete="name"
              value={fullName}
              error={fieldErrors.fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Email"
              required
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              error={fieldErrors.email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Phone"
              hint="Optional — launch-day text when the map goes live"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button type="submit" loading={submitting} fullWidth>
              Join the waitlist
            </Button>
            <FinePrint>
              Launching first in {marketingConfig.launchCity} — pre-register from anywhere. No
              spam, ever.
            </FinePrint>
          </Form>
        )}

        {step === 'done' && outcome && (
          <Done>
            <CheckMark aria-hidden>✓</CheckMark>
            {outcome.kind === 'created' ? (
              <>
                <DoneTitle>
                  {outcome.position !== null
                    ? `You’re #${outcome.position.toLocaleString()} in line`
                    : 'You’re on the list'}
                </DoneTitle>
                <DoneBody>
                  We’ll email you the moment the map goes live in{' '}
                  {marketingConfig.launchCity}. Early birds get founding-member perks.
                </DoneBody>
              </>
            ) : (
              <>
                <DoneTitle>You’re already in line</DoneTitle>
                <DoneBody>
                  This email is on the waitlist — no need to register twice. We’ll be in touch
                  the moment the map goes live.
                </DoneBody>
              </>
            )}
            <DoneActions>
              <Button onClick={() => void share()} fullWidth>
                {shared ? 'Link copied ✓' : 'Share with a friend'}
              </Button>
              <CtaLink href={marketingConfig.demoHref} $variant="secondary" $fullWidth>
                Explore the live map ↗
              </CtaLink>
            </DoneActions>
          </Done>
        )}
      </Body>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, role, fullName, email, phone, fieldErrors, submitting, banner, outcome, shared],
  );

  if (isDesktop) {
    return (
      <Modal open title={title} onClose={onClose}>
        {body}
      </Modal>
    );
  }
  return (
    <Sheet open onClose={onClose} initialSnap="full" ariaLabel={title}>
      <SheetTitle>{title}</SheetTitle>
      {body}
    </Sheet>
  );
}

const Body = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  padding: ${({ theme }) => theme.space[2]}px 0;
`;

const SheetTitle = styled.h2`
  font-size: 22px;
  letter-spacing: -0.02em;
  padding: 0 ${({ theme }) => theme.space[4]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
`;

const RoleGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: 0 ${({ theme }) => theme.space[4]}px;
  ${({ theme }) => theme.media.sm} {
    padding: 0;
  }
`;

const RoleCard = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]}px;
  text-align: left;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid ${({ theme }) => theme.color.line2};
  background: ${({ theme }) => theme.color.surfaceRaised};
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.motion.micro}ms;
  &:hover {
    border-color: ${({ theme }) => theme.color.accentSecondary};
  }
`;

const RoleIcon = styled.span`
  font-size: 26px;
  line-height: 1;
`;

const RoleTitle = styled.p`
  font-weight: 750;
  font-size: 16px;
`;

const RoleBody = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;

const formPad = css`
  padding: 0 ${({ theme }) => theme.space[4]}px ${({ theme }) => theme.space[4]}px;
  ${({ theme }) => theme.media.sm} {
    padding: 0;
  }
`;

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  ${formPad}
`;

const RolePill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.color.surfaceRaised2};
  font-size: 13px;
  font-weight: 700;
`;

const ChangeRole = styled.button`
  border: none;
  background: none;
  color: ${({ theme }) => theme.color.accentSecondary};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
`;

const FinePrint = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textTertiary};
  text-align: center;
`;

const Done = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  justify-items: center;
  text-align: center;
  ${formPad}
`;

const CheckMark = styled.span`
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  font-size: 30px;
  font-weight: 800;
  color: #fff;
  background: ${({ theme }) => theme.color.statusLive};
`;

const DoneTitle = styled.p`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
`;

const DoneBody = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.color.textSecondary};
  max-width: 40ch;
`;

const DoneActions = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  width: 100%;
  max-width: 320px;
  margin-top: ${({ theme }) => theme.space[3]}px;
`;
