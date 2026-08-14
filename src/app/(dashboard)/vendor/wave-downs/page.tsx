'use client';

import { WaveInbox, VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function VendorWaveDownsPage() {
  useRequireRole('vendor');
  return (
    <VendorBusinessGate module="wave_down">
      {(businessId) => <WaveInbox businessId={businessId} />}
    </VendorBusinessGate>
  );
}
