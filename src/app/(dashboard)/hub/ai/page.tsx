'use client';

import { HubAiDashboard, HubGate } from '@/features/hub';
import { useRequireRole } from '@/lib/auth/guards';

export default function HubAiPage() {
  useRequireRole('hub');
  /**
   * `HubGate` resolves the operator's real hub id — the same pattern every other hub page uses.
   * This page previously rendered without it, which is how it ended up on hardcoded sample data:
   * with no hub in scope there was nothing to fetch for.
   */
  return <HubGate>{(hubId) => <HubAiDashboard hubId={hubId} />}</HubGate>;
}
