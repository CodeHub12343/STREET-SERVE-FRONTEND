import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import type { BoostCampaign, BoostContribution } from './types';

/**
 * Boost My Marketing — the customer and vendor surfaces (ADR-006).
 *
 * The premise the whole feature is built on is that **missing the goal is the likely outcome**, so
 * these tests are mostly about whether the screens tell the truth about that before anyone pays:
 *
 *  1. the unmet-goal outcome and the contributor's refund-or-roll-forward choice are shown **before**
 *     the pay button — an ADR-006 exit criterion, not a nicety;
 *  2. refund is preselected — rolling money into a campaign somebody did not choose to fund is
 *     deciding what to do with their money for them;
 *  3. the roll-forward option states its own 60-day time-box, so it is not an open-ended hold;
 *  4. no urgency theatre, and no claim that this is charitable, an investment, or deductible;
 *  5. the vendor is told the money is not theirs until the campaign funds.
 *
 * Hooks are mocked rather than driven through demo mode, for the same reason as the payforward and
 * rewards tests: `isMapDemo` is captured when `@/lib/env` is first evaluated.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const OPEN_CAMPAIGN: BoostCampaign = {
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
  campaign: null as BoostCampaign | null,
  contributions: [] as BoostContribution[],
  estimate: {
    amountCents: 0,
    postcards: null as number | null,
    unitCostCents: 0,
    serviceFeeCents: 0,
    mailableCents: 0,
    isEstimate: true,
  },
  contribute: vi.fn(),
}));

vi.mock('./hooks/useBoost', () => ({
  useCurrentCampaign: () => ({ data: mocks.campaign, isLoading: false }),
  useCampaign: () => ({ data: mocks.campaign, isLoading: false }),
  useCampaignContributions: () => ({ data: mocks.contributions, isLoading: false }),
  usePostcardEstimate: () => ({ data: mocks.estimate, isLoading: false }),
  useContributeToCampaign: () => ({ mutate: mocks.contribute, isPending: false }),
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

afterEach(() => {
  mocks.campaign = null;
  mocks.contributions = [];
  mocks.estimate = {
    amountCents: 0,
    postcards: null,
    unitCostCents: 0,
    serviceFeeCents: 0,
    mailableCents: 0,
    isEstimate: true,
  };
  vi.clearAllMocks();
});

// ─── the profile card ───────────────────────────────────────────────────────────────────────
describe('the campaign on a business profile', () => {
  async function renderCard() {
    const { BoostCampaignCard } = await import('./components/BoostCampaignCard');
    render(
      <Providers>
        <BoostCampaignCard businessId="b1" businessName="Bean Bus" />
      </Providers>,
    );
  }

  it('renders nothing when there is no live campaign', async () => {
    await renderCard();
    expect(screen.queryByRole('button', { name: /chip in/i })).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows progress against the goal', async () => {
    mocks.campaign = OPEN_CAMPAIGN;
    await renderCard();
    expect(screen.getByText('$375.00')).toBeInTheDocument();
    expect(screen.getByText(/of \$1,000\.00/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '37');
  });

  it('puts the refund promise on the card, not one screen deeper', async () => {
    mocks.campaign = OPEN_CAMPAIGN;
    await renderCard();
    // The single most reassuring fact about the mechanic. Burying it wastes it.
    expect(screen.getByText(/refunded in full, automatically/i)).toBeInTheDocument();
  });

  it('discloses the service fee before anyone gives, not only after funding', async () => {
    /**
     * ADR-006 §6 requires the fee to be "disclosed on the campaign page before anyone gives", and
     * the contribution sheet's fine print promises a fee "shown on the campaign page". Both were
     * vacuously satisfied while the fee was 0%; at 10% they are real obligations.
     *
     * The RATE has to carry the disclosure, because `serviceFeeCents` stays 0 until the campaign
     * funds — i.e. it is absent for exactly the campaigns where someone is still deciding.
     */
    mocks.campaign = OPEN_CAMPAIGN;
    await renderCard();
    const copy = document.body.textContent ?? '';
    expect(copy).toMatch(/10% service fee comes out of the total raised/i);
    expect(copy).toMatch(/nothing is taken from your contribution/i);
  });

  it('says nothing about a fee when none is charged', async () => {
    // A "0% service fee" line would be noise that makes the mechanic sound more extractive.
    mocks.campaign = { ...OPEN_CAMPAIGN, serviceFeeBps: 0 };
    await renderCard();
    expect(document.body.textContent ?? '').not.toMatch(/service fee/i);
  });

  it('uses no urgency theatre', async () => {
    mocks.campaign = { ...OPEN_CAMPAIGN, deadlineAt: new Date(Date.now() + 2 * 86_400_000).toISOString() };
    const { container } = await (async () => {
      const { BoostCampaignCard } = await import('./components/BoostCampaignCard');
      return render(
        <Providers>
          <BoostCampaignCard businessId="b1" businessName="Bean Bus" />
        </Providers>,
      );
    })();
    const copy = (container.textContent ?? '').toLowerCase();
    // A contributor deciding under manufactured pressure is one who asks for their money back.
    for (const forbidden of ['hurry', 'last chance', 'act now', 'don’t miss', 'ending soon', '!!']) {
      expect(copy, `pressure phrase "${forbidden}"`).not.toContain(forbidden);
    }
    expect(screen.getByText(/2 days left/i)).toBeInTheDocument();
  });
});

