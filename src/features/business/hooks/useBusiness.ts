'use client';

/**
 * Business profile data layer (SCREEN_TO_API_MAPPING.md §2). Profile, menu, reviews, and the live
 * queue/discount preview for C-14. Follow/Notify-Me are optimistic (reversible toggles,
 * STATE_MANAGEMENT.md §4). Demo mode serves the local dataset so C-14 opens with real-looking data.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { findDemoBusiness } from '@/lib/demo';
import type { BusinessProfile, MenuItem, QueueState, Review } from '../types';

/** Raw GET /businesses/:id shape (vendors.service) — differs from the UI's BusinessProfile. */
interface RawBusiness {
  id: string;
  name: string;
  categoryId?: string;
  description?: string | null;
  logoUrl?: string | null;
  coverPhotoUrl?: string | null;
  hours?: { day: number; open: string; close: string }[] | string | null;
  status?: string; // business account status ('active'|'suspended') — NOT a live PinStatus
  liveStatus?: string | null; // current live session status: 'driving'|'parked'|'away_closed'|null
  // Some deployments enrich the profile with these; treat as optional.
  rating?: number;
  reviewCount?: number;
  trustScore?: number;
  locationLine?: string;
  following?: boolean;
  /** Registered service-area point [lng, lat] (vendors.service getBusiness). */
  serviceArea?: [number, number] | null;
  /** What the vendor charges to travel to the customer (spec §32.4); null = none. */
  travelFeeCents?: number | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format the backend's structured hours into a short human string.
 *
 * Consecutive days with identical hours collapse into a range: a standard weekday business reads
 * "Mon–Fri 09:00–17:00" instead of the same line repeated five times and wrapping across the card
 * ("Mon 09:00–17:00 · Tue 09:00–17:00 · Wed …"), which is how every real opening-hours listing is
 * written.
 */
function formatHours(hours: RawBusiness['hours']): string | undefined {
  if (!hours) return undefined;
  if (typeof hours === 'string') return hours || undefined;
  if (!Array.isArray(hours) || hours.length === 0) return undefined;

  const sorted = [...hours].sort((a, b) => a.day - b.day);
  const groups: { from: number; to: number; open: string; close: string }[] = [];
  for (const h of sorted) {
    const last = groups[groups.length - 1];
    // Extend the run only while the day is truly consecutive AND the times match exactly.
    if (last && h.day === last.to + 1 && h.open === last.open && h.close === last.close) {
      last.to = h.day;
    } else {
      groups.push({ from: h.day, to: h.day, open: h.open, close: h.close });
    }
  }
  return groups
    .map((g) => {
      const label =
        g.from === g.to
          ? (DAYS[g.from] ?? '?')
          : `${DAYS[g.from] ?? '?'}–${DAYS[g.to] ?? '?'}`;
      return `${label} ${g.open}–${g.close}`;
    })
    .join(' · ');
}

/** Backend live-session status → the UI's PinStatus ('away_closed' shows as 'away'; offline → undefined). */
function normalizeLiveStatus(s: string | null | undefined): BusinessProfile['status'] {
  if (!s) return undefined;
  if (s === 'away_closed') return 'away';
  if (s === 'driving' || s === 'parked' || s === 'away') return s;
  return undefined;
}

/** Map the raw profile response into the UI's BusinessProfile, tolerating missing aggregates. */
function normalizeBusiness(raw: RawBusiness): BusinessProfile {
  return {
    id: raw.id,
    name: raw.name,
    category: raw.categoryId ?? 'all',
    logoUrl: raw.logoUrl ?? undefined,
    coverUrl: raw.coverPhotoUrl ?? undefined,
    // Use the real live-session status (driving/parked/away), not the account status. away_closed
    // is presented as 'away'. Undefined when the business is offline (no active session).
    status: normalizeLiveStatus(raw.liveStatus),
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    trustScore: raw.trustScore,
    about: raw.description ?? undefined,
    hours: formatHours(raw.hours),
    locationLine: raw.locationLine,
    following: raw.following,
    lngLat:
      Array.isArray(raw.serviceArea) && raw.serviceArea.length === 2
        ? [raw.serviceArea[0], raw.serviceArea[1]]
        : undefined,
    travelFeeCents: raw.travelFeeCents ?? undefined,
  };
}

export function useBusiness(id: string | undefined) {
  return useQuery({
    queryKey: keys.business(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: (): Promise<BusinessProfile> => {
      if (isMapDemo) {
        const b = findDemoBusiness(id!);
        if (!b) throw new Error('Not found');
        return Promise.resolve({
          id: b.id, name: b.name, category: b.category, logoUrl: b.logoUrl,
          status: b.status, rating: b.rating, reviewCount: b.reviewCount, about: b.about,
          hours: b.hours, locationLine: b.locationLine, todaysSpecial: b.todaysSpecial,
          trustScore: b.trustScore, following: false,
        });
      }
      return api.get<RawBusiness>(endpoints.business(id!).root).then(normalizeBusiness);
    },
    staleTime: 60_000,
  });
}

export function useMenu(id: string | undefined) {
  return useQuery({
    queryKey: keys.menu(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: (): Promise<MenuItem[]> => {
      if (isMapDemo) return Promise.resolve(findDemoBusiness(id!)?.menu ?? []);
      return api.get<MenuItem[]>(endpoints.business(id!).menu);
    },
    staleTime: 60_000,
  });
}

export interface PublicService {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  /** Customer-facing listing image; null when the vendor hasn't added one. */
  photoUrl?: string | null;
}

const DEMO_SERVICES: PublicService[] = [
  { id: 'svc_demo_1', name: 'Men’s haircut', durationMin: 30, priceCents: 2500 },
  { id: 'svc_demo_2', name: 'Beard trim', durationMin: 15, priceCents: 1200 },
];

/**
 * The services a business offers — what an appointment or on-demand business actually sells.
 * `GET /businesses/:id/services` is public, so this is the single read for both sides: the vendor's
 * manager re-exports it (useVendorServices) rather than issuing its own. One query key, one demo
 * dataset, one staleTime — a vendor editing a service updates what customers see.
 */
export function useServices(id: string | undefined) {
  return useQuery({
    queryKey: keys.vendorServices(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: (): Promise<PublicService[]> =>
      isMapDemo
        ? Promise.resolve(DEMO_SERVICES)
        : api.get<PublicService[]>(endpoints.business(id!).services),
    staleTime: 30_000,
  });
}

/** Raw GET /reviews response (reviewsService.listForSubject). */
interface RawReviews {
  average: number;
  count: number;
  reviews: { rating: number; comment: string | null; authorId: string; createdAt: string }[];
}

export function useReviews(id: string | undefined) {
  return useQuery({
    queryKey: keys.reviews(id ?? 'none'),
    enabled: Boolean(id),
    queryFn: (): Promise<Review[]> => {
      if (isMapDemo) return Promise.resolve(findDemoBusiness(id!)?.reviews ?? []);
      // Reviews are keyed by subject, not nested under the business: GET /reviews?subjectType&subjectId.
      return api
        .get<RawReviews>(endpoints.reviews, { query: { subjectType: 'business', subjectId: id! } })
        .then((r) =>
          r.reviews.map((rv, i) => ({
            id: `${rv.authorId}_${i}`,
            author: 'Customer', // the list endpoint returns an author id, not a display name
            rating: rv.rating,
            body: rv.comment ?? '',
            createdAt: rv.createdAt,
          })),
        );
    },
    staleTime: 60_000,
  });
}

/** Raw GET /queues/business/:id (queueService.buildState) — the live line, differs from QueueState. */
interface RawQueueState {
  status: string;
  entries: { customerId: string; position: number; discountPercent: number }[];
  schedule: { tiers: { position?: number | null; discount_percent?: number | null }[]; capPercent: number };
}

export function useQueuePreview(ownerId: string | undefined) {
  return useQuery({
    queryKey: keys.queue(ownerId ?? 'none'),
    enabled: Boolean(ownerId),
    queryFn: (): Promise<QueueState> => {
      if (isMapDemo) {
        return Promise.resolve(findDemoBusiness(ownerId!)?.queue ?? { count: 0, cap: 0, schedule: [] });
      }
      // The backend returns the full line (entries + discount tiers); the preview only needs the
      // head-count and the tier ladder, so fold it down here.
      return api.get<RawQueueState>(endpoints.queue(ownerId!).root).then((s) => ({
        count: s.entries.length,
        cap: s.schedule.capPercent,
        schedule: s.schedule.tiers.map((t) => ({ position: t.position ?? 0, percent: t.discount_percent ?? 0 })),
      }));
    },
    staleTime: 15_000,
  });
}

export function useFollow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (following: boolean) =>
      isMapDemo
        ? Promise.resolve()
        : following
          ? api.del(endpoints.business(id).follow)
          : api.post(endpoints.business(id).follow),
    onMutate: (following) => {
      const prev = qc.getQueryData<BusinessProfile>(keys.business(id));
      if (prev) qc.setQueryData(keys.business(id), { ...prev, following: !following });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.business(id), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.favorites });
    },
  });
}

