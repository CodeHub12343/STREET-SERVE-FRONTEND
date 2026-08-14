'use client';

/**
 * The geohash-cell live subscription (REALTIME_IMPLEMENTATION.md §4). Subscribes only to the cells
 * the viewport covers (bounded fan-out) on the /live namespace, and patches pin position/status
 * deltas directly into the active /map/nearby cache entry — never a parallel store
 * (STATE_MANAGEMENT.md §6). On reconnect it re-subscribes and re-baselines via REST.
 *
 * In demo mode it simulates movement so "live pins move" works with no backend.
 */
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { env, isAuthConfigured, isMapDemo } from '@/lib/env';
import { API_JWT_TEMPLATE, useAuthCompat } from '@/lib/auth/useAuthCompat';
import type { MapPinData, PinRemoveEvent, PinUpdateEvent } from '../types';

export function useLiveCells(activeKey: QueryKey, cells: string[], onReconnectRefetch: () => void) {
  const qc = useQueryClient();
  const { isSignedIn, getToken } = useAuthCompat();

  // Refs so handlers always see the latest key/cells without reconnecting.
  const keyRef = useRef(activeKey);
  keyRef.current = activeKey;
  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  const socketRef = useRef<Socket | null>(null);
  const cellsKey = cells.join(',');

  const patch = (updater: (prev: MapPinData[]) => MapPinData[]) =>
    qc.setQueryData<MapPinData[]>(keyRef.current, (prev) => updater(prev ?? []));

  // ---- Demo mode: simulate driving pins moving ----
  useEffect(() => {
    if (!isMapDemo) return;
    const id = setInterval(() => {
      patch((prev) =>
        prev.map((p) =>
          p.status === 'driving'
            ? {
                ...p,
                lngLat: [
                  p.lngLat[0] + (Math.random() - 0.5) * 0.0009,
                  p.lngLat[1] + (Math.random() - 0.5) * 0.0009,
                ],
                etaMin: Math.max(1, (p.etaMin ?? 3) + (Math.random() < 0.5 ? -1 : 1)),
              }
            : p,
        ),
      );
    }, 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Real mode: /live namespace socket ----
  useEffect(() => {
    if (isMapDemo || !isAuthConfigured || !isSignedIn) return;

    const socket: Socket = io(`${env.socketUrl}/live`, {
      transports: ['websocket'],
      auth: (cb: (data: { token: string | null }) => void) => {
        void getToken({ template: API_JWT_TEMPLATE }).then((token) => cb({ token }));
      },
    });
    socketRef.current = socket;

    const subscribe = () => socket.emit('live:subscribe', { cells: cellsRef.current });

    socket.on('connect', () => {
      subscribe();
      onReconnectRefetch(); // re-baseline authoritative state after (re)connect
    });
    socket.on('pin:update', (e: PinUpdateEvent) => {
      patch((prev) => {
        const idx = prev.findIndex((p) => p.sessionId === e.sessionId);
        if (idx < 0) return prev; // unknown session → next /map/nearby refetch fills it in
        const next = [...prev];
        next[idx] = { ...next[idx]!, lngLat: [e.lng, e.lat], status: e.status, etaMin: e.etaMin };
        return next;
      });
    });
    socket.on('pin:remove', (e: PinRemoveEvent) => {
      patch((prev) => prev.filter((p) => p.sessionId !== e.sessionId));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Re-subscribe when the visible cells change (pan/zoom). socket.io buffers emits until connected.
  useEffect(() => {
    if (isMapDemo) return;
    socketRef.current?.emit('live:subscribe', { cells: cellsRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellsKey]);
}
