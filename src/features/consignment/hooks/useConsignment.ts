'use client';

/**
 * Consignment data layer (SCREEN_TO_API_MAPPING.md §6). Discovery, product detail, Seller Agreement
 * clickwrap, QR checkout (💳, idempotent), oversell-guarded sales (409), returns, and settlement.
 * Demo mode simulates the full lifecycle so reserve→checkout→sell→return→settle runs offline.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { AppApiError } from '@/lib/api/errors';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import {
  DEMO_PRODUCTS,
  demoFeePreview,
  demoSellerCheckouts,
  demoSellerEarnings,
  findDemoProduct,
} from '@/lib/demo';
import type { Checkout, CheckoutStatus, FeePreview, Product, SellerEarnings, Settlement } from '../types';

const toProduct = (p: (typeof DEMO_PRODUCTS)[number]): Product => ({ ...p });

/** The backend's checkoutView shape (consignment.service.ts) — field names differ from the UI's. */
interface ApiCheckout {
  id: string;
  productId: string;
  hubId: string;
  quantity: number;
  quantitySold: number;
  status: string;
  expectedReturnAt: string;
  checkedOutAt?: string | null;
  consignmentSplitPercent?: number | null;
  productName?: string | null;
  hubName?: string | null;
  termDays?: number | null;
  expiresAt?: string | null;
  currentUnitPriceCents?: number | null;
  minimumAuthorizedPriceCents?: number | null;
  returnTerms?: Checkout['returnTerms'];
}

const API_STATUS_TO_UI: Record<string, CheckoutStatus> = {
  pending_approval: 'pending_approval',
  declined: 'declined',
  active: 'active',
  settled: 'settled',
  overdue: 'overdue',
  return_pending: 'return_pending',
  ended: 'returned',
  disputed: 'overdue', // needs-attention state; disputes surface elsewhere
};

function toCheckout(c: ApiCheckout): Checkout {
  return {
    id: c.id,
    productId: c.productId,
    productName: c.productName ?? 'Consignment item',
    hubName: c.hubName ?? 'Consignment hub',
    quantity: c.quantity,
    soldQty: c.quantitySold ?? 0,
    sellerSplitPercent: c.consignmentSplitPercent ?? 0,
    unitPriceCents: c.currentUnitPriceCents ?? 0,
    checkedOutAt: c.checkedOutAt ?? new Date().toISOString(),
    returnDeadline: c.expectedReturnAt,
    status: API_STATUS_TO_UI[c.status] ?? 'active',
    termDays: c.termDays,
    expiresAt: c.expiresAt,
    currentUnitPriceCents: c.currentUnitPriceCents,
    minimumAuthorizedPriceCents: c.minimumAuthorizedPriceCents,
    returnTerms: c.returnTerms,
  };
}

