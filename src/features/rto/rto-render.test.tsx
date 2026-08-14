import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('rent-to-own dashboard (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  it('shows ownership progress and the live early-payoff amount (U9/R23)', async () => {
    const { RtoDashboard } = await import('./components/RtoDashboard');
    render(
      <Providers>
        <RtoDashboard id="rto_demo" />
      </Providers>,
    );
    // Ownership % (4000/10000 = 40%) and the locked payoff (10000 − 4000 = $60.00) both render.
    await waitFor(() => expect(screen.getByText('40%')).toBeInTheDocument());
    expect(screen.getByText('You own')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay \$60\.00/ })).toBeInTheDocument();

    // Consignment-RTO (R19): the 3-party split is disclosed on the dashboard.
    await waitFor(() => expect(screen.getByText('Where each payment goes')).toBeInTheDocument());
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Managing business')).toBeInTheDocument();
  });
});
