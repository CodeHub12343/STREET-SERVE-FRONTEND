'use client';

import { HubStation, HubGate } from '@/features/hub';
import { useRequireRole } from '@/lib/auth/guards';

export default function HubStationPage() {
  useRequireRole('hub');
  return <HubGate>{(hubId) => <HubStation hubId={hubId} />}</HubGate>;
}
