'use client';

/**
 * Admin / Trust & Safety data layer (SCREEN_TO_API_MAPPING.md §9). Ops overview (GAP-2), dispute
 * arbitration, category/license review, fraud triage, and user management. Demo mode seeds each
 * queue so the console is fully operable offline. Every resolution writes an audit log server-side.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import {
  demoAdminOverview,
  demoAdminUsers,
  demoCategoryReview,
  demoDisputes,
  demoFraudFlags,
  demoSponsors,
  type DemoAdminUser,
  type DemoDispute,
  type DemoFraudFlag,
} from '@/lib/demo';
import type { AdminBusiness } from '../types';

export function useAdminOverview() {
  return useQuery({
    queryKey: keys.adminOverview,
    queryFn: () => (isMapDemo ? Promise.resolve(demoAdminOverview()) : api.get<ReturnType<typeof demoAdminOverview>>(endpoints.admin.overview)),
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}

/**
 * Businesses matching a typed name.
 *
 * Disabled below two characters — one letter matches most of the table and helps nobody choose,
 * and the server refuses it anyway. Cached briefly so re-opening the picker within a form does not
 * re-query for a term the operator has not changed.
 */
export function useBusinessSearch(q: string) {
  const term = q.trim();
  return useQuery<AdminBusiness[]>({
    queryKey: keys.adminBusinessSearch(term),
    enabled: term.length >= 2,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(
            [
              { id: 'biz_taco', name: 'Taco Loco', status: 'active', isHub: false, ownerName: 'Demo Vendor', ownerEmail: null },
            ].filter((b) => b.name.toLowerCase().includes(term.toLowerCase())),
          )
        : api.get<AdminBusiness[]>(endpoints.admin.businessSearch, { query: { q: term } }),
    staleTime: 30_000,
  });
}

// ---- Disputes (A-02) ----
export function useDisputes() {
  return useQuery<DemoDispute[]>({
    queryKey: keys.adminDisputes,
    queryFn: () => (isMapDemo ? Promise.resolve(demoDisputes()) : api.get<DemoDispute[]>(endpoints.admin.disputes)),
    staleTime: isMapDemo ? Infinity : 15_000,
  });
}

export function useDispute(id: string) {
  const qc = useQueryClient();
  return useQuery<DemoDispute | undefined>({
    queryKey: keys.dispute(id),
    queryFn: () => {
      const fromList = qc.getQueryData<DemoDispute[]>(keys.adminDisputes)?.find((d) => d.id === id);
      return Promise.resolve(fromList ?? (isMapDemo ? demoDisputes().find((d) => d.id === id) : undefined));
    },
    staleTime: Infinity,
  });
}

export function useResolveDispute(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resolution: 'claimant' | 'respondent') => (isMapDemo ? Promise.resolve() : api.post(endpoints.disputeResolve(id), { resolution })),
    onSuccess: () => {
      const patch = (d: DemoDispute) => (d.id === id ? { ...d, status: 'resolved' as const } : d);
      qc.setQueryData<DemoDispute[]>(keys.adminDisputes, (prev) => (prev ?? []).map(patch));
      qc.setQueryData<DemoDispute | undefined>(keys.dispute(id), (d) => (d ? patch(d) : d));
    },
  });
}

// ---- Category review (A-03), real-data backed ----

export type Archetype =
  | 'counter_serve'
  | 'appointment_service'
  | 'on_demand_service'
  | 'goods_seller';
export type CategoryTab = 'food' | 'coffee' | 'services' | 'shopping' | 'more';

export interface AdminCategorySuggestion {
  id: string;
  proposedName: string;
  businessId: string;
  businessName: string;
  justification: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

/** The admin's approval decision. `archetype` is what gives the new category a working product. */
export interface SuggestionDecision {
  id: string;
  approve: boolean;
  topLevelTab?: CategoryTab;
  archetype?: Archetype;
  requiresLicense?: boolean;
  regulatedBy?: string;
}

/**
 * The pending taxonomy queue. Until BP-5 this returned `demoCategoryReview()` unconditionally —
 * there was no listing endpoint, so the admin console showed fixture data even against a real
 * backend and approvals silently acted on ids that didn't exist.
 */
export function useCategoryReview() {
  const qc = useQueryClient();
  const query = useQuery<AdminCategorySuggestion[]>({
    queryKey: keys.categoryReview,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(
            demoCategoryReview().suggestions.map((s) => ({
              id: s.id,
              proposedName: s.name,
              businessId: 'biz_demo',
              businessName: s.suggestedBy,
              justification: null,
              status: 'pending' as const,
              createdAt: new Date().toISOString(),
            })),
          )
        : api.get<AdminCategorySuggestion[]>(endpoints.admin.categorySuggestions),
    staleTime: 15_000,
  });

  const reviewSuggestion = useMutation({
    // `approve` is required server-side; `archetype` is what lets the approved category inherit
    // a complete product with no code change (BUSINESS_MODULE_SYSTEM.md §3).
    mutationFn: ({ id, ...decision }: SuggestionDecision) =>
      isMapDemo
        ? Promise.resolve()
        : api.post(endpoints.admin.categorySuggestionReview(id), decision),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.categoryReview }),
  });

  return { suggestions: query.data, isLoading: query.isLoading, reviewSuggestion };
}

// ---- Taxonomy governance (A-03) ----
export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  topLevelTab: CategoryTab;
  /** Null = no archetype set; the resolver falls back to the tab default. Surfaced so it's fixable. */
  archetype: Archetype | null;
  requiresLicense: boolean;
  regulatedBy: string | null;
  active: boolean;
}