export function useProductsNearby(category = 'all') {
  return useQuery<Product[]>({
    queryKey: keys.productsNearby(category),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(DEMO_PRODUCTS.filter((p) => category === 'all' || p.category === category).map(toProduct))
        : // The backend wraps this list as a paginated envelope `{ items, nextCursor }`, not a bare
          // array. Extract `items` (tolerating a bare array too) so callers always get Product[] —
          // otherwise `products.map` blows up the whole route (contract drift, see API reconciliation).
          api
            .get<{ items: Product[]; nextCursor?: string | null } | Product[]>(endpoints.productsNearby, {
              query: { category: category === 'all' ? undefined : category },
            })
            .then((res) => (Array.isArray(res) ? res : (res?.items ?? []))),
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery<Product>({
    queryKey: keys.product(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: () => {
      if (isMapDemo) {
        const p = findDemoProduct(id!);
        if (!p) throw new Error('Not found');
        return Promise.resolve(toProduct(p));
      }
      return api.get<Product>(endpoints.product(id!));
    },
    staleTime: 60_000,
  });
}

// The clickwrap bailment agreement version — must match the backend's SELLER_AGREEMENT_VERSION
// (config/constants.ts). There's no discovery endpoint, so it's mirrored here; bump on change.
const SELLER_AGREEMENT_VERSION = 'v1-2026-07';

// ---- Seller Agreement (clickwrap gate, G10) ----
export function useSellerAgreement() {
  const qc = useQueryClient();
  const accepted = useQuery<boolean>({
    queryKey: keys.sellerAgreement,
    queryFn: () => Promise.resolve(qc.getQueryData<boolean>(keys.sellerAgreement) ?? false),
    initialData: false,
    staleTime: Infinity,
  });
  const accept = useMutation({
    // Route is POST /seller-agreement/accept with { version } (AcceptAgreementBody).
    mutationFn: () =>
      isMapDemo
        ? Promise.resolve()
        : api.post(`${endpoints.sellerAgreement}/accept`, { version: SELLER_AGREEMENT_VERSION }),
    onSuccess: () => qc.setQueryData(keys.sellerAgreement, true),
  });
  return { accepted: accepted.data ?? false, accept };
}

// ---- Checkouts ----
export function useCheckouts() {
  return useQuery<Checkout[]>({
    queryKey: keys.checkoutsMine,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoSellerCheckouts())
        : api.get<ApiCheckout[]>(endpoints.checkoutsMine).then((list) => list.map(toCheckout)),
    staleTime: isMapDemo ? Infinity : 15_000,
  });
}

export function useCheckout(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery<Checkout | undefined>({
    queryKey: keys.checkout(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: () => {
      const fromList = qc.getQueryData<Checkout[]>(keys.checkoutsMine)?.find((c) => c.id === id);
      return Promise.resolve(fromList ?? (isMapDemo ? demoSellerCheckouts().find((c) => c.id === id) : undefined));
    },
    staleTime: Infinity,
  });
}

export function useFinalizeCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ product, quantity, qrToken, conditionPhotoUrl, idempotencyKey }: { product: Product; quantity: number; qrToken: string; conditionPhotoUrl: string; idempotencyKey: string }): Promise<Checkout> => {
      const checkout: Checkout = {
        id: `co_${Date.now()}`,
        productId: product.id,
        productName: product.name,
        hubName: product.hubName,
        quantity,
        soldQty: 0,
        sellerSplitPercent: product.sellerSplitPercent,
        unitPriceCents: Math.round(product.declaredValueCents / product.quantityAvailable),
        checkedOutAt: new Date().toISOString(),
        returnDeadline: new Date(Date.now() + product.returnWindowDays * 86_400_000).toISOString(),
        status: 'active',
      };
      if (isMapDemo) return Promise.resolve(checkout);
      // Backend CheckoutBody requires the hub QR token (must match the hub's checkout secret) and a
      // condition photo URL, both captured in QrCheckout but previously dropped here. The response
      // is the bare checkoutView (no name joins), so names/split come from the product in hand.
      return api
        .post<ApiCheckout>(
          endpoints.checkouts,
          { productId: product.id, quantity, qrToken, conditionPhotoUrl },
          { idempotencyKey },
        )
        .then((c) => ({
          ...toCheckout(c),
          productName: product.name,
          hubName: product.hubName,
          sellerSplitPercent: product.sellerSplitPercent,
        }));
    },
    onSuccess: (checkout) => {
      qc.setQueryData<Checkout[]>(keys.checkoutsMine, (prev) => [checkout, ...(prev ?? [])]);
      qc.setQueryData(keys.checkout(checkout.id), checkout);
    },
  });
}

export function useLogSale(checkoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      qty,
      saleAmountCents,
      paymentRail,
      idempotencyKey,
    }: {
      qty: number;
      saleAmountCents: number;
      paymentRail?: 'cash' | 'digital';
      idempotencyKey: string;
    }): Promise<{ debtCents?: number } | undefined> => {
      if (isMapDemo) {
        const co = qc.getQueryData<Checkout[]>(keys.checkoutsMine)?.find((c) => c.id === checkoutId);
        if (co && co.soldQty + qty > co.quantity) {
          // Oversell guard (409, FR-8.3).
          return Promise.reject(new AppApiError(409, { code: 'OVERSELL', message: `Only ${co.quantity - co.soldQty} left to sell.` }));
        }
        return Promise.resolve(undefined);
      }
      // `paymentRail` drives Phase 3 debt: a cash sale records what the seller now owes the hub.
      return api.post<{ debtCents?: number }>(
        endpoints.checkout(checkoutId).sales,
        { quantitySold: qty, saleAmountCents, paymentRail: paymentRail ?? 'cash', loggedVia: 'manual' },
        { idempotencyKey },
      );
    },
    onSuccess: (_r, { qty }) => {
      const patch = (c: Checkout) => (c.id === checkoutId ? { ...c, soldQty: c.soldQty + qty } : c);
      qc.setQueryData<Checkout[]>(keys.checkoutsMine, (prev) => (prev ?? []).map(patch));
      qc.setQueryData<Checkout | undefined>(keys.checkout(checkoutId), (c) => (c ? patch(c) : c));
    },
  });
}

