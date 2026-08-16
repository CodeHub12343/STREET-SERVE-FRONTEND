import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import type { CommunityContribution, CommunityFund, CommunityImpact } from './types';

/**
 * Pay It Forward — the customer and vendor surfaces (ADR-005).
 *
 * What is asserted here is the set of promises the screens make, not their layout. Every one of them
 * is a decision that would be easy to undo by accident later, and expensive if it were:
 *
 *  1. **Anonymous is the default**, and a name is opt-IN. A name put on a public wall by accident
 *     cannot be taken back.
 *  2. **The redemption prompt does not celebrate, qualify, or use charity words.** Someone short of
 *     money this week does not want their phone to throw a party about it, and being asked to
 *     justify taking help is how you make sure nobody does.
 *  3. **Nothing anywhere claims a contribution is tax-deductible** (CR-6) — except the disclosure
 *     that says plainly it is not.
 *  4. **The vendor is told the money is not theirs**, because the one thing they will try to do is
 *     withdraw it.
 *  5. **Who was helped is never shown** — a count, never a list.
 *
 * Hooks are mocked rather than driven through demo mode: `isMapDemo` is captured when `@/lib/env` is
 * first evaluated, so a later `stubEnv` reads too late. Same approach as the rewards + ads tests.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
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

const mocks = vi.hoisted(() => ({
  fund: null as CommunityFund | null,
  impact: null as CommunityImpact | null,
  contributions: [] as CommunityContribution[],
  contribute: vi.fn(),
}));

vi.mock('./hooks/usePayForward', () => ({
  useCommunityFund: () => ({ data: mocks.fund, isLoading: false }),
  useCommunityImpact: () => ({ data: mocks.impact, isLoading: false }),
  useRecentContributions: () => ({ data: mocks.contributions, isLoading: false }),
  useContribute: () => ({ mutate: mocks.contribute, isPending: false }),
  useUpdateFundSettings: () => ({ mutate: vi.fn(), isPending: false }),
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

afterEach(() => {
  mocks.fund = null;
  mocks.impact = null;
  mocks.contributions = [];
  vi.clearAllMocks();
});

// ─── the profile card ───────────────────────────────────────────────────────────────────────
describe('the fund on a business profile', () => {
  async function renderCard() {
    const { PayItForwardCard } = await import('./components/PayItForwardCard');
    render(
      <Providers>
        <PayItForwardCard businessId="b1" businessName="Bean Bus" />
      </Providers>,
    );
  }

  it('renders nothing when the business has no fund', async () => {
    // An empty pot advertised as a feature is a worse experience for both readers than silence.
    await renderCard();
    expect(screen.queryByText(/pay it forward/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /give to the fund/i })).toBeNull();
  });

  it('tells the person who might need it that it is there, without sorting them into deserving', async () => {
    mocks.fund = FUND;
    await renderCard();
    // Written in the second person, for the reader who is short today.
    expect(screen.getByText(/if money is tight today/i)).toBeInTheDocument();
    expect(screen.getByText(/no questions, and nobody is told/i)).toBeInTheDocument();
    // The words that would sort customers into deserving and undeserving.
    expect(screen.queryByText(/in need/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/less fortunate/i)).not.toBeInTheDocument();
  });

  it('credits a named giver but shows an anonymous one as the community', async () => {
    mocks.fund = FUND;
    mocks.contributions = [
      { id: 'c1', amountCents: 2000, givenBy: 'James', note: null, createdAt: new Date().toISOString() },
      { id: 'c2', amountCents: 500, givenBy: null, note: null, createdAt: new Date().toISOString() },
    ];
    await renderCard();
    expect(screen.getByText(/from James/)).toBeInTheDocument();
    expect(screen.getByText(/from someone in the community/)).toBeInTheDocument();
  });
});

// ─── the contribution sheet ─────────────────────────────────────────────────────────────────
describe('giving to the fund', () => {
  async function renderSheet() {
    const { ContributeSheet } = await import('./components/ContributeSheet');
    render(
      <Providers>
        <ContributeSheet businessId="b1" businessName="Bean Bus" open onClose={vi.fn()} />
      </Providers>,
    );
    await waitFor(() => expect(screen.getByText('Pay it forward')).toBeInTheDocument());
  }

  it('is anonymous by default, and says so before you give', async () => {
    await renderSheet();
    expect(screen.getByText(/your gift will be shown as anonymous/i)).toBeInTheDocument();
  });

  it('sends no name unless the giver opted in', async () => {
    const user = userEvent.setup();
    await renderSheet();
    await user.click(screen.getByRole('button', { name: /give/i }));

    expect(mocks.contribute).toHaveBeenCalledTimes(1);
    const [payload] = mocks.contribute.mock.calls[0] as [Record<string, unknown>];
    // Not `anonymous: true` — the field is simply absent, so the server's own default applies and
    // there is no way for a client bug to flip it.
    expect(payload).not.toHaveProperty('displayName');
    expect(payload).not.toHaveProperty('anonymous');
  });

  it('will not let you be named without giving a name', async () => {
    const user = userEvent.setup();
    await renderSheet();
    await user.click(screen.getByRole('switch', { name: /add my name/i }));

    expect(screen.getByText(/your name will be shown with your gift/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /give/i })).toBeDisabled();
  });

  it('says plainly that this is not tax-deductible, before payment (CR-6)', async () => {
    await renderSheet();
    expect(screen.getByText(/not tax-deductible/i)).toBeInTheDocument();
    expect(screen.getByText(/not a charitable donation/i)).toBeInTheDocument();
  });

  it('says where unused money goes — never back to the business', async () => {
    await renderSheet();
    expect(screen.getByText(/never goes back to the business/i)).toBeInTheDocument();
  });

  /**
   * ═══ Giving takes a card. THE bug that killed the whole feature. ═══
   *
   * This sheet dropped the `clientSecret` on the floor and toasted "Thank you — your gift is on its
   * way". No card was ever collected, so no contribution ever settled, so `creditContribution`
   * never ran and every pool stayed at zero for ever. That is also why the RECEIVING half looked
   * unbuilt: `quoteRedemption` returns `availableCents: 0` against an empty pool, and the checkout
   * offer correctly renders nothing at all. One dropped secret took down both ends of the feature.
   */
  it('asks for the card after the gift is recorded, rather than declaring it given', async () => {
    const user = userEvent.setup();
    await renderSheet();
    await user.click(screen.getByRole('button', { name: /give/i }));

    const [, opts] = mocks.contribute.mock.calls[0] as [
      unknown,
      { onSuccess: (r: unknown) => void },
    ];
    await act(async () => {
      opts.onSuccess({
        contributionId: 'c1',
        businessId: 'b1',
        amountCents: 1000,
        balanceCents: 0,
        clientSecret: 'demo',
      });
    });

    // The heading and the pay button both name the amount — hence `findAllByText`.
    expect(await screen.findAllByText('Pay $10.00')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: /Pay \$10\.00/ })).toBeInTheDocument();
    expect(screen.getByText(/reaches the fund once this payment goes through/i)).toBeInTheDocument();
    // The pool is credited by the webhook, so nothing here may claim the gift has landed.
    expect(screen.queryByText(/your gift is on its way/i)).not.toBeInTheDocument();
  });

  /** Recorded but unpayable. Reporting thanks here would be the original defect in miniature. */
  it('shows no card form when no client secret comes back', async () => {
    const user = userEvent.setup();
    await renderSheet();
    await user.click(screen.getByRole('button', { name: /give/i }));

    const [, opts] = mocks.contribute.mock.calls[0] as [
      unknown,
      { onSuccess: (r: unknown) => void },
    ];
    await act(async () => {
      opts.onSuccess({
        contributionId: 'c1',
        businessId: 'b1',
        amountCents: 1000,
        balanceCents: 0,
        clientSecret: null,
      });
    });

    expect(screen.queryAllByText('Pay $10.00')).toHaveLength(0);
  });
});

