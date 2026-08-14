import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import type { AxeResults } from 'axe-core';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactElement, ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import type { ArtworkSpec, PostcardAsset, PostcardOrder, PostcardProduct } from './types';

/**
 * Postcard Marketing — the buyer-facing surfaces (ADR-007).
 *
 * This feature charges real money for something that **cannot be undone**: once the printer's batch
 * closes, the paper exists and no refund brings it back. So these tests are mostly about whether the
 * screens tell the truth, in time for it to matter:
 *
 *  1. the irreversibility is stated **before** the pay button, in words, not in terms;
 *  2. an expired price is shown as expired rather than silently honoured or silently refreshed;
 *  3. artwork that would print badly blocks the order at upload, while the fix is still cheap;
 *  4. the buyer is told plainly that we never see the recipients' names or addresses;
 *  5. the timeline stops at "mailed" and admits the postal service reports nothing after that.
 *
 * Hooks are mocked rather than driven through demo mode, matching the Boost tests: `isMapDemo` is
 * captured when `@/lib/env` is first evaluated, so flipping it per-test does not work.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const PRODUCT: PostcardProduct = {
  sku: '68',
  label: '6 × 8.5 postcard',
  designedSides: 1,
  trim: '6 x 8.5',
  widthIn: 6,
  heightIn: 8.5,
  mailClasses: ['standard', 'first_class'],
  minQuantity: 500,
  maxQuantity: 50_000,
};

const SPEC: ArtworkSpec = {
  sku: '68',
  label: '6 × 8.5 postcard',
  designedSides: 1,
  trimWidthIn: 6,
  trimHeightIn: 8.5,
  fullWidthIn: 6.25,
  fullHeightIn: 8.75,
  bleedIn: 0.125,
  safeAreaIn: 0.125,
  targetDpi: 300,
  minDpi: 200,
  recommendedWidthPx: 1875,
  recommendedHeightPx: 2625,
  minimumWidthPx: 1250,
  minimumHeightPx: 1750,
  acceptedFormats: ['jpeg', 'png', 'pdf'],
  templatesUrl: 'https://pcmintegrations.com/templates',
};

function order(over: Partial<PostcardOrder> = {}): PostcardOrder {
  return {
    id: 'ord1',
    businessId: 'b1',
    status: 'quoted',
    sku: '68',
    mailClass: 'standard',
    audienceId: 'aud1',
    assetId: 'ast1',
    quantity: 1_000,
    price: {
      vendorUnitCostCents: 38,
      vendorCostCents: 38_000,
      marginCents: 4_222,
      totalCents: 42_222,
      quotedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
      isExpired: false,
    },
    payment: null,
    fulfilment: null,
    submissionProblem: null,
    mailDate: new Date('2026-09-01T00:00:00Z').toISOString(),
    cancelledReason: null,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

const mocks = vi.hoisted(() => ({
  asset: null as PostcardAsset | null,
  uploadPending: false,
  checkout: vi.fn(),
  quote: vi.fn(),
}));

vi.mock('./hooks/usePostcards', () => ({
  usePostcardProducts: () => ({ data: [PRODUCT], isLoading: false }),
  useArtworkSpec: () => ({ data: SPEC, isLoading: false }),
  useListTypes: () => ({ data: [{ key: 'IRL', label: 'Residents' }], isLoading: false }),
  usePostcardOrders: () => ({ data: [], isLoading: false }),
  usePostcardOrder: () => ({ data: undefined, isLoading: false }),
  useCreateOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useConfigureOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useQuoteOrder: () => ({ mutateAsync: mocks.quote, isPending: false }),
  useCheckoutOrder: () => ({ mutateAsync: mocks.checkout, isPending: false }),
  useCancelOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateAudience: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArtworkAsset: () => ({ data: mocks.asset, isLoading: false }),
  useUploadArtwork: () => ({
    mutateAsync: vi.fn().mockResolvedValue(mocks.asset),
    isPending: mocks.uploadPending,
  }),
  useModerationQueue: () => ({ data: [], isLoading: false }),
  useModerateArtwork: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

async function auditNoViolations(ui: ReactElement) {
  const { container } = render(<Providers>{ui}</Providers>);
  const results = (await axe(container)) as AxeResults;
  expect(results).toHaveNoViolations();
}

afterEach(() => {
  mocks.asset = null;
  mocks.uploadPending = false;
  vi.clearAllMocks();
});

// ─── review & pay ───────────────────────────────────────────────────────────────────────────
describe('review & pay — the last screen before the money moves', () => {
  async function renderReview(o: PostcardOrder) {
    const { ReviewStep } = await import('./components/steps/ReviewStep');
    render(
      <Providers>
        <ReviewStep order={o} businessId="b1" />
      </Providers>,
    );
  }

  it('states the irreversibility before the pay button, in plain words', async () => {
    await renderReview(order());

    // The rule the whole feature is built around (F-4, ADR-007 §2). If this ever disappears,
    // someone is being asked to authorise something permanent without being told it is permanent.
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be recalled, changed or refunded/i)).toBeInTheDocument();

    // And it has to come BEFORE the control, not after it, in reading order.
    const notice = screen.getByRole('note');
    const payButton = screen.getByRole('button', { name: /pay/i });
    expect(notice.compareDocumentPosition(payButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('says when the free cancellation window closes', async () => {
    await renderReview(order());
    // A real date, not "soon" — it is the deadline for changing their mind.
    expect(screen.getByText(/cancel free of charge up until your mail date/i)).toBeInTheDocument();
  });

  it('refuses to take payment on an expired price, and offers to refresh it', async () => {
    await renderReview(
      order({
        price: {
          ...order().price!,
          isExpired: true,
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
        },
      }),
    );

    // Rates move and the vendor does not reserve a price (audit F-8). Showing the stale number as
    // if it were live would mean charging one figure and being invoiced another.
    expect(screen.getByText(/this price has expired/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pay/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /up-to-date price/i })).toBeEnabled();
  });

  it('itemises what is being charged', async () => {
    await renderReview(order());
    expect(screen.getByText(/printing, postage and service/i)).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('does not offer to pay again for an order already paid', async () => {
    await renderReview(order({ status: 'submitted' }));
    expect(screen.queryByRole('button', { name: /pay/i })).not.toBeInTheDocument();
    expect(screen.getByText(/this order is paid/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { ReviewStep } = await import('./components/steps/ReviewStep');
    await auditNoViolations(<ReviewStep order={order()} businessId="b1" />);
  });
});

// ─── artwork ────────────────────────────────────────────────────────────────────────────────
describe('artwork — catching a bad file while the fix is still cheap', () => {
  async function renderArtwork() {
    const { ArtworkStep } = await import('./components/steps/ArtworkStep');
    render(
      <Providers>
        <ArtworkStep
          businessId="b1"
          sku="68"
          currentAssetId={null}
          busy={false}
          onConfirm={vi.fn()}
        />
      </Providers>,
    );
  }

  it('tells the designer the exact pixel size before they upload anything', async () => {
    await renderArtwork();
    expect(screen.getByText(/1,875/)).toBeInTheDocument();
    expect(screen.getByText(/2,625/)).toBeInTheDocument();
  });

  it('says only the front is designed, so nobody designs a back that has nowhere to go', async () => {
    await renderArtwork();
    expect(screen.getByText(/front only/i)).toBeInTheDocument();
    expect(screen.getByText(/address side is set up for you/i)).toBeInTheDocument();
  });

  it('warns that a human reviews the design, and that rejection is refunded', async () => {
    await renderArtwork();
    expect(screen.getByText(/a person checks every design/i)).toBeInTheDocument();
    expect(screen.getByText(/refunded in full/i)).toBeInTheDocument();
  });

  it('will not let a failed file be used', async () => {
    // Errors block. The button stays disabled until pre-press actually passes.
    await renderArtwork();
    expect(screen.getByRole('button', { name: /use this design/i })).toBeDisabled();
  });

  it('has no accessibility violations', async () => {
    const { ArtworkStep } = await import('./components/steps/ArtworkStep');
    await auditNoViolations(
      <ArtworkStep businessId="b1" sku="68" currentAssetId={null} busy={false} onConfirm={vi.fn()} />,
    );
  });
});

// ─── area ───────────────────────────────────────────────────────────────────────────────────
describe('choosing an area', () => {
  async function renderArea() {
    const { AreaStep } = await import('./components/steps/AreaStep');
    render(
      <Providers>
        <AreaStep businessId="b1" selectedAudienceId={null} busy={false} onChoose={vi.fn()} />
      </Providers>,
    );
  }

  it('offers the three targeting modes the vendor actually supports', async () => {
    await renderArea();
    // No "neighborhood": it is not a postal unit and the vendor has no such targeting (PC-6).
    const modes = screen.getByRole('group', { name: /how to choose the area/i });
    expect(within(modes).getByRole('button', { name: /zip codes/i })).toBeInTheDocument();
    expect(within(modes).getByRole('button', { name: /postal routes/i })).toBeInTheDocument();
    expect(within(modes).getByRole('button', { name: /around an address/i })).toBeInTheDocument();
    expect(screen.queryByText(/neighbou?rhood/i)).not.toBeInTheDocument();
  });

  it('does not show a count until one has been asked for', async () => {
    // Counting costs a vendor call, so it is an explicit act rather than a keystroke side effect.
    await renderArea();
    expect(screen.getByRole('button', { name: /count addresses/i })).toBeInTheDocument();
    // Asserted on the count itself rather than on `role="status"`: the toast provider always
    // renders an empty live region, so the broad query matches whether or not anything happened.
    expect(screen.queryByText(/deliverable addresses/i)).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { AreaStep } = await import('./components/steps/AreaStep');
    await auditNoViolations(
      <AreaStep businessId="b1" selectedAudienceId={null} busy={false} onChoose={vi.fn()} />,
    );
  });
});

// ─── quantity ───────────────────────────────────────────────────────────────────────────────
describe('quantity', () => {
  async function renderQuantity(o = order({ quantity: null })) {
    const { QuantityStep } = await import('./components/steps/QuantityStep');
    render(
      <Providers>
        <QuantityStep order={o} product={PRODUCT} busy={false} onConfirm={vi.fn()} />
      </Providers>,
    );
  }

  it('enforces the printer’s minimum with a reason rather than a silent block', async () => {
    const user = userEvent.setup();
    await renderQuantity();
    const input = screen.getByLabelText(/number of postcards/i);
    await user.clear(input);
    await user.type(input, '10');

    expect(screen.getByText(/minimum for this size is 500/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('shows no price here, and says why', async () => {
    // Volume bands mean a locally-multiplied total would be wrong (audit F-9).
    await renderQuantity();
    expect(screen.getByText(/priced in volume bands/i)).toBeInTheDocument();
  });
});

// ─── order list ─────────────────────────────────────────────────────────────────────────────
describe('order history', () => {
  async function renderCard(o: PostcardOrder) {
    const { PostcardOrderCard } = await import('./components/PostcardOrderList');
    render(
      <Providers>
        <PostcardOrderCard order={o} />
      </Providers>,
    );
  }

  it('admits the postal service reports nothing after handover', async () => {
    await renderCard(
      order({
        status: 'submitted',
        fulfilment: {
          stage: 'mailed',
          stageAt: new Date().toISOString(),
          label: 'Mailed',
          description: 'Your postcards have been handed to the postal service.',
          vendorOrderId: 'v1',
          submittedAt: new Date().toISOString(),
        },
      }),
    );
    // Never claim delivery we cannot observe.
    expect(screen.getByText(/does not report the final delivery/i)).toBeInTheDocument();
  });

  it('shows a paid-but-unsubmitted order loudly rather than hiding it', async () => {
    await renderCard(
      order({
        status: 'submission_failed',
        submissionProblem: { message: 'The printer rejected the file.', attempts: 3 },
      }),
    );
    expect(screen.getByText(/did not reach the printer/i)).toBeInTheDocument();
    expect(screen.getByText(/the printer rejected the file/i)).toBeInTheDocument();
    // "Needs attention", not "Failed" — the buyer did nothing wrong and the money is recoverable.
    expect(screen.getByText(/needs attention/i)).toBeInTheDocument();
  });
});
