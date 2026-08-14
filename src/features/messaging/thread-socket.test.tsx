import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { keys } from '@/lib/query/keys';
import type { Message } from './types';

/**
 * Live delivery: the other side's replies must land in an open thread without a refetch — and my
 * own echo must NOT double the optimistic bubble I already show.
 */

// A fake socket.io client whose handlers we can fire on demand.
const handlers = new Map<string, (payload: unknown) => void>();
const emitted: Array<[string, unknown]> = [];
const fakeSocket = {
  on: (event: string, cb: (payload: unknown) => void) => handlers.set(event, cb),
  emit: (event: string, payload: unknown) => emitted.push([event, payload]),
  disconnect: vi.fn(),
};
vi.mock('socket.io-client', () => ({ io: () => fakeSocket }));
vi.mock('@/lib/env', () => ({ isMapDemo: false, isAuthConfigured: true, env: { socketUrl: 'http://x' } }));
vi.mock('@/lib/auth/useAuthCompat', () => ({
  API_JWT_TEMPLATE: 'streetserve-api',
  useAuthCompat: () => ({ isSignedIn: true, getToken: async () => 't' }),
}));
vi.mock('@/lib/auth/useMe', () => ({ useMe: () => ({ principal: { userId: 'me_1' } }) }));

import { useThreadSocket } from './hooks/useThreadSocket';

let qc: QueryClient;
function wrapper() {
  qc = new QueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

function fireMessage(e: { id: string; threadId: string; senderId: string; body: string }) {
  handlers.get('message:new')?.(e);
}
function fireRead(e: { threadId: string; readerId: string; at: string }) {
  handlers.get('message:read')?.(e);
}

beforeEach(() => {
  handlers.clear();
  emitted.length = 0;
});

describe('live thread delivery', () => {
  it('subscribes to the thread room with a bare id (server contract)', () => {
    renderHook(() => useThreadSocket('thread_1', () => '2026-01-01T00:00:00Z'), { wrapper: wrapper() });
    handlers.get('connect')?.(undefined);
    expect(emitted).toContainEqual(['messages:subscribe', 'thread_1']);
  });

  it("appends the other person's message to the open thread", () => {
    renderHook(() => useThreadSocket('thread_1', () => '2026-01-01T00:00:00Z'), { wrapper: wrapper() });

    fireMessage({ id: 'm2', threadId: 'thread_1', senderId: 'them_9', body: 'on my way' });

    const msgs = qc.getQueryData<Message[]>(keys.thread('thread_1'));
    expect(msgs).toHaveLength(1);
    expect(msgs![0]).toMatchObject({ id: 'm2', body: 'on my way', from: 'them' });
  });

  it('ignores the echo of my own message (already shown optimistically)', () => {
    renderHook(() => useThreadSocket('thread_1', () => 'x'), { wrapper: wrapper() });

    fireMessage({ id: 'm3', threadId: 'thread_1', senderId: 'me_1', body: 'hi' });

    expect(qc.getQueryData<Message[]>(keys.thread('thread_1')) ?? []).toHaveLength(0);
  });

  it('is idempotent if the same message is delivered twice', () => {
    renderHook(() => useThreadSocket('thread_1', () => 'x'), { wrapper: wrapper() });

    const e = { id: 'm4', threadId: 'thread_1', senderId: 'them_9', body: 'yo' };
    fireMessage(e);
    fireMessage(e);

    expect(qc.getQueryData<Message[]>(keys.thread('thread_1'))).toHaveLength(1);
  });

  it('ignores a message meant for a different thread', () => {
    renderHook(() => useThreadSocket('thread_1', () => 'x'), { wrapper: wrapper() });

    fireMessage({ id: 'm5', threadId: 'thread_OTHER', senderId: 'them_9', body: 'nope' });

    expect(qc.getQueryData<Message[]>(keys.thread('thread_1')) ?? []).toHaveLength(0);
  });

  it('flips my delivered messages to Seen when the other side reads the thread', () => {
    renderHook(() => useThreadSocket('thread_1', () => 'x'), { wrapper: wrapper() });
    // Two of my messages sit unread; the other side's read event marks them both.
    qc.setQueryData<Message[]>(keys.thread('thread_1'), [
      { id: 'a', threadId: 'thread_1', from: 'me', body: 'hi', at: 't1' },
      { id: 'b', threadId: 'thread_1', from: 'me', body: 'you there?', at: 't2' },
    ]);

    fireRead({ threadId: 'thread_1', readerId: 'them_9', at: '2026-01-02T00:00:00Z' });

    const msgs = qc.getQueryData<Message[]>(keys.thread('thread_1'))!;
    expect(msgs.every((m) => m.readAt === '2026-01-02T00:00:00Z')).toBe(true);
  });

  it('ignores my own read event (it never marks my own messages seen)', () => {
    renderHook(() => useThreadSocket('thread_1', () => 'x'), { wrapper: wrapper() });
    qc.setQueryData<Message[]>(keys.thread('thread_1'), [
      { id: 'a', threadId: 'thread_1', from: 'me', body: 'hi', at: 't1' },
    ]);

    fireRead({ threadId: 'thread_1', readerId: 'me_1', at: '2026-01-02T00:00:00Z' });

    expect(qc.getQueryData<Message[]>(keys.thread('thread_1'))![0]!.readAt).toBeUndefined();
  });
});
