'use client';

import { LicenseManager, VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorLicensePage() {
  useRequireRole('vendor');
  return (
    <VendorBusinessGate module="licensing">
      {(businessId) => <LicenseManager businessId={businessId} />}
    </VendorBusinessGate>
  );
}
