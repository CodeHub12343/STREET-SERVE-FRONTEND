'use client';

/**
 * Hub data layer (SCREEN_TO_API_MAPPING.md §8). Product catalog, checkout approvals (auto-approve
 * by trust tier), live inventory (who holds what), and settlements. Demo mode uses the sample hub.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { DEMO_HUB_BUSINESS_ID, DEMO_PRODUCTS, demoPendingCheckouts, demoSellerCheckouts } from '@/lib/demo';
import type { ApprovalPolicy, Holder, HubProduct, PendingCheckout } from '../types';

export interface MyHub {
  id: string;
  businessId: string;
  address: string | null;
}

/**
 * The operator's own hubs (real: GET /hubs/mine; demo: the sample hub). The dashboard uses this to
 * resolve the real hub id — and to detect a brand-new operator with no hub yet, so they can be sent
 * to registration instead of shown an empty dashboard.
 */
export function useMyHub() {
  return useQuery<MyHub[]>({
    queryKey: keys.myHubs,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve([{ id: DEMO_HUB_BUSINESS_ID, businessId: DEMO_HUB_BUSINESS_ID, address: null }])
        : api.get<MyHub[]>(endpoints.hubsMine),
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}

/** @deprecated demo-only stub; use `useMyHub()` (via `HubGate`) to get the real hub id. */
export function useHubBusinessId(): string {
  return DEMO_HUB_BUSINESS_ID;
}

/** The backend's productView shape (consignment.service.ts) — differs from the UI's HubProduct. */
interface ApiHubProduct {
  id: string;
  hubId: string;
  name: string;
  category?: string | null;
  unitValueCents: number;
  consignmentSplitPercent: number;
  returnWindowHours: number;
  quantityAvailable: number;
  /** Units currently out with sellers (unsold, non-ended checkouts). */
  quantityOut?: number;
  photos?: string[];
}

function toHubProduct(p: ApiHubProduct, categoryFallback = ''): HubProduct {
  const quantityOut = p.quantityOut ?? 0;
  return {
    id: p.id,
    name: p.name,
    category: p.category ?? categoryFallback,
    // The UI renders In as total − out, and the API's available count already excludes out units.
    quantityTotal: p.quantityAvailable + quantityOut,
    quantityOut,
    sellerSplitPercent: p.consignmentSplitPercent,
    returnWindowDays: Math.round(p.returnWindowHours / 24),
    unitPriceCents: p.unitValueCents,
    photos: p.photos,
  };
}

export function useHubProducts(hubId: string) {
  return useQuery<HubProduct[]>({
    queryKey: keys.hubProducts(hubId),
    queryFn: () => {
      if (isMapDemo) {
        return Promise.resolve(
          DEMO_PRODUCTS.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            quantityTotal: p.quantityAvailable,
            quantityOut: 0,
            sellerSplitPercent: p.sellerSplitPercent,
            returnWindowDays: p.returnWindowDays,
            unitPriceCents: Math.round(p.declaredValueCents / p.quantityAvailable),
          })),
        );
      }
      return api.get<ApiHubProduct[]>(endpoints.hubProducts(hubId)).then((list) => list.map((p) => toHubProduct(p)));
    },
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}

export interface CreateHubProductInput {
  name: string;
  category: string;
  quantityTotal: number;
  unitPriceCents: number;
  sellerSplitPercent: number;
  returnWindowDays: number;
  /** Public photo URLs from the presigned-upload flow; first is the cover. */
  photos?: string[];
  // ── Owner-authored consignment terms (R14/R17/R18) — optional; backend applies defaults ──
  termDays?: number | 'no_limit';
  minimumAuthorizedPriceCents?: number;
  sellerPermissions?: {
    may_discount?: boolean;
    may_bundle?: boolean;
    may_accept_offers?: boolean;
    may_sell_below_min?: boolean;
  };
  returnResponsibility?: 'seller' | 'hub';
}

export function useCreateHubProduct(hubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHubProductInput): Promise<HubProduct> => {
      if (isMapDemo) {
        const { name, category, quantityTotal, unitPriceCents, sellerSplitPercent, returnWindowDays, photos } = input;
        return Promise.resolve({ id: `prod_${Date.now()}`, quantityOut: 0, name, category, quantityTotal, unitPriceCents, sellerSplitPercent, returnWindowDays, photos });
      }
      // Map the UI shape to the backend AddProductBody: renamed fields + return window in hours
      // (UI collects days).
      return api.post<ApiHubProduct>(endpoints.hubProducts(hubId), {
        name: input.name,
        category: input.category,
        unitValueCents: input.unitPriceCents,
        consignmentSplitPercent: input.sellerSplitPercent,
        returnWindowHours: input.returnWindowDays * 24,
        quantityAvailable: input.quantityTotal,
        ...(input.photos?.length && { photos: input.photos }),
        ...(input.termDays !== undefined && { termDays: input.termDays }),
        ...(input.minimumAuthorizedPriceCents !== undefined && { minimumAuthorizedPriceCents: input.minimumAuthorizedPriceCents }),
        ...(input.sellerPermissions !== undefined && { sellerPermissions: input.sellerPermissions }),
        ...(input.returnResponsibility !== undefined && { returnResponsibility: input.returnResponsibility }),
      }).then((p) => toHubProduct(p, input.category));
    },
    onSuccess: (product) => qc.setQueryData<HubProduct[]>(keys.hubProducts(hubId), (prev) => [product, ...(prev ?? [])]),
  });
}

