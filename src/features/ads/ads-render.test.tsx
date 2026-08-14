import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import type { AdPricing, Placement, ServedAd } from './types';

/**
 * Paid placement, client side (M-11/M-12/RV-11, spec §32).
 *
 * Two claims are load-bearing and both are asserted directly, because both are promises the
 * BACKEND makes on the client's behalf:
 *
 *  1. **Every ad carries its label.** The server attaches `label` to each served ad assuming the
 *     client always renders it. A paid result nobody can tell apart from an organic one is what
 *     makes a discovery feed worthless.
 *  2. **A promotion never claims outcomes.** §32 says promoted placement does not guarantee sales,
 *     and the purchase screen has to say so before the buy button, not after.
 *
 * The data hooks are mocked rather than driven through demo mode: `isMapDemo` is captured when
 * `@/lib/env` is first evaluated, so a `stubEnv` after any static import of this feature would be
 * read too late and the test would pass or fail for the wrong reason.
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

const AD: ServedAd = {
  placementId: 'p1',
  headline: 'Fresh birria till 8pm',
  body: 'Corner of 9th and Main',
  imageUrl: null,
  clickUrl: 'https://example.test/promo',
  label: 'Promoted',
};

const PRICING: AdPricing = {
  tiers: [
    { days: 1, label: 'One day', priceCents: 500, priceLabel: '$5.00' },
    { days: 7, label: 'One week', priceCents: 1500, priceLabel: '$15.00' },
    { days: 30, label: 'One month', priceCents: 4000, priceLabel: '$40.00' },
  ],
  cpm: [
    { placement: 'map_banner', cpmCents: 1200, cpmLabel: '$12.00 per 1,000 views' },
    { placement: 'discovery_card', cpmCents: 900, cpmLabel: '$9.00 per 1,000 views' },
    { placement: 'earn_slot', cpmCents: 700, cpmLabel: '$7.00 per 1,000 views' },
  ],
  disclosure:
    'Promoted placement increases how often people see this. It does not guarantee sales, and it ' +
    'never pushes other businesses out of results.',
  label: 'Promoted',
  maxShareOfFeed: 0.2,
};

const BASE_PLACEMENT: Placement = {
  id: 'pl1',
  kind: 'ad',
  subjectId: null,
  placement: 'discovery_card',
  headline: 'Birria Tuesdays',
  budgetCents: 1500,
  spentCents: 420,
  remainingCents: 1080,
  cpmCents: 900,
  impressions: 1200,
  clicks: 24,
  clickThroughRate: 0.02,
  status: 'active',
  citySlug: null,
  startsAt: new Date().toISOString(),
  endsAt: null,
  tierDays: 7,
  tierLabel: 'One week',
  awaitingPayment: false,
  label: 'Promoted',
  spendLabel: '$4.20 of $15.00',
  deliveryLabel: 'One week — $15.00',
};

/** Mock the data layer, then import the component so it binds to the mock. */
async function mockAds(overrides: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock('./hooks/useAds', async () => {
    const actual = await vi.importActual<typeof import('./hooks/useAds')>('./hooks/useAds');
    return { ...actual, ...overrides };
  });
}

afterEach(() => {
  vi.doUnmock('./hooks/useAds');
  vi.resetModules();
});

