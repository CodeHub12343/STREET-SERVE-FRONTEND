'use client';

/**
 * Paid-placement data layer (F-1/F-3, spec §32).
 *
 * Serving is deliberately conservative: an ad slot must NEVER break the surface it sits in. Every
 * serve query fails soft to an empty list, because a discovery feed that errors out because an ad
 * could not load is a worse product than one with no ad in it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type {
  AdPlacementSurface,
  AdPricing,
  CreateCampaignInput,
  CreateFeaturedInput,
  CreatedPlacement,
  Placement,
  ServedAd,
} from '../types';

/** Demo pricing mirrors the server's `AD_DURATION_TIERS` so the flow is walkable with no backend. */
const DEMO_PRICING: AdPricing = {
  tiers: [
    { days: 1, label: 'One day', priceCents: 500, priceLabel: '$5.00' },
    { days: 7, label: 'One week', priceCents: 1500, priceLabel: '$15.00' },
    { days: 30, label: 'One month', priceCents: 4000, priceLabel: '$40.00' },
  ],
  cpm: [
    { placement: 'map_banner', cpmCents: 1200, cpmLabel: '$12.00 per 1,000 views' },
    { placement: 'discovery_card', cpmCents: 900, cpmLabel: '$9.00 per 1,000 views' },
    { placement: 'earn_slot', cpmCents: 700, cpmLabel: '$7.00 per 1,000 views' },
  ],
  disclosure:
    'Promoted placement increases how often people see this. It does not guarantee sales, and it ' +
    'never pushes other businesses out of results — promoted items are always labelled and capped ' +
    'at a share of what anyone sees.',
  label: 'Promoted',
  maxShareOfFeed: 0.2,
};

export function useAdPricing() {
  return useQuery<AdPricing>({
    queryKey: keys.placementsPricing,
    queryFn: () =>
      isMapDemo ? Promise.resolve(DEMO_PRICING) : api.get<AdPricing>(endpoints.placementsPricing),
    staleTime: 10 * 60_000,
  });
}

export function usePlacements(businessId?: string) {
  return useQuery<Placement[]>({
    queryKey: keys.placementsMine(businessId ?? 'me'),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve([])
        : api.get<Placement[]>(endpoints.placementsMine, {
            query: businessId ? { businessId } : undefined,
          }),
    staleTime: 30_000,
  });
}

function useInvalidatePlacements(businessId?: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: keys.placementsMine(businessId ?? 'me') });
}

export function useCreateCampaign(businessId?: string) {
  const invalidate = useInvalidatePlacements(businessId);
  return useMutation({
    mutationFn: (input: CreateCampaignInput) =>
      api.post<CreatedPlacement>(endpoints.placementsCampaigns, input),
    onSuccess: invalidate,
  });
}

export function useCreateFeatured(businessId?: string) {
  const invalidate = useInvalidatePlacements(businessId);
  return useMutation({
    mutationFn: (input: CreateFeaturedInput) =>
      api.post<CreatedPlacement>(endpoints.placementsFeatured, input),
    onSuccess: invalidate,
  });
}

/**
 * Re-open the charge for a promotion that was created but never paid for.
 *
 * Safe to call more than once: the server passes a per-placement Stripe idempotency key, so this
 * returns the SAME PaymentIntent rather than opening a second one. A buyer cannot double-charge
 * themselves by retrying.
 */
export function useResumePlacementPayment(businessId?: string) {
  const invalidate = useInvalidatePlacements(businessId);
  return useMutation({
    mutationFn: (id: string) =>
      isMapDemo
        ? Promise.resolve({ clientSecret: 'demo' } as CreatedPlacement)
        : api.post<CreatedPlacement>(endpoints.placementPay(id), {}),
    onSuccess: invalidate,
  });
}

export function usePausePlacement(businessId?: string) {
  const invalidate = useInvalidatePlacements(businessId);
  return useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) =>
      api.post<Placement>(endpoints.placementPause(id), { paused }),
    onSuccess: invalidate,
  });
}

/**
 * Ads for a surface. `feedSize` is the number of ORGANIC items on screen — the server uses it to
 * cap ads at a share of the feed, so passing a real count is what keeps the cap meaningful.
 *
 * `enabled: false` (or demo mode) yields an empty list rather than a loading state, so a surface
 * can call this unconditionally and render nothing when there is nothing to render.
 */
export function useServedAds(
  placement: AdPlacementSurface,
  opts: {
    feedSize: number;
    citySlug?: string;
    category?: string;
    lng?: number;
    lat?: number;
    enabled?: boolean;
  },
) {
  const ctx = [opts.citySlug ?? '', opts.category ?? '', opts.feedSize].join('|');
  const query = useQuery<ServedAd[]>({
    queryKey: keys.placementsServe(placement, ctx),
    enabled: (opts.enabled ?? true) && !isMapDemo && opts.feedSize > 0,
    queryFn: () =>
      api
        .get<ServedAd[]>(endpoints.placementsServe, {
          query: {
            placement,
            feedSize: opts.feedSize,
            ...(opts.citySlug ? { citySlug: opts.citySlug } : {}),
            ...(opts.category ? { category: opts.category } : {}),
            ...(opts.lng !== undefined && opts.lat !== undefined
              ? { lng: opts.lng, lat: opts.lat }
              : {}),
          },
        })
        // An ad slot must never break the surface it sits in.
        .catch(() => []),
    // Each mount is an impression, so refetching on focus would bill the advertiser for the same
    // pair of eyes twice. Held for a minute; the surface re-fills on genuine navigation.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  return { ads: query.data ?? [], isLoading: query.isLoading };
}

/**
 * Record a click. Fire-and-forget: click attribution must never delay or block the navigation the
 * user asked for, and a failed beacon is not worth an error state.
 */
export function useRecordAdClick() {
  return (placementId: string) => {
    if (isMapDemo) return;
    void api.post(endpoints.placementClick(placementId), {}).catch(() => undefined);
  };
}
