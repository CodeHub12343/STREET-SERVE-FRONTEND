'use client';

import { CommunityImpactPanel } from '@/features/payforward';
import { VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function PayItForwardPage() {
  useRequireRole('vendor');
  return (
    <VendorBusinessGate module="pay_it_forward">
      {(businessId) => <CommunityImpactPanel businessId={businessId} />}
    </VendorBusinessGate>
  );
}
