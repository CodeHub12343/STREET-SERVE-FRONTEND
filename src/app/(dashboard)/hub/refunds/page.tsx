'use client';

import { HubGate } from '@/features/hub';
import { HubRefunds } from '@/features/refunds';
import { useRequireRole } from '@/lib/auth/guards';

export default function HubRefundsPage() {
  useRequireRole('hub');
  return <HubGate>{(hubId) => <HubRefunds hubId={hubId} />}</HubGate>;
}
