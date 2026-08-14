'use client';

/**
 * Messaging data layer (SCREEN_TO_API_MAPPING.md §5). Thread list + history; sends are optimistic
 * (append with a pending flag, reconcile on message:new). Live delivery arrives on the /messages
 * socket in production; demo mode appends + simulates a reply so threads feel alive offline.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { demoMessages, demoThreads, findDemoBusiness } from '@/lib/demo';
import { useMe } from '@/lib/auth/useMe';
import type { Message, Thread } from '../types';

/** Raw GET /message-threads/mine row (messaging.service) — differs from the UI's Thread. */
interface RawThread {
  id: string;
  customerId: string;
  businessId: string;
  businessName: string;
  counterpartyName: string;
  counterpartyAvatarUrl: string | null;
  counterpartyId: string | null;
  counterpartyOnline: boolean;
  counterpartyLastSeen: string | null;
  lastMessage: string;
  lastMessageAt: string | null;
  unread: number;
  side: 'customer' | 'business';
}

/** Raw GET /message-threads/:id/messages row — principal-neutral, so `from` is derived here. */
interface RawMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

function toThread(t: RawThread): Thread {
  return {
    id: t.id,
    businessId: t.businessId,
    businessName: t.businessName,
    counterpartyName: t.counterpartyName,
    avatarUrl: t.counterpartyAvatarUrl,
    counterpartyId: t.counterpartyId,
    online: t.counterpartyOnline,
    lastSeen: t.counterpartyLastSeen,
    lastMessage: t.lastMessage,
    lastAt: t.lastMessageAt ?? '',
    unread: t.unread,
  };
}

export function useThreads() {
  return useQuery<Thread[]>({
    queryKey: keys.threadsMine,
    queryFn: () =>
      isMapDemo
        ? // Demo has no vendor side, so the counterparty is always the business; borrow its logo and
          // show it as online so the presence UI has something to render.
          Promise.resolve(
            demoThreads().map((t) => ({
              ...t,
              counterpartyName: t.businessName,
              avatarUrl: findDemoBusiness(t.businessId)?.logoUrl ?? null,
              counterpartyId: t.businessId,
              online: true,
              lastSeen: null,
            })),
          )
        : api.get<RawThread[]>(endpoints.messageThreadsMine).then((rows) => rows.map(toThread)),
    staleTime: isMapDemo ? Infinity : 15_000,
    // Keep presence + last-message fresh while the inbox/thread is open (no effect in demo).
    refetchInterval: isMapDemo ? false : 25_000,
  });
}

export function useThread(threadId: string) {
  const qc = useQueryClient();
  // The API returns senderId (principal-neutral, cacheable); which side a bubble sits on is a
  // question only the reader can answer, so it's resolved here rather than on the server.
  const { principal } = useMe();
  const myId = principal?.userId;

  return useQuery<Message[]>({
    queryKey: keys.thread(threadId),
    // Without my id every bubble would render as 'them' — wait for it rather than lie.
    enabled: isMapDemo || Boolean(myId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoMessages(threadId))
        : api.get<RawMessage[]>(endpoints.threadMessages(threadId)).then((rows) =>
            rows.map(
              (m): Message => ({
                id: m.id,
                threadId,
                from: m.senderId === myId ? 'me' : 'them',
                body: m.body,
                at: m.createdAt,
                readAt: m.readAt,
              }),
            ),
          ),
    initialData: () => qc.getQueryData<Message[]>(keys.thread(threadId)),
    staleTime: isMapDemo ? Infinity : 10_000,
  });
}

/**
 * Clear this thread's unread badge. Reading a conversation is what marks it read — without this
 * the inbox's unread count would never fall back to zero.
 */
export function useMarkThreadRead(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => (isMapDemo ? Promise.resolve() : api.post(endpoints.threadRead(threadId))),
    onSuccess: () => {
      qc.setQueryData<Thread[]>(keys.threadsMine, (prev) =>
        (prev ?? []).map((t) => (t.id === threadId ? { ...t, unread: 0 } : t)),
      );
    },
  });
}

/**
 * Open the thread with a business — POST /message-threads is an idempotent upsert keyed on
 * (customer, business), so tapping Message twice reopens the same conversation instead of
 * spawning a duplicate.
 */
export function useStartThread() {
  const qc = useQueryClient();
  return useMutation({
    // customerId is the vendor-initiated path: the business owner opening the conversation with a
    // customer (e.g. from a booking card). Without it, the caller is the customer.
    mutationFn: (input: { businessId: string; customerId?: string }): Promise<{ id: string }> => {
      if (isMapDemo) {
        const existing = demoThreads().find((t) => t.businessId === input.businessId);
        return Promise.resolve({ id: existing?.id ?? `th_${input.businessId}` });
      }
      return api.post<{ id: string }>(endpoints.messageThreads, {
        businessId: input.businessId,
        ...(input.customerId ? { customerId: input.customerId } : {}),
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.threadsMine }),
  });
}

export function useSendMessage(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => (isMapDemo ? Promise.resolve() : api.post(endpoints.threadMessages(threadId), { body })),
    onMutate: (body) => {
      const optimistic: Message = { id: `tmp_${Date.now()}`, threadId, from: 'me', body, at: new Date().toISOString(), pending: true };
      qc.setQueryData<Message[]>(keys.thread(threadId), (prev) => [...(prev ?? []), optimistic]);
      return { optimistic };
    },
    onSuccess: (_r, _body, ctx) => {
      // Confirm the optimistic message.
      qc.setQueryData<Message[]>(keys.thread(threadId), (prev) =>
        (prev ?? []).map((m) => (m.id === ctx?.optimistic.id ? { ...m, pending: false } : m)),
      );
      // Demo: simulate a reply so the conversation continues.
      if (isMapDemo) {
        setTimeout(() => {
          qc.setQueryData<Message[]>(keys.thread(threadId), (prev) => [
            ...(prev ?? []),
            { id: `r_${Date.now()}`, threadId, from: 'them', body: 'Got it — see you soon! 👋', at: new Date().toISOString() },
          ]);
        }, 1500);
      }
    },
  });
}
