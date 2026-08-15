'use client';

/**
 * S-14 Jobs (docs/12 §3, Flow 9) — the seller's other way to earn today. Two feeds behind one
 * header: ranked gigs nearby, and the gigs this worker already holds. "My gigs" is not a nicety —
 * claiming a gig removes it from the nearby feed, so it's the only route back to check-in/out.
 *
 * The board needs the device's position (the endpoint is proximity-ranked), so a denied permission
 * is handled as its own first-class state rather than an empty list.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { TabPage } from '@/components/layout/TabPage';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Banner } from '@/components/feedback/Banner';
import { Badge } from '@/components/primitives/Badge';
import {
  locationFailureKind,
  useDeviceLocation,
  useJobTypes,
  useJobsNearby,
  useMyJobs,
} from '../hooks/useJobs';
import { JobCard } from './JobCard';
import type { Job, JobType } from '../types';

type Feed = 'nearby' | 'mine';

/** Gigs still needing something from the worker — the count worth surfacing on the tab. */
const ACTIVE = ['applied', 'accepted', 'checked_in'];

export function JobsList() {
  const [feed, setFeed] = useState<Feed>('nearby');
  // A-5: the selected work types. Empty = every type, which is the default a worker wants.
  const [types, setTypes] = useState<JobType[]>([]);
  const nearby = useJobsNearby(types);
  const mine = useMyJobs();
  const location = useDeviceLocation();

  const activeCount = (mine.data ?? []).filter(
    (j) => j.application && ACTIVE.includes(j.application.status),
  ).length;

  return (
    <TabPage title="Jobs">
      <Tabs role="tablist" aria-label="Jobs feeds">
        <Tab role="tab" aria-selected={feed === 'nearby'} $on={feed === 'nearby'} onClick={() => setFeed('nearby')}>
          Nearby
        </Tab>
        <Tab role="tab" aria-selected={feed === 'mine'} $on={feed === 'mine'} onClick={() => setFeed('mine')}>
          My gigs
          {activeCount > 0 ? <Badge tone="live" count={activeCount} /> : null}
        </Tab>
      </Tabs>

      {feed === 'nearby' ? (
        <>
          <JobTypeFilter selected={types} onChange={setTypes} />
          <NearbyFeed
            jobs={nearby.data}
            isLoading={nearby.isLocating || nearby.isLoading}
            error={(nearby.locationError ?? nearby.error) as Error | null}
            hasLocation={Boolean(nearby.coords)}
            onRetryLocation={() => void location.refetch()}
            filtered={types.length > 0}
            onClearFilter={() => setTypes([])}
          />
        </>
      ) : (
        <MineFeed jobs={mine.data} isLoading={mine.isLoading} error={mine.error} onRetry={() => void mine.refetch()} />
      )}
    </TabPage>
  );
}

/**
 * A-5 work-type filter. Multi-select rather than single-select: someone who will hold a sign will
 * usually also hand out samples, and forcing one choice at a time hides work they'd take.
 *
 * Rendered even while the list loads so the control doesn't pop in and shift the feed underneath a
 * thumb that's already reaching for it.
 */
function JobTypeFilter({
  selected,
  onChange,
}: {
  selected: JobType[];
  onChange: (next: JobType[]) => void;
}) {
  const { data: options } = useJobTypes();
  if (!options || options.length === 0) return null;

  const toggle = (key: JobType) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

  return (
    <Filters role="group" aria-label="Filter gigs by type of work">
      <FilterChip
        type="button"
        $on={selected.length === 0}
        aria-pressed={selected.length === 0}
        onClick={() => onChange([])}
      >
        All work
      </FilterChip>
      {options.map((o) => (
        <FilterChip
          key={o.key}
          type="button"
          $on={selected.includes(o.key)}
          aria-pressed={selected.includes(o.key)}
          onClick={() => toggle(o.key)}
        >
          {o.label}
        </FilterChip>
      ))}
    </Filters>
  );
}

