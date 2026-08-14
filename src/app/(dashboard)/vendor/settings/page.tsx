'use client';

import { VendorBusinessGate, VendorSettings } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorSettingsPage() {
  useRequireRole('vendor');
  return (
    <VendorBusinessGate>{(businessId) => <VendorSettings businessId={businessId} />}</VendorBusinessGate>
  );
}