/** The hub's pending-approval queue (H-03) — reservations awaiting the owner's decision. */
export function usePendingCheckouts(hubId: string) {
  return useQuery<PendingCheckout[]>({
    queryKey: keys.hubPendingCheckouts(hubId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoPendingCheckouts())
        : api.get<PendingCheckout[]>(endpoints.hubApprovals(hubId)),
    staleTime: isMapDemo ? Infinity : 10_000,
  });
}

/** The live auto-approve rule, so H-03 states the policy that's actually enforced. */
export function useApprovalPolicy(hubId: string) {
  return useQuery<ApprovalPolicy>({
    queryKey: keys.hubApprovalPolicy(hubId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({ autoApproveMinTrust: 85, autoApproveMaxValueCents: 20_000 })
        : api.get<ApprovalPolicy>(endpoints.hubApprovalPolicy(hubId)),
    staleTime: isMapDemo ? Infinity : 60_000,
  });
}

export function useRespondCheckout(hubId: string) {
  const qc = useQueryClient();
  const settled = (id: string) => {
    qc.setQueryData<PendingCheckout[]>(keys.hubPendingCheckouts(hubId), (prev) =>
      (prev ?? []).filter((p) => p.id !== id),
    );
    // An approval puts stock in a seller's hands; a decline returns it — both change these views.
    void qc.invalidateQueries({ queryKey: keys.hubProducts(hubId) });
  };
  const approve = useMutation({
    mutationFn: (id: string) => (isMapDemo ? Promise.resolve() : api.post(endpoints.checkoutApprove(id))),
    onSuccess: (_r, id) => settled(id),
  });
  const decline = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      isMapDemo ? Promise.resolve() : api.post(endpoints.checkoutDecline(id), reason ? { reason } : {}),
    onSuccess: (_r, { id }) => settled(id),
  });
  return { approve, decline };
}

/** What the server hands back when notice is given — the deadline is the whole point of the reply. */
export interface RecallResult {
  id: string;
  terminationEffectiveAt: string | null;
  terminationNoticeDays: number | null;
  terminatedBy: 'seller' | 'hub' | null;
}

/**
 * ═══ H-04 recall — §37 termination notice, given by the hub owner. ═══
 *
 * The Recall button was wired to nothing at all: it called `show('Recall requested from …')` and
 * returned. No request was sent, the seller was never told, no deadline was ever set, and the hub
 * owner was left believing they had acted. `POST /checkouts/:id/end` has supported the hub-owner
 * caller since it was written — the button simply never reached it.
 *
 * The copy matters as much as the call. This is **notice, not a request**: the seller cannot
 * decline it, and it does not take effect today. The checkout stays active for the agreed notice
 * period (3/7/14–30 days by the goods' value), auto-renewal is cancelled, both parties are
 * notified, and a sweep completes it into settlement when the deadline passes. So the UI states the
 * date the server returns rather than claiming anything has already happened — "Recall requested"
 * was wrong twice over, implying both a request the seller could refuse and an effect that was
 * never scheduled.
 */
