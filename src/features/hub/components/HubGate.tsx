'use client';

/**
 * Resolves the operator's real hub for every hub dashboard screen — the hub counterpart to
 * VendorBusinessGate. While loading, a skeleton; if the operator has registered NO hub yet, they're
 * sent to /hub/register (with a visible CTA fallback) instead of an empty, confusing dashboard.
 * Otherwise it renders its children with the real hub id.
 */
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { TabPage } from '@/components/layout/TabPage';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/primitives/Button';
import { useMyHub } from '../hooks/useHub';

export function HubGate({ children }: { children: (hubId: string) => ReactNode }) {
  const router = useRouter();
  const { data: hubs, isLoading } = useMyHub();
  const hasNoHub = !isLoading && (hubs?.length ?? 0) === 0;

  useEffect(() => {
    if (hasNoHub) router.replace('/hub/register');
  }, [hasNoHub, router]);

  if (isLoading) {
    return (
      <TabPage title="Consignment Hub">
        <Skeleton $h="180px" $radius={16} />
      </TabPage>
    );
  }
  if (hasNoHub || !hubs) {
    return (
      <TabPage title="Consignment Hub">
        <EmptyState
          icon="🏪"
          title="Register your hub to get started"
          description="Turn your storefront into a consignment hub — stock street sellers and settle automatically."
          action={<Button onClick={() => router.push('/hub/register')}>Register your hub</Button>}
        />
      </TabPage>
    );
  }
  return <>{children(hubs[0]!.id)}</>;
}
