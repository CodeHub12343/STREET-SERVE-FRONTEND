'use client';

/**
 * Postcard Marketing data layer (ADR-007).
 *
 * Two rules shape everything here, and both come from the same fact: **the vendor is authoritative,
 * and we are reselling.**
 *
 *  1. **Nothing is computed locally.** Deliverable counts and prices come from the server, which
 *     gets them from the vendor. A count we derived in the browser would disagree with the invoice
 *     after the buyer had already seen ours (audit F-9), so there is no client-side arithmetic on
 *     money or reach anywhere in this feature.
 *  2. **A quote is a snapshot that expires.** Any mutation that changes WHAT is being bought
 *     invalidates the order, because the server drops it back to `draft` and throws the old price
 *     away. Optimistically keeping the number on screen would show a price that no longer applies
 *     (audit F-8).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { newIdempotencyKey } from '@/lib/idempotency';
import type {
  ArtworkSpec,
  CheckoutResult,
  ConfigureOrderInput,
  CreateAudienceInput,
  ListType,
  ModerationQueueItem,
  PostcardAsset,
  PostcardAudience,
  PostcardOrder,
  PostcardProduct,
} from '../types';

// ─── Catalogue ──────────────────────────────────────────────────────────────────────────────

/** Public and effectively static — the catalogue is a price list, not per-user state. */
export function usePostcardProducts() {
  return useQuery<PostcardProduct[]>({
    queryKey: keys.postcardProducts,
    queryFn: () => api.get<PostcardProduct[]>(endpoints.postcards.products),
    staleTime: 10 * 60_000,
  });
}

/** The numbers a designer needs. Also static, and safe to hold for a long time. */
export function useArtworkSpec(sku: string | undefined) {
  return useQuery<ArtworkSpec>({
    queryKey: keys.postcardArtworkSpec(sku ?? 'none'),
    enabled: Boolean(sku),
    queryFn: () => api.get<ArtworkSpec>(endpoints.postcards.artworkSpec(sku!)),
    staleTime: 10 * 60_000,
  });
}

/** Live upstream call, so authenticated and cached briefly rather than hammered per keystroke. */
export function useListTypes() {
  return useQuery<ListType[]>({
    queryKey: keys.postcardListTypes,
    queryFn: () => api.get<ListType[]>(endpoints.postcards.listTypes),
    staleTime: 5 * 60_000,
  });
}

// ─── Orders ─────────────────────────────────────────────────────────────────────────────────

export function usePostcardOrders(businessId: string | undefined) {
  return useQuery<PostcardOrder[]>({
    queryKey: keys.postcardOrders(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () => api.get<PostcardOrder[]>(endpoints.postcards.orders(businessId!)),
    staleTime: 15_000,
  });
}

/**
 * One order.
 *
 * Polls while the physical run is in progress, because the pipeline advances from a background
 * sweep rather than from anything the buyer does — without this the timeline would only move when
 * they reloaded. Polling stops once the order reaches a state that cannot change on its own.
 */
export function usePostcardOrder(orderId: string | undefined) {
  return useQuery<PostcardOrder>({
    queryKey: keys.postcardOrder(orderId ?? 'none'),
    enabled: Boolean(orderId),
    queryFn: () => api.get<PostcardOrder>(endpoints.postcards.order(orderId!)),
    refetchInterval: (query) => {
      const order = query.state.data;
      if (!order) return false;
      /**
       * `mailed` is a fulfilment STAGE, not an order status — the order stays `submitted` while
       * the paper moves. Polling stops when either the pipeline has finished or the order can no
       * longer change on its own.
       */
      const settled =
        order.fulfilment?.stage === 'mailed' ||
        (['cancelled', 'refunded', 'submission_failed', 'draft', 'quoted'] as const).some(
          (s) => s === order.status,
        );
      return settled ? false : 30_000;
    },
  });
}

export function useCreateOrder(businessId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<PostcardOrder, Error, { sku: string; mailClass: string }>({
    mutationFn: (input) =>
      api.post<PostcardOrder>(endpoints.postcards.orders(businessId!), input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.postcardOrders(businessId ?? 'none') });
    },
  });
}

/**
 * Changes what is being bought.
 *
 * Always invalidates rather than merging the response in. The server may have discarded the price
 * as a side effect — changing the area or the quantity makes the old quote a price for a different
 * order — and a cache that kept the stale number would be showing a figure the server has already
 * thrown away.
 */
export function useConfigureOrder(orderId: string | undefined, businessId?: string) {
  const qc = useQueryClient();
  return useMutation<PostcardOrder, Error, ConfigureOrderInput>({
    mutationFn: (input) =>
      api.patch<PostcardOrder>(endpoints.postcards.order(orderId!), input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.postcardOrder(orderId ?? 'none') });
      if (businessId) void qc.invalidateQueries({ queryKey: keys.postcardOrders(businessId) });
    },
  });
}