export function useReturnCheckout(checkoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    // Backend ReturnBody: { quantityReturned, conditionPhotoUrl?, conditionAssessment? }.
    mutationFn: ({ quantityReturned, conditionPhotoUrl }: { quantityReturned: number; conditionPhotoUrl?: string }) =>
      isMapDemo
        ? Promise.resolve()
        : api.post(endpoints.checkout(checkoutId).return, { quantityReturned, conditionPhotoUrl }),
    onSuccess: () => {
      const patch = (c: Checkout) => (c.id === checkoutId ? { ...c, status: 'returned' as const } : c);
      qc.setQueryData<Checkout[]>(keys.checkoutsMine, (prev) => (prev ?? []).map(patch));
      qc.setQueryData<Checkout | undefined>(keys.checkout(checkoutId), (c) => (c ? patch(c) : c));
    },
  });
}

/**
 * Seller earnings feed (S-13, GAP-6): settled payout history + recent daily gross + pending totals.
 * Real endpoint is GET /checkouts/earnings (single seller, server-aggregated); demo synthesizes it.
 */
export function useSellerEarnings() {
  return useQuery<SellerEarnings>({
    queryKey: keys.sellerEarnings,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoSellerEarnings())
        : api.get<SellerEarnings>(endpoints.sellerEarnings),
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}

/**
 * The seller's Stripe Connect payout readiness (S-13). Settlement pushes money to this account, so
 * without it a settled sale credits the ledger and transfers nothing — the seller has to be told.
 */
export interface PayoutStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  balance: { availableCents: number; pendingCents: number; currency: string } | null;
}

export function usePayoutStatus() {
  return useQuery<PayoutStatus>({
    queryKey: keys.payoutStatus,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({
            connected: true,
            chargesEnabled: true,
            payoutsEnabled: true,
            detailsSubmitted: true,
            balance: { availableCents: 0, pendingCents: 0, currency: 'usd' },
          })
        : api.get<PayoutStatus>(endpoints.connectStatus),
    staleTime: 30_000,
  });
}

/** Opens Stripe's hosted onboarding; the seller returns to CONNECT_RETURN_URL when done. */
export function useConnectPayouts() {
  return useMutation({
    mutationFn: () => api.post<{ url: string }>(endpoints.connectOnboard),
    onSuccess: ({ url }) => window.location.assign(url),
  });
}

/**
 * Pre-publish fee calculator (R12): server-computed net-payout preview from a price + split, so the
 * seller sees exactly what they'll take home before they list. Re-quotes as the inputs change; the
 * fee/split math is authoritative (same registry the real settlement uses).
 */
