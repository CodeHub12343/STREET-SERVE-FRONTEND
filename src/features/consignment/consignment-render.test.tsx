import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('seller consignment (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  it('renders nearby consignment products with their terms', async () => {
    const { DiscoverInventory } = await import('./components/DiscoverInventory');
    render(
      <Providers>
        <DiscoverInventory />
      </Providers>,
    );
    await waitFor(() => expect(screen.getByText('Soy Candles (12-pack)')).toBeInTheDocument());
    // Seller split term is surfaced (proves product terms render).
    expect(screen.getByText(/70% yours/)).toBeInTheDocument();
  });

  it('renders the real Seller Earnings screen (B7: no "depends on GAP" placeholder)', async () => {
    const { SellerEarnings } = await import('./components/SellerEarnings');
    render(
      <Providers>
        <SellerEarnings />
      </Providers>,
    );
    // Real totals + settlement history render from the server feed. The tile says "Earned", not
    // "Settled net" — Phase 0 separates money earned from money actually paid out.
    await waitFor(() => expect(screen.getByText('Earned')).toBeInTheDocument());
    expect(screen.getByText('Settlement history')).toBeInTheDocument();
    // …and the old placeholder copy is gone.
    expect(screen.queryByText(/depends on GAP/i)).not.toBeInTheDocument();
  });

  it('previews a seller net payout from a price in the fee calculator (R12)', async () => {
    const { FeeCalculator } = await import('./components/FeeCalculator');
    const { fireEvent } = await import('@testing-library/react');
    render(
      <Providers>
        <FeeCalculator />
      </Providers>,
    );
    // Enter $50 at the default 70% split → net = (5000 − 10%) × 70% = $31.50.
    // The net shows twice by design: the big headline and the "Your net" ledger row.
    fireEvent.change(screen.getByLabelText('Item price'), { target: { value: '50' } });
    await waitFor(() => expect(screen.getAllByText('$31.50').length).toBeGreaterThan(0));
    expect(screen.getByText('Platform fee (10%)')).toBeInTheDocument();
  });

  it('surfaces the consignment term + lifecycle actions on inventory (R14/R15)', async () => {
    const { MyInventory } = await import('./components/MyInventory');
    render(
      <Providers>
        <MyInventory />
      </Providers>,
    );
    // The term countdown (R14) and the Extend/notice actions (R15/§37) are visible on active
    // checkouts (the demo has two, so these appear more than once).
    await waitFor(() => expect(screen.getAllByText(/Term ends in/).length).toBeGreaterThan(0));
    expect(screen.getAllByRole('button', { name: 'Extend 30d' }).length).toBeGreaterThan(0);
    /**
     * "Give notice", not "End" — §37 makes ending a consignment a notice with an agreed period,
     * and a button labelled "End" would tell the seller their goods are due back today when they
     * have days. The label is part of the disclosure, not decoration.
     */
    expect(screen.getAllByRole('button', { name: 'Give notice' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'End' })).not.toBeInTheDocument();
  });
});
