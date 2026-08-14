'use client';

/**
 * The driver's home. One route rather than two, because the answer to "what do I do now" differs by
 * state, not by page: apply, wait, take an offer, or finish the job you're on.
 */
import { TabPage } from '@/components/layout/TabPage';
import { DriverOffers, DriverOnboarding, useDriverEligibility } from '@/features/delivery';

export default function DrivePage() {
  const { data: eligibility, isLoading } = useDriverEligibility();
  const ready = eligibility?.eligible === true;

  return (
    <TabPage title={ready ? 'Deliveries' : 'Drive'}>
      {isLoading ? null : ready ? <DriverOffers /> : <DriverOnboarding />}
    </TabPage>
  );
}
