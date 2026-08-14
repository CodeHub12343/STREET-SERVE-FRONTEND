import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import type { Delivery, DeliveryOffer, DriverProfile } from './types';

/**
 * Delivery Assist Network — the driver, customer and vendor surfaces (ADR-004).
 *
 * These tests are weighted the same way the backend's are: mostly toward **prohibitions**, because
 * this is the only feature on the platform carrying third-party physical risk and the things that
 * matter most are the ones that must never appear.
 *
 *  1. **No decline control, and nothing that counts one.** ADR-004 prohibits acceptance-rate
 *     pressure; a decline button needs a handler, a handler needs an endpoint, and an endpoint is
 *     one product meeting away from a counter.
 *  2. **Never tell a driver they are covered** (CR-3) — the insurance copy is entirely about their
 *     own obligation.
 *  3. **Not a job** (CR-4) and **nothing guaranteed** (CR-5).
 *  4. **The address arrives only after accepting** (A-15), and the proof code belongs to the
 *     customer alone.
 *  5. **"Nobody accepted" leads with the money**, because that is the customer's actual question.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const OFFER: DeliveryOffer = {
  deliveryId: 'dl1',
  payoutCents: 800,
  pickup: { lng: -122.42, lat: 37.77 },
  dropOffArea: { lng: -122.43, lat: 37.78, city: 'Testville' },
  expiresAt: new Date(Date.now() + 80_000).toISOString(),
};

const ACCEPTED: Delivery = {
  id: 'dl1',
  orderId: 'o1',
  status: 'accepted',
  pickup: { lng: -122.42, lat: 37.77 },
  destination: {
    line1: '14 Alder Street',
    line2: null,
    city: 'Testville',
    postalCode: 'T1 1AA',
    lng: -122.43,
    lat: 37.78,
    notes: 'Blue door, ring twice',
    contactPhone: '555-0100',
  },
  payoutCents: 800,
  coordinationFeeCents: 0,
  customerTotalCents: 800,
  expiresAt: new Date().toISOString(),
  acceptedAt: new Date().toISOString(),
  deliveredAt: null,
  endedReason: null,
};

const mocks = vi.hoisted(() => ({
  profile: null as DriverProfile | null,
  eligibility: { eligible: false, reasons: ['no_profile'] } as {
    eligible: boolean;
    reasons: string[];
  },
  offers: [] as DeliveryOffer[],
  delivery: null as Delivery | null,
  activeId: undefined as string | undefined,
  accept: vi.fn(),
  request: vi.fn(),
  apply: vi.fn(),
}));

vi.mock('./hooks/useDelivery', () => ({
  useDriverProfile: () => ({ data: mocks.profile, isLoading: false }),
  useDriverEligibility: () => ({ data: mocks.eligibility, isLoading: false }),
  useApplyToDrive: () => ({ mutate: mocks.apply, isPending: false }),
  useRenewAttestation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeliveryOffers: () => ({ data: mocks.offers, isLoading: false }),
  useDelivery: () => ({ data: mocks.delivery, isLoading: false }),
  useAcceptDelivery: () => ({ mutate: mocks.accept, isPending: false }),
  useMarkPickedUp: () => ({ mutate: vi.fn(), isPending: false }),
  useCompleteDelivery: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkUndeliverable: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelDelivery: () => ({ mutate: vi.fn(), isPending: false }),
  useReportIncident: () => ({ mutate: vi.fn(), isPending: false }),
  useReportPosition: () => ({ mutate: vi.fn(), isPending: false }),
  useRequestDelivery: () => ({ mutate: mocks.request, isPending: false }),
}));

vi.mock('./hooks/useDeliveryOffers', () => ({
  useAcceptDelivery: () => ({ mutate: mocks.accept, isPending: false }),
  useActiveDelivery: () => ({ data: null, isLoading: false }),
  useDeliveryEligibleOffers: () => ({
    offers: mocks.offers,
    isLoading: false,
    eligibility: mocks.eligibility,
    activeId: mocks.activeId,
  }),
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
  mocks.profile = null;
  mocks.eligibility = { eligible: false, reasons: ['no_profile'] };
  mocks.offers = [];
  mocks.delivery = null;
  mocks.activeId = undefined;
  vi.clearAllMocks();
});

// ─── driver onboarding ──────────────────────────────────────────────────────────────────────
describe('applying to drive', () => {
  async function renderOnboarding() {
    const { DriverOnboarding } = await import('./components/DriverOnboarding');
    render(
      <Providers>
        <DriverOnboarding />
      </Providers>,
    );
  }

  it('never tells a driver they are covered (CR-3)', async () => {
    await renderOnboarding();
    const copy = document.body.textContent?.toLowerCase() ?? '';
    // The platform's policy protects the platform. A driver whose personal policy excludes delivery,
    // told by an app that they're covered, has been misled into a risk they didn't know they took.
    for (const forbidden of ['you are covered', 'you’re covered', 'we insure', 'our policy', 'covered by us']) {
      expect(copy, `forbidden phrase "${forbidden}"`).not.toContain(forbidden);
    }
    // It asks about THEIR insurance instead.
    expect(copy).toContain('insurance that covers using your vehicle for delivery');
  });

  it('says it is not a job, and promises no earnings (CR-4, CR-5)', async () => {
    await renderOnboarding();
    const copy = document.body.textContent?.toLowerCase() ?? '';
    // Only AFFIRMATIVE employment framing is forbidden — "not an employee" is the required
    // disclaimer, so a bare "employee" substring rule would ban the very sentence CR-4 mandates.
    for (const forbidden of [
      'you are an employee',
      'you’re an employee',
      'hourly',
      'wage',
      'salary',
      'your shift',
      'guaranteed',
      'earn up to',
      'per hour',
    ]) {
      expect(copy, `forbidden phrase "${forbidden}"`).not.toContain(forbidden);
    }
    expect(copy).toContain('not an employee');
    expect(copy).toContain('there’s no schedule');
  });

  it('says up front that turning work down costs nothing', async () => {
    await renderOnboarding();
    // ADR-004 §2. If a driver believes declining is counted, the prohibition has failed in practice
    // whether or not anything is actually recorded.
    expect(screen.getByText(/turning one down\s+costs you nothing/i)).toBeInTheDocument();
  });

  it('asks for an emergency contact — absent from the specification', async () => {
    await renderOnboarding();
    expect(screen.getByText(/someone we can call/i)).toBeInTheDocument();
  });

  it('translates every eligibility blocker into plain language', async () => {
    mocks.profile = {
      userId: 'u1',
      vehicleType: 'bicycle',
      vehicleDescription: null,
      status: 'pending',
      backgroundCheckStatus: 'pending',
      insuranceExpiresAt: null,
      licenceExpiresAt: null,
      suspendedReason: null,
      emergencyContactName: null,
    };
    mocks.eligibility = { eligible: false, reasons: ['awaiting_approval', 'payout_account'] };
    await renderOnboarding();

    expect(screen.getByText(/still reviewing your application/i)).toBeInTheDocument();
    expect(screen.getByText(/add a payout account/i)).toBeInTheDocument();
    // The raw enum must never reach a screen.
    expect(screen.queryByText(/awaiting_approval|payout_account/)).toBeNull();
  });
});

// ─── the offer list ─────────────────────────────────────────────────────────────────────────
describe('the driver’s offers', () => {
  async function renderOffers() {
    const { DriverOffers } = await import('./components/DriverOffers');
    render(
      <Providers>
        <DriverOffers />
      </Providers>,
    );
  }

  it('shows the payout and only an AREA for the drop-off (A-15)', async () => {
    mocks.eligibility = { eligible: true, reasons: [] };
    mocks.offers = [OFFER];
    await renderOffers();

    expect(screen.getByRole('button', { name: /take it · \$8\.00/i })).toBeInTheDocument();
    expect(screen.getByText(/drop off around Testville/i)).toBeInTheDocument();
    // Every driver in range gets this. Sending a stranger's address to all of them would be a
    // disclosure with no purpose.
    expect(screen.queryByText(/Alder Street/)).toBeNull();
    expect(screen.getByText(/full address once you take it/i)).toBeInTheDocument();
  });

  it('has no decline control, and shows no rate, score, or streak', async () => {
    mocks.eligibility = { eligible: true, reasons: [] };
    mocks.offers = [OFFER];
    await renderOffers();

    expect(screen.queryByRole('button', { name: /^decline$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull();
    const copy = document.body.textContent?.toLowerCase() ?? '';
    for (const forbidden of ['acceptance rate', 'completion rate', 'streak', 'your score', 'rating']) {
      expect(copy, `forbidden metric "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it('"Not this one" sends nothing — it only hides the card', async () => {
    const user = userEvent.setup();
    mocks.eligibility = { eligible: true, reasons: [] };
    mocks.offers = [OFFER];
    await renderOffers();

    await user.click(screen.getByRole('button', { name: /not this one/i }));
    // The offer expires on its own. There is deliberately no server-side notion of declining.
    expect(mocks.accept).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /take it/i })).toBeNull();
  });

  it('promises nothing about how much work there is', async () => {
    mocks.eligibility = { eligible: true, reasons: [] };
    await renderOffers();
    const copy = document.body.textContent?.toLowerCase() ?? '';
    expect(copy).toContain('nothing right now');
    // CR-5 — the platform does not control how many offers exist.
    expect(copy).not.toContain('stay online');
    expect(copy).not.toContain('guaranteed');
  });
});

// ─── customer tracking ──────────────────────────────────────────────────────────────────────
describe('the customer’s tracker', () => {
  async function renderTracking() {
    const { DeliveryTracking } = await import('./components/DeliveryTracking');
    render(
      <Providers>
        <DeliveryTracking deliveryId="dl1" />
      </Providers>,
    );
  }

  it('shows the hand-off code to the customer, and explains why', async () => {
    mocks.delivery = { ...ACCEPTED, status: 'picked_up', proofCode: '482913' };
    await renderTracking();

    expect(screen.getByText('482913')).toBeInTheDocument();
    // Knowing it is the proof — so the customer needs to know the driver can't see it.
    expect(screen.getByText(/they can’t see it/i)).toBeInTheDocument();
  });

  it('leads with the money when nobody accepted', async () => {
    mocks.delivery = { ...ACCEPTED, status: 'expired', proofCode: undefined };
    await renderTracking();

    // The customer's actual question is "am I out of pocket". A red error state that doesn't answer
    // it produces a support ticket.
    expect(screen.getByText(/haven’t been charged for delivery/i)).toBeInTheDocument();
    expect(screen.queryByText('482913')).toBeNull();
  });

  it('hides the code once the delivery is done', async () => {
    mocks.delivery = { ...ACCEPTED, status: 'delivered', proofCode: '482913' };
    await renderTracking();
    expect(screen.queryByText('482913')).toBeNull();
  });
});

// ─── the vendor's request ───────────────────────────────────────────────────────────────────
describe('the vendor asking for a driver', () => {
  async function renderButton() {
    const { RequestDriverButton } = await import('./components/RequestDriverButton');
    render(
      <Providers>
        <RequestDriverButton orderId="o1" />
      </Providers>,
    );
  }

  it('lets the vendor name the payout, and says drivers see it first', async () => {
    const user = userEvent.setup();
    await renderButton();
    await user.click(screen.getByRole('button', { name: /need delivery help/i }));

    // ADR-004 §2 — a rate a driver only discovers after accepting would be prohibited control.
    expect(screen.getByText(/drivers nearby see this amount before they decide/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ask drivers/i }));
    expect(mocks.request).toHaveBeenCalledWith(
      { orderId: 'o1', driverPayoutCents: 800 },
      expect.anything(),
    );
  });

  it('tells the vendor nobody is charged if no driver takes it', async () => {
    const user = userEvent.setup();
    await renderButton();
    await user.click(screen.getByRole('button', { name: /need delivery help/i }));
    // A vendor who thinks this might charge their customer will not try it.
    expect(screen.getByText(/isn’t charged for delivery/i)).toBeInTheDocument();
  });
});
