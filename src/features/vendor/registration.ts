'use client';

/**
 * Registration data layer (BP-3, BUSINESS_REGISTRATION_REDESIGN.md).
 *
 * The taxonomy carries an `archetype`, which is the single field that decides what the wizard asks
 * next — so the vendor answers one question (their category) and never sees a step meant for a
 * different kind of business.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isMapDemo } from '@/lib/env';
import type { Archetype } from './hooks/useBusinessModules';

export interface Category {
  _id: string;
  slug: string;
  name: string;
  top_level_tab: 'food' | 'coffee' | 'services' | 'shopping' | 'more';
  archetype?: Archetype | null;
  requires_license?: boolean;
  regulated_by?: string | null;
}

export interface HoursEntry {
  day: number;
  open: string;
  close: string;
}

/** Mirrors the backend's DEFAULT_ARCHETYPE_BY_TAB — a category seeded before BP-1 has none. */
export function archetypeOf(category: Category | undefined): Archetype {
  if (!category) return 'counter_serve';
  if (category.archetype) return category.archetype;
  switch (category.top_level_tab) {
    case 'food':
    case 'coffee':
      return 'counter_serve';
    case 'services':
      return 'on_demand_service';
    default:
      return 'goods_seller';
  }
}

const DEMO_CATEGORIES: Category[] = [
  { _id: 'food', slug: 'food-truck', name: 'Food Truck', top_level_tab: 'food', archetype: 'counter_serve', requires_license: true, regulated_by: 'County Health Dept' },
  { _id: 'coffee', slug: 'coffee-cart', name: 'Coffee Cart', top_level_tab: 'coffee', archetype: 'counter_serve', requires_license: true, regulated_by: 'County Health Dept' },
  { _id: 'services', slug: 'mobile-mechanic', name: 'Mobile Mechanic', top_level_tab: 'services', archetype: 'on_demand_service' },
  { _id: 'shopping', slug: 'handmade-crafts', name: 'Handmade & Crafts', top_level_tab: 'shopping', archetype: 'goods_seller' },
];

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['catalog-categories'],
    queryFn: () =>
      isMapDemo ? Promise.resolve(DEMO_CATEGORIES) : api.get<Category[]>(endpoints.categories),
    staleTime: 5 * 60_000,
  });
}

/** "Something else" — the taxonomy gap is already solved server-side; nobody is ever blocked. */
export function useSuggestCategory() {
  return useMutation({
    mutationFn: (input: { businessId: string; proposedName: string }) =>
      isMapDemo
        ? Promise.resolve({ id: 'sug_demo' })
        : api.post<{ id: string }>(endpoints.categorySuggestions, {
            businessId: input.businessId,
            proposedName: input.proposedName,
          }),
  });
}

export const TAB_LABEL: Record<Category['top_level_tab'], string> = {
  food: 'Food',
  coffee: 'Coffee & drinks',
  services: 'Services',
  shopping: 'Shopping',
  more: 'More',
};

export const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Mon–Fri 9–5 as a humane starting point; the vendor edits from there rather than from nothing. */
export function defaultHours(): HoursEntry[] {
  return [1, 2, 3, 4, 5].map((day) => ({ day, open: '09:00', close: '17:00' }));
}

export const RADIUS_OPTIONS = [
  { value: 2000, label: '2 km — my street & nearby blocks' },
  { value: 5000, label: '5 km — my neighbourhood' },
  { value: 10000, label: '10 km — across town' },
  { value: 25000, label: '25 km — the whole metro' },
];
