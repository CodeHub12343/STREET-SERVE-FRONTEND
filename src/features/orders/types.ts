/**
 * Order / transaction contracts (docs/13 C-21–24, SCREEN_TO_API_MAPPING.md §3).
 */
import type { CartLine } from '@/stores/cart.store';
import type { Breakdown } from './breakdown';

export type OrderContext = 'window' | 'ahead';
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export interface OrderItem {
  name: string;
  qty: number;
  priceCents: number;
}

export interface OrderTxn {
  id: string;
  businessId: string;
  businessName: string;
  /**
   * DAN-6 — set only when a driver has been requested for this order. Absent on every pickup order,
   * which is the common case; the tracker is rendered (and its bundle loaded) only when present.
   */
  deliveryId?: string;
  context: OrderContext;
  status: OrderStatus;
  /** Stripe PaymentIntent client secret ('demo' in demo mode). */
  clientSecret?: string;
  breakdown: Breakdown;
  items: OrderItem[];
  createdAt: string;
  /** Tier-based payout timing shown on the receipt (E3). */
  payoutTiming: string;
  cancelReason?: string;
  /** Settled transaction backing this order — required to leave a review (H3). */
  transactionId?: string;
  /**
   * What the community fund covered, and what is actually left to pay. `totalCents` is what the
   * MEAL cost, so a client reading only that cannot tell a fully covered order from an unpaid one —
   * which is how the payment screen came to report "session expired" on an order that had been paid
   * for in full. Read `amountDueCents` for any "is anything owed?" decision.
   */
  payItForwardCents?: number;
  amountDueCents?: number;
}

/** Refund disclosure (R13/U6) — what the customer gets back, mirrors payments/refundPolicy. */
export interface RefundQuote {
  scenario: 'full_pre_fulfillment' | 'partial' | 'post_fulfillment';
  refundedCents: number;
  goodsCents: number;
  tipCents: number;
  marketplaceFeeReturnedCents: number;
  processingRetainedCents: number;
  reverseTransfer: boolean;
  refundApplicationFee: boolean;
  disclosure: string;
}

export interface CreateTransactionInput {
  businessId: string;
  businessName: string;
  context: OrderContext;
  lines: CartLine[];
  breakdown: Breakdown;
  /**
   * PIF-4 — the customer opted in to the community fund covering part or all of this order. Opt-in
   * only: the server never applies it unasked, because accepting help is the customer's decision.
   */
  usePayItForward?: boolean;
}
