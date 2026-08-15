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
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/primitives/Button';
import { useMyHub } from '../hooks/useHub';

export function HubGate({ children }: { children: (hubId: string) => ReactNode }) {
  const router = useRouter();
  const { data: hubs, isLoading, isError, refetch } = useMyHub();
  /**
   * `isError` is part of the question, not a detail.
   *
   * Without it, a FAILED request looks identical to "you have no hub": `data` is undefined either
   * way, so a 403, a 500, or a cold backend redirected an operator who owns a hub to go and
   * register one — offering to create a duplicate the server would refuse as
   * "Business is already a hub". VendorBusinessGate already draws this distinction; this did not.
   */
  const hasNoHub = !isLoading && !isError && (hubs?.length ?? 0) === 0;

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
  if (isError) {
    return (
      <TabPage title="Consignment Hub">
        <ErrorState
          title="Couldn’t load your hub"
          message="This is a connection problem, not a missing hub — nothing has been lost."
          onRetry={() => void refetch()}
        />
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
