'use client';

import { MenuManager, VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorMenuPage() {
  useRequireRole('vendor');
  return (
    <VendorBusinessGate module="menu">
      {(businessId) => <MenuManager businessId={businessId} />}
    </VendorBusinessGate>
  );
}