// ─── the checkout prompt — the hardest screen ───────────────────────────────────────────────
describe('the offer at checkout', () => {
  async function renderOffer(
    offer: { availableCents: number; reason: null | 'daily_limit' | 'verification_required' | 'exhausted' },
    checked = false,
  ) {
    const { PayItForwardOffer } = await import('./components/PayItForwardOffer');
    return render(
      <Providers>
        <PayItForwardOffer offer={offer} checked={checked} onChange={vi.fn()} />
      </Providers>,
    );
  }

  it('is a plain unchecked checkbox — never pre-ticked', async () => {
    await renderOffer({ availableCents: 1645, reason: null });
    const box = screen.getByRole('checkbox');
    // Opt-in. Spending a stranger's gift on someone who did not ask is the wrong surprise both ways.
    expect(box).not.toBeChecked();
  });

  it('states who is told: nobody', async () => {
    await renderOffer({ availableCents: 1645, reason: null });
    expect(screen.getByText(/isn’t told who uses it/i)).toBeInTheDocument();
  });

  it('does not celebrate, qualify, or use charity words', async () => {
    const { container } = await renderOffer({ availableCents: 1645, reason: null });
    const copy = (container.textContent ?? '').toLowerCase();
    for (const forbidden of [
      'free',
      'congratulations',
      'lucky',
      'charity',
      'charitable',
      'donated',
      'in need',
      'deserve',
      'are you sure',
    ]) {
      expect(copy, `forbidden word "${forbidden}"`).not.toContain(forbidden);
    }
    // And no emoji party.
    expect(copy).not.toMatch(/🎉|🥳|❤️/u);
  });

  it('explains a daily limit in plain language, without implying fault', async () => {
    await renderOffer({ availableCents: 0, reason: 'daily_limit' });
    expect(screen.getByText(/already covered an order for you here today/i)).toBeInTheDocument();
    // The raw enum must never reach a screen.
    expect(screen.queryByText(/daily_limit/i)).not.toBeInTheDocument();
  });

  it('says nothing at all when the pot is simply empty', async () => {
    await renderOffer({ availableCents: 0, reason: 'exhausted' });
    // "There is no money for you" helps nobody at a checkout — so there is no row, and no note.
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.queryByText(/community fund/i)).toBeNull();
  });
});

