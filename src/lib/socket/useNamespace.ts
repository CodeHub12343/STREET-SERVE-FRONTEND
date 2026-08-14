'use client';

/**
 * Joins a room on mount and leaves on unmount, re-joining on reconnect
 * (REALTIME_IMPLEMENTATION.md §3). Room authorization is re-checked server-side on every join.
 *
 * Usage:
 *   useRoom('queue:subscribe', { ownerId }, {
 *     'queue:update': (p) => queryClient.setQueryData(keys.queue(ownerId), ...),
 *   });
 */
import { useEffect } from 'react';
import { useSocket } from './SocketProvider';

type Handlers = Record<string, (payload: never) => void>;

export function useRoom(
  subscribeEvent: string,
  subscribePayload: Record<string, unknown>,
  handlers: Handlers,
  unsubscribeEvent?: string,
): void {
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const join = () => socket.emit(subscribeEvent, subscribePayload);

    // (Re)join on every (re)connect so a dropped socket restores subscriptions.
    if (connected) join();
    socket.on('connect', join);

    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler as (payload: unknown) => void);
    }

    return () => {
      socket.off('connect', join);
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event, handler as (payload: unknown) => void);
      }
      if (unsubscribeEvent) socket.emit(unsubscribeEvent, subscribePayload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, subscribeEvent, unsubscribeEvent, JSON.stringify(subscribePayload)]);
}
