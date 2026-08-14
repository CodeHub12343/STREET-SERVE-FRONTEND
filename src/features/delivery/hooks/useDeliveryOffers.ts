'use client';

/**
 * The driver's home-screen data: are they eligible, are they already on a job, and what is on offer.
 *
 * Composed into one hook because the screen's first decision depends on all three, and three
 * separate loading states on a screen somebody is looking at while standing next to a bike is a
 * worse experience than one.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type { Delivery, DeliveryOffer } from '../types';
import { useDeliveryOffers, useDriverEligibility } from './useDelivery';

export { useAcceptDelivery } from './useDelivery';

/** The delivery in progress, if any. Polled: its status changes from the vendor's side too. */
export function useActiveDelivery(enabled = true) {
  return useQuery<Delivery | null>({
    queryKey: keys.activeDelivery,
    enabled,
    queryFn: () =>
      isMapDemo ? Promise.resolve(null) : api.get<Delivery | null>(endpoints.deliveries.mine),
    refetchInterval: 15_000,
    staleTime: 0,
  });
}

export function useDeliveryEligibleOffers(): {
  offers: DeliveryOffer[];
  isLoading: boolean;
  eligibility: { eligible: boolean; reasons: string[] } | undefined;
  activeId: string | undefined;
} {
  const { data: eligibility } = useDriverEligibility();
  const eligible = eligibility?.eligible ?? false;
  const { data: active } = useActiveDelivery(eligible);
  // Don't poll for offers while they're mid-delivery — they cannot take a second one anyway.
  const { data: offers = [], isLoading } = useDeliveryOffers(eligible && !active);

  return { offers, isLoading, eligibility, activeId: active?.id };
}
