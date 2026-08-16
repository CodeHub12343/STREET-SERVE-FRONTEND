'use client';

/**
 * Pay It Forward data layer (ADR-005).
 *
 * The server is authoritative for every number here, and unusually strictly: a balance, an
 * eligibility answer, and a cap are all decisions about other people's money. Nothing in this file
 * computes what the fund "should" cover — it asks, and renders the answer.
 *
 * Demo mode returns fixtures so the screens are walkable with no backend, matching the rest of the app.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { newIdempotencyKey } from '@/lib/idempotency';
import type {
  CommunityContribution,
  CommunityFund,
  CommunityImpact,
  ContributeInput,
  ContributeResult,
  FundSettingsInput,
  MyContribution,
} from '../types';

const DEMO_FUND: CommunityFund = {
  businessId: 'biz_taco',
  balanceCents: 18_735,
  accepting: true,
  maxPerRedemptionCents: null,
  maxPercentOfOrder: 100,
  maxPerDayCents: null,
  expiryDays: 365,
};

const DEMO_CONTRIBUTIONS: CommunityContribution[] = [
  {
    id: 'c1',
    amountCents: 2000,
    givenBy: 'James',
    note: 'For whoever needs it today.',
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  },
  { id: 'c2', amountCents: 500, givenBy: null, note: null, createdAt: new Date(Date.now() - 7_200_000).toISOString() },
  { id: 'c3', amountCents: 1000, givenBy: null, note: null, createdAt: new Date(Date.now() - 86_400_000).toISOString() },
];

const DEMO_IMPACT: CommunityImpact = {
  businessId: 'biz_taco',
  availableCents: 18_735,
  contributedCents: 142_500,
  contributionCount: 63,
  largestContributionCents: 10_000,
  averageContributionCents: 2262,
  redeemedCents: 123_765,
  redemptionCount: 71,
  peopleHelped: 58,
};

/** Deliberately carries a `pending` row: the state a giver most needs this screen to be able to show. */
const DEMO_MINE: MyContribution[] = [
  {
    id: 'm1',
    businessId: 'biz_taco',
    businessName: 'Taco Libre',
    amountCents: 2000,
    status: 'succeeded',
    remainingCents: 500,
    note: 'For whoever needs it today.',
    anonymous: false,
    createdAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    expiresAt: new Date(Date.now() + 361 * 86_400_000).toISOString(),
    expiredAt: null,
  },
  {
    id: 'm2',
    businessId: 'biz_taco',
    businessName: 'Taco Libre',
    amountCents: 1000,
    status: 'pending',
    remainingCents: 0,
    note: null,
    anonymous: true,
    createdAt: new Date(Date.now() - 120_000).toISOString(),
    expiresAt: null,
    expiredAt: null,
  },
];

/** The pot, and the vendor's terms for using it. Public. */
export function useCommunityFund(businessId: string | undefined) {
  return useQuery<CommunityFund | null>({
    queryKey: keys.communityFund(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({ ...DEMO_FUND, businessId: businessId! })
        : api.get<CommunityFund>(endpoints.payForward(businessId!).fund),
    // Short: a balance that has already been spent by someone else is the one number worth refetching.
    staleTime: 15_000,
  });
}

export function useCommunityImpact(businessId: string | undefined) {
  return useQuery<CommunityImpact | null>({
    queryKey: keys.communityImpact(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({ ...DEMO_IMPACT, businessId: businessId! })
        : api.get<CommunityImpact>(endpoints.payForward(businessId!).impact),
    staleTime: 60_000,
  });
}

/** Recent gifts for the business's wall. Anonymous unless the giver chose to be named. */
export function useRecentContributions(businessId: string | undefined) {
  return useQuery<CommunityContribution[]>({
    queryKey: keys.communityContributions(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(DEMO_CONTRIBUTIONS)
        : api.get<CommunityContribution[]>(endpoints.payForward(businessId!).contributions),
    staleTime: 60_000,
  });
}

/**
 * Give. Money-path, so it carries an idempotency key — a double-tapped donation is a double charge
 * for something the giver gets nothing back from.
 *
 * The returned `balanceCents` is deliberately UNCHANGED: the pool only rises once the charge settles
 * server-side. Showing an optimistic new balance here would be a lie the backend refuses to tell.
 */
export function useContribute(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContributeInput) =>
      isMapDemo
        ? Promise.resolve<ContributeResult>({
            contributionId: `demo_${Date.now()}`,
            businessId,
            amountCents: input.amountCents,
            balanceCents: DEMO_FUND.balanceCents,
            clientSecret: 'demo',
          })
        : api.post<ContributeResult>(
            endpoints.payForward(businessId).contributions,
            input,
            { idempotencyKey: newIdempotencyKey() },
          ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.communityFund(businessId) });
      void qc.invalidateQueries({ queryKey: keys.communityContributions(businessId) });
      void qc.invalidateQueries({ queryKey: keys.communityImpact(businessId) });
    },
  });
}

/**
 * The caller's own gifts. Includes ones still pending and ones that failed — this is the only
 * screen where a contribution that did not land is the most important row on it.
 *
 * `staleTime: 0` because the interesting case is a gift that has just been paid for and is waiting
 * on the webhook: the giver is refreshing this page precisely to watch `pending` become `succeeded`.
 */
export function useMyContributions() {
  return useQuery<MyContribution[]>({
    queryKey: keys.communityContributionsMine,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(DEMO_MINE)
        : api.get<MyContribution[]>(endpoints.payForwardMine),
    staleTime: 0,
  });
}

/** Vendor: caps, expiry, and whether new contributions are accepted. */
export function useUpdateFundSettings(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: FundSettingsInput) =>
      isMapDemo
        ? Promise.resolve({ ...DEMO_FUND, ...patch } as CommunityFund)
        : api.patch<CommunityFund>(endpoints.payForward(businessId).settings, patch),
    onSuccess: (fund) => {
      qc.setQueryData(keys.communityFund(businessId), fund);
    },
  });
}
