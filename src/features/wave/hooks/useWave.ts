'use client';

/**
 * Wave-down data layer (SCREEN_TO_API_MAPPING.md §3). Create → waiting; the vendor's accept/decline
 * and arrival arrive over the /queue + /notifications sockets. In demo mode a client state machine
 * simulates the vendor accepting then arriving, so the flow is walkable end-to-end offline.
 */
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type { CreateWaveInput, WaveDown, WaveStatus } from '../types';

const SLA_SECONDS = 300;

/** Backend wave status → the UI's WaveStatus ('pending' is presented as 'waiting'). */
function mapWaveStatus(s: string): WaveStatus {
  return s === 'pending' ? 'waiting' : (s as WaveStatus);
}

export function useCreateWave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateWaveInput): Promise<WaveDown> => {
      if (isMapDemo) {
        return {
          id: `wave_${Date.now()}`,
          businessId: input.businessId,
          businessName: input.businessName,
          status: 'waiting',
          slaDeadline: new Date(Date.now() + SLA_SECONDS * 1000).toISOString(),
        };
      }
      // Backend CreateWaveDownBody expects { targetType, targetId, note? } — map from the UI's
      // business-centric input (a wave here always targets a business). The response is
      // { id, status, expiresAt }, so merge the display fields from input and map status/deadline.
      const res = await api.post<{
        id: string;
        status: string;
        expiresAt: string;
        feeLines?: { label: string; amountCents: number }[];
        totalFeeCents?: number;
      }>(endpoints.waveDowns, {
        targetType: 'business',
        targetId: input.businessId,
        note: input.note,
      });
      return {
        id: res.id,
        businessId: input.businessId,
        businessName: input.businessName,
        status: mapWaveStatus(res.status),
        slaDeadline: res.expiresAt,
        feeLines: res.feeLines,
        totalFeeCents: res.totalFeeCents,
      };
    },
    onSuccess: (wave) => qc.setQueryData(keys.wave(wave.id), wave),
  });
}

/** Backend GET /wave-downs/:id shape (queueService.getWaveDown). */
interface RawWave {
  id: string;
  targetId: string;
  targetName?: string | null;
  status: string;
  expiresAt: string;
  etaSeconds?: number | null;
  /** §32.4 fee disclosure, carried on the wave so the tracker keeps showing it until payment. */
  feeLines?: { label: string; amountCents: number }[];
  totalFeeCents?: number;
}

/** Non-terminal statuses still worth polling — a waiting wave can be accepted, an accepted one arrives. */
const LIVE_STATUSES: readonly WaveStatus[] = ['waiting', 'accepted'];

export function useWave(id: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: keys.wave(id ?? 'none'),
    enabled: Boolean(id),
    // The previous implementation only read a static cache seeded at creation, so the customer's
    // tracker never saw the vendor accept — it sat on "waiting" forever. Poll the real endpoint and
    // merge onto the display fields (businessName from the cache, or targetName on a cold load).
    queryFn: async (): Promise<WaveDown | null> => {
      const cached = qc.getQueryData<WaveDown>(keys.wave(id!));
      if (isMapDemo) return cached ?? null;
      const res = await api.get<RawWave>(endpoints.waveDown(id!));
      return {
        id: res.id,
        businessId: res.targetId,
        businessName: cached?.businessName || res.targetName || 'the vendor',
        status: mapWaveStatus(res.status),
        slaDeadline: res.expiresAt,
        etaSeconds: res.etaSeconds ?? cached?.etaSeconds,
        discountPercent: cached?.discountPercent,
        reason: cached?.reason,
        feeLines: res.feeLines ?? cached?.feeLines,
        totalFeeCents: res.totalFeeCents ?? cached?.totalFeeCents,
      };
    },
    initialData: () => qc.getQueryData<WaveDown>(keys.wave(id ?? 'none')),
    // Poll while the wave can still change; stop once it reaches a terminal state.
    refetchInterval: (q) =>
      !isMapDemo && q.state.data && LIVE_STATUSES.includes(q.state.data.status) ? 3000 : false,
    staleTime: isMapDemo ? Infinity : 0,
  });

  const data = query.data;

  // Demo state machine: waiting → accepted (5s) → arrived (8s more).
  useEffect(() => {
    if (!isMapDemo || !id || !data) return;
    if (data.status === 'waiting') {
      const t = setTimeout(() => {
        qc.setQueryData<WaveDown>(keys.wave(id), (p) =>
          p ? { ...p, status: 'accepted', etaSeconds: 180, discountPercent: 15 } : p,
        );
      }, 5000);
      return () => clearTimeout(t);
    }
    if (data.status === 'accepted') {
      const t = setTimeout(() => {
        qc.setQueryData<WaveDown>(keys.wave(id), (p) => (p ? { ...p, status: 'arrived' } : p));
      }, 8000);
      return () => clearTimeout(t);
    }
    // Re-schedule only when the status transitions — not on every cache patch (would reset the timer).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status, id, qc]);

  return query;
}

export function useCancelWave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (isMapDemo ? Promise.resolve() : api.del(endpoints.waveDown(id))),
    onSuccess: (_r, id) => qc.removeQueries({ queryKey: keys.wave(id) }),
  });
}
