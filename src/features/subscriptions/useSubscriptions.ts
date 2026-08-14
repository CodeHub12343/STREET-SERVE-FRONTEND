'use client';

/**
 * Monetization subscriptions (R29/R30) — list plans, read entitlements, subscribe, cancel. Business
 * plans (Pro / Featured / Verified badge) pass a businessId; the AI assistant is user-scoped.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { newIdempotencyKey } from '@/lib/idempotency';
import type { Cents } from '@/types';

/**
 * All six plans the backend defines. `seller_plus` and `stock_waiver` are SELLER-scoped (keyed to
 * the user, not a business) and were missing here — the server returned them and the client had no
 * type, no entitlement key, and no demo row for either, so two revenue-bearing products were
 * invisible to the screen that sells them.
 */
export type SubscriptionPlan =
  | 'pro'
  | 'featured'
  | 'verified_badge'
  | 'ai_assistant'
  | 'seller_plus'
  | 'stock_waiver';

export interface PlanDef {
  plan: SubscriptionPlan;
  name: string;
  priceCents: Cents;
  blurb: string;
  scope: 'business' | 'user';
}

export interface Entitlements {
  pro: boolean;
  featured: boolean;
  verifiedBadge: boolean;
  aiAssistant: boolean;
  sellerPlus: boolean;
  stockWaiver: boolean;
}

const DEMO_PLANS: PlanDef[] = [
  { plan: 'pro', name: 'StreetServe Pro', priceCents: 2999, blurb: 'Lower marketplace fees on every sale, plus priority support.', scope: 'business' },
  { plan: 'featured', name: 'Featured Placement', priceCents: 4999, blurb: 'Rise to the top of Trending and discovery.', scope: 'business' },
  { plan: 'verified_badge', name: 'Verified Badge', priceCents: 999, blurb: 'A verified badge on your profile and pins.', scope: 'business' },
  { plan: 'ai_assistant', name: 'AI Marketing Assistant', priceCents: 1999, blurb: 'Unlimited AI coaching, pricing, and marketing copy.', scope: 'user' },
  { plan: 'seller_plus', name: 'Seller Plus', priceCents: 499, blurb: 'Carry more stock, keep more of each sale, and get first look at new inventory.', scope: 'user' },
  // Deliberately a WAIVER, never insurance — the copy must never say policy, premium, or claim.
  { plan: 'stock_waiver', name: 'Stock Protection', priceCents: 299, blurb: 'If stock is lost or damaged, we waive what you’d owe — up to your cover limit.', scope: 'user' },
];

export function usePlans() {
  return useQuery<PlanDef[]>({
    queryKey: keys.subscriptionPlans,
    queryFn: () => (isMapDemo ? Promise.resolve(DEMO_PLANS) : api.get<PlanDef[]>(endpoints.subscriptionPlans)),
    staleTime: 5 * 60_000,
  });
}

export function useEntitlements(businessId?: string) {
  return useQuery<Entitlements>({
    queryKey: keys.entitlements(businessId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({
            pro: false,
            featured: false,
            verifiedBadge: false,
            aiAssistant: false,
            sellerPlus: false,
            stockWaiver: false,
          })
        : api.get<Entitlements>(endpoints.subscriptionsMine, { query: { businessId } }),
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}

/**
 * What the server returns when a plan is taken up. `clientSecret` is present whenever the first
 * invoice still needs paying — the subscription exists at Stripe but entitles nothing until it is
 * confirmed, so the screen must collect a card rather than declare victory.
 */
export interface SubscribeResult {
  plan: SubscriptionPlan;
  status: string;
  clientSecret: string | null;
}

export function useSubscribe(businessId?: string) {
  const qc = useQueryClient();
  return useMutation<SubscribeResult, Error, SubscriptionPlan>({
    mutationFn: (plan: SubscriptionPlan) =>
      isMapDemo
        ? Promise.resolve({ plan, status: 'active', clientSecret: null })
        : api.post<SubscribeResult>(
            endpoints.subscribe,
            { plan, businessId },
            { idempotencyKey: newIdempotencyKey() },
          ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.entitlements(businessId) }),
  });
}

/**
 * Settles the subscription once the card has been confirmed. The server re-reads Stripe, so this
 * asks "what happened?" rather than asserting that payment succeeded.
 */
export function useConfirmSubscription(businessId?: string) {
  const qc = useQueryClient();
  return useMutation<{ status: string }, Error, SubscriptionPlan>({
    mutationFn: (plan: SubscriptionPlan) =>
      isMapDemo
        ? Promise.resolve({ status: 'active' })
        : api.post<{ status: string }>(endpoints.subscriptionConfirm(plan), { businessId }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.entitlements(businessId) }),
  });
}

export function useCancelSubscription(businessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: SubscriptionPlan) =>
      isMapDemo ? Promise.resolve() : api.post(endpoints.subscriptionCancel(plan), { businessId }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.entitlements(businessId) }),
  });
}
