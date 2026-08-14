'use client';

import { HubSettlements, HubGate } from '@/features/hub';
import { useRequireRole } from '@/lib/auth/guards';

export default function HubSettlementsPage() {
  useRequireRole('hub');
  return <HubGate>{(hubId) => <HubSettlements hubId={hubId} />}</HubGate>;
}