describe('AdSlot — disclosure is structural, not optional', () => {
  it.each(['map_banner', 'discovery_card', 'earn_slot'] as const)(
    'renders the Promoted label on the %s surface',
    async (surface) => {
      const { AdSlot } = await import('./components/AdSlot');
      render(
        <Providers>
          <AdSlot ads={[AD]} surface={surface} />
        </Providers>,
      );
      expect(screen.getByText('Promoted')).toBeInTheDocument();
      expect(screen.getByText('Fresh birria till 8pm')).toBeInTheDocument();
    },
  );

  it('renders nothing at all when a slot goes unsold', async () => {
    const { AdSlot } = await import('./components/AdSlot');
    render(
      <Providers>
        <div data-testid="slot">
          <AdSlot ads={[]} surface="discovery_card" />
        </div>
      </Providers>,
    );
    // An unsold slot must cost the layout nothing — no placeholder, no empty box.
    expect(screen.getByTestId('slot')).toBeEmptyDOMElement();
  });

  it('marks the outbound link as sponsored and opens it safely', async () => {
    const { AdSlot } = await import('./components/AdSlot');
    render(
      <Providers>
        <AdSlot ads={[AD]} surface="discovery_card" />
      </Providers>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.test/promo');
    // `sponsored` is the honest rel for paid placement; noopener protects the opener.
    expect(link.getAttribute('rel')).toContain('sponsored');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('still labels an ad that has no click-through', async () => {
    const { AdSlot } = await import('./components/AdSlot');
    render(
      <Providers>
        <AdSlot ads={[{ ...AD, clickUrl: null }]} surface="map_banner" />
      </Providers>,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Promoted')).toBeInTheDocument();
  });
});

describe('promote flow (§32)', () => {
  async function renderFlow() {
    await mockAds({
      useAdPricing: () => ({ data: PRICING, isLoading: false }),
      useCreateFeatured: () => ({ mutate: vi.fn(), isPending: false }),
      useCreateCampaign: () => ({ mutate: vi.fn(), isPending: false }),
    });
    const { PromoteFlow } = await import('./components/PromoteFlow');
    return render(
      <Providers>
        <PromoteFlow subject={{ kind: 'featured_product', subjectId: 'prod_1', name: 'Candles' }} />
      </Providers>,
    );
  }

  it('leads with the flat tiers and discloses that promotion guarantees nothing', async () => {
    await renderFlow();

    // Spec §32's three tiers, at the spec's prices.
    await waitFor(() => expect(screen.getByText('One day')).toBeInTheDocument());
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('One week')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('One month')).toBeInTheDocument();
    expect(screen.getByText('$40.00')).toBeInTheDocument();

    // The disclosure sits BEFORE the buy button — this is the sentence a disappointed vendor will
    // quote back, so it cannot live in a post-purchase receipt.
    expect(screen.getByText(/does not guarantee sales/i)).toBeInTheDocument();

    // The CTA names the exact price being charged, not a vague "continue".
    /**
     * "Continue", not "Promote": this button no longer completes the purchase — it advances to the
     * card form. Labelling it "Promote for $15.00" would promise that tapping it buys the
     * promotion, which is exactly the confusion that let people believe an unpaid placement was
     * running.
     */
    expect(screen.getByRole('button', { name: /Continue — \$15\.00/ })).toBeInTheDocument();
  });

  it('describes the map surface by where it actually renders', async () => {
    // It renders in the sheet at the bottom of the map, not across the top. Someone who buys a
    // "banner" and studies the top of their screen concludes the product is broken.
    const { PromoteFlow } = await import('./components/PromoteFlow');
    render(
      <Providers>
        <PromoteFlow subject={{ kind: 'ad', businessId: 'biz_1' }} />
      </Providers>,
    );
    await waitFor(() => expect(screen.getByLabelText(/Where it appears/i)).toBeInTheDocument());
    expect(screen.getByText(/nearby list at the bottom of the map/i)).toBeInTheDocument();
  });

  it('lets a buyer switch to a custom CPM budget instead of a fixed length', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    await renderFlow();
    await waitFor(() => expect(screen.getByText('One week')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /Set my own budget instead/ }));
    expect(screen.getByLabelText(/Budget/)).toBeInTheDocument();
    // With no budget typed yet there is no price to promise, so the CTA must not state one.
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('ads dashboard (M-11)', () => {
  async function renderWith(rows: Placement[]) {
    await mockAds({
      usePlacements: () => ({ data: rows, isLoading: false, isError: false, refetch: vi.fn() }),
      usePausePlacement: () => ({ mutate: vi.fn(), isPending: false }),
    });
    const { AdsDashboard } = await import('./components/AdsDashboard');
    return render(
      <Providers>
        <AdsDashboard businessId="biz_1" />
      </Providers>,
    );
  }

  it('reports real delivery numbers rather than implying outcomes', async () => {
    await renderWith([BASE_PLACEMENT]);
    await waitFor(() => expect(screen.getByText('Birria Tuesdays')).toBeInTheDocument());
    expect(screen.getByText('One week — $15.00')).toBeInTheDocument();
    // Once in the summary, once on the row — both are the campaign's real delivery.
    expect(screen.getAllByText('1,200').length).toBeGreaterThan(0);
    expect(screen.getAllByText('24').length).toBeGreaterThan(0);
    expect(screen.getByText('2.0%')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  /**
   * The regression this guards: a placement is created UNPAID and delivers nothing until its charge
   * settles. Showing it delivery stats — even honest zeroes — would present a campaign that has not
   * started as one that started and failed.
   */
  it('says an unpaid promotion has not started, instead of showing it zero views', async () => {
    await renderWith([
      { ...BASE_PLACEMENT, status: 'pending_payment', awaitingPayment: true, impressions: 0, clicks: 0 },
    ]);
    await waitFor(() => expect(screen.getByText('Awaiting payment')).toBeInTheDocument());
    expect(screen.getByText(/starts as soon as its payment goes through/i)).toBeInTheDocument();
    expect(screen.queryByText(/tap rate/)).not.toBeInTheDocument();
  });

  /**
   * The bug this guards against: the server has always opened a PaymentIntent and returned its
   * secret, and the UI discarded it — so a promotion could be created and then never paid for from
   * anywhere in the product. It sat at "Awaiting payment" for ever, holding a city slot.
   */
  it('offers a way to pay for a promotion that is awaiting payment', async () => {
    await renderWith([
      { ...BASE_PLACEMENT, status: 'pending_payment', awaitingPayment: true, impressions: 0, clicks: 0 },
    ]);
    await waitFor(() => expect(screen.getByText('Awaiting payment')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /pay now/i })).toBeInTheDocument();
  });

  it('does not offer to pay for a promotion that is already running', async () => {
    // Re-opening a charge for a paid placement would be taking money for something not owed.
    await renderWith([{ ...BASE_PLACEMENT, status: 'active', awaitingPayment: false }]);
    await waitFor(() => expect(screen.getByText('Running')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /pay now/i })).not.toBeInTheDocument();
  });

  /**
   * The bug: the purchase flow never asks for a destination, so every business-bought ad arrived
   * with `clickUrl: null` and rendered as a card that could not be tapped. A vendor was paying for
   * a promotion that went nowhere.
   */
  it('links an internal destination in the same tab, without a sponsored rel', async () => {
    const { AdSlot } = await import('./components/AdSlot');
    render(
      <Providers>
        <AdSlot ads={[{ ...AD, clickUrl: '/business/biz_1' }]} surface="map_banner" />
      </Providers>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/business/biz_1');
    // Our own route: a new tab loses the user's place, and `sponsored` on our own page is nonsense.
    expect(link).not.toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel') ?? '').not.toMatch(/sponsored/);
  });

  it('keeps the new tab and sponsored rel for a destination that leaves the app', async () => {
    const { AdSlot } = await import('./components/AdSlot');
    render(
      <Providers>
        <AdSlot ads={[{ ...AD, clickUrl: 'https://example.com' }]} surface="map_banner" />
      </Providers>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel') ?? '').toMatch(/sponsored/);
  });

  /**
   * Stored XSS: an ad is written by one advertiser and rendered on strangers' maps, so a
   * `javascript:` href would run attacker code in a victim's session. The server constrains the
   * scheme; this is the render-site guard that means a future entry point cannot reintroduce it.
   */
  it.each([
    'javascript:alert(document.cookie)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '//evil.com',
  ])('refuses to make %s clickable', async (evil) => {
    const { AdSlot } = await import('./components/AdSlot');
    render(
      <Providers>
        <AdSlot ads={[{ ...AD, clickUrl: evil }]} surface="map_banner" />
      </Providers>,
    );
    // Renders as a plain card: the copy is still there, but there is nothing to click.
    expect(screen.getByText('Fresh birria till 8pm')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('is honest about a paid promotion that delivered nothing yet', async () => {
    await renderWith([{ ...BASE_PLACEMENT, impressions: 0, clicks: 0, clickThroughRate: 0 }]);
    await waitFor(() => expect(screen.getByText(/No views yet/i)).toBeInTheDocument());
  });

  it('offers a way in when nothing has been bought yet', async () => {
    await renderWith([]);
    await waitFor(() => expect(screen.getByText('No promotions yet')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Create a promotion/ })).toBeInTheDocument();
  });
});