export function useQuoteOrder(orderId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<PostcardOrder, Error, void>({
    mutationFn: () => api.post<PostcardOrder>(endpoints.postcards.quote(orderId!), {}),
    onSuccess: (order) => {
      qc.setQueryData(keys.postcardOrder(orderId ?? 'none'), order);
    },
  });
}

/**
 * 💳 The charge.
 *
 * Idempotency-keyed, and the key is generated ONCE per mutation instance rather than per attempt —
 * that is the whole point. A buyer who double-taps, or a retry after a flaky response, must not
 * produce two charges for one mailing.
 */
export function useCheckoutOrder(orderId: string | undefined, businessId?: string) {
  const qc = useQueryClient();
  return useMutation<CheckoutResult, Error, void>({
    mutationFn: () =>
      api.post<CheckoutResult>(
        endpoints.postcards.checkout(orderId!),
        {},
        { idempotencyKey: newIdempotencyKey() },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.postcardOrder(orderId ?? 'none') });
      if (businessId) void qc.invalidateQueries({ queryKey: keys.postcardOrders(businessId) });
    },
  });
}

export function useCancelOrder(orderId: string | undefined, businessId?: string) {
  const qc = useQueryClient();
  return useMutation<PostcardOrder, Error, { reason?: string }>({
    mutationFn: (input) =>
      api.post<PostcardOrder>(endpoints.postcards.cancel(orderId!), input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.postcardOrder(orderId ?? 'none') });
      if (businessId) void qc.invalidateQueries({ queryKey: keys.postcardOrders(businessId) });
    },
  });
}

// ─── Audiences ──────────────────────────────────────────────────────────────────────────────

/**
 * Resolves an area to a counted audience.
 *
 * Not a query keyed on the selection, because creating one COSTS a vendor call and writes a row.
 * Making it a mutation keeps it an explicit act — a buyer asks for a count when they are ready,
 * rather than firing one off on every keystroke in the ZIP field.
 */
export function useCreateAudience(businessId: string | undefined) {
  return useMutation<PostcardAudience, Error, CreateAudienceInput>({
    mutationFn: (input) =>
      api.post<PostcardAudience>(endpoints.postcards.audiences(businessId!), input),
  });
}

// ─── Artwork ────────────────────────────────────────────────────────────────────────────────

export function useArtworkAsset(assetId: string | undefined) {
  return useQuery<PostcardAsset>({
    queryKey: keys.postcardAsset(assetId ?? 'none'),
    enabled: Boolean(assetId),
    queryFn: () => api.get<PostcardAsset>(endpoints.postcards.asset(assetId!)),
  });
}

/**
 * The three-step upload: ask for a target, PUT the bytes straight to storage, then ask the server
 * to inspect what landed.
 *
 * The middle step bypasses our API entirely, which is why the third exists at all — the server
 * never sees the file in flight and has to fetch its header back to validate it. Exposed as one
 * mutation because "upload my artwork" is one action to the person doing it.
 */
export function useUploadArtwork(businessId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<PostcardAsset, Error, { file: File; sku: string }>({
    mutationFn: async ({ file, sku }) => {
      const target = await api.post<{ assetId: string; uploadUrl: string }>(
        endpoints.postcards.artwork(businessId!),
        { contentType: file.type },
      );

      // Direct to object storage. Not our API, so no bearer token and no envelope.
      const put = await fetch(target.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!put.ok) {
        throw new Error('The upload did not complete. Check your connection and try again.');
      }

      // Only now can anything be said about the file — this is where pre-press actually runs.
      return api.post<PostcardAsset>(endpoints.postcards.validateAsset(target.assetId), { sku });
    },
    onSuccess: (asset) => {
      qc.setQueryData(keys.postcardAsset(asset.id), asset);
    },
  });
}

// ─── Moderation (staff) ─────────────────────────────────────────────────────────────────────

export function useModerationQueue(enabled = true) {
  return useQuery<ModerationQueueItem[]>({
    queryKey: keys.postcardModerationQueue,
    enabled,
    queryFn: () => api.get<ModerationQueueItem[]>(endpoints.postcards.moderationQueue),
    // Short, because a reviewer works the list live and a stale queue means duplicated effort.
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useModerateArtwork() {
  const qc = useQueryClient();
  return useMutation<
    PostcardAsset,
    Error,
    { assetId: string; decision: 'approved' | 'rejected'; reason?: string }
  >({
    mutationFn: ({ assetId, decision, reason }) =>
      api.post<PostcardAsset>(endpoints.postcards.moderate(assetId), { decision, reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.postcardModerationQueue });
    },
  });
}