export function useAdminCategories() {
  const qc = useQueryClient();
  const query = useQuery<AdminCategory[]>({
    queryKey: keys.adminCategories,
    queryFn: () => (isMapDemo ? Promise.resolve([]) : api.get<AdminCategory[]>(endpoints.admin.categories)),
    staleTime: 60_000,
  });

  const update = useMutation({
    mutationFn: ({ id, ...patch }: Partial<AdminCategory> & { id: string }) =>
      isMapDemo ? Promise.resolve() : api.patch(endpoints.admin.category(id), patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.adminCategories }),
  });

  return { categories: query.data, isLoading: query.isLoading, update };
}

// ---- License review queue (A-03), real-data backed ----
export interface AdminLicenseDoc {
  id: string;
  businessId: string;
  businessName: string;
  categoryId: string;
  categoryName: string;
  regulatedBy: string | null;
  documentUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

/**
 * The pending licence queue. Approving flips the business's server-derived `canGoLive`, which is
 * what unblocks the vendor's "Go live" — so this is a real gate, not a formality.
 */
export function useLicenseReview() {
  const qc = useQueryClient();
  const query = useQuery<AdminLicenseDoc[]>({
    queryKey: keys.adminLicenseDocs,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(
            demoCategoryReview().licenses.map((l) => ({
              id: l.id,
              businessId: 'biz_demo',
              businessName: l.business,
              categoryId: 'cat_demo',
              categoryName: l.category,
              regulatedBy: 'County Health Dept',
              documentUrl: '#',
              status: 'pending' as const,
              createdAt: l.submittedAt,
            })),
          )
        : api.get<AdminLicenseDoc[]>(endpoints.admin.licenseDocs),
    staleTime: 15_000,
  });

  const review = useMutation({
    // `approve` is a REQUIRED body field server-side (ReviewLicenseBody) — omitting it 400s.
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      isMapDemo ? Promise.resolve() : api.post(endpoints.admin.licenseDocReview(id), { approve }),
    onSuccess: (_r, { id }) => {
      qc.setQueryData<AdminLicenseDoc[]>(keys.adminLicenseDocs, (p) =>
        (p ?? []).filter((l) => l.id !== id),
      );
      void qc.invalidateQueries({ queryKey: keys.adminLicenseDocs });
    },
  });

  return { licenses: query.data, isLoading: query.isLoading, review };
}

// ---- Fraud (A-04) ----
export function useFraudFlags() {
  return useQuery<DemoFraudFlag[]>({
    queryKey: keys.fraudFlags,
    queryFn: () => (isMapDemo ? Promise.resolve(demoFraudFlags()) : api.get<DemoFraudFlag[]>(endpoints.admin.fraudFlags)),
    staleTime: isMapDemo ? Infinity : 15_000,
  });
}

// ---- User management (A-05) ----
export function useAdminUsers() {
  return useQuery<DemoAdminUser[]>({
    queryKey: keys.adminUsers,
    queryFn: () => (isMapDemo ? Promise.resolve(demoAdminUsers()) : api.get<DemoAdminUser[]>(endpoints.admin.users)),
    staleTime: isMapDemo ? Infinity : 15_000,
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; suspend: boolean }) => (isMapDemo ? Promise.resolve() : api.post(endpoints.admin.suspend(id))),
    onMutate: ({ id, suspend }) =>
      qc.setQueryData<DemoAdminUser[]>(keys.adminUsers, (prev) => (prev ?? []).map((u) => (u.id === id ? { ...u, status: suspend ? 'suspended' : 'active' } : u))),
  });
}

// ---- Sponsors (A-07) ----
/**
 * A sponsorship as the admin roster shows it.
 *
 * `contractedCents` is recorded BY HAND and nothing is collected through the platform —
 * sponsorships are negotiated and settled off-platform. The screen previously showed a "Spend"
 * column against no stored field at all: the figure came from a demo fixture, so it reported a
 * number nobody had entered and nothing could verify.
 */
export interface AdminSponsor {
  id: string;
  name: string;
  logoUrl: string | null;
  tier: string;
  utmCode: string;
  launchCitySlug: string | null;
  active: boolean;
  impressions: number;
  attributedSignups: number;
  contractedCents: number;
  note: string | null;
  createdAt: string | null;
}

/**
 * The roster. This called `GET /admin/sponsors`, which did not exist — the request 404'd, the data
 * stayed undefined, and the component's `if (isLoading || !sponsors)` rendered its loading skeleton
 * for ever. The page could only ever be blank.
 */
export function useSponsors() {
  return useQuery<AdminSponsor[]>({
    queryKey: keys.sponsors,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoSponsors() as unknown as AdminSponsor[])
        : api.get<AdminSponsor[]>(endpoints.admin.sponsors),
    staleTime: isMapDemo ? Infinity : 60_000,
  });
}

export function useCreateSponsor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      utmCode: string;
      tier?: string;
      logoUrl?: string;
      contractedCents?: number;
      note?: string;
    }) => api.post<{ id: string }>(endpoints.admin.sponsors, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.sponsors }),
  });
}

/**
 * Edit a sponsorship, including ending one. `active` was in the model and reachable by nothing, so
 * a term could never be closed: the logo stayed on the landing page and the UTM code kept
 * attributing signups to a partner who had stopped paying.
 */
export function useUpdateSponsor() {
  const qc = useQueryClient();
  return useMutation<
    { id: string; active: boolean; impressions: number; attributedSignups: number },
    unknown,
    { id: string; active?: boolean; contractedCents?: number; note?: string | null }
  >({
    mutationFn: ({ id, ...patch }) => api.patch(endpoints.admin.sponsor(id), patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.sponsors }),
  });
}