// ─── the contribution sheet — the disclosure ────────────────────────────────────────────────
describe('chipping in: the unmet-goal outcome is disclosed before payment', () => {
  async function renderSheet() {
    const { ContributeToCampaignSheet } = await import('./components/ContributeToCampaignSheet');
    render(
      <Providers>
        <ContributeToCampaignSheet
          campaign={OPEN_CAMPAIGN}
          businessName="Bean Bus"
          open
          onClose={vi.fn()}
        />
      </Providers>,
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /chip in/i })).toBeInTheDocument(),
    );
  }

  it('states the deadline as a date, and that a miss refunds in full automatically', async () => {
    await renderSheet();
    expect(screen.getByText(/if the goal isn’t reached by/i)).toBeInTheDocument();
    expect(screen.getByText(/in full and automatically/i)).toBeInTheDocument();
    // A date, not "soon".
    expect(screen.getByText(/15 September 2026|September 15, 2026/)).toBeInTheDocument();
  });

  it('preselects refund — money is never moved to a campaign nobody chose', async () => {
    await renderSheet();
    expect(screen.getByRole('radio', { name: /refund me/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /next campaign/i })).not.toBeChecked();
  });

  it('states the 60-day time-box on rolling forward', async () => {
    await renderSheet();
    // Without this, "put it toward the next one" is an open-ended hold on their money.
    expect(screen.getByText(/don’t start one within 60 days, you’re refunded anyway/i)).toBeInTheDocument();
  });

  it('sends the contributor’s choice with the contribution', async () => {
    const user = userEvent.setup();
    await renderSheet();
    await user.click(screen.getByRole('radio', { name: /next campaign/i }));
    await user.click(screen.getByRole('button', { name: /chip in/i }));

    expect(mocks.contribute).toHaveBeenCalledTimes(1);
    const [payload] = mocks.contribute.mock.calls[0] as [Record<string, unknown>];
    expect(payload.onUnmet).toBe('roll_forward');
    // Anonymous unless opted out: the field is absent, so the server's own default applies.
    expect(payload).not.toHaveProperty('anonymous');
  });

  /**
   * The regression the original suite could not catch.
   *
   * POSTing a contribution does not move money — the server returns a `clientSecret` for a PENDING
   * PaymentIntent and credits the campaign only when the webhook settles it. The sheet used to
   * discard that secret and toast "your contribution is in", so nobody was ever asked for a card
   * and the toast was simply false. Asserting the mutation fired (above) passes either way; what
   * has to be asserted is that a card is asked for and that success is NOT claimed before it.
   */
  it('asks for a card before claiming the contribution is in', async () => {
    const user = userEvent.setup();
    // `once`: afterEach clears calls but not implementations, and this one must not leak.
    mocks.contribute.mockImplementationOnce(
      (_input: unknown, opts: { onSuccess: (r: unknown) => void }) =>
        opts.onSuccess({
          contributionId: 'bc_1',
          campaignId: 'camp1',
          amountCents: 2500,
          raisedCents: 37_500,
          clientSecret: 'demo',
        }),
    );

    await renderSheet();
    await user.click(screen.getByRole('button', { name: /chip in/i }));

    // Step 2 is a payment surface, not a thank-you.
    expect(await screen.findByRole('button', { name: /pay \$25\.00/i })).toBeInTheDocument();
    expect(screen.queryByText(/your contribution is in/i)).toBeNull();
    expect(screen.queryByText(/payment received/i)).toBeNull();
  });

  it('says plainly what this is not — charitable, an investment, or deductible', async () => {
    await renderSheet();
    const copy = document.body.textContent?.toLowerCase() ?? '';
    expect(copy).toContain('not a charitable donation');
    expect(copy).toContain('not an investment');
    expect(copy).toContain('not tax-deductible');
    expect(copy).toContain('no fee is taken from your contribution');
  });

  it('shows no postcard estimate while no mailing rate is configured', async () => {
    await renderSheet();
    // MB-4/MB-8: inventing "≈ 250 postcards" would present a guess as a quote. Scoped to the
    // estimate line — the campaign TITLE also contains the word "postcards".
    expect(screen.queryByText(/an estimate, based on current mailing costs/i)).toBeNull();
    expect(screen.queryByText(/roughly/i)).toBeNull();
  });

  it('shows the estimate, labelled as one, once a rate exists', async () => {
    mocks.estimate = {
      amountCents: 2500,
      postcards: 125,
      unitCostCents: 20,
      serviceFeeCents: 0,
      mailableCents: 2500,
      isEstimate: true,
    };
    await renderSheet();
    expect(screen.getByText(/125/)).toBeInTheDocument();
    expect(screen.getByText(/an estimate, based on current mailing costs/i)).toBeInTheDocument();
  });
});

