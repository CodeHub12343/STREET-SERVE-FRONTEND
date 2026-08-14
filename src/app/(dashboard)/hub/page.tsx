'use client';

import { HubInventory, HubGate } from '@/features/hub';
import { useRequireRole } from '@/lib/auth/guards';

export default function HubHomePage() {
  useRequireRole('hub');
  return <HubGate>{(hubId) => <HubInventory hubId={hubId} />}</HubGate>;
}
