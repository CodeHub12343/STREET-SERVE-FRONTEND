/**
 * Shared jobs presentation rules, so the card, the detail screen and the tests can never disagree
 * about what a lifecycle state is called or how a gig's pay reads.
 */
import type { StatusKey } from '@/styles/tokens';
import { formatCents } from '@/lib/money';
import { formatDateTime } from '@/lib/format';
import type { Job, JobApplicationStatus } from './types';

/** Metres → the "0.5 mi" / "800 ft" phrasing used by the map's nearby lists. */
export function formatDistance(m: number | null | undefined): string | null {
  if (m === null || m === undefined) return null;
  const miles = m / 1609.34;
  return miles < 0.1 ? `${Math.round(m * 3.28084)} ft` : `${miles.toFixed(1)} mi`;
}

/**
 * Flat gigs read as one plain amount; hourly gigs must say so on the same line. A worker comparing
 * "$45 flat" to "$22/hr" should never have to do the algebra themselves (S-14 design note).
 */
export function formatPay(job: Pick<Job, 'payCents' | 'payUnit'>): string {
  return job.payUnit === 'hourly' ? `${formatCents(job.payCents)}/hr` : formatCents(job.payCents);
}

/** What an hourly gig is expected to total, so the headline number isn't misleading. */
export function estimatedTotalCents(job: Pick<Job, 'payCents' | 'payUnit' | 'durationHrs'>): number | null {
  if (job.payUnit !== 'hourly' || !job.durationHrs) return null;
  return Math.round(job.payCents * job.durationHrs);
}

/** "4h · Jul 30, 11:57 AM" — omitting whichever half the posting didn't specify. */
export function formatSchedule(job: Pick<Job, 'startsAt' | 'durationHrs'>): string | null {
  const parts: string[] = [];
  if (job.durationHrs) parts.push(`${job.durationHrs}h`);
  if (job.startsAt) parts.push(formatDateTime(job.startsAt));
  return parts.length > 0 ? parts.join(' · ') : null;
}

export interface StatusPresentation {
  label: string;
  tone: StatusKey;
  /** What the worker should do next, in their words. */
  hint: string;
}

const STATUS: Record<JobApplicationStatus, StatusPresentation> = {
  applied: { label: 'Applied', tone: 'warning', hint: 'Waiting on the employer to confirm you.' },
  accepted: { label: 'Confirmed', tone: 'live', hint: 'Head to the site — check in when you arrive.' },
  checked_in: { label: 'On site', tone: 'driving', hint: 'Check out when the work is done to get paid.' },
  completed: { label: 'Completed', tone: 'live', hint: 'Done — your payout is on its way.' },
  no_show: { label: 'No-show', tone: 'danger', hint: 'You didn’t check in for this gig.' },
  cancelled: { label: 'Cancelled', tone: 'danger', hint: 'The employer pulled this gig.' },
};

export function applicationPresentation(status: JobApplicationStatus): StatusPresentation {
  return STATUS[status] ?? STATUS.applied;
}

/** The lifecycle stages shown on the detail screen, in order. */
export const LIFECYCLE_STEPS: { status: JobApplicationStatus; label: string }[] = [
  { status: 'accepted', label: 'Confirmed' },
  { status: 'checked_in', label: 'Checked in' },
  { status: 'completed', label: 'Paid' },
];

/** How far through LIFECYCLE_STEPS a given application is (−1 before it starts). */
export function lifecycleIndex(status: JobApplicationStatus | undefined): number {
  switch (status) {
    case 'accepted':
    case 'applied':
      return 0;
    case 'checked_in':
      return 1;
    case 'completed':
      return 2;
    default:
      return -1;
  }
}
