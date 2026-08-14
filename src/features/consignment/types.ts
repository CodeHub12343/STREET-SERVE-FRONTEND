/**
 * Consignment contracts (docs/12 §3, SCREEN_TO_API_MAPPING.md §6).
 */
import type { Cents, LngLat } from '@/types';

export interface Product {
  id: string;
  hubId: string;
  hubName: string;
  name: string;
  category: string;
  declaredValueCents: Cents;
  /** Seller's share of each sale, %. */
  sellerSplitPercent: number;
  returnWindowDays: number;
  quantityAvailable: number;
  conditionNotes: string;
  distanceLabel: string;
  lngLat: LngLat;
  /** Public photo URLs; the first is the cover. */
  photos?: string[];
  /**
   * A-3 premium inventory: the Trust Score this hub requires to take the item, or null if it's open
   * to anyone. Surfaced so browse can show a locked state instead of letting the seller walk to the
   * hub and get refused at the QR screen. The server enforces it at checkout either way.
   */
  minSellerTrustScore?: number | null;
  /**
   * D-5: an Academy certification required to take this item. Unlike a Trust shortfall, this lock is
   * clearable TODAY — so browse shows the course rather than a bare refusal.
   */
  requiredCertification?: string | null;
}

export type CheckoutStatus =
  /** Reserved, waiting on the hub owner's decision (H-03) — the seller doesn't hold the goods yet. */
  | 'pending_approval'
  | 'declined'
  | 'active'
  | 'returned'
  | 'settled'
  | 'overdue'
  | 'return_pending';

export interface Checkout {
  id: string;
  productId: string;
  productName: string;
  hubName: string;
  quantity: number;
  soldQty: number;
  sellerSplitPercent: number;
  unitPriceCents: Cents;
  checkedOutAt: string;
  returnDeadline: string;
  status: CheckoutStatus;
  // ── Consignment agreement lifecycle (R14/R17/R18) ──
  termDays?: number | null;
  expiresAt?: string | null;
  currentUnitPriceCents?: Cents | null;
  minimumAuthorizedPriceCents?: Cents | null;
  returnTerms?: {
    returnResponsibility: 'seller' | 'hub';
    returnWindowDays: number;
    storageFeeCentsPerDay: Cents;
    abandonmentAfterDays: number;
  };
  /** §37 — a termination in flight. Set once either party has given notice. */
  terminationNoticeDays?: number | null;
  terminatedBy?: 'seller' | 'hub' | null;
  terminationEffectiveAt?: string | null;
  /** §39 — automatic renewal, and how long each renewal runs for. */
  autoRenew?: boolean;
  autoRenewTerm?: number | 'until_sold' | null;
  renewalCount?: number;
}

/** Whether the platform actually collected the proceeds it is disbursing (Phase 0 solvency guard). */
export type FundingSource = 'collected' | 'unfunded' | 'mixed' | 'none' | 'legacy_unfunded';
export type PayoutLegStatus = 'paid' | 'awaiting_funds' | 'no_account' | 'not_applicable';

export interface Settlement {
  checkoutId: string;
  soldQty: number;
  returnedQty: number;
  grossCents: Cents;
  platformFeeCents: Cents;
  hubShareCents: Cents;
  sellerNetCents: Cents;
  payoutTiming: string;
  trustDelta: number;
  fundingSource?: FundingSource;
  collectedCents?: Cents;
  sellerPayoutStatus?: PayoutLegStatus;
  hubPayoutStatus?: PayoutLegStatus;
}

/** One settled payout in the earnings feed (S-13). Mirrors consignmentService.sellerEarnings. */
export interface EarningsPayout {
  checkoutId: string;
  grossSalesCents: Cents;
  platformFeeCents: Cents;
  hubShareCents: Cents;
  sellerNetCents: Cents;
  payoutRef: string | null;
  settledAt: string;
}

/** Pre-publish fee calculator (R12 / S-13): server-computed net-payout preview from a price + split. */
export interface FeePreview {
  input: { unitPriceCents: Cents; splitPercent: number; quantity: number };
  grossCents: Cents;
  platformFeeCents: Cents;
  sellerNetCents: Cents;
  hubShareCents: Cents;
  customer: {
    subtotalCents: Cents;
    serviceFeeCents: Cents;
    processingFeeCents: Cents;
    taxCents: Cents;
    totalCents: Cents;
  };
  /**
   * §57.2 — the rent-to-own half of the calculator, present only when the seller asked for it. All
   * seven rows the spec names, computed by the same math the customer will actually be charged.
   */
  rto: {
    initialPaymentCents: Cents;
    installmentAmountCents: Cents;
    installmentCount: number;
    totalToOwnCents: Cents;
    costOverCashCents: Cents;
    earlyPayoffCents: Cents;
    platformFeePerPaymentCents: Cents;
    sellerTotalEarningsCents: Cents;
  } | null;
  estimated: boolean;
}

/** Seller earnings feed (S-13 / GAP-6): settled payout history + recent daily gross + pending totals. */
export interface SellerEarnings {
  totals: {
    lifetimeGrossCents: Cents;
    /** Everything earned across settlements — whether or not it was actually disbursed. */
    settledNetCents: Cents;
    /** The portion that really moved to the seller's account. */
    paidNetCents?: Cents;
    /** Earned but not payable: the sale was cash, so the platform never collected it. */
    awaitingFundsCents?: Cents;
    /** Funded, but blocked by a missing payout account. */
    noAccountCents?: Cents;
    settledCount: number;
    paidCount?: number;
    pendingGrossCents: Cents;
    pendingCheckoutCount: number;
  };
  windowDays: number;
  dailyGross: { date: string; grossCents: Cents; count: number }[];
  payouts: EarningsPayout[];
}
