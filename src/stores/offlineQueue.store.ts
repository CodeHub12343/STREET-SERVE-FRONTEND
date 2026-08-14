/**
 * Offline action queue (PWA_IMPLEMENTATION.md §5) — persisted so seller QR checkouts/sales survive
 * a reload while offline. Each item carries its Idempotency-Key so replay on reconnect can't
 * double-charge or double-decrement inventory (§3). Only inventory actions with server-side oversell
 * guards queue; card payments stay online-only.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type QueuedKind = 'checkout' | 'sale';
export type QueuedStatus = 'queued' | 'syncing' | 'synced' | 'failed';

export interface QueuedAction {
  id: string;
  kind: QueuedKind;
  label: string;
  endpoint: string;
  body: unknown;
  idempotencyKey: string;
  createdAt: string;
  status: QueuedStatus;
}

interface QueueState {
  items: QueuedAction[];
  enqueue: (a: Omit<QueuedAction, 'id' | 'createdAt' | 'status'>) => void;
  setStatus: (id: string, status: QueuedStatus) => void;
  remove: (id: string) => void;
}

export const useOfflineQueueStore = create<QueueState>()(
  persist(
    (set) => ({
      items: [],
      enqueue: (a) =>
        set((s) => ({
          items: [
            ...s.items,
            { ...a, id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date().toISOString(), status: 'queued' },
          ],
        })),
      setStatus: (id, status) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, status } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    }),
    { name: 'ss-offline-queue' },
  ),
);
