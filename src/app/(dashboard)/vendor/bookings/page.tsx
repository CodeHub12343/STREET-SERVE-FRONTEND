'use client';

import { VendorBookings } from '@/features/scheduling';
import { VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorBookingsPage() {
  useRequireRole('vendor');
  return (
    <VendorBusinessGate module="booking">
      {(businessId) => <VendorBookings businessId={businessId} />}
    </VendorBusinessGate>
  );
}
