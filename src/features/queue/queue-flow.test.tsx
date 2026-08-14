import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';

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

describe('queue status (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  /**
   * Regression: navigating straight to /queue/[ownerId] (no prior join) must auto-join once the
   * membership lookup settles — previously the run-once join effect fired while the query was
   * still loading, skipped, and the skeleton stuck forever.
   */
  it('auto-joins and renders the position when visited directly', async () => {
    const { QueueStatus } = await import('./components/QueueStatus');
    render(
      <Providers>
        <QueueStatus ownerId="biz_bean" />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText(/in line at Bean Bus/)).toBeInTheDocument(), {
      timeout: 4000,
    });
    // Locked discount restated (C-20) — proves the demo schedule flowed through the join.
    expect(screen.getByText(/locked at join/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave the line' })).toBeInTheDocument();
  });
});
