'use client';

/**
 * Menu manager (docs/13 V-06). CRUD items + availability + Today's Special. Optimistic since these
 * are low-conflict edits (STATE_MANAGEMENT.md §4). Demo mode seeds from the sample menu.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { findDemoBusiness } from '@/lib/demo';
import type { VendorMenuItem } from '../types';

export function useVendorMenu(businessId: string) {
  return useQuery<VendorMenuItem[]>({
    queryKey: keys.vendorMenu(businessId),
    // Callers pass '' to mean "not applicable" (e.g. the setup checklist skips the menu for a
    // service business) — without this the query would fire GET /businesses//menu.
    enabled: Boolean(businessId),
    queryFn: () => {
      if (isMapDemo) {
        const items = (findDemoBusiness(businessId)?.menu ?? []).map((m) => ({ ...m, available: true }));
        return Promise.resolve(items);
      }
      return api.get<VendorMenuItem[]>(endpoints.business(businessId).menu);
    },
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}

export function useAddMenuItem(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      priceCents: number;
      photoUrl?: string;
      todaysSpecial?: boolean;
    }): Promise<VendorMenuItem> => {
      const item: VendorMenuItem = { id: `mi_${Date.now()}`, available: true, ...input };
      if (isMapDemo) return Promise.resolve(item);
      // Backend CreateMenuItemBody is .strict() and has no `todaysSpecial` — that's set separately
      // via PATCH /businesses/:id { todaySpecialMenuItemId }. Send only the accepted fields.
      return api.post<VendorMenuItem>(endpoints.business(businessId).menu, {
        name: input.name,
        priceCents: input.priceCents,
        ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
      });
    },
    onSuccess: (item) =>
      qc.setQueryData<VendorMenuItem[]>(keys.vendorMenu(businessId), (prev) => [...(prev ?? []), item]),
  });
}

/**
 * Today's Special is a business-level setting (`business.todaySpecialMenuItemId`), not a per-item
 * flag. This reads the current special item id and sets/clears it via PATCH /businesses/:id.
 */
/**
 * Remove an item for good. A hard delete server-side — safe because order line items snapshot the
 * name and price, so historical receipts are unaffected.
 */
export function useDeleteMenuItem(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      isMapDemo ? Promise.resolve() : api.del(endpoints.business(businessId).menuItem(itemId)),
    onSuccess: () => {
      // The setup checklist derives from this list — invalidate so it can reappear.
      void qc.invalidateQueries({ queryKey: keys.vendorMenu(businessId) });
      void qc.invalidateQueries({ queryKey: keys.vendorBusiness(businessId) });
    },
  });
}

export function useTodaysSpecial(businessId: string) {
  const qc = useQueryClient();
  const key = ['today-special', businessId];
  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<string | null> => {
      if (isMapDemo) {
        const special = (findDemoBusiness(businessId)?.menu ?? []).find((m) => m.todaysSpecial);
        return special?.id ?? null;
      }
      const b = await api.get<{ todaySpecialMenuItemId?: string | null }>(endpoints.business(businessId).root);
      return b.todaySpecialMenuItemId ?? null;
    },
    staleTime: isMapDemo ? Infinity : 60_000,
  });
  const setSpecial = useMutation({
    mutationFn: (menuItemId: string | null) =>
      isMapDemo
        ? Promise.resolve()
        : api.patch(endpoints.business(businessId).root, { todaySpecialMenuItemId: menuItemId }),
    onMutate: (menuItemId) => {
      const prev = qc.getQueryData<string | null>(key);
      qc.setQueryData(key, menuItemId);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev ?? null),
  });
  return { specialId: query.data ?? null, setSpecial };
}

export function useUpdateMenuItem(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      patch,
    }: {
      itemId: string;
      // photoUrl: null means "remove the photo" — distinct from omitting it.
      patch: Partial<Omit<VendorMenuItem, 'photoUrl'>> & { photoUrl?: string | null };
    }) => {
      if (isMapDemo) return Promise.resolve();
      // Backend UpdateMenuItemBody (.strict()) accepts { name?, priceCents?, isAvailable?,
      // photoUrl?, description? }. Map the UI's `available` → `isAvailable`. `todaysSpecial` is a
      // business-level setting (business.todaySpecialMenuItemId), not a per-item field — it's
      // optimistic-only here until that separate mechanism is wired
      // (see API_CONTRACT_RECONCILIATION.md).
      const body: Record<string, unknown> = {};
      if (patch.name !== undefined) body.name = patch.name;
      if (patch.priceCents !== undefined) body.priceCents = patch.priceCents;
      if (patch.available !== undefined) body.isAvailable = patch.available;
      if (patch.photoUrl !== undefined) body.photoUrl = patch.photoUrl;
      if (Object.keys(body).length === 0) return Promise.resolve();
      return api.patch(endpoints.business(businessId).menuItem(itemId), body);
    },
    onMutate: ({ itemId, patch }) => {
      const prev = qc.getQueryData<VendorMenuItem[]>(keys.vendorMenu(businessId));
      qc.setQueryData<VendorMenuItem[]>(keys.vendorMenu(businessId), (list) =>
        (list ?? []).map((i) =>
          i.id === itemId
            ? { ...i, ...patch, photoUrl: patch.photoUrl === null ? undefined : patch.photoUrl ?? i.photoUrl }
            : i,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.vendorMenu(businessId), ctx.prev);
    },
  });
}
