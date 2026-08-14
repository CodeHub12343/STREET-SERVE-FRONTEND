'use client';

import { BoostManagerPanel } from '@/features/boost';
import { VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function BoostPage() {
  useRequireRole('vendor');
  // No module gate: any business may crowdfund a mailing — there is no capability to switch on.
  return <VendorBusinessGate>{(businessId) => <BoostManagerPanel businessId={businessId} />}</VendorBusinessGate>;
}
