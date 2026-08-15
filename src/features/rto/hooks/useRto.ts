'use client';

/**
 * Rent-to-Own data layer (R20–R27). Disclosure preview (U8), agreement acceptance, the progress
 * dashboard (U9), and early payoff (R23). Demo mode simulates offline.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { demoRtoAgreements, demoRtoDashboard, demoRtoDisclosure, demoRtoStatements } from '@/lib/demo.rto';
import { newIdempotencyKey } from '@/lib/idempotency';
import type {
  CreateRtoListingInput,
  RtoReturnQuote,
  RtoDashboard,
  RtoDisclosure,
  RtoListing,
  RtoListingDisclosure,
  RtoQuoteInput,
  RtoStatements,
} from '../types';

export function useRtoDisclosure(input: RtoQuoteInput | null) {
  return useQuery<RtoDisclosure>({
    queryKey: ['rto', 'disclose', JSON.stringify(input)],
    enabled: Boolean(input && input.cashPriceCents > 0),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoRtoDisclosure(input!))
        : api.post<RtoDisclosure>(endpoints.rtoDisclose, input!),
    staleTime: 60_000,
  });
}

export function useRtoAgreements() {
  return useQuery<RtoDashboard[]>({
    queryKey: keys.rtoAgreementsMine,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoRtoAgreements())
        : api.get<RtoDashboard[]>(endpoints.rtoAgreementsMine),
    staleTime: isMapDemo ? Infinity : 15_000,
  });
}

export function useRtoDashboard(id: string | undefined) {
  return useQuery<RtoDashboard>({
    queryKey: keys.rtoAgreement(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoRtoDashboard(id!))
        : api.get<RtoDashboard>(endpoints.rtoAgreement(id!)),
    staleTime: isMapDemo ? Infinity : 10_000,
  });
}

export function useRtoStatements(id: string | undefined, enabled = true) {
  return useQuery<RtoStatements>({
    queryKey: ['rto', id ?? 'none', 'statements'],
    enabled: Boolean(id) && enabled,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoRtoStatements(id!))
        : api.get<RtoStatements>(endpoints.rtoStatements(id!)),
    staleTime: isMapDemo ? Infinity : 15_000,
  });
}

export function usePayoff(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      isMapDemo
        ? Promise.resolve({ payoffCents: 0, completed: true })
        : api.post(endpoints.rtoPayoff(id), {}, { idempotencyKey: newIdempotencyKey() }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.rtoAgreement(id) }),
  });
}

// ─── Listings (§42/§44) ──────────────────────────────────────────────────────────────────────

/** Public browse. Someone deciding whether RTO is for them should not have to sign in first. */
export function useRtoListings(
  filter: { citySlug?: string; categoryId?: string; sellerId?: string } = {},
) {
  return useQuery<RtoListing[]>({
    queryKey: keys.rtoListings(`${filter.citySlug ?? ''}|${filter.categoryId ?? ''}|${filter.sellerId ?? ''}`),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve([])
        : api.get<RtoListing[]>(endpoints.rtoListings, {
            query: {
              ...(filter.citySlug ? { citySlug: filter.citySlug } : {}),
              ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
              ...(filter.sellerId ? { sellerId: filter.sellerId } : {}),
            },
          }),
    staleTime: 60_000,
  });
}

/**
 * One offer plus its full §44 disclosure. The money AND the obligations come from the server, so
 * the acceptance screen never has to re-derive a number or re-word a promise.
 */
