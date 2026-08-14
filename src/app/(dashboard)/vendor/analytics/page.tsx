'use client';

import { VendorAnalytics, VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorAnalyticsPage() {
  useRequireRole('vendor');
  return (
    <VendorBusinessGate>
      {(businessId) => <VendorAnalytics businessId={businessId} />}
    </VendorBusinessGate>
  );
}
