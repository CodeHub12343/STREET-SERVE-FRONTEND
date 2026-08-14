'use client';

/**
 * F-4 — Stock Protection status.
 *
 * Reads the SAME computation the liability path enforces, so a seller can never be shown a cover
 * state that disagrees with the code deciding whether to charge them.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';

export interface WaiverStatus {
  active: boolean;
  /** Bought, but inside the waiting period — see the backend's adverse-selection note. */
  waiting: boolean;
  activeFrom: string | null;
  perIncidentCapCents: number;
  periodCapCents: number;
  periodDays: number;
  usedThisPeriodCents: number;
  remainingThisPeriodCents: number;
  reason: string | null;
}

const DEMO: WaiverStatus = {
  active: true,
  waiting: false,
  activeFrom: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  perIncidentCapCents: 15_000,
  periodCapCents: 30_000,
  periodDays: 30,
  usedThisPeriodCents: 4_000,
  remainingThisPeriodCents: 26_000,
  reason: null,
};

export function useWaiverStatus() {
  return useQuery<WaiverStatus>({
    queryKey: keys.waiverStatus,
    queryFn: () =>
      isMapDemo ? Promise.resolve(DEMO) : api.get<WaiverStatus>(endpoints.waiverStatus),
    staleTime: isMapDemo ? Infinity : 60_000,
  });
}
