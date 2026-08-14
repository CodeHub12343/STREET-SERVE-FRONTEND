'use client';

import { VendorPayouts, VendorBusinessGate } from '@/features/vendor';
import { useRequireAnyRole } from '@/lib/auth/guards';

export default function VendorPayoutsPage() {
  /**
   * Hub owners reach this too. A hub IS a business with its own Stripe account and settlements, and
   * plenty of hub operators never sell as a vendor — gating payouts behind the vendor role forced
   * them to switch into a mode they don't use just to see their own money.
   */
  useRequireAnyRole('vendor', 'hub');
  return (
    <VendorBusinessGate>
      {(businessId) => <VendorPayouts businessId={businessId} />}
    </VendorBusinessGate>
  );
}
