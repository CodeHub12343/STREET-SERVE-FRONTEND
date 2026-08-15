import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithTheme } from '@/test/test-utils';
import { useSellerOnboardingStore } from '@/stores/sellerOnboarding.store';
import { SellerIntro } from './components/SellerIntro';

const replace = vi.fn();
const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
}));

/**
 * S-01 is a first-visit pitch. It used to record "seen" only when the CTA was pressed, so leaving
 * by any other route — the orb, back, switching mode — left the flag false and the pitch returned
 * on every visit to the Street Seller surface, which is what a seller actually reported.
 */
describe('SellerIntro', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    useSellerOnboardingStore.setState({ introSeen: false });
  });

  afterEach(() => {
    useSellerOnboardingStore.setState({ introSeen: false });
  });

  it('shows the pitch on a first visit and does not redirect', () => {
    renderWithTheme(<SellerIntro />);

    expect(screen.getByRole('button', { name: /Find inventory near me/i })).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('counts arriving as having seen it, not converting', () => {
    // The seller opens the intro and leaves without pressing anything.
    renderWithTheme(<SellerIntro />);

    expect(useSellerOnboardingStore.getState().introSeen).toBe(true);
  });

  it('forwards a returning seller straight to Discover', () => {
    useSellerOnboardingStore.setState({ introSeen: true });

    renderWithTheme(<SellerIntro />);

    // `replace`, not `push` — the pitch must not sit in the back stack.
    expect(replace).toHaveBeenCalledWith('/seller');
    expect(push).not.toHaveBeenCalled();
  });

  it('does not redirect the visitor away from the pitch it just marked seen', () => {
    // Marking seen flips the store; re-checking the NEW value would bounce them off the screen
    // they had only just opened. The mount value is the one that answers "have they been here?".
    renderWithTheme(<SellerIntro />);

    expect(useSellerOnboardingStore.getState().introSeen).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });
});
