'use client';

/**
 * DAN-3 — applying to drive, and seeing why you cannot yet.
 *
 * ## The copy rules this screen exists inside
 *
 * **CR-3: never tell a driver they are covered.** The platform's own liability policy protects the
 * platform. This form asks a driver to confirm *their own* insurance permits delivery use, records
 * the date they gave, and says nothing about what it covers — because a driver whose personal policy
 * excludes delivery, who was told by an app that they were covered, has been misled into a risk they
 * did not know they were taking. That is the harm ADR-003 §2 refused to take on.
 *
 * **CR-4: this is not a job.** No "apply for a position", no "shift", no "wage". Offers are accepted
 * or declined at will, and the screen says so up front rather than burying it in terms.
 *
 * **CR-5: nothing is guaranteed.** No earnings estimate, no "make £X a week". The platform does not
 * control how many offers exist.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Select } from '@/components/primitives/Select';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Banner } from '@/components/feedback/Banner';
import { useToast } from '@/components/feedback/ToastProvider';
import { AppApiError } from '@/lib/api/errors';
import {
  useApplyToDrive,
  useDriverEligibility,
  useDriverProfile,
  useRenewAttestation,
} from '../hooks/useDelivery';
import type { VehicleType } from '../types';

const VEHICLES = [
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'car', label: 'Car' },
  { value: 'van', label: 'Van' },
];

/** Every reason in the driver's own words. The raw enum must never reach a screen. */
const REASON_COPY: Record<string, string> = {
  no_profile: 'You haven’t applied yet.',
  awaiting_approval: 'We’re still reviewing your application.',
  background_check: 'Your background check hasn’t come back yet.',
  licence_expired: 'Your licence date has passed — update it below.',
  insurance_expired: 'Your insurance date has passed — update it below.',
  suspended: 'Your account is on hold. Get in touch and we’ll look at it.',
  payout_account: 'Add a payout account so you can be paid.',
};

function isoFromDateInput(v: string): string {
  return new Date(`${v}T12:00:00`).toISOString();
}

