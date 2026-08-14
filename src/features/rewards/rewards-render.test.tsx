import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import type { ReactNode } from 'react';
import { darkTheme } from '@/styles/theme';
import { makeQueryClient } from '@/lib/query/queryClient';
import { ToastProvider } from '@/components/feedback/ToastProvider';
import type { LoyaltyCard, LoyaltyReward, WishlistItem } from './types';

/**
 * 7.2 / 7.3 / 7.4 — the rewards hub.
 *
 * The assertions here are the promises the screen makes to a customer, not its layout:
 *
 *  1. **A referral says what earns the reward before you share the code.** A programme that pays on
 *     the friend's first completed ORDER, described as if it pays on signup, reads as a scam the
 *     moment somebody signs up and nothing arrives.
 *  2. **A reward code is legible.** It gets read aloud at a counter.
 *  3. **A stamp card whose programme ended says so**, rather than showing a bar that can never fill.
 *
 * Hooks are mocked rather than driven through demo mode, for the same reason the ads tests do it:
 * `isMapDemo` is captured when `@/lib/env` is first evaluated, so a later `stubEnv` reads too late.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mocks = vi.hoisted(() => ({
  rewards: [] as LoyaltyReward[],
  cards: [] as LoyaltyCard[],
  wishlist: [] as WishlistItem[],
}));

vi.mock('./hooks/useRewards', () => ({
  useLoyaltyRewards: () => ({ data: mocks.rewards, isLoading: false }),
  useLoyaltyCards: () => ({ data: mocks.cards, isLoading: false }),
  useWishlist: () => ({ data: mocks.wishlist, isLoading: false }),
  useReferrals: () => ({ data: { referrals: [], credits: [] }, isLoading: false }),
  useRemoveFromWishlist: () => ({ mutate: vi.fn(), isPending: false }),
  useReferralCode: () => ({ mutate: vi.fn(), isPending: false, data: undefined }),
  useClaimReferral: () => ({ mutate: vi.fn(), isPending: false }),
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

async function renderHub() {
  const { RewardsHub } = await import('./components/RewardsHub');
  render(
    <Providers>
      <RewardsHub />
    </Providers>,
  );
  await waitFor(() => expect(screen.getByText('Rewards')).toBeInTheDocument());
}

afterEach(() => {
  mocks.rewards = [];
  mocks.cards = [];
  mocks.wishlist = [];
  vi.clearAllMocks();
});

describe('rewards hub (7.2/7.3/7.4)', () => {
  it('says a referral pays on the first completed ORDER, before the code is shared', async () => {
    // Said up front, not after a friend signs up and nothing happens.
    await renderHub();
    expect(screen.getByText(/completes their first order/i)).toBeInTheDocument();
    expect(screen.getByText(/not at sign-up/i)).toBeInTheDocument();
  });

  it('shows a reward code prominently — it gets read aloud at a counter', async () => {
    mocks.rewards = [
      {
        id: 'r1',
        businessId: 'b1',
        description: 'A free taco plate',
        code: 'K7RQ2MNX',
        earnedAt: new Date().toISOString(),
      },
    ];
    await renderHub();
    expect(screen.getByText('K7RQ2MNX')).toBeInTheDocument();
    expect(screen.getByText(/only be used once/i)).toBeInTheDocument();
  });

  it('describes a stamp card’s progress to a screen reader, not only in pips', async () => {
    mocks.cards = [
      {
        businessId: 'b1',
        stamps: 7,
        stampsRequired: 10,
        rewardDescription: 'A free taco plate',
        active: true,
        lifetimeStamps: 7,
      },
    ];
    await renderHub();
    expect(screen.getByLabelText('7 of 10 stamps collected')).toBeInTheDocument();
  });

  it('says a card is history when the vendor ended the programme', async () => {
    // Rather than showing a progress bar that can never fill.
    mocks.cards = [
      {
        businessId: 'b1',
        stamps: 4,
        stampsRequired: 10,
        rewardDescription: 'A free taco plate',
        active: false,
        lifetimeStamps: 4,
      },
    ];
    await renderHub();
    expect(screen.getByText(/no longer running a stamp card/i)).toBeInTheDocument();
  });

  it('tells a wish-list owner the alert fires once', async () => {
    // The restraint is the feature. A customer who expects an alert every time will think it broke.
    mocks.wishlist = [
      {
        id: 'w1',
        subjectType: 'menu_item',
        subjectId: 'm1',
        label: 'Birria Tacos',
        businessId: 'b1',
        notified: false,
        createdAt: new Date().toISOString(),
      },
    ];
    await renderHub();
    expect(screen.getByText(/tell you once when this is available again/i)).toBeInTheDocument();
  });

  it('offers an empty state that explains how a card starts', async () => {
    await renderHub();
    expect(screen.getByText(/starts automatically/i)).toBeInTheDocument();
  });
});
