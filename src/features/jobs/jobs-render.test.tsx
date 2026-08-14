import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { resetDemoJobs } from './demo';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider theme={darkTheme}>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('jobs / S-14 (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());
  beforeEach(() => resetDemoJobs());

  it('lists ranked nearby gigs with pay and schedule', async () => {
    const { JobsList } = await import('./components/JobsList');
    render(
      <Providers>
        <JobsList />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Event setup crew')).toBeInTheDocument());
    expect(screen.getByText('Graceada Summer Fair')).toBeInTheDocument();
    expect(screen.getByText('$80.00')).toBeInTheDocument();
    // An hourly gig must say so, and show what the shift is actually worth.
    expect(screen.getByText('$22.00/hr')).toBeInTheDocument();
    expect(screen.getByText('≈ $66.00 total')).toBeInTheDocument();
  });

  it('runs the whole lifecycle: apply → check in → check out → paid', async () => {
    const user = userEvent.setup();
    const { JobDetail } = await import('./components/JobDetail');
    render(
      <Providers>
        <JobDetail id="job_demo_setup" />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Event setup crew')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Apply for this gig/ }));
    // Claimed: the screen advances to check-in and states the geofence rule.
    await waitFor(() => expect(screen.getByRole('button', { name: /Check in on site/ })).toBeInTheDocument());
    expect(screen.getByText(/within 250m of the site/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Check in on site/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Check out & get paid/ })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Check out & get paid/ }));
    // Completed: the payout is reported as a real amount, not a toast that vanishes.
    await waitFor(() => expect(screen.getByText('Gig complete')).toBeInTheDocument());
    // Scoped to the payout row — the pay also appears in the header and the toast.
    expect(screen.getByText('Earned').parentElement).toHaveTextContent('$80.00');
    expect(screen.getByText('Sent — shows in Earnings')).toBeInTheDocument();
  });

  it('keeps a claimed gig reachable under "My gigs" once it leaves the nearby feed', async () => {
    const user = userEvent.setup();
    const { demoApplyToJob } = await import('./demo');
    demoApplyToJob('job_demo_flyer');

    const { JobsList } = await import('./components/JobsList');
    render(
      <Providers>
        <JobsList />
      </Providers>,
    );

    // Claimed gigs drop out of Nearby (the posting is `filled`)…
    await waitFor(() => expect(screen.getByText('Event setup crew')).toBeInTheDocument());
    expect(screen.queryByText('Flyer distribution')).not.toBeInTheDocument();

    // …and are still reachable, with the next action spelled out.
    await user.click(screen.getByRole('tab', { name: /My gigs/ }));
    await waitFor(() => expect(screen.getByText('Flyer distribution')).toBeInTheDocument());
    expect(screen.getByText('Head to the site — check in when you arrive.')).toBeInTheDocument();
  });
});