export function useNotifyMe(id: string) {
  return useMutation({
    mutationFn: () => (isMapDemo ? Promise.resolve() : api.post(endpoints.business(id).notifyMe)),
  });
}

/** C-16 review submit — gated to a completed transaction server-side (H3). */
export function useSubmitReview(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    /**
     * The response is `{ id, rating }`, not a full review row. Typed honestly so nothing can treat
     * it as renderable again — the previous `Promise<Review>` was what let a row with no timestamp
     * reach the list and crash the page.
     */
    mutationFn: ({
      rating,
      body,
      transactionId,
    }: {
      rating: number;
      body: string;
      transactionId?: string;
    }): Promise<{ id: string; rating: number }> => {
      if (isMapDemo) return Promise.resolve({ id: `rv_${Date.now()}`, rating });
      // Backend CreateReviewBody: { subjectType, subjectId, rating, comment?, transactionId }. The
      // transactionId comes from the completed order the user is reviewing (H3, enforced server-side).
      return api.post<{ id: string; rating: number }>(endpoints.reviews, {
        subjectType: 'business',
        subjectId: businessId,
        rating,
        comment: body || undefined,
        transactionId,
      });
    },
    onSuccess: () => {
      /**
       * Refetch rather than splice the POST response into the list.
       *
       * `POST /reviews` returns `{ id, rating }` — reviews.service.ts §60 — NOT the row shape the
       * list renders. Unshifting it produced an entry with no `createdAt`, and
       * `formatRelativeMinutes` fell through to `Intl.DateTimeFormat.format()`, which throws
       * RangeError on an invalid date. Thrown during render, that hit the error boundary: posting a
       * review appeared to break the page, seconds after the success toast.
       *
       * The list endpoint is the authority on how a review reads back (it resolves the author, and
       * hides moderated photos). Asking it is both correct and cheaper than keeping a hand-built row
       * in sync with a projection that has different fields.
       */
      void qc.invalidateQueries({ queryKey: keys.reviews(businessId) });
      void qc.invalidateQueries({ queryKey: keys.business(businessId) });
    },
  });
}
