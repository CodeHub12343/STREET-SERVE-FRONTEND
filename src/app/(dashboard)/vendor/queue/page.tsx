'use client';

import { QueueManagement, VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorQueuePage() {
  useRequireRole('vendor');
  return (
    <VendorBusinessGate module="queue">
      {(businessId) => <QueueManagement businessId={businessId} />}
    </VendorBusinessGate>
  );
}
