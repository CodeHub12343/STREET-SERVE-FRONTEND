import type { Cents } from '@/types';

/**
 * Pay It Forward (ADR-005). A customer contributes to a business's community fund; a later
 * customer's order is paid from it. The giver and the receiver never learn who each other are.
 *
 * Every shape here mirrors the backend `payforward` module exactly. Nothing about eligibility,
 * caps, or amounts is decided client-side — the server is authoritative, and the UI renders what it
 * is told. That matters more than usual here: the numbers are other people's money.
 */

export interface CommunityFund {
  businessId: string;
  /** What is available right now, in cents. */
  balanceCents: Cents;
  /** Off = the business has paused new contributions. Existing money stays redeemable. */
  accepting: boolean;
  maxPerRedemptionCents: Cents | null;
  maxPercentOfOrder: number;
  maxPerDayCents: Cents | null;
  expiryDays: number;
}

/**
 * Why the fund did or did not apply. Rendered as plain language — a customer who asked for help and
 * was charged in full is owed a reason, and "daily_limit" must never reach a screen untranslated.
 */
export type PayForwardReason = 'daily_limit' | 'verification_required' | 'exhausted' | null;

/** What the server says the fund would cover for this person on this order. No side effects. */
export interface PayForwardOffer {
  availableCents: Cents;
  reason: PayForwardReason;
}

/** What actually happened when the order was placed. */
export interface PayForwardOutcome {
  appliedCents: Cents;
  reason: PayForwardReason;
}

export interface CommunityContribution {
  id: string;
  amountCents: Cents;
  /**
   * The giver's chosen display name, or null when they gave anonymously — which is the default.
   * The API never returns a user id here, so there is nothing to leak by accident.
   */
  givenBy: string | null;
  note: string | null;
  createdAt: string;
}

/** The vendor's community-impact panel. Every figure is derived server-side from immutable rows. */
export interface CommunityImpact {
  businessId: string;
  availableCents: Cents;
  contributedCents: Cents;
  contributionCount: number;
  largestContributionCents: Cents;
  averageContributionCents: Cents;
  redeemedCents: Cents;
  redemptionCount: number;
  /** A count, never a list. Who accepted help is not the vendor's to publish. */
  peopleHelped: number;
}

export interface ContributeInput {
  amountCents: Cents;
  /** Omitted or true = anonymous. Opt-OUT, so the private answer is the one you get by default. */
  anonymous?: boolean;
  displayName?: string;
  note?: string;
}

export interface ContributeResult {
  contributionId: string;
  businessId: string;
  amountCents: Cents;
  /** Unchanged until the charge settles — the pool never rises on intent alone. */
  balanceCents: Cents;
  clientSecret: string | null;
}

export interface FundSettingsInput {
  accepting?: boolean;
  maxPerRedemptionCents?: Cents | null;
  maxPercentOfOrder?: number;
  maxPerDayCents?: Cents | null;
  expiryDays?: number;
}
