'use client';

/**
 * B-6: the shelter staff console. Client-rendered because the partner id comes from the signed-in
 * staff member's own enrollment context rather than the URL — staff belong to exactly one org, so
 * making them pick one from a route param would be busywork.
 */
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { TabPage } from '@/components/layout/TabPage';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ShelterConsole } from '@/features/shelter';

function Console() {
  const params = useSearchParams();
  const partnerId = params.get('partner');

  if (!partnerId) {
    return (
      <EmptyState
        icon="🏠"
        title="No shelter linked to this account"
        description="Ask a StreetServe admin to register your organisation as a partner."
      />
    );
  }
  return <ShelterConsole partnerId={partnerId} />;
}

export default function ShelterConsolePage() {
  return (
    <TabPage title="Shelter program">
      <Suspense fallback={null}>
        <Console />
      </Suspense>
    </TabPage>
  );
}
