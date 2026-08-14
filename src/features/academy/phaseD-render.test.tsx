import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { resetDemoAcademy } from './demo';

/**
 * Phase D client surfaces.
 *
 * The assertions are about the promises each screen makes: that the earn hub shows BOTH ranking
 * axes rather than hiding them behind a rank, that a consignment payout is honestly labelled per
 * unit, and that the Academy shows a certification the way a hub owner will see it.
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

describe('D-1 earn hub (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());
  beforeEach(() => resetDemoAcademy());

  it('merges gigs and stock, and prints payout AND time-to-payout on every row', async () => {
    const { EarnHub } = await import('./components/EarnHub');
    render(
      <Providers>
        <EarnHub />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Event setup crew')).toBeInTheDocument());
    expect(screen.getByText('Soy candles')).toBeInTheDocument();

    // Both kinds are labelled, so the merge doesn't blur what the work actually is.
    expect(screen.getByText('Gig')).toBeInTheDocument();
    expect(screen.getAllByText('Sell stock').length).toBe(2);

    /**
     * The whole reason the merge works: someone choosing between "$80 after a shift" and "$5.98
     * when it sells" is making that trade explicitly, so both numbers are on the row.
     */
    expect(screen.getByText('$80.00')).toBeInTheDocument();
    expect(screen.getByText('paid today')).toBeInTheDocument();
    expect(screen.getByText('$5.98')).toBeInTheDocument();
    expect(screen.getAllByText('paid when it sells').length).toBe(2);
  });

  it('labels a consignment payout as per-item so it can’t be read as the whole pickup', async () => {
    const { EarnHub } = await import('./components/EarnHub');
    render(
      <Providers>
        <EarnHub />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Soy candles')).toBeInTheDocument());
    // Quoting the full stock value would be the flattering number and the dishonest one.
    expect(screen.getAllByText(/per item you sell/).length).toBe(2);
  });

  it('nudges an incomplete profile, because a blank one is the cold-start problem', async () => {
    const { EarnHub } = await import('./components/EarnHub');
    render(
      <Providers>
        <EarnHub />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Tell us what you’re good at')).toBeInTheDocument());
  });
});

describe('D-3/D-4 academy (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());
  beforeEach(() => resetDemoAcademy());

  it('lists courses with progress and marks the certifying one', async () => {
    const { AcademyHome } = await import('./components/AcademyHome');
    render(
      <Providers>
        <AcademyHome />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Handling stock properly')).toBeInTheDocument());

    // A course that gates real access is flagged as such — it's the one worth doing.
    expect(screen.getByText('Certification')).toBeInTheDocument();
    // The fixture has selling-basics passed already.
    expect(screen.getByText('Done')).toBeInTheDocument();
    // And the resident course is shown as required for its programme, not as optional homework.
    expect(screen.getByText(/Required · Shelter partner programme/)).toBeInTheDocument();
  });

  it('shows earned credentials above the catalog', async () => {
    const { AcademyHome } = await import('./components/AcademyHome');
    render(
      <Providers>
        <AcademyHome />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('What you’ve earned')).toBeInTheDocument());
    expect(screen.getByText('1 course completed')).toBeInTheDocument();
  });
});

describe('D-2 seller profile (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());
  beforeEach(() => resetDemoAcademy());

  it('keeps what the seller declared separate from what was inferred', async () => {
    const { SellerProfileEditor } = await import('./components/SellerProfileEditor');
    render(
      <Providers>
        <SellerProfileEditor />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('What are you good at?')).toBeInTheDocument());

    // Declared: a chip they've selected.
    expect(screen.getByRole('switch', { name: 'Talking to people' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Crafts & handmade' })).not.toBeChecked();

    /**
     * Inferred, shown separately and labelled as an observation. Someone should always be able to
     * see what we concluded about them, and how much we're leaning on it.
     */
    expect(screen.getByText('What we’ve noticed')).toBeInTheDocument();
    expect(screen.getByText(/Based on 3 sales/)).toBeInTheDocument();
  });

  it('toggles a skill', async () => {
    const { SellerProfileEditor } = await import('./components/SellerProfileEditor');
    render(
      <Providers>
        <SellerProfileEditor />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('How do you get around?')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('switch', { name: 'Automotive' }));
    // Saving is optimistic-feeling and per-field, so nothing is lost to a mis-tap.
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument());
  });
});
