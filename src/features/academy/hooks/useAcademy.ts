'use client';

/**
 * Phase D data layer — Academy (D-3/D-4), seller profile (D-2), earn hub (D-1).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { AppApiError } from '@/lib/api/errors';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { useDeviceLocation } from '@/features/jobs/hooks/useJobs';
import {
  demoCourse,
  demoCourses,
  demoCredentials,
  demoEarnFeed,
  demoSellerProfile,
  demoSubmitCourse,
  resetDemoAcademy,
} from '../demo';
import type {
  CourseAnswer,
  CourseDetail,
  CourseResult,
  CourseSummary,
  Credentials,
  EarnFeed,
  ProfileOptions,
  SellerProfile,
} from '../types';

export { resetDemoAcademy };

// ─── D-3 Academy ────────────────────────────────────────────────────────────────────────────
export function useCourses() {
  return useQuery<CourseSummary[]>({
    queryKey: keys.academyCourses,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoCourses())
        : api.get<CourseSummary[]>(endpoints.academyCourses),
    staleTime: isMapDemo ? Infinity : 60_000,
  });
}

export function useCourse(slug: string | undefined) {
  return useQuery<CourseDetail>({
    queryKey: keys.academyCourse(slug ?? 'none'),
    enabled: Boolean(slug),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoCourse(slug!))
        : api.get<CourseDetail>(endpoints.academyCourse(slug!)),
    // Versioned content — changes on deploy, not during a session.
    staleTime: Infinity,
  });
}

export function useSubmitCourse(slug: string) {
  const qc = useQueryClient();
  return useMutation<CourseResult, AppApiError, CourseAnswer[]>({
    mutationFn: (answers) =>
      isMapDemo
        ? demoSubmitCourse(slug, answers.every((a) => a.answerIndex === 2))
        : api.post<CourseResult>(endpoints.academySubmit(slug), { answers }),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: keys.academyCourses });
      void qc.invalidateQueries({ queryKey: keys.academyCourse(slug) });
      if (result.passed) {
        void qc.invalidateQueries({ queryKey: keys.academyCredentials });
        /**
         * A certification unlocks gated stock (D-5), so the browse cache is now wrong — it's
         * showing locks that no longer apply.
         */
        if (result.certificationAwarded) {
          void qc.invalidateQueries({ queryKey: ['products'] });
        }
      }
    },
  });
}

/** D-4 — badges and certifications. */
export function useCredentials() {
  return useQuery<Credentials>({
    queryKey: keys.academyCredentials,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoCredentials())
        : api.get<Credentials>(endpoints.academyCredentials),
    staleTime: isMapDemo ? Infinity : 60_000,
  });
}

// ─── D-2 Seller profile ─────────────────────────────────────────────────────────────────────
export function useSellerProfile() {
  return useQuery<SellerProfile>({
    queryKey: keys.sellerProfile,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoSellerProfile())
        : api.get<SellerProfile>(endpoints.sellerProfile),
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}

export function useProfileOptions() {
  return useQuery<ProfileOptions>({
    queryKey: [...keys.sellerProfile, 'options'],
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({
            skills: [
              'talking_to_people',
              'crafts_and_handmade',
              'food_and_drink',
              'tech_and_gadgets',
              'fashion_and_style',
              'kids_and_family',
              'automotive',
              'sports_and_outdoors',
            ],
            venues: [
              'street_and_sidewalk',
              'parks',
              'farmers_markets',
              'sports_events',
              'car_events',
              'concerts_and_festivals',
              'transit_hubs',
              'campus',
            ],
            transport: ['on_foot', 'bike', 'transit', 'car', 'van'],
          })
        : api.get<ProfileOptions>(endpoints.sellerProfileOptions),
    staleTime: Infinity,
  });
}

export function useUpdateSellerProfile() {
  const qc = useQueryClient();
  return useMutation<SellerProfile, AppApiError, Partial<SellerProfile>>({
    mutationFn: (patch) =>
      isMapDemo
        ? Promise.resolve({ ...demoSellerProfile(), ...patch } as SellerProfile)
        : api.patch<SellerProfile>(endpoints.sellerProfile, {
            skills: patch.skills,
            venues: patch.venues,
            transport: patch.transport,
            availableHours: patch.availableHours,
            bio: patch.bio,
          }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.sellerProfile });
      // The profile feeds product ranking (D-2 → A-4), so recommendations are now stale.
      void qc.invalidateQueries({ queryKey: keys.aiRecs });
      void qc.invalidateQueries({ queryKey: ['earn'] });
    },
  });
}

// ─── D-1 Earn hub ───────────────────────────────────────────────────────────────────────────
/**
 * Location is optional here, unlike the jobs board: without it gigs drop out (their feed is
 * proximity-ranked) but consignment stock still returns. A denied permission narrows the list
 * rather than emptying it.
 */
export function useEarnFeed() {
  const { data: coords } = useDeviceLocation();
  const key = coords ? `${coords.lng.toFixed(2)},${coords.lat.toFixed(2)}` : 'none';

  return useQuery<EarnFeed>({
    queryKey: keys.earn(key),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoEarnFeed())
        : api.get<EarnFeed>(endpoints.earn, {
            query: coords ? { lat: coords.lat, lng: coords.lng } : undefined,
          }),
    staleTime: isMapDemo ? Infinity : 60_000,
  });
}
