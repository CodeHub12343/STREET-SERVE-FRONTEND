/**
 * Tax contracts (Phase 5).
 */
import type { Cents } from '@/types';

export interface SellerTaxStatement {
  year: number;
  subjectType: 'seller';
  subjectId: string;
  grossSalesCents: Cents;
  digitalGrossCents: Cents;
  /**
   * Collected and remitted BY THE PLATFORM as marketplace facilitator — shown so the seller's
   * books reconcile, but explicitly not their income or their liability.
   */
  salesTaxCollectedByPlatformCents: Cents;
  platformFeesCents: Cents;
  refundsCents: Cents;
  inventoryLiabilitiesCents: Cents;
  netEarningsCents: Cents;
  settlementCount: number;
  note: string;
  generatedAt: string;
}

export interface RemittanceReport {
  totalTaxCents: Cents;
  jurisdictions: {
    jurisdiction: string;
    registrationId: string | null;
    taxableCents: Cents;
    taxCents: Cents;
    saleCount: number;
  }[];
  /** Cross-check: this must agree with the sum of the jurisdictions. */
  ledgerLiabilityCents: Cents;
}
