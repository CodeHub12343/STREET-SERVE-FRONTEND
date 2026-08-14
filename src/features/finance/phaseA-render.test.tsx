import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';

/**
 * Phase A client surfaces. These screens exist to stop the app claiming things that aren't true, so
 * the assertions are about the CLAIMS — that blocked money is distinguished from delayed money,
 * that the fee discount says whose money it is, and that a filtered empty state doesn't send a
 * worker away from work that's right there.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
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

describe('A-2 funds availability (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  it('separates money that is merely held from money that cannot move at all', async () => {
    const { FundsAvailability } = await import('./components/FundsAvailability');
    render(
      <Providers>
        <FundsAvailability />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Where your money is')).toBeInTheDocument());

    // The two totals are never collapsed into one "pending" number — that conflation is the whole
    // dishonesty this screen exists to fix.
    expect(screen.getByText('On the way')).toBeInTheDocument();
    expect(screen.getByText('Can’t be paid out')).toBeInTheDocument();

    // Each amount appears twice by design — once as a total, once on the bucket that explains it.
    expect(screen.getAllByText('$124.50').length).toBe(2);
    expect(screen.getAllByText('$82.00').length).toBe(2);

    // Each blocked reason gets its own named bucket rather than a lump "pending".
    expect(screen.getByText('Earned from cash sales')).toBeInTheDocument();

    // The tier hold is stated as policy, not discovered as a delay — in the header AND on the
    // bucket it applies to, so it can't be missed by someone scanning either one.
    expect(screen.getAllByText(/held 3 days/i).length).toBeGreaterThanOrEqual(2);

    // Cash is explained as uncollected, with the honest reason.
    expect(screen.getByText(/never came through StreetServe/i)).toBeInTheDocument();

    // And there's a next step the seller can actually take.
    expect(screen.getByText('Verify your identity to shorten the hold')).toBeInTheDocument();
  });
});

describe('A-3 trust benefits (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  it('states the band, the three benefits, and how far the next band is', async () => {
    const { TrustBenefits } = await import('./components/TrustBenefits');
    render(
      <Providers>
        <TrustBenefits />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Trusted')).toBeInTheDocument());
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText(/points to Elite/i)).toBeInTheDocument();

    // The three concrete benefits, in the seller's terms.
    expect(screen.getByText('1.5× stock limit')).toBeInTheDocument();
    expect(screen.getByText('10% off our fee')).toBeInTheDocument();
    expect(screen.getByText('Premium stock unlocked')).toBeInTheDocument();

    /**
     * The most important sentence on the screen: the discount comes out of the PLATFORM's cut, not
     * the hub's. If this copy ever drifts, the platform is implying it can move a hub's money.
     */
    expect(screen.getByText(/hub still gets its full share/i)).toBeInTheDocument();
  });
});

describe('A-5 job type filter (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  it('filters the board by kind of work and offers a way back when nothing matches', async () => {
    const { resetDemoJobs } = await import('@/features/jobs/demo');
    resetDemoJobs();
    const { JobsList } = await import('@/features/jobs/components/JobsList');
    render(
      <Providers>
        <JobsList />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Event setup crew')).toBeInTheDocument());
    // Every card names its kind of work. Scoped to the card's link — the same label also appears as
    // a filter chip, and matching that would prove nothing about the card.
    expect(
      screen.getByRole('link', { name: /Event staffing.*Event setup crew/s }),
    ).toBeInTheDocument();

    // Narrowing to delivery — which no demo gig is — must not dead-end the worker.
    await userEvent.click(screen.getByRole('button', { name: 'Delivery' }));
    await waitFor(() =>
      expect(screen.getByText('No gigs of that kind nearby')).toBeInTheDocument(),
    );

    // …and the way out is back to the full board, not off to browse inventory.
    await userEvent.click(screen.getByRole('button', { name: 'Show all work' }));
    await waitFor(() => expect(screen.getByText('Event setup crew')).toBeInTheDocument());
  });
});
