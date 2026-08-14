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

describe('monetization plans screen (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  /**
   * Asserted against the plan definitions rather than a hand-listed subset. The previous version
   * checked three of six by name and passed while `seller_plus` and `stock_waiver` — the two
   * seller-scoped plans — were absent from the client entirely. A test that names a subset cannot
   * notice a product disappearing.
   */
  it('lists every subscription plan with its price and a subscribe CTA (R29/R30)', async () => {
    const [{ PlansScreen }, { formatCents }] = await Promise.all([
      import('./PlansScreen'),
      import('@/lib/money'),
    ]);
    const plans: { name: string; priceCents: number }[] = [
      { name: 'StreetServe Pro', priceCents: 2999 },
      { name: 'Featured Placement', priceCents: 4999 },
      { name: 'Verified Badge', priceCents: 999 },
      { name: 'AI Marketing Assistant', priceCents: 1999 },
      { name: 'Seller Plus', priceCents: 499 },
      { name: 'Stock Protection', priceCents: 299 },
    ];

    render(
      <Providers>
        <PlansScreen businessId="biz_demo" />
      </Providers>,
    );
    await waitFor(() => expect(screen.getByText('StreetServe Pro')).toBeInTheDocument());

    for (const p of plans) {
      expect(screen.getByText(p.name)).toBeInTheDocument();
      expect(screen.getByText(formatCents(p.priceCents))).toBeInTheDocument();
    }
    // Not yet subscribed → every plan offers a subscribe CTA.
    expect(screen.getAllByRole('button', { name: /Subscribe/ }).length).toBe(plans.length);
  });

  /**
   * Stock Protection is a contractual WAIVER, not insurance. The backend enforces this vocabulary
   * ban in its own copy; the screen that sells the product has to hold the same line, because this
   * is the surface a regulator or a confused seller would actually read.
   */
  it('never describes Stock Protection as insurance', async () => {
    const { PlansScreen } = await import('./PlansScreen');
    const { container } = render(
      <Providers>
        <PlansScreen businessId="biz_demo" />
      </Providers>,
    );
    await waitFor(() => expect(screen.getByText('Stock Protection')).toBeInTheDocument());
    expect(container.textContent ?? '').not.toMatch(
      /insurance|policy|premium|claim|covered peril/i,
    );
  });
});
