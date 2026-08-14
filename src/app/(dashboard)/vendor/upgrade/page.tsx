'use client';

import { VendorBusinessGate } from '@/features/vendor';
import { PlansScreen } from '@/features/subscriptions';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorUpgradePage() {
  useRequireRole('vendor');
  return <VendorBusinessGate>{(businessId) => <PlansScreen businessId={businessId} />}</VendorBusinessGate>;
}
