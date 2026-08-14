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

describe('vendor order queue (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  it('renders incoming orders the vendor can act on', async () => {
    const { OrderQueue } = await import('./components/OrderQueue');
    render(
      <Providers>
        <OrderQueue businessId="biz_taco" />
      </Providers>,
    );
    // Real incoming order from the demo dataset, with an actionable CTA.
    await waitFor(() => expect(screen.getByText('Sam T.')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: 'Accept' }).length).toBeGreaterThan(0);
  });
});