export function useFeePreview(
  unitPriceCents: number,
  splitPercent: number,
  quantity: number,
  /** §57.2 — supply these and the preview also prices the rent-to-own deal. */
  rto?: { installmentCount: number; frequency: string; markupBps: number; initialPaymentCents: number },
) {
  return useQuery<FeePreview>({
    queryKey: [...keys.feePreview(unitPriceCents, splitPercent, quantity), rto ? JSON.stringify(rto) : ''],
    enabled: unitPriceCents > 0 && quantity > 0,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoFeePreview(unitPriceCents, splitPercent, quantity) as FeePreview)
        : api.get<FeePreview>(endpoints.feePreview, {
            query: {
              unitPriceCents,
              splitPercent,
              quantity,
              ...(rto
                ? {
                    rtoInstallmentCount: rto.installmentCount,
                    rtoFrequency: rto.frequency,
                    rtoMarkupBps: rto.markupBps,
                    rtoInitialPaymentCents: rto.initialPaymentCents,
                  }
                : {}),
            },
          }),
    placeholderData: (prev) => prev, // keep the last preview visible while the seller types
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}

/**
 * Consignment lifecycle actions (R15/R18): Extend the term, Reduce the price (floored at the owner's
 * minimum), or End the consignment (→ Return-Pending). Each patches the cached checkout list/detail.
 */
export function useCheckoutLifecycle(checkoutId: string) {
  const qc = useQueryClient();
  const patch = (next: Partial<Checkout>) => {
    const apply = (c: Checkout) => (c.id === checkoutId ? { ...c, ...next } : c);
    qc.setQueryData<Checkout[]>(keys.checkoutsMine, (prev) => (prev ?? []).map(apply));
    qc.setQueryData<Checkout | undefined>(keys.checkout(checkoutId), (c) => (c ? apply(c) : c));
  };

  const extend = useMutation({
    mutationFn: (termDays: number | 'no_limit') =>
      isMapDemo ? Promise.resolve() : api.post(endpoints.checkout(checkoutId).extend, { termDays }),
    onSuccess: (_r, termDays) =>
      patch({
        termDays: termDays === 'no_limit' ? null : termDays,
        expiresAt:
          termDays === 'no_limit'
            ? null
            : new Date(Date.now() + termDays * 86_400_000).toISOString(),
      }),
  });

  const reducePrice = useMutation({
    mutationFn: (unitPriceCents: number) =>
      isMapDemo
        ? Promise.resolve()
        : api.post(endpoints.checkout(checkoutId).reducePrice, { unitPriceCents }),
    onSuccess: (_r, unitPriceCents) => patch({ currentUnitPriceCents: unitPriceCents }),
  });

  /**
   * §37 — ending gives NOTICE; the consignment stays active until the agreed period elapses. The
   * optimistic patch deliberately does NOT flip the status: showing "return pending" the instant
   * someone taps End would tell the seller their goods are due back today when they have days.
   */
  const end = useMutation({
    mutationFn: () =>
      isMapDemo
        ? Promise.resolve({} as Checkout)
        : api.post<Checkout>(endpoints.checkout(checkoutId).end, {}),
    onSuccess: (res) =>
      patch({
        terminationEffectiveAt: res?.terminationEffectiveAt ?? null,
        terminationNoticeDays: res?.terminationNoticeDays ?? null,
        terminatedBy: res?.terminatedBy ?? null,
      }),
  });

  /** §39 — either party may switch renewal on or off, right up until it fires. */
  const setAutoRenew = useMutation({
    mutationFn: (input: { enabled: boolean; term?: number | 'until_sold' }) =>
      isMapDemo
        ? Promise.resolve()
        : api.post(endpoints.checkout(checkoutId).autoRenew, input),
    onSuccess: (_r, input) => patch({ autoRenew: input.enabled, autoRenewTerm: input.term ?? null }),
  });

  return { extend, reducePrice, end, setAutoRenew };
}

export function useSettlement(checkoutId: string | undefined) {
  const qc = useQueryClient();
  return useQuery<Settlement>({
    queryKey: keys.settlement(checkoutId ?? 'none'),
    enabled: Boolean(checkoutId),
    queryFn: () => {
      if (isMapDemo) {
        const co = qc.getQueryData<Checkout[]>(keys.checkoutsMine)?.find((c) => c.id === checkoutId) ?? demoSellerCheckouts().find((c) => c.id === checkoutId);
        const soldQty = co?.soldQty ?? 0;
        const gross = soldQty * (co?.unitPriceCents ?? 0);
        const platformFee = Math.round(gross * 0.1);
        const sellerShare = Math.round(((gross - platformFee) * (co?.sellerSplitPercent ?? 60)) / 100);
        const hubShare = gross - platformFee - sellerShare;
        return Promise.resolve<Settlement>({
          checkoutId: checkoutId!,
          soldQty,
          returnedQty: (co?.quantity ?? 0) - soldQty,
          grossCents: gross,
          platformFeeCents: platformFee,
          hubShareCents: hubShare,
          sellerNetCents: sellerShare,
          payoutTiming: 'Bronze — payout held 3 days',
          trustDelta: 2,
        });
      }
      return api.get<Settlement>(endpoints.checkout(checkoutId!).settlement);
    },
    staleTime: 30_000,
  });
}
