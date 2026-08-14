import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';

/**
 * Phase F client surfaces.
 *
 * The load-bearing assertion here is the LEGAL one: Stock Protection must never be described as
 * insurance. Charging a premium and paying claims makes a platform an insurer, which requires a
 * licensed carrier and state-by-state licensing. The product is a contractual waiver of what we
 * would otherwise collect — and the copy has to say that, in those terms, everywhere.
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

describe('F-2/F-4 seller membership (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  it('states Seller Plus perks as the numbers that will actually be applied', async () => {
    const { SellerMembership } = await import('./components/SellerMembership');
    render(
      <Providers>
        <SellerMembership />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Seller Plus')).toBeInTheDocument());
    // "Carry more" is marketing; these are promises the checkout guard and settlement keep.
    expect(screen.getByText('1.5× your stock limit')).toBeInTheDocument();
    expect(screen.getByText('15% off our fee on every sale')).toBeInTheDocument();

    // And it says whose money the discount is — ours, not the hub's.
    expect(
      screen.getByText(/comes out of StreetServe’s cut — the hub still gets its full share/),
    ).toBeInTheDocument();
  });

  it('shows live cover status rather than a static marketing claim', async () => {
    const { SellerMembership } = await import('./components/SellerMembership');
    render(
      <Providers>
        <SellerMembership />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Cover is on')).toBeInTheDocument());
    // The real remaining headroom, from the same computation that decides whether to charge.
    expect(screen.getByText(/\$260\.00 of your \$300\.00 left/)).toBeInTheDocument();
  });

  /**
   * The regulatory guardrail. If this test ever fails, the product has drifted into being an
   * insurance offering and cannot ship without a licensed carrier.
   */
  it('never uses insurance language anywhere on the screen', async () => {
    const { SellerMembership } = await import('./components/SellerMembership');
    const { container } = render(
      <Providers>
        <SellerMembership />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Stock Protection')).toBeInTheDocument());
    const copy = (container.textContent ?? '').toLowerCase();
    for (const forbidden of ['insurance', 'insured', 'policy', 'premium', 'claim', 'coverage plan']) {
      expect(copy).not.toContain(forbidden);
    }

    /**
     * And it says positively what the product IS, so the absence isn't evasion. Note it doesn't
     * say "this isn't a policy" either — a negation still names the thing, and naming it invites
     * the association the product must not carry.
     */
    expect(
      screen.getByText(/we don’t charge you for stock that goes wrong, up to your limit/),
    ).toBeInTheDocument();
  });
});