// ─── the vendor panel ───────────────────────────────────────────────────────────────────────
describe('the vendor’s campaign panel', () => {
  async function renderPanel() {
    const { BoostManagerPanel } = await import('./components/BoostManagerPanel');
    render(
      <Providers>
        <BoostManagerPanel businessId="b1" />
      </Providers>,
    );
  }

  it('offers a campaign to start when there is none, and promises the refund up front', async () => {
    await renderPanel();
    expect(screen.getByText(/start a marketing campaign/i)).toBeInTheDocument();
    expect(screen.getByText(/you’re never left owing anyone/i)).toBeInTheDocument();
  });

  it('does not offer a campaign with no end date', async () => {
    await renderPanel();
    const select = screen.getByLabelText(/how long to raise it/i);
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toEqual(['14 days', '30 days', '45 days', '60 days']);
    expect(options).not.toContain('No deadline');
  });

  it('tells the vendor the money is not theirs and cannot be paid out', async () => {
    mocks.campaign = OPEN_CAMPAIGN;
    await renderPanel();
    expect(screen.getByText(/isn’t yours until the campaign funds/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /withdraw/i })).toBeNull();
  });

  it('offers to cover exactly the shortfall while the campaign is open', async () => {
    mocks.campaign = OPEN_CAMPAIGN;
    await renderPanel();
    expect(screen.getByRole('button', { name: /pay \$625\.00/i })).toBeInTheDocument();
  });

  it('shows the mailing section once funded, and never promises delivery', async () => {
    mocks.campaign = { ...OPEN_CAMPAIGN, status: 'funded', raisedCents: 100_000, remainingCents: 0 };
    await renderPanel();
    expect(screen.getByText('Mailing')).toBeInTheDocument();
    // D-12: the pipeline stops at handover. The compiler caught this section being unreachable once.
    const copy = document.body.textContent?.toLowerCase() ?? '';
    expect(copy).not.toContain('delivered to');
    expect(copy).toContain('don’t claim it');
  });

  it('warns that cancelling refunds everyone, including roll-forward backers', async () => {
    mocks.campaign = OPEN_CAMPAIGN;
    await renderPanel();
    expect(screen.getByText(/including anyone who asked to roll their money/i)).toBeInTheDocument();
  });
});
