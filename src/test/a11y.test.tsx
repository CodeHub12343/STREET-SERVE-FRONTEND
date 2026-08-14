/**
 * M10 launch readiness — automated accessibility audit.
 *
 * Runs axe-core over the primitives that appear on nearly every screen plus two
 * representative live screens (an onboarding surface and a data-driven demo screen).
 * jsdom can't compute layout, so axe auto-skips the `color-contrast` rule here — that
 * check lives in the Playwright/browser a11y pass (e2e/a11y.spec.ts) and the manual SR
 * matrix in LAUNCH_READINESS.md. This gate catches the structural failures that break
 * screen readers: missing labels, bad roles, orphaned form controls, duplicate ids.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { axe } from 'vitest-axe';
import type { AxeResults } from 'axe-core';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

async function auditNoViolations(ui: ReactElement) {
  const { container } = render(<Providers>{ui}</Providers>);
  const results = (await axe(container)) as AxeResults;
  expect(results).toHaveNoViolations();
}

describe('a11y — shared primitives', () => {
  it('Button (all variants) has no axe violations', async () => {
    await auditNoViolations(
      <div>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="tertiary">Tertiary</Button>
        <Button variant="destructive" disabled>
          Destructive
        </Button>
      </div>,
    );
  });

  it('Input is labelled and error-associated', async () => {
    await auditNoViolations(
      <form>
        <Input label="Email" hint="We never share it" defaultValue="a@b.co" />
        <Input label="Name" error="Required" required />
      </form>,
    );
  });

  it('EmptyState (actionable) has no violations', async () => {
    await auditNoViolations(
      <EmptyState
        icon="🌮"
        title="No vendors nearby yet"
        description="Widen your radius or check back at lunch."
        action={<Button variant="primary">Expand radius</Button>}
      />,
    );
  });

  it('ErrorState with retry has no violations', async () => {
    await auditNoViolations(<ErrorState onRetry={() => {}} />);
  });
});

describe('a11y — live screens (demo mode)', () => {
  beforeAll(() => vi.stubEnv('NEXT_PUBLIC_MAP_DEMO', 'true'));
  afterAll(() => vi.unstubAllEnvs());

  it('onboarding welcome carousel has no violations', async () => {
    const { WelcomeCarousel } = await import('@/features/identity');
    await auditNoViolations(<WelcomeCarousel />);
  });

  it('nearby list (map list view) has no violations', async () => {
    const { NearbyList } = await import('@/features/livemap/components/NearbyList');
    await auditNoViolations(<NearbyList />);
  });
});
