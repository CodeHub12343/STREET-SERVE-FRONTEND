/**
 * Ledger contracts (Phase 1 — docs/consignment/DATABASE_CHANGES.md).
 */
import type { Cents } from '@/types';

// ─── A-2: funds availability ────────────────────────────────────────────────────────────────
/** Verification tier — sets the payout hold. Mirrors the backend `Tier`. */
export type PayoutTier = 'tier0' | 'bronze' | 'silver' | 'gold';

/**
 * One REASON money isn't in the seller's hand. Each carries its own cause and remedy, because
 * "your payout is pending" is the answer that creates a support ticket rather than preventing one.
 */
export interface FundsBucket {
  key: 'on_the_way' | 'cash_sales' | 'no_payout_account' | 'not_settled';
  label: string;
  amountCents: Cents;
  /** `true` means this money cannot move at all yet — not merely that it's waiting out a hold. */
  blocked: boolean;
  reason: string;
  /** What the seller can do about it, when there is anything. */
  remedy: string | null;
}

export type FundsNextStepAction =
  | 'await_dispute'
  | 'connect_payout_account'
  | 'verify_identity';

/**
 * The honest answer to "why is my money held?". The platform holds payouts by verification tier,
 * can't pay out cash it never collected, and freezes everything during a dispute — all correct, and
 * all previously invisible to the seller.
 */
export interface FundsAvailability {
  tier: PayoutTier;
  /** Days a settled payout is held before reaching the bank. 0 for Gold. */
  holdDays: number;
  connected: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  /** Frozen is not delayed: an open dispute, with no hold clock running. */
  frozen: boolean;
  buckets: FundsBucket[];
  totals: { movingCents: Cents; blockedCents: Cents };
  nextStep: { action: FundsNextStepAction; label: string; detail: string } | null;
}

// ─── A-3: trust benefits ────────────────────────────────────────────────────────────────────
export type TrustBandKey = 'building' | 'established' | 'trusted' | 'elite';

export interface TrustBand {
  key: TrustBandKey;
  label: string;
  minScore: number;
  /** Multiplier on the tier's inventory ceiling. Never below 1 — trust is upside only. */
  inventoryMultiplier: number;
  /** Discount on the platform's consignment fee, paid entirely to the seller. */
  feeDiscountBps: number;
  premiumEligible: boolean;
}

/** What a seller's Trust Score actually buys, read from the same table the server enforces. */
export interface TrustBenefits {
  score: number;
  computedAt: string | null;
  formulaVersion: string;
  band: TrustBand;
  nextBand:
    | {
        key: TrustBandKey;
        label: string;
        minScore: number;
        pointsAway: number;
        unlocks: {
          inventoryMultiplier: number;
          feeDiscountBps: number;
          premiumEligible: boolean;
        };
      }
    | null;
  howToImprove: string[];
}

export type AccountType =
  | 'cash'
  | 'payable'
  | 'receivable'
  | 'fee_revenue'
  | 'reserve'
  | 'write_off';

export interface LedgerAccount {
  id: string;
  ownerType: 'platform' | 'user' | 'business';
  ownerId: string | null;
  accountType: AccountType;
  currency: string;
  /** Natural balance — positive in normal operation for every account type. */
  balanceCents: Cents;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  direction: 'debit' | 'credit';
  amountCents: Cents;
  currency: string;
  entryType: string;
  refType: string | null;
  refId: string | null;
  memo: string | null;
  createdAt: string;
}

export interface ReconciliationReport {
  accountsChecked: number;
  /** Accounts whose cached balance disagrees with the sum of their entries — always a bug. */
  drifted: { accountId: string; cached: Cents; computed: Cents; deltaCents: Cents }[];
  /** Transaction groups that don't net to zero — a balanced-set violation. */
  unbalancedTransactions: string[];
  repaired: number;
  healthy: boolean;
}
