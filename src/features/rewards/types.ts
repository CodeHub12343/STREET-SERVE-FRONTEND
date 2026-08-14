/**
 * Phase 7 rewards + wish lists — the shapes the API returns.
 *
 * Kept in one feature because they are one idea from the customer's side: *things the app is
 * holding for me.* A stamp card, an earned reward, a referral credit, and a wish list entry are all
 * "come back for this", and splitting them across four features would put four half-empty screens
 * in the navigation.
 */

// ─── 7.2 wish lists ────────────────────────────────────────────────────────────────────────
export type WishlistSubject = 'menu_item' | 'product';

export interface WishlistItem {
  id: string;
  subjectType: WishlistSubject;
  subjectId: string;
  /** Captured when the wish was made, so the list survives a rename or a deletion. */
  label: string;
  businessId: string | null;
  /** True once the back-in-stock alert has fired. Re-adding re-arms it. */
  notified: boolean;
  createdAt: string;
}

// ─── 7.3 loyalty ───────────────────────────────────────────────────────────────────────────
export interface LoyaltyProgram {
  businessId: string;
  stampsRequired: number;
  rewardDescription: string;
  active: boolean;
}

export interface LoyaltyCard {
  businessId: string;
  stamps: number;
  /** Null when the vendor has ended the programme — the card is history, not progress. */
  stampsRequired: number | null;
  rewardDescription: string | null;
  active: boolean;
  lifetimeStamps: number;
}

export interface LoyaltyReward {
  id: string;
  businessId: string;
  description: string;
  /** Read out at the counter. Not a secret — the vendor confirms who is standing there. */
  code: string;
  earnedAt: string;
}

// ─── 7.4 referrals ─────────────────────────────────────────────────────────────────────────
export interface ReferralCode {
  code: string;
  rewardsEarned: number;
  cap: number;
}

export interface ReferralSummary {
  referrals: {
    id: string;
    status: 'pending' | 'converted' | 'lapsed';
    convertedAt: string | null;
    expiresAt: string;
  }[];
  credits: { id: string; reason: string; earnedAt: string }[];
}

export interface ReferralClaimResult {
  id: string;
  status: string;
  /** Says plainly that nothing is earned until the first order completes. */
  message: string;
  expiresAt: string;
}
