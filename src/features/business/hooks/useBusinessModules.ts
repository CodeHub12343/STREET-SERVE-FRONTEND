'use client';

/**
 * The business's resolved capability set (BUSINESS_MODULE_SYSTEM.md §5) — the server decides,
 * the client only renders. Drives the dashboard nav, route gates, the Modules screen, and (later)
 * the customer profile's primary CTA.
 *
 * Demo mode mirrors the server's archetype defaults per category tab, so the sample businesses stay
 * walkable — and honest: the demo mechanic leads with "Wave them down", not "Order".
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { findDemoBusiness } from '@/lib/demo';

export type Archetype =
  | 'counter_serve'
  | 'appointment_service'
  | 'on_demand_service'
  | 'goods_seller';

export type BusinessModule =
  | 'live_presence'
  | 'profile'
  | 'reviews'
  | 'messaging'
  | 'payouts'
  | 'analytics'
  | 'licensing'
  | 'hub_operations'
  | 'menu'
  | 'ordering'
  | 'queue'
  | 'wave_down'
  | 'services'
  | 'booking'
  | 'catalog'
  | 'consignment'
  | 'gifting'
  | 'giveaways'
  | 'pay_it_forward'
  | 'ping_sharing'
  | 'ai_assistant';

export interface ResolvedModules {
  archetype: Archetype;
  enabled: BusinessModule[];
  available: BusinessModule[];
  core: BusinessModule[];
  /** Cannot be disabled: core + auto rules (licensing when regulated, hub_operations for hubs). */
  locked: BusinessModule[];
  /**
   * The ONE way customers transact here — `ordering` or `booking`, never both, or `null` for a
   * trade that takes neither (wave-downs only). The server enforces the exclusivity; the client
   * only renders the choice.
   */
  commerceMode: BusinessModule | null;
}

/** Mirrors the server's COMMERCE_MODULES — mutually exclusive by construction. */
export const COMMERCE_MODULES: BusinessModule[] = ['ordering', 'booking'];

const CORE: BusinessModule[] = [
  'live_presence',
  'profile',
  'reviews',
  'messaging',
  'payouts',
  'analytics',
];

/** Mirrors the server's ARCHETYPE_DEFAULTS (modules.service.ts) — demo mode only. */
const DEMO_DEFAULTS: Record<Archetype, BusinessModule[]> = {
  counter_serve: ['menu', 'ordering', 'queue', 'wave_down'],
  appointment_service: ['services', 'booking'],
  on_demand_service: ['services', 'wave_down'],
  goods_seller: ['menu', 'catalog', 'ordering', 'consignment'],
};

/** Mirrors the server's DEFAULT_ARCHETYPE_BY_TAB (config/constants.ts) — demo mode only. */
const DEMO_ARCHETYPE_BY_TAB: Record<string, Archetype> = {
  food: 'counter_serve',
  coffee: 'counter_serve',
  services: 'on_demand_service',
  shopping: 'goods_seller',
  more: 'goods_seller',
};

/** The demo resolution of a category tab. Exported so demo map pins agree with demo profiles. */
export function demoModulesFor(categoryTab: string | undefined): ResolvedModules {
  const archetype = DEMO_ARCHETYPE_BY_TAB[categoryTab ?? 'more'] ?? 'goods_seller';
  const enabled = [...DEMO_DEFAULTS[archetype], ...CORE];
  return {
    archetype,
    enabled,
    // Demo never exercises the Modules screen's off-by-default column, so available === enabled.
    available: enabled,
    core: CORE,
    locked: CORE,
    // Each archetype's defaults hold at most one of these, so this mirrors the server's rule.
    commerceMode: COMMERCE_MODULES.find((m) => enabled.includes(m)) ?? null,
  };
}

export function useBusinessModules(businessId: string | undefined) {
  return useQuery<ResolvedModules>({
    queryKey: keys.businessModules(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoModulesFor(findDemoBusiness(businessId!)?.category))
        : api.get<ResolvedModules>(endpoints.business(businessId!).modules),
    staleTime: 60_000,
  });
}

export function useSetBusinessModules(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: BusinessModule[]) =>
      isMapDemo
        ? Promise.resolve({ ...demoModulesFor(findDemoBusiness(businessId)?.category), enabled })
        : api.put<ResolvedModules>(endpoints.business(businessId).modules, { enabled }),
    onSuccess: (data) => {
      // Nav + gates read this key — write through so the sidebar updates without a refetch race.
      qc.setQueryData(keys.businessModules(businessId), data);
    },
  });
}
