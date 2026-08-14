import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';

// next/navigation isn't available outside Next; stub the router the list view uses.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('live map (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  it('renders real nearby businesses from the demo dataset in the list view', async () => {
    // Import after stubbing env so isMapDemo resolves true.
    const { NearbyList } = await import('./components/NearbyList');
    render(
      <Providers>
        <NearbyList />
      </Providers>,
    );
    // Pins flow query → DOM (proves "pins render with real data", C-12 parity of C-10).
    // `getAllBy` because a name can legitimately appear twice on this screen: once in the Trending
    // rail (R1b) and once in the distance-sorted list below it.
    await waitFor(() => expect(screen.getAllByText('Taco Loco').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Bean Bus').length).toBeGreaterThan(0);
  });

  it('surfaces a Trending row that visibly rewards discounting (R1b)', async () => {
    const { TrendingRow } = await import('./components/TrendingRow');
    render(
      <Providers>
        <TrendingRow center={[-120.9969, 37.6391]} />
      </Providers>,
    );
    await waitFor(() => expect(screen.getByText('Trending now')).toBeInTheDocument());
    // The discount is the loudest thing on the card — the customer-visible payoff for discounting.
    const badges = await screen.findAllByText(/Up to \d+% off/);
    expect(badges.length).toBeGreaterThan(0);
  });
});