function NearbyFeed({
  jobs,
  isLoading,
  error,
  hasLocation,
  onRetryLocation,
  filtered,
  onClearFilter,
}: {
  jobs: Job[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasLocation: boolean;
  onRetryLocation: () => void;
  filtered: boolean;
  onClearFilter: () => void;
}) {
  /**
   * A location failure is the one the worker can usually fix, so it gets an explanation and a retry
   * rather than a generic error.
   *
   * The title follows the ACTUAL cause. It used to read "Turn on location to see gigs" whatever
   * happened — so someone whose location was on and working was told to switch on a thing that was
   * already on, and had nowhere to go from there. Only one of these four is about permission.
   */
  if (!hasLocation && error) {
    const kind = locationFailureKind(error);
    const title =
      kind === 'denied'
        ? 'Location is blocked for this site'
        : kind === 'unsupported'
          ? 'This device cannot share a location'
          : kind === 'timeout'
            ? 'Could not get your location in time'
            : 'Could not work out where you are';

    return (
      <Banner
        tone="warning"
        title={title}
        action={
          <Button size="compact" onClick={onRetryLocation}>
            Try again
          </Button>
        }
      >
        {/*
          Only what this failure actually cost them. The check-in geofence is a separate step with
          its own stricter rules, and naming it here made a slow GPS on the LIST read as though
          working a gig were now impossible.
        */}
        {error.message} Gigs are shown nearest first, so the board needs a rough idea of where you
        are.
      </Banner>
    );
  }
  if (isLoading) return <Stack><Skeleton $h="120px" $radius={16} /><Skeleton $h="120px" $radius={16} /></Stack>;
  if (error) return <ErrorState message={error.message} onRetry={onRetryLocation} />;
  if (!jobs || jobs.length === 0) {
    /**
     * A filtered empty result is a different situation from an empty board, and must not send the
     * worker off to browse inventory when widening the filter would show them work right here.
     */
    if (filtered) {
      return (
        <EmptyState
          icon="🔍"
          title="No gigs of that kind nearby"
          description="There may be other work near you right now."
          action={
            <Button size="compact" onClick={onClearFilter}>
              Show all work
            </Button>
          }
        />
      );
    }
    // Flow 9's empty state: Jobs is the fallback when there's nothing to sell, so its own empty
    // state points back the other way rather than dead-ending.
    return (
      <EmptyState
        icon="🛠️"
        title="No gigs nearby"
        description="New gigs post throughout the day. In the meantime, there may be inventory you can sell."
        action={<BrowseInventoryLink />}
      />
    );
  }
  return (
    <Stack>
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </Stack>
  );
}

function MineFeed({
  jobs,
  isLoading,
  error,
  onRetry,
}: {
  jobs: Job[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  if (isLoading) return <Stack><Skeleton $h="120px" $radius={16} /></Stack>;
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />;
  if (!jobs || jobs.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="No gigs yet"
        description="Gigs you claim show up here, with check-in and check-out."
      />
    );
  }
  return (
    <Stack>
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </Stack>
  );
}

/** Sends the worker back to consignment discovery — the other half of "earn today". */
function BrowseInventoryLink() {
  const router = useRouter();
  return (
    <Button size="compact" onClick={() => router.push('/seller')}>
      Browse inventory
    </Button>
  );
}

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[3]}px;
`;
const Tabs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[4]}px;
`;
const Tab = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid ${({ theme, $on }) => ($on ? 'transparent' : theme.color.line2)};
  background: ${({ theme, $on }) => ($on ? theme.color.accentPrimary : 'transparent')};
  color: ${({ theme, $on }) => ($on ? '#fff' : theme.color.textSecondary)};
`;
/**
 * Horizontally scrollable so six work types fit a narrow phone without wrapping into a wall of
 * chips that pushes the actual gigs below the fold.
 */
const Filters = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]}px;
  margin-bottom: ${({ theme }) => theme.space[3]}px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;
const FilterChip = styled.button<{ $on: boolean }>`
  flex: 0 0 auto;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid ${({ theme, $on }) => ($on ? 'transparent' : theme.color.line2)};
  background: ${({ theme, $on }) => ($on ? theme.color.textPrimary : 'transparent')};
  color: ${({ theme, $on }) => ($on ? theme.color.surfaceBase : theme.color.textSecondary)};
`;