// ─── the vendor panel ───────────────────────────────────────────────────────────────────────
describe('the vendor’s community panel', () => {
  async function renderPanel() {
    const { CommunityImpactPanel } = await import('./components/CommunityImpactPanel');
    render(
      <Providers>
        <CommunityImpactPanel businessId="b1" />
      </Providers>,
    );
  }

  it('tells the vendor the money is not theirs and cannot be paid out', async () => {
    mocks.fund = FUND;
    await renderPanel();
    // The one thing a vendor will try to do with a balance on their own dashboard.
    expect(screen.getByText(/isn’t your money and can’t be paid out/i)).toBeInTheDocument();
  });

  it('shows how many people were helped, and offers no way to see who', async () => {
    mocks.fund = FUND;
    mocks.impact = {
      businessId: 'b1',
      availableCents: 18_735,
      contributedCents: 142_500,
      contributionCount: 63,
      largestContributionCents: 10_000,
      averageContributionCents: 2262,
      redeemedCents: 123_765,
      redemptionCount: 71,
      peopleHelped: 58,
    };
    await renderPanel();
    expect(screen.getByText('58')).toBeInTheDocument();
    expect(screen.getByText('people helped')).toBeInTheDocument();
    // A count, never a list. There is no control to drill in, and no recipient name anywhere.
    expect(screen.queryByRole('button', { name: /who|recipients|view people/i })).toBeNull();
  });

  it('does not offer "never" as an expiry (ADR-005 §6)', async () => {
    mocks.fund = FUND;
    await renderPanel();
    const select = screen.getByLabelText(/how long a gift stays usable/i);
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toEqual(['30 days', '60 days', '12 months']);
    expect(options).not.toContain('Never');
  });

  it('tells the vendor about the one-per-customer-per-day rule up front', async () => {
    mocks.fund = FUND;
    await renderPanel();
    expect(screen.getByText(/one order per customer here per day/i)).toBeInTheDocument();
  });
});
