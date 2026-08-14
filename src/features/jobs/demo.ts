/**
 * Jobs demo fixtures (S-14). Unlike the old read-only `demoJobs()`, this is a small mutable store
 * so the whole lifecycle — apply → check in → check out → paid — actually runs offline.
 *
 * It lives in the feature rather than lib/ (where demo.rto.ts sits) because it depends on the
 * feature's own types, and lib/ is cross-cutting plumbing that must not import from features/.
 *
 * Mirrors the backend jobs.service response shapes exactly, so the components can't accidentally
 * be written against a demo-only field.
 */
import type { Job, JobApplication, JobCheckOutResult, JobCoords } from './types';

/** Downtown Modesto, matching the rest of the demo fixtures. */
const DEMO_ORIGIN: [number, number] = [-120.9969, 37.6391];

function offset([lng, lat]: [number, number], metresE: number, metresN: number): [number, number] {
  return [lng + metresE / 88_000, lat + metresN / 111_000];
}

const hours = (n: number) => n * 3_600_000;

function seed(): Job[] {
  return [
    {
      id: 'job_demo_setup',
      posterBusinessId: 'biz_demo_fair',
      employerName: 'Graceada Summer Fair',
      title: 'Event setup crew',
      description:
        'Help set up tables, canopies and signage before the fair opens. Lifting up to 25 lbs. Water and lunch provided on site.',
      payCents: 8000,
      payUnit: 'flat',
      jobType: 'event_staffing',
      jobTypeLabel: 'Event staffing',
      status: 'open',
      startsAt: new Date(Date.now() + hours(24)).toISOString(),
      durationHrs: 4,
      cancelledReason: null,
      checkInRadiusM: 250,
      location: offset(DEMO_ORIGIN, 400, 300),
      distanceM: 800,
      reasonSummary: 'Ranked for pay (8000¢) and being ~800m away.',
      application: null,
    },
    {
      id: 'job_demo_flyer',
      posterBusinessId: 'biz_demo_downtown',
      employerName: 'Downtown Modesto Partnership',
      title: 'Flyer distribution',
      description:
        'Hand out event flyers along 10th Street. Flyers and a branded tote are supplied at check-in.',
      payCents: 5000,
      payUnit: 'flat',
      jobType: 'promotion',
      jobTypeLabel: 'Promotion',
      status: 'open',
      startsAt: new Date(Date.now() + hours(48)).toISOString(),
      durationHrs: 3,
      cancelledReason: null,
      checkInRadiusM: 250,
      location: offset(DEMO_ORIGIN, -900, 1400),
      distanceM: 1900,
      reasonSummary: 'Ranked for pay (5000¢) and being ~1900m away.',
      application: null,
    },
    {
      id: 'job_demo_sampling',
      posterBusinessId: null,
      employerName: 'StreetServe',
      title: 'Product sampling shift',
      description:
        'Offer samples outside the farmers market and log interest. Paid hourly for time on site.',
      payCents: 2200,
      payUnit: 'hourly',
      jobType: 'sampling',
      jobTypeLabel: 'Product sampling',
      status: 'open',
      startsAt: new Date(Date.now() + hours(6)).toISOString(),
      durationHrs: 3,
      cancelledReason: null,
      checkInRadiusM: 250,
      location: offset(DEMO_ORIGIN, 150, -200),
      distanceM: 250,
      reasonSummary: 'Ranked for pay (2200¢/hr) and being ~250m away.',
      application: null,
    },
  ];
}

let store: Job[] = seed();

/** Test hook — resets the in-memory lifecycle between runs. */
export function resetDemoJobs(): void {
  store = seed();
}

function find(id: string): Job {
  const job = store.find((j) => j.id === id);
  if (!job) throw new Error('Job not found');
  return job;
}

/** Open postings only, exactly like the server's `status: 'open'` filter. */
export function demoJobsNearby(): Job[] {
  return store.filter((j) => j.status === 'open').map((j) => ({ ...j }));
}

export function demoMyJobs(): Job[] {
  const rank = (j: Job) =>
    j.application && ['applied', 'accepted', 'checked_in'].includes(j.application.status) ? 0 : 1;
  return store
    .filter((j) => j.application !== null)
    .map((j) => ({ ...j }))
    .sort((a, b) => rank(a) - rank(b));
}

export function demoJob(id: string): Job {
  return { ...find(id) };
}

export function demoApplyToJob(id: string): JobApplication {
  const job = find(id);
  if (job.status !== 'open') throw new Error('This job is no longer available');
  job.status = 'filled';
  job.application = {
    id: `app_${job.id}`,
    jobId: job.id,
    status: 'accepted',
    checkedInAt: null,
    checkedOutAt: null,
    payoutRef: null,
    payoutCents: 0,
    cancelledReason: null,
  };
  return { ...job.application };
}

export function demoCheckInJob(id: string, _coords: JobCoords): JobApplication {
  const job = find(id);
  if (!job.application || job.application.status !== 'accepted') {
    throw new Error('No accepted application to check in');
  }
  job.application = {
    ...job.application,
    status: 'checked_in',
    checkedInAt: new Date().toISOString(),
  };
  return { ...job.application };
}

export function demoCheckOutJob(id: string): JobCheckOutResult {
  const job = find(id);
  if (!job.application || job.application.status !== 'checked_in') {
    throw new Error('Not checked in');
  }
  // Mirror the server's hourly maths: bill whole hours on site, at least one, capped at the
  // posted duration.
  const checkedInAt = job.application.checkedInAt
    ? new Date(job.application.checkedInAt).getTime()
    : Date.now();
  const worked = Math.max(1, Math.ceil((Date.now() - checkedInAt) / hours(1)));
  const cap = job.durationHrs ? Math.ceil(job.durationHrs) : worked;
  const payoutCents =
    job.payUnit === 'hourly' ? job.payCents * Math.min(worked, Math.max(1, cap)) : job.payCents;

  job.application = {
    ...job.application,
    status: 'completed',
    checkedOutAt: new Date().toISOString(),
    payoutRef: `tr_demo_${job.id}`,
    payoutCents,
  };
  job.status = 'completed';
  return { ...job.application, paid: true };
}
