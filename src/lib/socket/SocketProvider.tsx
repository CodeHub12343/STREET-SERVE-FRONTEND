'use client';

/**
 * Owns the single Socket.IO connection lifecycle (REALTIME_IMPLEMENTATION.md §2). Connects only
 * when authenticated + configured; disconnects on sign-out. Exposes the socket + connection
 * status via context. Namespaced/room subscriptions are managed per-screen by useNamespace.
 *
 * Uses useAuthCompat so it works with or without Clerk configured (idle when signed out).
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { API_JWT_TEMPLATE, useAuthCompat } from '@/lib/auth/useAuthCompat';
import { makeSocket, type AppSocket } from './io';

interface SocketContextValue {
  socket: AppSocket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, getToken } = useAuthCompat();
  const socketRef = useRef<AppSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;

    const socket = makeSocket(() => getToken({ template: API_JWT_TEMPLATE }));
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isSignedIn, getToken]);

  const value = useMemo<SocketContextValue>(
    () => ({ socket: socketRef.current, connected }),
    [connected],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
