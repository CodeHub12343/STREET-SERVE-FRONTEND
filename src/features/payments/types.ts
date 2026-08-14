/**
 * Digital-rail contracts (Phase 2 — docs/consignment/API_CHANGES.md §1).
 */
import type { Cents } from '@/types';

export interface SalePaymentIntent {
  id: string;
  payToken: string;
  /** The URL the seller shows as a QR code; the customer opens it on their own phone. */
  payUrl: string;
  amountCents: Cents;
  currency: string;
  quantity: number;
  unitPriceCents: Cents;
  status: 'pending' | 'succeeded' | 'failed' | 'expired' | 'cancelled';
  clientSecret: string | null;
  expiresAt: string;
}

export interface SalePaymentStatus {
  id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'expired' | 'cancelled';
  amountCents: Cents;
  paidAt: string | null;
  expiresAt: string;
}

/** What the customer sees on the public pay page — deliberately minimal. */
export interface PayPageView {
  payToken: string;
  businessName: string;
  productName: string;
  quantity: number;
  unitPriceCents: Cents;
  /** Pre-tax sale price. */
  amountCents: Cents;
  /** Sales tax collected by the platform as marketplace facilitator. */
  taxCents: Cents;
  /** What the customer actually pays: amount + tax. */
  totalCents: Cents;
  currency: string;
  status: string;
  clientSecret: string | null;
  expiresAt: string;
  expired: boolean;
}
