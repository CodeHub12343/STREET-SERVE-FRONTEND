/**
 * Seller onboarding progress. Persists whether the seller has seen the intro (S-01), so the
 * Street Seller surface opens on the onboarding pitch the FIRST time and jumps straight to
 * Discover on every visit after. One flag, persisted across sessions.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SellerOnboardingState {
  introSeen: boolean;
  markIntroSeen: () => void;
}

export const useSellerOnboardingStore = create<SellerOnboardingState>()(
  persist(
    (set) => ({
      introSeen: false,
      markIntroSeen: () => set({ introSeen: true }),
    }),
    { name: 'ss-seller-onboarding' },
  ),
);
