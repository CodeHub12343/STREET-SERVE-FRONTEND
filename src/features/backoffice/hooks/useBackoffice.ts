'use client';

/**
 * Phase 7 vendor data layer — flash sales (7.6), scheduled pickup (7.5), mileage (7.7), corridors
 * (7.8), festivals (7.9), and the back office (7.10).
 *
 * Grouped by *who uses it* rather than by module: everything here is something a vendor or seller
 * opens while running their business, and the alternative — one hooks file per backend module —
 * would scatter six screens' data across six files that always change together.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type {
  Corridor,
  CrewMember,
  Expense,
  ExpenseSummary,
  FestivalDirectory,
  FlashSale,
  Invoice,
  MileageSummary,
  PickupSlots,
} from '../types';

// ─── 7.6 flash sales ───────────────────────────────────────────────────────────────────────

/** Public: what is on sale right now at one business. */
export function useLiveFlashSales(businessId: string | undefined) {
  return useQuery<FlashSale[]>({
    queryKey: keys.flashSales(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () =>
      isMapDemo ? Promise.resolve([]) : api.get<FlashSale[]>(endpoints.flashSales(businessId!)),
    // Short: a sale that has just ended must stop being advertised quickly.
    staleTime: 30_000,
  });
}

/** Owner: every sale, including finished and cancelled ones. */
export function useAllFlashSales(businessId: string | undefined) {
  return useQuery<FlashSale[]>({
    queryKey: keys.flashSalesAll(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () =>
      isMapDemo ? Promise.resolve([]) : api.get<FlashSale[]>(endpoints.flashSalesAll(businessId!)),
  });
}

export function useCreateFlashSale(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      menuItemId?: string;
      percent: number;
      label?: string;
      startsAt: string;
      endsAt: string;
    }) => api.post<FlashSale>(endpoints.flashSales(businessId), input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.flashSalesAll(businessId) });
      void qc.invalidateQueries({ queryKey: keys.flashSales(businessId) });
    },
  });
}

export function useCancelFlashSale(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (saleId: string) => api.post<FlashSale>(endpoints.flashSaleCancel(saleId)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.flashSalesAll(businessId) });
      void qc.invalidateQueries({ queryKey: keys.flashSales(businessId) });
    },
  });
}

// ─── 7.5 scheduled pickup ──────────────────────────────────────────────────────────────────

export function usePickupSlots(businessId: string | undefined) {
  return useQuery<PickupSlots>({
    queryKey: keys.pickupSlots(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () => api.get<PickupSlots>(endpoints.pickupSlots(businessId!)),
    // Slots are generated from "now", so a stale list offers times that have passed.
    staleTime: 60_000,
  });
}

// ─── 7.7 mileage ───────────────────────────────────────────────────────────────────────────

export function useMileage(
  actorType: 'business' | 'seller',
  actorId: string | undefined,
  days = 30,
) {
  return useQuery<MileageSummary>({
    queryKey: keys.mileage(actorType, actorId ?? 'none', days),
    enabled: Boolean(actorId),
    queryFn: () =>
      api.get<MileageSummary>(endpoints.mileage, { query: { actorType, actorId: actorId!, days } }),
    staleTime: 300_000,
  });
}

// ─── 7.8 corridors ─────────────────────────────────────────────────────────────────────────

export function useCorridors() {
  return useQuery<Corridor[]>({
    queryKey: keys.corridors,
    queryFn: () => (isMapDemo ? Promise.resolve([]) : api.get<Corridor[]>(endpoints.corridors)),
  });
}

export function useCreateCorridor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      label: string;
      path: [number, number][];
      radiusM?: number;
      categories?: string[];
    }) => api.post<Corridor>(endpoints.corridors, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.corridors }),
  });
}

export function useSetCorridorActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<Corridor>(endpoints.corridor(id), { active }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.corridors }),
  });
}

export function useRemoveCorridor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(endpoints.corridor(id)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.corridors }),
  });
}

// ─── 7.9 festivals ─────────────────────────────────────────────────────────────────────────

export function useFestivals(coords: { lng: number; lat: number } | null, withinDays = 60) {
  return useQuery<FestivalDirectory>({
    queryKey: keys.festivals(coords?.lng, coords?.lat, withinDays),
    enabled: Boolean(coords),
    queryFn: () =>
      api.get<FestivalDirectory>(endpoints.festivals, {
        query: { lng: coords!.lng, lat: coords!.lat, withinDays },
      }),
    staleTime: 600_000,
  });
}

// ─── 7.10 back office ──────────────────────────────────────────────────────────────────────

export function useCrew(businessId: string | undefined) {
  return useQuery<CrewMember[]>({
    queryKey: keys.businessCrew(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () => api.get<CrewMember[]>(endpoints.businessCrew(businessId!)),
  });
}

export function useInviteCrew(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; note?: string; defaultRateCents?: number }) =>
      api.post<CrewMember>(endpoints.businessCrew(businessId), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.businessCrew(businessId) }),
  });
}

/** My own crew memberships — so someone can see and leave the lists they are on. */
export function useMyCrews() {
  return useQuery<CrewMember[]>({
    queryKey: keys.myCrews,
    queryFn: () => (isMapDemo ? Promise.resolve([]) : api.get<CrewMember[]>(endpoints.myCrews)),
  });
}

export function useRespondToCrewInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      api.post<CrewMember>(endpoints.crewRespond(id), { accept }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.myCrews }),
  });
}

export function useLeaveCrew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(endpoints.crewMember(id)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.myCrews }),
  });
}

export function useExpenses(businessId: string | undefined) {
  return useQuery<Expense[]>({
    queryKey: keys.businessExpenses(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () => api.get<Expense[]>(endpoints.businessExpenses(businessId!)),
  });
}

export function useAddExpense(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      category: string;
      amountCents: number;
      incurredOn: string;
      description?: string;
      receiptUrl?: string;
      vendorName?: string;
    }) => api.post<Expense>(endpoints.businessExpenses(businessId), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.businessExpenses(businessId) }),
  });
}

export function useDeleteExpense(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(endpoints.expense(id)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.businessExpenses(businessId) }),
  });
}

export function useExpenseSummary(businessId: string | undefined, from: string, to: string) {
  return useQuery<ExpenseSummary>({
    queryKey: keys.businessExpenseSummary(businessId ?? 'none', from, to),
    enabled: Boolean(businessId),
    queryFn: () =>
      api.get<ExpenseSummary>(endpoints.businessExpenseSummary(businessId!), {
        query: { from, to },
      }),
  });
}

export function useInvoices(businessId: string | undefined) {
  return useQuery<Invoice[]>({
    queryKey: keys.businessInvoices(businessId ?? 'none'),
    enabled: Boolean(businessId),
    queryFn: () => api.get<Invoice[]>(endpoints.businessInvoices(businessId!)),
  });
}

export function useCreateInvoice(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      customerName: string;
      customerEmail?: string;
      lineItems: { description: string; quantity: number; unitPriceCents: number }[];
      taxCents?: number;
      notes?: string;
      dueOn?: string;
    }) => api.post<Invoice>(endpoints.businessInvoices(businessId), input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.businessInvoices(businessId) }),
  });
}

export function useSetInvoiceStatus(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'sent' | 'paid' | 'void' }) =>
      api.patch<Invoice>(endpoints.invoice(id), { status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.businessInvoices(businessId) }),
  });
}