export function DriverOnboarding() {
  const { show } = useToast();
  const { data: profile, isLoading } = useDriverProfile();
  const { data: eligibility } = useDriverEligibility();
  const apply = useApplyToDrive();
  const renew = useRenewAttestation();

  const [vehicleType, setVehicleType] = useState<VehicleType>('bicycle');
  const [vehicleDescription, setVehicleDescription] = useState('');
  const [licence, setLicence] = useState('');
  const [insurance, setInsurance] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  if (isLoading) return <Skeleton $h="240px" $radius={16} />;

  const fail = (e: unknown) =>
    show(e instanceof AppApiError ? e.message : 'Something went wrong', 'danger');
  const datesValid = Boolean(licence && insurance);

  // ─── Already applied ────────────────────────────────────────────────────────────────────
  if (profile) {
    const blockers = eligibility?.reasons ?? [];
    return (
      <Wrap>
        <Card>
          <CardTitle>Your driver account</CardTitle>
          {eligibility?.eligible ? (
            <Banner tone="success">You can take deliveries.</Banner>
          ) : (
            <>
              <Banner tone="warning">You can’t take deliveries yet.</Banner>
              <List>
                {blockers.map((r) => (
                  <li key={r}>{REASON_COPY[r] ?? r}</li>
                ))}
              </List>
            </>
          )}
          <Meta>
            {profile.vehicleType}
            {profile.vehicleDescription ? ` · ${profile.vehicleDescription}` : ''}
          </Meta>
        </Card>

        <Card>
          <CardTitle>Your licence and insurance</CardTitle>
          {/*
            CR-3. Phrased entirely as the driver's own responsibility. There is no sentence anywhere
            on this screen that tells them what is or isn't covered.
          */}
          <Quiet>
            You need a valid licence and insurance that covers using your vehicle for delivery. Keep
            the dates here up to date — offers stop when either one passes.
          </Quiet>
          <Row>
            <Input
              label="Licence valid until"
              type="date"
              value={licence}
              onChange={(e) => setLicence(e.target.value)}
            />
            <Input
              label="Insurance valid until"
              type="date"
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
            />
          </Row>
          <Button
            variant="secondary"
            disabled={!datesValid}
            loading={renew.isPending}
            onClick={() =>
              renew.mutate(
                {
                  licenceExpiresAt: isoFromDateInput(licence),
                  insuranceExpiresAt: isoFromDateInput(insurance),
                },
                { onSuccess: () => show('Dates updated', 'success'), onError: fail },
              )
            }
          >
            Update dates
          </Button>
        </Card>
      </Wrap>
    );
  }

  // ─── First application ──────────────────────────────────────────────────────────────────
  return (
    <Wrap>
      <Intro>
        <IntroTitle>Deliver for businesses near you</IntroTitle>
        {/*
          CR-4 + CR-5, said before anything is asked of them. Not a job, not a schedule, and no
          promise about how much work exists — the platform does not control that.
        */}
        <Quiet>
          When a vendor nearby needs a hand, you’ll see the trip and what they’re offering for it.
          Take the ones you want. There’s no schedule, nothing to sign up for, and turning one down
          costs you nothing — we don’t track it.
        </Quiet>
      </Intro>

      <Card>
        <CardTitle>About you</CardTitle>
        <Select
          label="What will you deliver on?"
          options={VEHICLES}
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value as VehicleType)}
        />
        <Input
          label="Describe it (optional)"
          placeholder="Blue hybrid bike"
          value={vehicleDescription}
          onChange={(e) => setVehicleDescription(e.target.value)}
          maxLength={120}
        />
      </Card>

      <Card>
        <CardTitle>Licence and insurance</CardTitle>
        <Quiet>
          You need a valid licence and insurance that covers using your vehicle for delivery.
          It&rsquo;s worth checking with your insurer — many personal policies don&rsquo;t include
          it. We record the dates you give us so we can stop sending you offers before they run out.
        </Quiet>
        <Row>
          <Input
            label="Licence valid until"
            type="date"
            value={licence}
            onChange={(e) => setLicence(e.target.value)}
          />
          <Input
            label="Insurance valid until"
            type="date"
            value={insurance}
            onChange={(e) => setInsurance(e.target.value)}
          />
        </Row>
      </Card>

      <Card>
        {/* A-14 — absent from the specification. Nobody should be sent to a stranger's address
            without this having been asked for. */}
        <CardTitle>Someone we can call</CardTitle>
        <Quiet>If something happens while you&rsquo;re out, who should we contact?</Quiet>
        <Row>
          <Input
            label="Name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            maxLength={80}
          />
          <Input
            label="Phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            maxLength={32}
          />
        </Row>
      </Card>

      <Button
        fullWidth
        disabled={!datesValid}
        loading={apply.isPending}
        onClick={() =>
          apply.mutate(
            {
              vehicleType,
              ...(vehicleDescription.trim() ? { vehicleDescription: vehicleDescription.trim() } : {}),
              licenceExpiresAt: isoFromDateInput(licence),
              insuranceExpiresAt: isoFromDateInput(insurance),
              ...(contactName.trim() ? { emergencyContactName: contactName.trim() } : {}),
              ...(contactPhone.trim() ? { emergencyContactPhone: contactPhone.trim() } : {}),
            },
            { onSuccess: () => show('Application sent', 'success'), onError: fail },
          )
        }
      >
        Send application
      </Button>
      <FinePrint>
        We&rsquo;ll run a background check before you can start. You&rsquo;re an independent party
        taking individual deliveries — not an employee, and there&rsquo;s no minimum.
      </FinePrint>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]}px;
  max-width: 560px;
`;
const Intro = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[2]}px;
`;
const IntroTitle = styled.h2`
  font-size: 20px;
  font-weight: 800;
`;
const Card = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
  padding: ${({ theme }) => theme.space[4]}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.line2};
`;
const CardTitle = styled.h3`
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.color.textTertiary};
`;
const Quiet = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const Meta = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
  text-transform: capitalize;
`;
const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const List = styled.ul`
  display: grid;
  gap: ${({ theme }) => theme.space[1]}px;
  padding-left: ${({ theme }) => theme.space[4]}px;
  list-style: disc;
  font-size: 13px;
  color: ${({ theme }) => theme.color.textSecondary};
`;
const FinePrint = styled.p`
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme }) => theme.color.textTertiary};
`;
