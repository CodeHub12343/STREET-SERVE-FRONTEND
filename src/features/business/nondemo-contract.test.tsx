import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { makeQueryClient } from '@/lib/query/queryClient';
import { DEMO_BUSINESSES } from '@/lib/demo';
import type { DemoMenuItem, DemoReview } from '@/lib/demo';
import type { MenuItem, Review } from './types';
import { useMenu, useReviews } from './hooks/useBusiness';

/**
 * A-10, the compile-time half: the demo fixtures must stay assignable to the real feature types.
 *
 * `lib/` may not import `features/` (`import/no-restricted-paths` — lib is cross-cutting plumbing),
 * so the assertion lives here, on the feature side, where both are visible. Structural typing makes
 * that free. If `MenuItem` or `Review` gains a required field, or changes one, these two lines fail
 * `tsc` — which is the whole point: a contract change must not be able to leave the fixtures behind
 * while every demo-backed test stays green.
 */
const _demoMenuItemIsAMenuItem: MenuItem = {} as DemoMenuItem;
const _demoReviewIsAReview: Review = {} as DemoReview;
void _demoMenuItemIsAMenuItem;
void _demoReviewIsAReview;

/**
 * A-10 — the non-demo half of the demo boundary.
 *
 * Demo mode (`NEXT_PUBLIC_MAP_DEMO`) is load-bearing for several component tests: it makes the app
 * walkable with no backend and no Mapbox token. That is genuinely useful, and it is also how a
 * breaking API change could stay invisible — the fixtures would still satisfy the components while
 * the real request path was broken.
 *
 * Two things close that gap:
 *
 *   1. `lib/demo.ts` is now typed **as** the feature types rather than cast to them, so a contract
 *      change is a compile error rather than a runtime surprise. That is enforced by `tsc`, not here.
 *   2. This file: the same surfaces, exercised through the REAL fetch path with demo mode off, so
 *      the mapping code between the API response and the UI type is verified independently of the
 *      fixtures.
 */

function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>;
}

function mockJson(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ data: body }),
  } as unknown as Response);
}

describe('business surfaces without demo mode (A-10)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('maps a real menu response to MenuItem[] with no demo fixtures involved', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'false');
    vi.stubGlobal(
      'fetch',
      mockJson([{ id: 'm9', name: 'Carne asada', priceCents: 950, todaysSpecial: false }]),
    );

    const { result } = renderHook(() => useMenu('biz-real'), { wrapper: Providers });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual([
      { id: 'm9', name: 'Carne asada', priceCents: 950, todaysSpecial: false },
    ]);
    expect(fetch).toHaveBeenCalled();
  });

  it('maps a real reviews response to Review[] with no demo fixtures involved', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'false');
    // The real endpoint returns `{ reviews: [...] }` keyed by subject, with an author ID rather
    // than a display name — a shape the demo fixtures do not have, which is exactly why this test
    // exercises the API path instead of trusting the fixtures.
    vi.stubGlobal(
      'fetch',
      mockJson({
        reviews: [
          { authorId: 'u1', rating: 5, comment: 'Great', createdAt: '2026-08-01T00:00:00Z' },
        ],
      }),
    );

    const { result } = renderHook(() => useReviews('biz-real'), { wrapper: Providers });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.[0]).toEqual({
      id: 'u1_0',
      author: 'Customer', // the list endpoint has no display name; the hook substitutes one
      rating: 5,
      body: 'Great',
      createdAt: '2026-08-01T00:00:00Z',
    });
    expect(fetch).toHaveBeenCalled();
  });

  it('the demo fixtures satisfy the same types the API path produces', () => {
    // The compile-time guarantee, restated at runtime so the intent is visible in the suite: these
    // fixtures are MenuItem[] and Review[], not lookalikes. If someone reintroduces a local
    // `DemoMenuItem` shape, `tsc` fails before this does — this is the readable statement of why.
    const business = DEMO_BUSINESSES[0]!;
    for (const item of business.menu) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.priceCents).toBe('number');
    }
    for (const review of business.reviews) {
      expect(typeof review.rating).toBe('number');
      expect(typeof review.createdAt).toBe('string');
    }
  });
});
