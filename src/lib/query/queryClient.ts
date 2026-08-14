/**
 * TanStack Query client defaults (STATE_MANAGEMENT.md §2.1). One client per browser session.
 * - never retry 4xx (validation/auth/business-rule are not transient)
 * - mutations never auto-retry — idempotency keys handle intent (PAYMENTS_IMPLEMENTATION.md §3)
 */
import { QueryClient } from '@tanstack/react-query';
import { AppApiError } from '@/lib/api/errors';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (error instanceof AppApiError && error.isClientError) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
