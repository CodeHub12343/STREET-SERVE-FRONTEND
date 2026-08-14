'use client';

/**
 * Live delivery for an open thread (REALTIME_IMPLEMENTATION.md §5). Joins the `/messages` namespace
 * room `thread:<id>` and appends incoming `message:new` events to the thread cache, so the other
 * side's replies arrive without a refetch. REST still owns history + authorization; this only
 * pushes deltas.
 *
 * Only the OTHER participant's messages are appended here — your own are already shown optimistically
 * by useSendMessage, and the server echoes `message:new` to every room member including you.
 */
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { env, isAuthConfigured, isMapDemo } from '@/lib/env';
import { API_JWT_TEMPLATE, useAuthCompat } from '@/lib/auth/useAuthCompat';
import { useMe } from '@/lib/auth/useMe';
import { keys } from '@/lib/query/keys';
import type { Message } from '../types';

interface MessageNewEvent {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
}

interface MessageReadEvent {
  threadId: string;
  readerId: string;
  at: string;
}

export function useThreadSocket(threadId: string, nowIso: () => string = () => new Date().toISOString()) {
  const qc = useQueryClient();
  const { isSignedIn, getToken } = useAuthCompat();
  const { principal } = useMe();

  // Refs so the long-lived socket handler always sees the current values without reconnecting.
  const myIdRef = useRef<string | undefined>(principal?.userId);
  myIdRef.current = principal?.userId;
  const threadRef = useRef(threadId);
  threadRef.current = threadId;

  useEffect(() => {
    if (isMapDemo || !isAuthConfigured || !isSignedIn) return;

    const socket: Socket = io(`${env.socketUrl}/messages`, {
      transports: ['websocket'],
      auth: (cb: (data: { token: string | null }) => void) => {
        void getToken({ template: API_JWT_TEMPLATE }).then((token) => cb({ token }));
      },
    });

    // The server's join handler expects the threadId as a bare string, not an object.
    // The presence ping (repeated below) marks me online while this thread is open.
    const subscribe = () => {
      socket.emit('messages:subscribe', threadRef.current);
      socket.emit('presence:ping');
    };
    socket.on('connect', subscribe);
    // Heartbeat: refresh my presence TTL so I don't flip to "offline" while sitting in a thread.
    const heartbeat = setInterval(() => socket.emit('presence:ping'), 25_000);

    socket.on('message:new', (e: MessageNewEvent) => {
      if (e.threadId !== threadRef.current) return;
      // My own message is already on screen (optimistic + POST) — skip the echo to avoid a double.
      if (e.senderId === myIdRef.current) return;
      qc.setQueryData<Message[]>(keys.thread(threadRef.current), (prev) => {
        if (prev?.some((m) => m.id === e.id)) return prev; // idempotent on redelivery
        return [...(prev ?? []), { id: e.id, threadId: e.threadId, from: 'them', body: e.body, at: nowIso() }];
      });
      // Keep the inbox preview + unread badge honest for when the user backs out.
      void qc.invalidateQueries({ queryKey: keys.threadsMine });
    });

    // The other participant opened/read the thread → flip MY delivered messages to "Seen" live.
    socket.on('message:read', (e: MessageReadEvent) => {
      if (e.threadId !== threadRef.current) return;
      if (e.readerId === myIdRef.current) return; // my own read doesn't mark my messages seen
      qc.setQueryData<Message[]>(keys.thread(threadRef.current), (prev) =>
        (prev ?? []).map((m) => (m.from === 'me' && !m.readAt ? { ...m, readAt: e.at } : m)),
      );
    });

    return () => {
      clearInterval(heartbeat);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, threadId]);
}
