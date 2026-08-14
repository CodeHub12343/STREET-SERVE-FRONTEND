'use client';

import { HubApprovals, HubGate } from '@/features/hub';
import { useRequireRole } from '@/lib/auth/guards';

export default function HubApprovalsPage() {
  useRequireRole('hub');
  return <HubGate>{(hubId) => <HubApprovals hubId={hubId} />}</HubGate>;
}
