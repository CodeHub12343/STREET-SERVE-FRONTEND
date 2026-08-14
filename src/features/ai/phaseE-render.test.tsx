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
 * Phase E client surfaces.
 *
 * These assertions are about honesty, because that is where this phase can do the most harm. The
 * Income Coach in particular must show a shortfall AS a shortfall — the person reading it may be
 * deciding whether they can eat tonight, and a padded plan costs them the day.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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

describe('E-9 Income Coach (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  it('produces a plan in the brief’s shape: what to take, where to go, why', async () => {
    const { IncomeCoach } = await import('./components/IncomeCoach');
    render(
      <Providers>
        <IncomeCoach />
      </Providers>,
    );

    // $50 is under the demo fixture's ~$51.87 projection, so this plan clears its goal.
    await userEvent.click(screen.getByRole('radio', { name: '$50.00' }));
    await userEvent.click(screen.getByRole('button', { name: /Make me a plan/ }));

    await waitFor(() => expect(screen.getByText('What to take')).toBeInTheDocument());
    expect(screen.getByText('Soy candles')).toBeInTheDocument();
    expect(screen.getByText('×12')).toBeInTheDocument();
    expect(screen.getByText('Where to go')).toBeInTheDocument();

    // The forecast explains itself — no oracles.
    expect(screen.getByText(/Forecast: about 40% of these sell around now/)).toBeInTheDocument();
  });

  /**
   * The most important assertion in this file. When today's stock genuinely can't reach the goal,
   * the plan says so — it does not pad the basket until the arithmetic lands.
   */
  it('shows a shortfall as a shortfall, with what would actually close it', async () => {
    const { IncomeCoach } = await import('./components/IncomeCoach');
    render(
      <Providers>
        <IncomeCoach />
      </Providers>,
    );

    await userEvent.click(screen.getByRole('radio', { name: '$200.00' }));
    await userEvent.click(screen.getByRole('button', { name: /Make me a plan/ }));

    await waitFor(() =>
      expect(screen.getByText(/Realistically you can make about/)).toBeInTheDocument(),
    );
    // The real number, next to the goal it falls short of.
    expect(screen.getByText(/of your \$200\.00 goal/)).toBeInTheDocument();
    // And information about closing the gap, not encouragement.
    expect(screen.getByText(/short of your goal/)).toBeInTheDocument();
    expect(
      screen.getByText(/Picking up again tomorrow, or adding a gig/),
    ).toBeInTheDocument();
  });

  it('shows what the seller has actually made recently — measured, not claimed', async () => {
    const { IncomeCoach } = await import('./components/IncomeCoach');
    render(
      <Providers>
        <IncomeCoach />
      </Providers>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Make me a plan/ }));
    await waitFor(() =>
      expect(screen.getByText(/Over your last 6 selling days/)).toBeInTheDocument(),
    );
    expect(screen.getByText('$41.50')).toBeInTheDocument();
  });
});

describe('E-4 event pin', () => {
  it('leads with attendance when known, and says nothing rather than "0" when it isn’t', async () => {
    const { EventPin } = await import('@/components/map/EventPin');
    const { rerender } = render(
      <ThemeProvider theme={darkTheme}>
        <EventPin name="Graceada Summer Fair" expectedAttendance={800} hoursUntil={5} />
      </ThemeProvider>,
    );
    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByText('in 5h')).toBeInTheDocument();

    /**
     * Unknown attendance must not render as zero. This is the one place a seller is most likely to
     * act on the number, so a fabricated one is the most costly kind.
     */
    rerender(
      <ThemeProvider theme={darkTheme}>
        <EventPin name="Street Market" expectedAttendance={null} hoursUntil={2} />
      </ThemeProvider>,
    );
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Street Market, in 2 hours/ }),
    ).toBeInTheDocument();
  });

  it('marks an event already under way as live', async () => {
    const { EventPin } = await import('@/components/map/EventPin');
    render(
      <ThemeProvider theme={darkTheme}>
        <EventPin name="Fair" expectedAttendance={1500} hoursUntil={-1} />
      </ThemeProvider>,
    );
    expect(screen.getByText('On now')).toBeInTheDocument();
    // Thousands are abbreviated so the pin stays readable at map scale.
    expect(screen.getByText('1.5k')).toBeInTheDocument();
  });
});
