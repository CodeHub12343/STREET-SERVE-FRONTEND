import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import type { RtoListingDisclosure } from './types';

/**
 * §44 disclosure + §47 acceptance.
 *
 * These assertions are consumer-protection requirements, not styling preferences:
 *
 *  - The total cost to own must be visible before acceptance, and must not be subordinate to the
 *    instalment. A screen that shouts "$25/week" and whispers "$1,300 total" is the exact pattern
 *    §47 exists to prevent.
 *  - The "may cost more than buying outright" line comes from the server verbatim. A client that
 *    paraphrases a disclosure is a client that can soften one.
 *  - Acceptance is blocked until the agreement is actually acknowledged.
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

/** $600 cash, $75 up front, 12 × $60 monthly → $795 to own, $195 over cash (the spec's §47 example). */
const OFFER: RtoListingDisclosure = {
  listing: {
    id: 'l1',
    sellerId: 'biz1',
    productName: 'Washing machine',
    description: 'Reconditioned, 12-month warranty.',
    photos: [],
    categoryId: 'cat1',
    citySlug: 'modesto-ca',
    cashPriceCents: 60000,
    initialPaymentCents: 7500,
    installmentCount: 12,
    frequency: 'monthly',
    markupBps: 3250,
    setupFeeCents: 0,
    lateFeeCents: 0,
    listingTerms: {
      maintenanceResponsibility: 'customer',
      damageResponsibility: 'customer',
      returnAllowed: false,
      returnTransportResponsibility: 'customer',
      restockingFeeCents: 0,
      paymentsRefundableOnReturn: false,
      ownershipCreditPreservedOnReturn: false,
      reinstatementAllowed: true,
      cancellationNoticeDays: 7,
      deliveryFeeCents: 0,
      taxBps: 0,
    },
    obligations: [],
    quantityAvailable: 3,
    status: 'active',
  },
  cashPriceCents: 60000,
  initialPaymentCents: 7500,
  totalToOwnCents: 79500,
  costOverCashCents: 19500,
  installmentAmountCents: 6000,
  installmentCount: 12,
  frequency: 'monthly',
  graceDays: 7,
  setupFeeCents: 0,
  lateFeeCents: 0,
  schedule: [],
  disclosure:
    "You'll pay $795.00 total to own this — $195.00 more than the $600.00 cash price. " +
    'Rent-to-own may cost more than buying outright.',
  listingTerms: {
    maintenanceResponsibility: 'customer',
    damageResponsibility: 'customer',
    returnAllowed: false,
    returnTransportResponsibility: 'customer',
    restockingFeeCents: 0,
    paymentsRefundableOnReturn: false,
    ownershipCreditPreservedOnReturn: false,
    reinstatementAllowed: true,
    cancellationNoticeDays: 7,
    deliveryFeeCents: 0,
    taxBps: 0,
  },
  obligations: [
    'You are responsible for maintaining the item.',
    'This agreement does not offer a voluntary return before the term ends.',
    "To cancel, give 7 days' notice.",
  ],
};

const acceptMutate = vi.fn();

async function renderOffer(overrides: Partial<RtoListingDisclosure> = {}) {
  vi.resetModules();
  vi.doMock('./hooks/useRto', async () => {
    const actual = await vi.importActual<typeof import('./hooks/useRto')>('./hooks/useRto');
    return {
      ...actual,
      useRtoListing: () => ({
        data: { ...OFFER, ...overrides },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      }),
      useAcceptRtoListing: () => ({ mutate: acceptMutate, isPending: false }),
    };
  });
  vi.doMock('@/features/vendor/hooks/useAgreement', () => ({
    useAgreement: () => ({
      data: {
        type: 'rto',
        version: 'v1',
        title: 'Rent-to-Own Agreement',
        body: 'The customer pays in installments; ownership transfers after the final payment.',
        contentHash: 'h',
      },
      isLoading: false,
    }),
  }));
  const { RtoOfferDetail } = await import('./components/RtoOfferDetail');
  return render(
    <Providers>
      <RtoOfferDetail id="l1" />
    </Providers>,
  );
}

afterEach(() => {
  acceptMutate.mockReset();
  vi.doUnmock('./hooks/useRto');
  vi.doUnmock('@/features/vendor/hooks/useAgreement');
  vi.resetModules();
});

describe('RTO offer — §44 disclosure', () => {
  it('shows the total cost to own before acceptance, not just the instalment', async () => {
    await renderOffer();
    await waitFor(() => expect(screen.getByText('Washing machine')).toBeInTheDocument());

    // The instalment people shop on…
    expect(screen.getByText('$60.00')).toBeInTheDocument();
    // …and the number §47 says they must understand, given its own headline rather than left to be
    // inferred from the disclosure sentence (which also states it — hence `getAllByText`).
    expect(screen.getByText('$795.00 total to own')).toBeInTheDocument();
    expect(screen.getAllByText(/\$795\.00/).length).toBeGreaterThan(1);
    expect(screen.getByText('$600.00')).toBeInTheDocument(); // cash price
    expect(screen.getByText('$195.00')).toBeInTheDocument(); // the delta
  });

  it('renders the server’s disclosure verbatim rather than paraphrasing it', async () => {
    await renderOffer();
    await waitFor(() =>
      expect(screen.getByText(OFFER.disclosure)).toBeInTheDocument(),
    );
    expect(screen.getByText(OFFER.disclosure)).toHaveTextContent(
      /may cost more than buying outright/i,
    );
  });

  it('lists every §44 obligation in full, not behind a link', async () => {
    await renderOffer();
    for (const line of OFFER.obligations) {
      expect(await screen.findByText(line)).toBeInTheDocument();
    }
  });

  /**
   * §51's sharpest requirement: a customer must never be led to believe past payments create
   * ownership unless the agreement grants credit. The wording is the server's; this asserts the
   * screen actually shows it when a seller does offer returns.
   */
  it('states plainly that payments are not refunded when returns are offered without credit', async () => {
    await renderOffer({
      obligations: [
        'You can return the item before the end of the term.',
        'If you return the item, your previous payments are NOT refunded — they were rent for the time you had it.',
      ],
    });
    expect(
      await screen.findByText(/previous payments are NOT refunded/),
    ).toBeInTheDocument();
  });
});

describe('RTO offer — §47 acceptance', () => {
  it('will not accept until the customer acknowledges the total cost', async () => {
    await renderOffer();
    await waitFor(() => expect(screen.getByText('Washing machine')).toBeInTheDocument());

    const cta = screen.getByRole('button', { name: /Accept and start paying/ });
    expect(cta).toBeDisabled();
    expect(acceptMutate).not.toHaveBeenCalled();

    // The acknowledgement restates the total — ticking it is a statement about the price, not a
    // generic "I agree".
    const tick = screen.getByRole('checkbox');
    expect(tick.closest('label')).toHaveTextContent('$795.00');

    await userEvent.click(tick);
    expect(cta).toBeEnabled();
    await userEvent.click(cta);
    expect(acceptMutate).toHaveBeenCalledWith({ listingId: 'l1' }, expect.anything());
  });

  it('sends only the listing id — the customer never names a price', async () => {
    await renderOffer();
    await userEvent.click(await screen.findByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /Accept and start paying/ }));

    const [payload] = acceptMutate.mock.calls[0] as [Record<string, unknown>];
    expect(Object.keys(payload)).toEqual(['listingId']);
  });
});
