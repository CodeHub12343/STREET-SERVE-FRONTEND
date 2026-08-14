import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }) }));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('order review / cart (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  it('renders the real menu and computes a total when an item is added', async () => {
    const { OrderReview } = await import('./components/OrderReview');
    render(
      <Providers>
        <OrderReview businessId="biz_taco" context="ahead" />
      </Providers>,
    );

    // Real menu item from the demo dataset (proves data → cart).
    await waitFor(() => expect(screen.getByText('Birria Tacos (3)')).toBeInTheDocument());

    // Add it → the total / payment CTA appears with an amount.
    await userEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]!);
    await waitFor(() => expect(screen.getByText(/Continue to payment ·/)).toBeInTheDocument());
    // $11.00 shows on the subtotal, total, and the CTA — assert it renders (multiple is expected).
    expect(screen.getAllByText(/\$11\.00/).length).toBeGreaterThan(0);
  });

  it('cancel discloses the exact refund before committing (R13/U6)', async () => {
    const { OrderTracking } = await import('./components/OrderTracking');
    const { QueryClientProvider } = await import('@tanstack/react-query');
    const { keys } = await import('@/lib/query/keys');
    const qc = makeQueryClient();
    // Seed an in-progress order so the cancel affordance is available.
    qc.setQueryData(keys.order('ord_demo'), {
      id: 'ord_demo',
      businessId: 'biz_taco',
      businessName: 'Taco Loco',
      context: 'ahead',
      status: 'accepted',
      breakdown: { subtotalCents: 1500, discountCents: 0, tipCents: 135, platformFeeCents: 150, totalCents: 1635, discountPercent: 0 },
      items: [],
      createdAt: new Date().toISOString(),
      payoutTiming: '',
    });
    render(
      <QueryClientProvider client={qc}>
        <ThemeProvider theme={darkTheme}>
          <OrderTracking id="ord_demo" />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    // First tap reveals the disclosure — it does NOT cancel yet.
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    await waitFor(() => expect(screen.getByText(/Full refund of \$16\.35/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Confirm cancellation/ })).toBeInTheDocument();
  });
});
