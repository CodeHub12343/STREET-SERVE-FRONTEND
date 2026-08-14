'use client';

/**
 * Boost My Marketing data layer (ADR-006).
 *
 * `raisedCents` is never optimistically bumped after a contribution. The pool only rises when the
 * charge settles server-side, and a progress bar that runs ahead of the money is a promise the
 * campaign cannot keep — so the mutation invalidates and re-reads instead.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { newIdempotencyKey } from '@/lib/idempotency';
import type {
  BoostCampaign,
  BoostContributeInput,
  BoostContributeResult,
  BoostContribution,
  CreateCampaignInput,
  PostcardEstimate,
} from '../types';

const DEMO_CAMPAIGN: BoostCampaign = {
  id: 'camp_demo',
  businessId: 'biz_taco',
  title: 'Postcards for the neighbourhood',
  goalCents: 100_000,
  raisedCents: 37_500,
  remainingCents: 62_500,
  percentFunded: 37,
  deadlineAt: new Date(Date.now() + 18 * 86_400_000).toISOString(),
  status: 'open',
  fundedAt: null,
  serviceFeeCents: 0,
  serviceFeeBps: 1_000,
  mailDate: null,
  mailingStatus: null,
};

const DEMO_CONTRIBUTIONS: BoostContribution[] = [
  { id: 'bc1', amountCents: 10_000, givenBy: 'Dana', createdAt: new Date(Date.now() - 3_600_000).toISOString() },
  { id: 'bc2', amountCents: 2_500, givenBy: null, createdAt: new Date(Date.now() - 7_200_000).toISOString() },
  { id: 'bc3', amountCents: 25_000, givenBy: 'Corner Coffee', createdAt: new Date(Date.now() - 86_400_000).toISOString() },
];

/** The business's live campaign, or null. Public. */
export function useCurrentCampaign(businessId: string | undefined) {
  return useQuery<BoostCampaign | null>({
    queryKey: keys.boostCurrent(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({ ...DEMO_CAMPAIGN, businessId: businessId! })
        : api.get<BoostCampaign | null>(endpoints.boost.currentFor(businessId!)),
    staleTime: 30_000,
  });
}

export function useCampaign(campaignId: string | undefined) {
  return useQuery<BoostCampaign | null>({
    queryKey: keys.boostCampaign(campaignId ?? 'none'),
    enabled: Boolean(campaignId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(DEMO_CAMPAIGN)
        : api.get<BoostCampaign>(endpoints.boost.campaign(campaignId!).root),
    staleTime: 15_000,
  });
}

export function useCampaignContributions(campaignId: string | undefined) {
  return useQuery<BoostContribution[]>({
    queryKey: keys.boostContributions(campaignId ?? 'none'),
    enabled: Boolean(campaignId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(DEMO_CONTRIBUTIONS)
        : api.get<BoostContribution[]>(endpoints.boost.campaign(campaignId!).contributions),
    staleTime: 60_000,
  });
}

/**
 * MB-4 — the postcard estimate, now backed by a live vendor rate.
 *
 * Demo mode still resolves `postcards: null`: the demo has no server, and a plausible number there
 * would be a fabricated quote shown to a real person. Same rule as when no vendor was contracted.
 */
export function usePostcardEstimate(amountCents: number) {
  return useQuery<PostcardEstimate>({
    queryKey: ['boost', 'estimate', amountCents],
    enabled: amountCents > 0,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({
            amountCents,
            postcards: null,
            unitCostCents: 0,
            serviceFeeCents: 0,
            mailableCents: amountCents,
            isEstimate: true,
          })
        : api.get<PostcardEstimate>(`${endpoints.boost.estimate}?amountCents=${amountCents}`),
    staleTime: 300_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, campaignId: string, businessId?: string) {
  void qc.invalidateQueries({ queryKey: keys.boostCampaign(campaignId) });
  void qc.invalidateQueries({ queryKey: keys.boostContributions(campaignId) });
  if (businessId) void qc.invalidateQueries({ queryKey: keys.boostCurrent(businessId) });
}

/** Chip in. Money path, so it carries an idempotency key. */
export function useContributeToCampaign(campaignId: string, businessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BoostContributeInput) =>
      isMapDemo
        ? Promise.resolve<BoostContributeResult>({
            contributionId: `demo_${Date.now()}`,
            campaignId,
            amountCents: input.amountCents,
            raisedCents: DEMO_CAMPAIGN.raisedCents,
            clientSecret: 'demo',
          })
        : api.post<BoostContributeResult>(
            endpoints.boost.campaign(campaignId).contributions,
            input,
            { idempotencyKey: newIdempotencyKey() },
          ),
    onSuccess: () => invalidate(qc, campaignId, businessId),
  });
}

export function useCreateCampaign(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampaignInput) =>
      isMapDemo
        ? Promise.resolve({ ...DEMO_CAMPAIGN, ...input, raisedCents: 0, remainingCents: input.goalCents })
        : api.post<BoostCampaign>(endpoints.boost.campaigns(businessId), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.boostCurrent(businessId) }),
  });
}

/** The owner covering their own shortfall — server refuses this after the deadline. */
export function useTopUpCampaign(campaignId: string, businessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      isMapDemo
        ? Promise.resolve({ ok: true })
        : api.post<unknown>(endpoints.boost.campaign(campaignId).topUp, {}, {
            idempotencyKey: newIdempotencyKey(),
          }),
    onSuccess: () => invalidate(qc, campaignId, businessId),
  });
}

export function useConfirmMailDate(campaignId: string, businessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mailDate: string) =>
      isMapDemo
        ? Promise.resolve({ ...DEMO_CAMPAIGN, mailDate, mailingStatus: 'preparing' as const })
        : api.post<BoostCampaign>(endpoints.boost.campaign(campaignId).mailDate, { mailDate }),
    onSuccess: () => invalidate(qc, campaignId, businessId),
  });
}

export function useCancelCampaign(campaignId: string, businessId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) =>
      isMapDemo
        ? Promise.resolve({ campaignId, refunded: 0 })
        : api.post<{ campaignId: string; refunded: number }>(
            endpoints.boost.campaign(campaignId).cancel,
            { reason },
          ),
    onSuccess: () => invalidate(qc, campaignId, businessId),
  });
}
