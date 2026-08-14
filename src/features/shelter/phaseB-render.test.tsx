import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import { resetDemoShelter } from './demo';

/**
 * Phase B client surfaces.
 *
 * These screens are the difference between a program that is pitched and one someone can actually
 * use, so the assertions are about the promises: that the resident is told the money is theirs,
 * that the allowance they're shown is the one that will be enforced, and that an ordinary seller
 * never sees any of it.
 */
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
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

describe('B-2 resident status (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());
  beforeEach(() => resetDemoShelter());

  it('shows the cosigned allowance, who is standing behind it, and the training gate', async () => {
    const { ResidentStatus } = await import('./components/ResidentStatus');
    render(
      <Providers>
        <ResidentStatus />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Hope Center Modesto')).toBeInTheDocument());
    expect(screen.getByText('is cosigning your stock')).toBeInTheDocument();

    // The number the checkout guard will enforce, shown continuously rather than only on refusal.
    expect(screen.getByText('$30.00 left')).toBeInTheDocument();
    expect(screen.getByText(/Holding \$20.00 of \$50.00/)).toBeInTheDocument();

    // Training is outstanding in the fixture, so the gate is offered as a route forward.
    expect(screen.getByText('Finish the starter course')).toBeInTheDocument();

    // The most reassuring fact available before a first pickup.
    expect(screen.getByText(/first pickup is covered/i)).toBeInTheDocument();
  });
});

describe('B-3 resident wallet (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());
  beforeEach(() => resetDemoShelter());

  it('states plainly that the money is the resident’s and says where to collect it', async () => {
    const { ResidentWallet } = await import('./components/ResidentWallet');
    render(
      <Providers>
        <ResidentWallet />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Ready to collect')).toBeInTheDocument());
    expect(screen.getByText('$48.20')).toBeInTheDocument();

    /**
     * The single most important sentence on the screen. Someone who has been through the benefits
     * system has every reason to assume a deduction unless told otherwise.
     */
    expect(screen.getByText(/they can’t keep any of it/i)).toBeInTheDocument();

    // Verbatim collection instructions beat any generic string we could write.
    expect(screen.getByText(/Ask for Dana at the front desk/)).toBeInTheDocument();
  });

  it('lets the resident confirm they received a handed-over amount', async () => {
    const { ResidentWallet } = await import('./components/ResidentWallet');
    render(
      <Providers>
        <ResidentWallet />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('Already collected')).toBeInTheDocument());
    // The already-acknowledged entry shows as confirmed rather than offering the button again.
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });
});

describe('B-5 training (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());
  beforeEach(() => resetDemoShelter());

  it('walks module by module and never ships its own answer key', async () => {
    const { ResidentTraining } = await import('./components/ResidentTraining');
    const { container } = render(
      <Providers>
        <ResidentTraining />
      </Providers>,
    );

    await waitFor(() => expect(screen.getByText('How this works')).toBeInTheDocument());
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();

    // Next is disabled until the question on this screen is answered — not until it's answered
    // CORRECTLY, which is a different and much worse gate.
    const next = screen.getByRole('button', { name: /Next/ });
    expect(next).toBeDisabled();

    await userEvent.click(
      screen.getByRole('radio', { name: /you take it on consignment and pay nothing/i }),
    );
    expect(next).toBeEnabled();
    await userEvent.click(next);

    await waitFor(() => expect(screen.getByText('Bringing stock back')).toBeInTheDocument());
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();

    // Nothing in the rendered DOM reveals which option is correct.
    expect(container.innerHTML).not.toContain('answerIndex');
  });
});
