'use client';

/**
 * Live delivery for the notification inbox (REALTIME_IMPLEMENTATION.md §7).
 *
 * ## Why this exists
 *
 * The server half was complete and the client half was never written. `realtime/hub.ts` dispatches
 * to the `/notifications` namespace, room `user:<id>`, as `notify` and `wave:accepted` — and nothing
 * in the app ever opened that namespace. So the bell only ever changed when React Query happened to
 * refetch, which is why a phone had to be reloaded by hand to see anything new.
 *
 * `useRoom` could not be used: it multiplexes the ROOT-namespace socket from SocketProvider, and
 * notifications live on a child namespace, which is a separate connection. This mirrors
 * useThreadSocket, which already does exactly that for `/messages`.
 *
 * ## Rooms
 *
 * No join is emitted. The server joins `user:<principal.userId>` itself on connection, precisely so
 * a client cannot ask to be put in someone else's notification room.
 *
 * ## Catch-up on reconnect
 *
 * A phone suspends sockets whenever the screen locks or the PWA is backgrounded, and events
 * dispatched while disconnected are gone — Socket.IO replays nothing across a new connection. So
 * every (re)connect refetches the inbox, which is the durable record. Without this, coming back to
 * the app would show a stale bell that only a manual reload could fix — the reported symptom.
 */
import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { env, isAuthConfigured, isMapDemo } from '@/lib/env';
import { API_JWT_TEMPLATE, useAuthCompat } from '@/lib/auth/useAuthCompat';
import { keys } from '@/lib/query/keys';

export function useNotificationSocket(): void {
  const qc = useQueryClient();
  const { isSignedIn, getToken } = useAuthCompat();

  useEffect(() => {
    if (isMapDemo || !isAuthConfigured || !isSignedIn) return;

    const socket: Socket = io(`${env.socketUrl}/notifications`, {
      transports: ['websocket'],
      auth: (cb: (data: { token: string | null }) => void) => {
        void getToken({ template: API_JWT_TEMPLATE }).then((token) => cb({ token }));
      },
    });

    /**
     * Refetch rather than push the payload into the cache.
     *
     * The socket payload is the dispatch shape, not the inbox row shape — it has no id and no
     * `read` flag, so a row built from it could not be marked read or de-duplicated against the
     * same notification arriving from GET. The inbox is the authority; the event is only a signal
     * that it changed. One extra request per notification is a fair price for never rendering a
     * row the rest of the UI cannot act on.
     */
    const refresh = () => void qc.invalidateQueries({ queryKey: keys.notifications });

    socket.on('connect', refresh);
    socket.on('notify', refresh);
    // Dispatched on its own event rather than through `notify` (hub.ts), so it needs its own listener
    // — a customer whose wave was accepted is exactly who must not wait for a poll.
    socket.on('wave:accepted', refresh);

    return () => {
      socket.off('connect', refresh);
      socket.off('notify', refresh);
      socket.off('wave:accepted', refresh);
      socket.disconnect();
    };
  }, [qc, isSignedIn, getToken]);
}