export function useRtoListing(id: string | undefined) {
  return useQuery<RtoListingDisclosure>({
    queryKey: keys.rtoListing(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: () => api.get<RtoListingDisclosure>(endpoints.rtoListing(id!)),
    staleTime: 60_000,
  });
}

export function useMyRtoListings(sellerId: string | undefined) {
  return useQuery<RtoListing[]>({
    queryKey: keys.rtoListingsMine(sellerId ?? 'none'),
    enabled: Boolean(sellerId),
    queryFn: () =>
      api.get<RtoListing[]>(endpoints.rtoListingsMine, { query: { sellerId: sellerId! } }),
    staleTime: 30_000,
  });
}

export interface RtoEligibility {
  eligible: boolean;
  checks: { sellerApproved: boolean; cityEnabled: boolean; categoryEligible: boolean | null };
  blockers: { code: string; message: string }[];
}

/**
 * Can this business publish an RTO offer at all?
 *
 * Asked on page load so the answer arrives BEFORE the vendor fills in a cash price, term, markup
 * and two toggles — previously the approval gate only fired on submit, so all of that work was
 * done before finding out it could never be published.
 *
 * `isMapDemo` reports eligible: the demo has no admin to approve anyone, and a demo that cannot
 * reach the form teaches nothing about the form.
 */
export function useRtoEligibility(sellerId: string | undefined, citySlug?: string) {
  return useQuery<RtoEligibility>({
    queryKey: keys.rtoEligibility(sellerId ?? 'none'),
    enabled: Boolean(sellerId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({
            eligible: true,
            checks: { sellerApproved: true, cityEnabled: true, categoryEligible: null },
            blockers: [],
          })
        : api.get<RtoEligibility>(endpoints.rtoEligibility, {
            query: { sellerId: sellerId!, citySlug },
          }),
    staleTime: 60_000,
  });
}

export function useCreateRtoListing(sellerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRtoListingInput) =>
      api.post<RtoListing>(endpoints.rtoListings, input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: keys.rtoListingsMine(sellerId ?? 'none') }),
  });
}

export function useSetRtoListingStatus(sellerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RtoListing['status'] }) =>
      api.patch<RtoListing>(endpoints.rtoListing(id), { status }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: keys.rtoListingsMine(sellerId ?? 'none') }),
  });
}

/**
 * Accept an offer. The body carries only the listing id — every term is the seller's and is read
 * server-side, so there is nothing here a customer could tilt in their own favour.
 */
export function useAcceptRtoListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { listingId: string }) =>
      api.post<RtoDashboard>(endpoints.rtoAgreements, input, {
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.rtoAgreementsMine }),
  });
}

// ─── §51 voluntary return ────────────────────────────────────────────────────────────────────

/**
 * What returning would actually mean — fetched BEFORE the customer decides, and rendered verbatim.
 * The server computes it from the agreement's own snapshotted terms, so the answer cannot drift
 * from what they were told at acceptance or be softened at the moment it matters most.
 */
export function useRtoReturnPreview(id: string | undefined, enabled = true) {
  return useQuery<RtoReturnQuote>({
    queryKey: ['rto', id ?? 'none', 'return-preview'],
    enabled: Boolean(id) && enabled && !isMapDemo,
    queryFn: () => api.get<RtoReturnQuote>(endpoints.rtoReturnPreview(id!)),
    staleTime: 30_000,
  });
}

export function useRequestRtoReturn(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(endpoints.rtoReturn(id), {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.rtoAgreement(id) }),
  });
}

// ─── §50 seller remedies ─────────────────────────────────────────────────────────────────────

/**
 * The seller's alternatives to letting an agreement fail. Grouped in one hook because they are one
 * decision on the screen — "what can I do about this?" — and splitting them would make the UI
 * assemble a menu the domain already defines.
 */
export function useRtoRemedies(id: string) {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: keys.rtoAgreement(id) });

  return {
    defer: useMutation({
      mutationFn: (days: number) => api.post(endpoints.rtoDefer(id), { days }),
      onSuccess: invalidate,
    }),
    partialPayment: useMutation({
      mutationFn: (amountCents: number) =>
        api.post(endpoints.rtoPartialPayment(id), { amountCents }, {
          idempotencyKey: newIdempotencyKey(),
        }),
      onSuccess: invalidate,
    }),
    arrangement: useMutation({
      mutationFn: (input: { catchUpCents: number; dueAt: string; note?: string }) =>
        api.post(endpoints.rtoArrangement(id), input),
      onSuccess: invalidate,
    }),
    pause: useMutation({
      mutationFn: (until: string) => api.post(endpoints.rtoPause(id), { until }),
      onSuccess: invalidate,
    }),
    reinstate: useMutation({
      mutationFn: () => api.post(endpoints.rtoReinstate(id), {}),
      onSuccess: invalidate,
    }),
  };
}

/** §52 — sign a condition report. The second signature is what makes it an agreed fact. */
export function useAcknowledgeCondition(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (report: 'delivery' | 'return') =>
      api.post(endpoints.rtoAcknowledgeCondition(id), { report }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.rtoAgreement(id) }),
  });
}
