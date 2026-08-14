import { describe, it, expect, vi, afterEach } from 'vitest';
import { axe } from 'vitest-axe';
import type { AxeResults } from 'axe-core';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactElement, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import type { CommunityFund } from '@/features/payforward/types';
import type { BoostCampaign } from '@/features/boost/types';

/**
 * Phase 7.6 — accessibility on the **community-network** surfaces.
 *
 * ## Why these deserve their own pass
 *
 * `a11y-money.test.tsx` covers the screens where somebody decides to hand over money. These are
 * different, and in one case harder:
 *
 *  • The Pay It Forward offer at checkout is the screen a person uses when they are **short of
 *    money in a queue**. If it is unreachable by keyboard, or its checkbox is unlabelled, the
 *    feature exists for everyone except the people most likely to be using assistive tech on an old
 *    phone. An inaccessible "free coffee" banner is an inconvenience; an inaccessible way to accept
 *    help is a way of quietly excluding people from help.
 *  • A campaign's progress is conveyed **visually by a bar**. A bar with no accessible value is a
 *    number that exists only for sighted users, on a screen that is asking them for money.
 *  • The Boost disclosure — what happens if the goal is missed — is a §31-style obligation: a
 *    disclosure a screen reader cannot reach is not a disclosure.
 *
 * ## What this cannot cover
 *
 * axe in jsdom finds structural failures. It cannot compute layout, so **contrast is not checked
 * here** (that is the Playwright pass), and it cannot judge reading ORDER — whether the refund
 * promise is announced before the pay button rather than after it. That needs a person with a screen
 * reader, and it stays recorded as outstanding rather than quietly implied to be done.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const FUND: CommunityFund = {
  businessId: 'b1',
  balanceCents: 18_735,
  accepting: true,
  maxPerRedemptionCents: null,
  maxPercentOfOrder: 100,
  maxPerDayCents: null,
  expiryDays: 365,
};

const CAMPAIGN: BoostCampaign = {
  id: 'camp1',
  businessId: 'b1',
  title: 'Postcards for the neighbourhood',
  goalCents: 100_000,
  raisedCents: 37_500,
  remainingCents: 62_500,
  percentFunded: 37,
  deadlineAt: new Date('2026-09-15T00:00:00Z').toISOString(),
  status: 'open',
  fundedAt: null,
  serviceFeeCents: 0,
  serviceFeeBps: 1_000,
  mailDate: null,
  mailingStatus: null,
};

const mocks = vi.hoisted(() => ({
  fund: null as CommunityFund | null,
  campaign: null as BoostCampaign | null,
}));

vi.mock('@/features/payforward/hooks/usePayForward', () => ({
  useCommunityFund: () => ({ data: mocks.fund, isLoading: false }),
  useCommunityImpact: () => ({ data: null, isLoading: false }),
  useRecentContributions: () => ({ data: [], isLoading: false }),
  useContribute: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateFundSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/features/boost/hooks/useBoost', () => ({
  useCurrentCampaign: () => ({ data: mocks.campaign, isLoading: false }),
  useCampaign: () => ({ data: mocks.campaign, isLoading: false }),
  useCampaignContributions: () => ({ data: [], isLoading: false }),
  usePostcardEstimate: () => ({
    data: { amountCents: 0, postcards: null, unitCostCents: 0, isEstimate: true },
    isLoading: false,
  }),
  useContributeToCampaign: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateCampaign: () => ({ mutate: vi.fn(), isPending: false }),
  useTopUpCampaign: () => ({ mutate: vi.fn(), isPending: false }),
  useConfirmMailDate: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelCampaign: () => ({ mutate: vi.fn(), isPending: false }),
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

/**
 * Audits `baseElement` (document.body), never the render container.
 *
 * `Sheet` and `Modal` portal to the body, so their markup is not inside the container at all — an
 * audit scoped to the container would run axe over an empty node and pass every dialog in this
 * file without looking at one. Auditing the base element covers portalled and inline markup alike.
 */
/**
 * Page-level rules, switched off because these renders are components, not pages.
 *
 * Auditing the body (see above) brings axe's whole-document rules into scope, and they all fail for
 * the same uninteresting reason: a component rendered on its own has no landmarks, no `<main>`, no
 * `<h1>` and no page title. Those are properties of the route that hosts the component, and the
 * route-level suites are where they belong. Leaving them on here would mean every sheet in this
 * file fails on the page's structure instead of its own, which is how a real violation gets lost.
 */
