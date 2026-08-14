'use client';

import { ModulesManager, VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorModulesPage() {
  useRequireRole('vendor');
  return (
    <VendorBusinessGate>{(businessId) => <ModulesManager businessId={businessId} />}</VendorBusinessGate>
  );
}