export function useRecallStock(hubId: string) {
  const qc = useQueryClient();
  return useMutation<RecallResult, unknown, string>({
    mutationFn: (checkoutId: string) =>
      isMapDemo
        ? Promise.resolve({
            id: checkoutId,
            terminationEffectiveAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
            terminationNoticeDays: 7,
            terminatedBy: 'hub' as const,
          })
        : api.post<RecallResult>(endpoints.checkout(checkoutId).end, {}),
    // The holder row now carries a deadline, and the stock is on its way back to the hub's books.
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.hubProducts(hubId) }),
  });
}

/** A settled checkout reconciliation row (H-05). */
export interface HubSettlementRow {
  checkoutId: string;
  sellerName: string;
  productName: string;
  quantity: number;
  soldQty: number;
  grossCents: number;
  hubShareCents: number;
  settledAt: string;
  /** Whether the platform collected the proceeds it would disburse (Phase 0 solvency guard). */
  fundingSource?: 'collected' | 'unfunded' | 'mixed' | 'none' | 'legacy_unfunded';
  hubPayoutStatus?: 'paid' | 'awaiting_funds' | 'no_account' | 'not_applicable';
}

export function useHubSettlements(hubId: string) {
  return useQuery<HubSettlementRow[]>({
    queryKey: keys.hubSettlements(hubId),
    queryFn: () => {
      if (isMapDemo) {
        const UNIT = 2000;
        return Promise.resolve(
          demoSellerCheckouts()
            .filter((c) => c.soldQty > 0)
            .map((c) => ({
              checkoutId: c.id,
              sellerName: c.id === 'co_1' ? 'Dana W.' : 'Marcus T.',
              productName: c.productName,
              quantity: c.quantity,
              soldQty: c.soldQty,
              grossCents: c.soldQty * UNIT,
              hubShareCents: Math.round(c.soldQty * UNIT * 0.9 * 0.35),
              settledAt: new Date().toISOString(),
            })),
        );
      }
      return api.get<HubSettlementRow[]>(endpoints.hubSettlements(hubId));
    },
    staleTime: isMapDemo ? Infinity : 15_000,
  });
}

export interface StationToken {
  token: string;
  expiresAt: string;
  rotateSeconds: number;
  /** True while the old printed poster still works — a prompt to reprint and turn it off. */
  staticQrStillAccepted: boolean;
}

/**
 * The hub's rotating check-in token (Phase 6). Refetched on its own cadence so the station display
 * always shows a live code — a screenshot of it expires within ~30 seconds, which is the whole
 * point: the old static QR could be photographed once and reused forever.
 */
export function useStationToken(hubId: string) {
  return useQuery<StationToken>({
    queryKey: keys.hubStationToken(hubId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({
            token: 'ssq1.demo.token',
            expiresAt: new Date(Date.now() + 30_000).toISOString(),
            rotateSeconds: 30,
            staticQrStillAccepted: false,
          })
        : api.get<StationToken>(endpoints.hubQr(hubId)),
    // Refresh a little ahead of expiry so the displayed code is never stale.
    refetchInterval: 20_000,
    staleTime: 0,
  });
}

export function useHubHolders(hubId: string) {
  return useQuery<Holder[]>({
    queryKey: [...keys.hubProducts(hubId), 'holders'],
    queryFn: () => {
      if (isMapDemo) {
        return Promise.resolve(
          demoSellerCheckouts().map((c) => ({
            checkoutId: c.id,
            sellerName: c.id === 'co_1' ? 'Dana W.' : 'Marcus T.',
            productName: c.productName,
            quantity: c.quantity,
            soldQty: c.soldQty,
            returnDeadline: c.returnDeadline,
          })),
        );
      }
      return api.get<Holder[]>(endpoints.hubProducts(hubId) + '/holders');
    },
    staleTime: isMapDemo ? Infinity : 15_000,
  });
}
