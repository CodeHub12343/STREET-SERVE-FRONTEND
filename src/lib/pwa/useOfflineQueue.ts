'use client';

/**
 * Offline queue flushing (PWA_IMPLEMENTATION.md §5). On reconnect, replays queued actions with
 * their original Idempotency-Key so a replay is a no-op if the server already applied it. In demo
 * mode replay is simulated. Oversell conflicts (409) surface as a failed item, not a silent drop.
 */
import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { AppApiError } from '@/lib/api/errors';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { useOfflineQueueStore } from '@/stores/offlineQueue.store';
import { useOnlineStatus } from './useOnlineStatus';

export function useOfflineQueue() {
  const online = useOnlineStatus();
  const qc = useQueryClient();
  const items = useOfflineQueueStore((s) => s.items);
  const setStatus = useOfflineQueueStore((s) => s.setStatus);
  const remove = useOfflineQueueStore((s) => s.remove);

  const flush = useCallback(async () => {
    const queued = useOfflineQueueStore.getState().items.filter((i) => i.status === 'queued' || i.status === 'failed');
    for (const item of queued) {
      setStatus(item.id, 'syncing');
      try {
        if (!isMapDemo) {
          await api.post(item.endpoint, item.body, { idempotencyKey: item.idempotencyKey });
        }
        setStatus(item.id, 'synced');
        setTimeout(() => remove(item.id), 1500);
        void qc.invalidateQueries({ queryKey: keys.checkoutsMine });
      } catch (e) {
        setStatus(item.id, 'failed');
        if (e instanceof AppApiError && e.isOversell) {
          // Leave it visible so the seller can reconcile the conflict.
        }
      }
    }
  }, [qc, setStatus, remove]);

  // Auto-flush when connectivity returns.
  useEffect(() => {
    if (online && items.some((i) => i.status === 'queued' || i.status === 'failed')) {
      void flush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const pending = items.filter((i) => i.status !== 'synced').length;
  return { items, pending, flush, online };
}
