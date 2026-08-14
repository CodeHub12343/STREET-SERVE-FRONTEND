'use client';

/**
 * Queue data layer (SCREEN_TO_API_MAPPING.md §3). Join/leave + live position via the /queue socket
 * (queue:update, popup:delay). In demo mode a client timer advances the position to "your turn" so
 * the flow completes offline. Position/discount are server-authoritative; the client only renders.
 */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import { findDemoBusiness } from '@/lib/demo';
import type { QueueMembership } from '../types';

const HOLD_SECONDS = 900; // 15-minute geofence hold (FR-3.4)

export function useJoinQueue(ownerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<QueueMembership> => {
      if (isMapDemo) {
        const biz = findDemoBusiness(ownerId);
        const position = (biz?.queue.count ?? 3) + 1;
        const tier = biz?.queue.schedule.find((s) => s.position === position) ?? biz?.queue.schedule.at(-1);
        return Promise.resolve({
          ownerId,
          businessName: biz?.name ?? 'Business',
          position,
          aheadCount: position - 1,
          nowServing: Math.max(0, position - (biz?.queue.count ?? 0)),
          discountPercent: tier?.percent ?? 10,
          cap: biz?.queue.cap ?? 20,
          schedule: biz?.queue.schedule ?? [],
          holdDeadline: new Date(Date.now() + HOLD_SECONDS * 1000).toISOString(),
          status: 'in_line',
        });
      }
      return api.post<QueueMembership>(endpoints.queue(ownerId).join);
    },
    onSuccess: (m) => qc.setQueryData(keys.queueMe(ownerId), m),
  });
}

export function useQueueMembership(ownerId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: keys.queueMe(ownerId ?? 'none'),
    enabled: Boolean(ownerId),
    // Demo memberships exist only client-side — resolve from cache (null = not in line yet)
    // instead of hitting a backend that doesn't know this session.
    queryFn: (): Promise<QueueMembership | null> =>
      isMapDemo
        ? Promise.resolve(qc.getQueryData<QueueMembership>(keys.queueMe(ownerId ?? 'none')) ?? null)
        : // GET /queues/business/:id/me returns the caller's membership, or null if not in line.
          api.get<QueueMembership | null>(endpoints.queue(ownerId!).me),
    staleTime: Infinity,
  });
  const data = query.data;

  // Demo: advance the line every 6s until it's the customer's turn.
  useEffect(() => {
    if (!isMapDemo || !ownerId || !data || data.status === 'your_turn') return;
    const t = setTimeout(() => {
      qc.setQueryData<QueueMembership>(keys.queueMe(ownerId), (p) => {
        if (!p) return p;
        const position = p.position - 1;
        const nowServing = p.nowServing + 1;
        return position <= 1
          ? { ...p, position: 1, aheadCount: 0, nowServing, status: 'your_turn' }
          : { ...p, position, aheadCount: position - 1, nowServing };
      });
    }, 6000);
    return () => clearTimeout(t);
    // Re-schedule only when position/status change — not on every cache patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.position, data?.status, ownerId, qc]);

  return query;
}

export function useLeaveQueue(ownerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => (isMapDemo ? Promise.resolve() : api.del(endpoints.queue(ownerId).leave)),
    onSuccess: () => qc.removeQueries({ queryKey: keys.queueMe(ownerId) }),
  });
}
