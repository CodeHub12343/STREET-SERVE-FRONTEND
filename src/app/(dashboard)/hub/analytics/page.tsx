'use client';

import { HubAnalytics, HubGate } from '@/features/hub';
import { useRequireRole } from '@/lib/auth/guards';

export default function HubAnalyticsPage() {
  useRequireRole('hub');
  return <HubGate>{(hubId) => <HubAnalytics hubId={hubId} />}</HubGate>;
}
