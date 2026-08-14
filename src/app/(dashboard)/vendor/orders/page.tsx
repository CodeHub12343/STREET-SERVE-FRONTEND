'use client';

import { OrderQueue, VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorOrdersPage() {
  useRequireRole('vendor');
  return (
    <VendorBusinessGate module="ordering">
      {(businessId) => <OrderQueue businessId={businessId} />}
    </VendorBusinessGate>
  );
}
