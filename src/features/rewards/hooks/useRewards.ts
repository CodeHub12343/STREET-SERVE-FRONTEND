'use client';

/**
 * Phase 7 rewards data layer — wish lists (7.2), loyalty stamps (7.3), referrals (7.4).
 *
 * Demo mode returns fixtures so the screens are walkable with no backend, matching the pattern the
 * rest of the app uses.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type {
  LoyaltyCard,
  LoyaltyProgram,
  LoyaltyReward,
  ReferralClaimResult,
  ReferralCode,
  ReferralSummary,
  WishlistItem,
  WishlistSubject,
} from '../types';

const DEMO_WISHLIST: WishlistItem[] = [
  {
    id: 'w1',
    subjectType: 'menu_item',
    subjectId: 'm1',
    label: 'Birria Tacos (3)',
    businessId: 'biz_taco',
    notified: false,
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
];

const DEMO_CARDS: LoyaltyCard[] = [
  {
    businessId: 'biz_taco',
    stamps: 7,
    stampsRequired: 10,
    rewardDescription: 'A free taco plate',
    active: true,
    lifetimeStamps: 17,
  },
];

const DEMO_REWARDS: LoyaltyReward[] = [
  {
    id: 'r1',
    businessId: 'biz_taco',
    description: 'A free taco plate',
    code: 'K7RQ2MNX',
    earnedAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

// ─── 7.2 wish lists ────────────────────────────────────────────────────────────────────────

export function useWishlist() {
  return useQuery<WishlistItem[]>({
    queryKey: keys.wishlist,
    queryFn: () =>
      isMapDemo ? Promise.resolve(DEMO_WISHLIST) : api.get<WishlistItem[]>(endpoints.wishlist),
    staleTime: 30_000,
  });
}

export function useAddToWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { subjectType: WishlistSubject; subjectId: string }) =>
      isMapDemo
        ? Promise.resolve({ ...DEMO_WISHLIST[0]!, ...input })
        : api.post<WishlistItem>(endpoints.wishlist, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.wishlist }),
  });
}

export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      isMapDemo ? Promise.resolve() : api.del(endpoints.wishlistItem(id)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.wishlist }),
  });
}

// ─── 7.3 loyalty ───────────────────────────────────────────────────────────────────────────

export function useLoyaltyCards() {
  return useQuery<LoyaltyCard[]>({
    queryKey: keys.loyaltyCards,
    queryFn: () =>
      isMapDemo ? Promise.resolve(DEMO_CARDS) : api.get<LoyaltyCard[]>(endpoints.loyaltyCards),
    staleTime: 30_000,
  });
}

export function useLoyaltyRewards() {
  return useQuery<LoyaltyReward[]>({
    queryKey: keys.loyaltyRewards,
    queryFn: () =>
      isMapDemo ? Promise.resolve(DEMO_REWARDS) : api.get<LoyaltyReward[]>(endpoints.loyaltyRewards),
    staleTime: 30_000,
  });
}

/** The card a customer is being asked to fill, shown on a business profile. Null = no programme. */
export function useBusinessLoyalty(businessId: string | undefined) {
  return useQuery<LoyaltyProgram | null>({
    queryKey: keys.businessLoyalty(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({
            businessId: businessId!,
            stampsRequired: 10,
            rewardDescription: 'A free taco plate',
            active: true,
          })
        : api.get<LoyaltyProgram | null>(endpoints.businessLoyalty(businessId!)),
    staleTime: 300_000,
  });
}

/** Vendor: set up or change the card. */
export function useSetLoyaltyProgram(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { stampsRequired: number; rewardDescription: string; active?: boolean }) =>
      isMapDemo
        ? Promise.resolve({ businessId, ...input, active: input.active ?? true })
        : api.put<LoyaltyProgram>(endpoints.businessLoyalty(businessId), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.businessLoyalty(businessId) }),
  });
}

/** Vendor: honour a reward at the counter. */
export function useRedeemReward(businessId: string) {
  return useMutation({
    mutationFn: (code: string) =>
      isMapDemo
        ? Promise.resolve({ id: 'r1', description: 'A free taco plate', redeemedAt: new Date().toISOString() })
        : api.post<{ id: string; description: string; redeemedAt: string }>(
            endpoints.businessLoyaltyRedeem(businessId),
            { code },
          ),
  });
}

// ─── 7.4 referrals ─────────────────────────────────────────────────────────────────────────

export function useReferrals() {
  return useQuery<ReferralSummary>({
    queryKey: keys.referrals,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({ referrals: [], credits: [] })
        : api.get<ReferralSummary>(endpoints.referrals),
    staleTime: 60_000,
  });
}

/** Allocated on first ask and stable thereafter — people share it. */
export function useReferralCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      isMapDemo
        ? Promise.resolve({ code: 'TACO24', rewardsEarned: 0, cap: 25 })
        : api.post<ReferralCode>(endpoints.referralCode),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.referrals }),
  });
}

export function useClaimReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      isMapDemo
        ? Promise.resolve({
            id: 'ref1',
            status: 'pending',
            message:
              'Referral recorded. Your friend earns their reward once you complete your first order — and so do you.',
            expiresAt: new Date(Date.now() + 60 * 86_400_000).toISOString(),
          })
        : api.post<ReferralClaimResult>(endpoints.referralClaim, { code }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.referrals }),
  });
}