const PAGE_LEVEL_RULES = {
  region: { enabled: false },
  'landmark-one-main': { enabled: false },
  'page-has-heading-one': { enabled: false },
  'html-has-lang': { enabled: false },
  'document-title': { enabled: false },
  bypass: { enabled: false },
} as const;

async function auditNoViolations(ui: ReactElement) {
  const { baseElement } = render(<Providers>{ui}</Providers>);
  const results = (await axe(baseElement, { rules: PAGE_LEVEL_RULES })) as AxeResults;
  expect(results).toHaveNoViolations();
  return baseElement;
}

afterEach(() => {
  mocks.fund = null;
  mocks.campaign = null;
  vi.clearAllMocks();
});

describe('7.6 · Pay It Forward', () => {
  it('the offer at checkout has no violations, and its checkbox is properly labelled', async () => {
    const { PayItForwardOffer } = await import('@/features/payforward');
    await auditNoViolations(
      <PayItForwardOffer
        offer={{ availableCents: 1645, reason: null }}
        checked={false}
        onChange={vi.fn()}
      />,
    );

    /**
     * The single most important control in this feature. `getByRole('checkbox', { name })` only
     * resolves when the label is genuinely associated — a visually-adjacent `<span>` would render
     * identically and be nameless to a screen reader.
     */
    const box = screen.getByRole('checkbox', { name: /community fund/i });
    expect(box).toBeInTheDocument();
    expect(box).not.toBeChecked();
  });

  it('states the unavailable reason as text, not as an absence', async () => {
    // "Nothing happened" is not a message. Somebody who asked for help and got none is owed a
    // sentence they can actually hear.
    const { PayItForwardOffer } = await import('@/features/payforward');
    const container = await auditNoViolations(
      <PayItForwardOffer
        offer={{ availableCents: 0, reason: 'daily_limit' }}
        checked={false}
        onChange={vi.fn()}
      />,
    );
    expect(container.textContent).toMatch(/already covered an order for you here today/i);
  });

  it('the profile card has no violations', async () => {
    mocks.fund = FUND;
    const { PayItForwardCard } = await import('@/features/payforward');
    await auditNoViolations(<PayItForwardCard businessId="b1" businessName="Bean Bus" />);
  });
});

describe('7.6 · Boost My Marketing', () => {
  it('the campaign card has no violations and exposes progress as a value', async () => {
    mocks.campaign = CAMPAIGN;
    const { BoostCampaignCard } = await import('@/features/boost');
    await auditNoViolations(<BoostCampaignCard businessId="b1" businessName="Bean Bus" />);

    /**
     * A progress bar with no accessible value is a number that exists only for sighted users — on a
     * screen asking them for money. `aria-valuenow` is what makes "37% funded" a fact rather than a
     * shape.
     */
    const bar = screen.getByRole('progressbar', { name: /funded/i });
    expect(bar).toHaveAttribute('aria-valuenow', '37');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('the contribution sheet has no violations, and its refund choice is a real radio group', async () => {
    const { ContributeToCampaignSheet } = await import('@/features/boost');
    await auditNoViolations(
      <ContributeToCampaignSheet
        campaign={CAMPAIGN}
        businessName="Bean Bus"
        open
        onClose={vi.fn()}
      />,
    );

    // ADR-006 requires the unmet-goal choice to be made before paying. A choice a screen-reader user
    // cannot operate is not a choice they were offered.
    const group = screen.getByRole('radiogroup', { name: /doesn’t reach its goal/i });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /refund me/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /next campaign/i })).toBeInTheDocument();
  });

  it('the disclosure is reachable as text, not conveyed by styling alone', async () => {
    const { ContributeToCampaignSheet } = await import('@/features/boost');
    await auditNoViolations(
      <ContributeToCampaignSheet
        campaign={CAMPAIGN}
        businessName="Bean Bus"
        open
        onClose={vi.fn()}
      />,
    );
    // A disclosure a screen reader cannot reach is not a disclosure.
    const copy = (document.body.textContent ?? '').toLowerCase();
    expect(copy).toContain('in full and automatically');
    expect(copy).toContain('not tax-deductible');
  });
});
