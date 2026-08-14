import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * The receiver-sees-nothing bug. Root cause: GET /users/me returns `{ id }`, but the Principal
 * contract is `{ userId }`, so `principal.userId` was silently undefined. useThread gates on that
 * id to attribute each bubble, so with it missing the message query never ran and the receiver
 * opened an EMPTY thread — while the sender still saw their own optimistic bubble.
 */

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/env', () => ({ isMapDemo: false, isAuthConfigured: true }));
vi.mock('@/lib/api/client', () => ({ api: { get, post: vi.fn() } }));

// A signed-in principal whose id comes back from the API as `id` (the real wire shape).
const authState = { isSignedIn: true, isLoaded: true };
vi.mock('@/lib/auth/useAuthCompat', () => ({
  API_JWT_TEMPLATE: 'streetserve-api',
  useAuthCompat: () => authState,
}));

import { useMe } from '@/lib/auth/useMe';
import { useThread } from './hooks/useMessaging';

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

beforeEach(() => vi.clearAllMocks());

describe('principal identity mapping', () => {
  it('maps the API `id` onto the Principal `userId` the app reads', async () => {
    get.mockResolvedValueOnce({ id: 'user_B', displayName: 'Bee', roles: ['customer'], verificationTier: 'bronze', status: 'active' });

    const { result } = renderHook(() => useMe(), { wrapper: wrapper() });

    // Without the mapping this is undefined — and every downstream `principal.userId` read breaks.
    await waitFor(() => expect(result.current.principal?.userId).toBe('user_B'));
    expect(result.current.principal?.name).toBe('Bee');
  });
});

describe('opening a thread as the receiver', () => {
  it('shows the message the other person sent, attributed to them', async () => {
    // /users/me → I am user_B; the thread's message was sent by user_A.
    get.mockImplementation((path: string) => {
      if (path.endsWith('/me') || path.includes('/users/me')) {
        return Promise.resolve({ id: 'user_B', roles: ['customer'], verificationTier: 'bronze', status: 'active' });
      }
      return Promise.resolve([
        { id: 'm1', senderId: 'user_A', body: 'hello, how are you doing', createdAt: '2026-07-17T15:54:00Z', readAt: null },
      ]);
    });

    const { result } = renderHook(
      () => {
        useMe(); // resolves the principal so useThread's id gate opens
        return useThread('thread_1');
      },
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.data?.length).toBe(1));
    const msg = result.current.data![0]!;
    expect(msg.body).toBe('hello, how are you doing');
    // The receiver did not send it, so it must render on the "them" side, not "me".
    expect(msg.from).toBe('them');
  });

  it('attributes my own messages to me', async () => {
    get.mockImplementation((path: string) => {
      if (path.endsWith('/users/me') || path.endsWith('/me')) {
        return Promise.resolve({ id: 'user_A', roles: ['customer'], verificationTier: 'bronze', status: 'active' });
      }
      return Promise.resolve([
        { id: 'm1', senderId: 'user_A', body: 'hello', createdAt: '2026-07-17T15:54:00Z', readAt: null },
      ]);
    });

    const { result } = renderHook(
      () => {
        useMe();
        return useThread('thread_1');
      },
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.data?.length).toBe(1));
    expect(result.current.data![0]!.from).toBe('me');
  });
});
