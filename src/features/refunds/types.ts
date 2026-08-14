/**
 * Refund contracts (Phase 4 — docs/consignment/API_CHANGES.md §3).
 */
import type { Cents } from '@/types';

export type RefundReason =
  | 'customer_request'
  | 'defective'
  | 'not_received'
  | 'seller_error'
  | 'dispute_resolution'
  | 'chargeback';

export interface Refund {
  id: string;
  salePaymentId: string;
  checkoutId: string;
  amountCents: Cents;
  reason: RefundReason;
  /** Proportional reversal per party — always sums to `amountCents`. */
  reversedSellerCents: Cents;
  reversedHubCents: Cents;
  reversedFeeCents: Cents;
  /** Set when a payee had already spent their share and it became a debt instead. */
  clawbackDebtId: string | null;
  restockedQuantity: number;
  createdAt: string;
}

export interface RefundResult {
  id: string;
  amountCents: Cents;
  reversals: { sellerCents: Cents; hubCents: Cents; feeCents: Cents };
  sellerReversed: boolean;
  hubReversed: boolean;
  clawbackDebtId: string | null;
  restockedQuantity: number;
}
