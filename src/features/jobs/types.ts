/**
 * Jobs / "Earn Today" (S-14, Flow 9). Mirrors the backend jobs.service views — `view()` for the
 * posting and `applicationView()` for the worker's claim on it. Money is integer cents; every
 * timestamp is an ISO string.
 */
import type { Cents, LngLat } from '@/types';

/** Flat fee for the whole gig, or a rate per hour on site. */
export type JobPayUnit = 'flat' | 'hourly';

/**
 * A-5: what KIND of work a gig is — the six shapes named in the "Earn Today" brief. Distinct from
 * `JobPayUnit`, which only says how it's priced. Mirrors the backend `JOB_TYPES`; the label list is
 * fetched from `/jobs/types` rather than hardcoded here, so adding a type server-side doesn't
 * silently leave the client offering five of six.
 */
export type JobType =
  | 'sell'
  | 'signage'
  | 'delivery'
  | 'sampling'
  | 'promotion'
  | 'event_staffing';

export interface JobTypeOption {
  key: JobType;
  label: string;
}

/** The posting's own lifecycle (jobs_postings.status). */
export type JobPostingStatus = 'open' | 'filled' | 'cancelled' | 'completed';

/**
 * The worker's lifecycle on a posting (job_applications.status). `cancelled` is the employer
 * pulling the gig after acceptance; `no_show` is the worker never arriving — different states
 * with different compensation policies, so they are never collapsed into one.
 */
export type JobApplicationStatus =
  | 'applied'
  | 'accepted'
  | 'checked_in'
  | 'completed'
  | 'no_show'
  | 'cancelled';

export interface JobApplication {
  id: string;
  jobId: string;
  status: JobApplicationStatus;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  /** Stripe transfer id once the same-day payout lands; null when there's no connected account. */
  payoutRef: string | null;
  payoutCents: Cents;
  cancelledReason: string | null;
}

export interface Job {
  id: string;
  posterBusinessId: string | null;
  /** Business name, or "StreetServe" for a platform-posted gig. */
  employerName: string;
  title: string;
  description: string | null;
  payCents: Cents;
  payUnit: JobPayUnit;
  /** A-5. Un-migrated postings report the default (`sell`) rather than null. */
  jobType: JobType;
  jobTypeLabel: string;
  status: JobPostingStatus;
  startsAt: string | null;
  durationHrs: number | null;
  cancelledReason: string | null;
  /** How close the worker must be to check in — the server enforces the same number. */
  checkInRadiusM: number;
  /** GeoJSON order, [lng, lat]. */
  location: LngLat | [];
  /** Straight-line metres from the viewer; null when the viewer shared no location. */
  distanceM?: number | null;
  /** Present on the nearby feed: why this gig ranked where it did (explainability). */
  reasonSummary?: string;
  /** The viewer's own claim, when they have one. */
  application: JobApplication | null;
  isPoster?: boolean;
}

/** Check-out response — the completed application plus whether money actually moved. */
export interface JobCheckOutResult extends JobApplication {
  paid: boolean;
}

/** Where the worker is, resolved from the device before a check-in attempt. */
export interface JobCoords {
  lng: number;
  lat: number;
}
