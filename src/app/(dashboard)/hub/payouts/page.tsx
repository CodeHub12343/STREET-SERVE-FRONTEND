'use client';

/**
 * The hub's payout account — the same surface as the vendor's, on a /hub route.
 *
 * A hub IS a business with its own Stripe account, settlements and balance, and many hub operators
 * never sell as a vendor. Previously the only way to reach payouts was /vendor/payouts, which both
 * required the vendor role and flipped the dashboard shell out of the hub workspace.
 */
import { VendorPayouts, VendorBusinessGate } from '@/features/vendor';
import { useRequireAnyRole } from '@/lib/auth/guards';

export default function HubPayoutsPage() {
  useRequireAnyRole('hub', 'vendor');
  return (
    <VendorBusinessGate>
      {(businessId) => <VendorPayouts businessId={businessId} />}
    </VendorBusinessGate>
  );
}
