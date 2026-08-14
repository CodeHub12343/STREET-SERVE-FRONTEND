'use client';

/**
 * Resolves the vendor's active business once, for every vendor screen, and renders children only
 * with a REAL business id. Without this each screen would call business-scoped endpoints with a
 * placeholder id and get a 400 (the backend validates ids as 24-char ObjectIds).
 *
 * With `module`, it also asserts the screen's capability is enabled (BUSINESS_MODULE_SYSTEM.md
 * §5). Nav filtering hides the tab; this handles the deep link — and, per docs/06 §1, does it
 * with a way forward rather than a 404.
 *
 * The states it owns so screens don't repeat them: loading, no-business-yet → registration,
 * lookup failure, and module-not-enabled → Modules screen.
 */
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { useVendorBusiness } from '../hooks/useVendorBusinessId';
import { useBusinessModules, type BusinessModule } from '../hooks/useBusinessModules';

const MODULE_LABEL: Partial<Record<BusinessModule, string>> = {
  menu: 'Menu',
  ordering: 'Orders',
  queue: 'Queue',
  wave_down: 'Wave-downs',
  services: 'Services',
  booking: 'Bookings',
  catalog: 'Catalog',
  consignment: 'Consignment',
  gifting: 'Gift cards',
  giveaways: 'Giveaways',
  pay_it_forward: 'Pay It Forward',
  ping_sharing: 'Ping Sharing',
  licensing: 'License',
  hub_operations: 'Hub tools',
};

export interface VendorBusinessGateProps {
  /** Assert this capability is enabled before rendering. */
  module?: BusinessModule;
  children: (businessId: string) => ReactNode;
}

export function VendorBusinessGate({ module, children }: VendorBusinessGateProps) {
  const router = useRouter();
  const { businessId, isLoading, isError, refetch } = useVendorBusiness();
  const { data: modules, isLoading: modulesLoading } = useBusinessModules(
    module ? (businessId ?? undefined) : undefined,
  );

  if (isLoading) {
    return (
      <Screen>
        <Skeleton $h="180px" $radius={16} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <EmptyState
          icon="⚠️"
          title="Couldn’t load your business"
          description="We couldn’t reach the server. Nothing is lost — try again."
          action={<Button onClick={refetch}>Try again</Button>}
        />
      </Screen>
    );
  }

  if (!businessId) {
    return (
      <Screen>
        <EmptyState
          icon="🚚"
          title="Register your business to go live"
          description="You have the vendor role — the last step is registering your business. Then you can go live on the map, manage a queue, and take orders."
          action={<Button onClick={() => router.push('/vendor/register')}>Register my business</Button>}
        />
      </Screen>
    );
  }

  if (module) {
    if (modulesLoading) {
      return (
        <Screen>
          <Skeleton $h="180px" $radius={16} />
        </Screen>
      );
    }
    if (modules && !modules.enabled.includes(module)) {
      const label = MODULE_LABEL[module] ?? module;
      // Available but off → the vendor can fix it themselves. Not available → their category
      // doesn't offer it at all, so sending them to Modules would be a dead end.
      const canEnable = modules.available.includes(module);
      return (
        <Screen>
          <EmptyState
            icon="🧩"
            title={`${label} isn’t turned on`}
            description={
              canEnable
                ? `${label} isn’t part of your setup yet. Turn it on in Modules and it’ll appear in your dashboard.`
                : `${label} isn’t available for your business category. Everything else on your dashboard works as usual.`
            }
            action={
              canEnable ? (
                <Button onClick={() => router.push('/vendor/modules')}>Open Modules</Button>
              ) : (
                <Button variant="secondary" onClick={() => router.push('/vendor')}>
                  Back to dashboard
                </Button>
              )
            }
          />
        </Screen>
      );
    }
  }

  return <>{children(businessId)}</>;
}

const Screen = styled.div`
  padding: ${({ theme }) => theme.space[5]}px;
`;
