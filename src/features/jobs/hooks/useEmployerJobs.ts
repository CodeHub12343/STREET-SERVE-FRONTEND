'use client';

/**
 * Employer side of the gig lifecycle (S-14). The worker half shipped complete; this half had no
 * screen at all — `POST /jobs` existed and was even in `endpoints.ts`, but nothing called it, so
 * jobs could only be created with curl and the board sat permanently empty.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Cents } from '@/types';
import type { Job, JobApplicationStatus } from '../types';

export interface PostedJob extends Job {
  applicantCount: number;
  paidOutCents: Cents;
}

export interface JobApplicant {
  id: string;
  jobId: string;
  status: JobApplicationStatus;
  applicantId: string;
  applicantName: string;
  applicantPhotoUrl: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  payoutCents: Cents;
}

export interface PostJobInput {
  title: string;
  description?: string;
  lng: number;
  lat: number;
  payCents: Cents;
  payUnit: 'flat' | 'hourly';
  startsAt?: string;
  durationHrs?: number;
  businessId?: string;
}

const postedKey = ['jobs', 'posted'] as const;

export function usePostedJobs() {
  return useQuery<PostedJob[]>({
    queryKey: postedKey,
    queryFn: () => api.get<PostedJob[]>(endpoints.jobsPosted),
    staleTime: 15_000,
  });
}

export function useJobApplicants(jobId: string | undefined) {
  return useQuery<JobApplicant[]>({
    queryKey: ['jobs', jobId ?? 'none', 'applicants'],
    enabled: Boolean(jobId),
    queryFn: () => api.get<JobApplicant[]>(endpoints.job(jobId!).applicants),
    staleTime: 15_000,
  });
}

export interface JobCheckInToken {
  jobId: string;
  token: string;
  expiresAt: string;
  rotateSeconds: number;
}

/**
 * The rotating on-site code the employer shows a worker whose GPS won't cooperate. Refetched ahead
 * of expiry so the displayed code is never stale — same contract as the hub station.
 */
export function useJobCheckInToken(jobId: string | undefined, enabled = true) {
  return useQuery<JobCheckInToken>({
    queryKey: ['jobs', jobId ?? 'none', 'qr'],
    enabled: Boolean(jobId) && enabled,
    queryFn: () => api.get<JobCheckInToken>(endpoints.job(jobId!).qr),
    refetchInterval: 20_000,
    staleTime: 0,
  });
}

export function usePostJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PostJobInput) => api.post<Job>(endpoints.jobs, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: postedKey });
      // A new gig belongs on the board immediately.
      void qc.invalidateQueries({ queryKey: ['jobs', 'nearby'] });
    },
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason?: string }) =>
      api.post(endpoints.job(jobId).cancel, { reason }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: postedKey }),
  });
}

/** Records that the worker never turned up, and puts the shift back on the board. */
export function useMarkNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => api.post(endpoints.job(jobId).noShow),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: postedKey });
      void qc.invalidateQueries({ queryKey: ['jobs', 'nearby'] });
    },
  });
}
