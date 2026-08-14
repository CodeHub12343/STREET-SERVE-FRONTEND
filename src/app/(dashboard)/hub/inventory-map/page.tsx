'use client';

/**
 * C-5 — "where is my inventory right now", for a hub owner.
 *
 * Its own route rather than a tab on the holders list: this is the screen someone opens when stock
 * is late and they need to find it, which is a different mode from routine reconciliation.
 */
import { TabPage } from '@/components/layout/TabPage';
import { HubGate, HubInventoryMap } from '@/features/hub';
import { useRequireRole } from '@/lib/auth/guards';

export default function HubInventoryMapPage() {
  useRequireRole('hub');
  return (
    <TabPage title="Where my stock is">
      <HubGate>{(hubId) => <HubInventoryMap hubId={hubId} />}</HubGate>
    </TabPage>
  );
}
