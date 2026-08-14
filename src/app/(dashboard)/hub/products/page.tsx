'use client';

import { HubProducts, HubGate } from '@/features/hub';
import { useRequireRole } from '@/lib/auth/guards';

export default function HubProductsPage() {
  useRequireRole('hub');
  return <HubGate>{(hubId) => <HubProducts hubId={hubId} />}</HubGate>;
}
