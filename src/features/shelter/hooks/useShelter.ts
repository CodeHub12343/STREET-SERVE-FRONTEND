'use client';

/**
 * Shelter Partner Program data layer (Phase B).
 *
 * `useResidentCapabilities` returns `null` for everyone who isn't an enrolled resident — that null
 * is meaningful, not an error, and it's what every resident-aware surface branches on. Modelled as
 * a successful query returning null rather than a 404 so ordinary sellers don't see error states on
 * screens that merely check.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { AppApiError } from '@/lib/api/errors';
import { endpoints } from '@/lib/api/endpoints';
import { keys } from '@/lib/query/keys';
import { isMapDemo } from '@/lib/env';
import type {
  ClaimResult,
  CustodyLedger,
  EnrollResult,
  MyCustody,
  ResidentCapabilities,
  ShelterReport,
  TrainingAnswer,
  TrainingCourse,
  TrainingResult,
  TrainingStatus,
} from '../types';
import {
  demoClaim,
  demoCourse,
  demoCustody,
  demoCustodyLedger,
  demoResident,
  demoSubmitTraining,
  resetDemoShelter,
} from '../demo';

export { resetDemoShelter };

// ─── Resident ───────────────────────────────────────────────────────────────────────────────
export function useResidentCapabilities() {
  return useQuery<ResidentCapabilities | null>({
    queryKey: keys.residentMe,
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoResident())
        : api.get<ResidentCapabilities | null>(endpoints.residentMe),
    staleTime: isMapDemo ? Infinity : 30_000,
  });
}

export function useClaimEnrollment() {
  const qc = useQueryClient();
  return useMutation<ClaimResult, AppApiError, string>({
    mutationFn: (code) =>
      isMapDemo
        ? demoClaim(code)
        : api.post<ClaimResult>(endpoints.residentClaim, { code: code.trim().toUpperCase() }),
    onSuccess: () => {
      // Claiming grants the seller role and a verification tier, so almost every cached
      // capability read is now stale — including the user's own profile.
      void qc.invalidateQueries({ queryKey: keys.residentMe });
      void qc.invalidateQueries({ queryKey: keys.me });
      void qc.invalidateQueries({ queryKey: keys.myCredit });
    },
  });
}

// ─── Training (B-5) ─────────────────────────────────────────────────────────────────────────
export function useTrainingCourse() {
  return useQuery<TrainingCourse>({
    queryKey: [...keys.residentTraining, 'course'],
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoCourse())
        : api.get<TrainingCourse>(endpoints.residentTrainingCourse),
    // Versioned content that changes on deploy, not during a session.
    staleTime: Infinity,
  });
}

export function useTrainingStatus() {
  return useQuery<TrainingStatus>({
    queryKey: [...keys.residentTraining, 'status'],
    queryFn: () =>
      isMapDemo
        ? Promise.resolve({
            courseSlug: 'resident-starter',
            courseVersion: 'v1',
            passed: false,
            scorePercent: null,
            completedAt: null,
            passMark: 70,
          })
        : api.get<TrainingStatus>(endpoints.residentTrainingStatus),
    staleTime: 15_000,
  });
}

export function useSubmitTraining() {
  const qc = useQueryClient();
  return useMutation<TrainingResult, AppApiError, TrainingAnswer[]>({
    mutationFn: (answers) =>
      isMapDemo
        ? demoSubmitTraining(answers)
        : api.post<TrainingResult>(endpoints.residentTrainingSubmit, { answers }),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: keys.residentTraining });
      // Passing lifts the checkout gate, so the capability matrix changed.
      if (result.passed) void qc.invalidateQueries({ queryKey: keys.residentMe });
    },
  });
}

// ─── Custody (B-3) ──────────────────────────────────────────────────────────────────────────
export function useMyCustody() {
  return useQuery<MyCustody>({
    queryKey: keys.residentCustody,
    queryFn: () =>
      isMapDemo ? Promise.resolve(demoCustody()) : api.get<MyCustody>(endpoints.residentCustody),
    staleTime: isMapDemo ? Infinity : 20_000,
  });
}

export function useAcknowledgeCustody() {
  const qc = useQueryClient();
  return useMutation<{ id: string; acknowledged: boolean }, AppApiError, string>({
    mutationFn: (id) =>
      isMapDemo
        ? Promise.resolve({ id, acknowledged: true })
        : api.post<{ id: string; acknowledged: boolean }>(endpoints.residentCustodyAck(id)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.residentCustody }),
  });
}

// ─── Staff console ──────────────────────────────────────────────────────────────────────────
export function useEnrollResident(partnerId: string) {
  const qc = useQueryClient();
  return useMutation<
    EnrollResult,
    AppApiError,
    { cosignedAllocationCents: number; staffVerifierName: string }
  >({
    mutationFn: (input) =>
      api.post<EnrollResult>(endpoints.shelterPartner(partnerId).enrollments, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.shelterReport(partnerId) }),
  });
}

export function useCustodyLedger(partnerId: string, status?: 'held' | 'disbursed') {
  return useQuery<CustodyLedger>({
    queryKey: [...keys.shelterCustody(partnerId), status ?? 'all'],
    enabled: Boolean(partnerId),
    queryFn: () =>
      isMapDemo
        ? Promise.resolve(demoCustodyLedger(partnerId))
        : api.get<CustodyLedger>(endpoints.shelterPartner(partnerId).custody, {
            query: status ? { status } : undefined,
          }),
    staleTime: 15_000,
  });
}

export function useDisburseCustody(partnerId: string) {
  const qc = useQueryClient();
  return useMutation<
    { id: string; status: string; amountCents: number },
    AppApiError,
    { custodyId: string; method: 'cash' | 'in_kind' | 'stored'; note?: string }
  >({
    mutationFn: ({ custodyId, method, note }) =>
      api.post(endpoints.shelterPartner(partnerId).disburse(custodyId), { method, note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.shelterCustody(partnerId) });
      void qc.invalidateQueries({ queryKey: keys.shelterReport(partnerId) });
    },
  });
}

export function useShelterReport(partnerId: string) {
  return useQuery<ShelterReport>({
    queryKey: keys.shelterReport(partnerId),
    enabled: Boolean(partnerId),
    queryFn: () => api.get<ShelterReport>(endpoints.shelterPartner(partnerId).reporting),
    staleTime: 30_000,
  });
}
