/**
 * Receipt breakdown (PAYMENTS_IMPLEMENTATION.md §8, R9). The SERVER is authoritative for every real
 * total — in real mode the breakdown is fetched from `POST /orders/quote` and rendered as-is (see
 * `mapServerBreakdown`). `computeBreakdown` is the DEMO-only / offline fallback that mirrors the
 * server's pickup-MVP math. Integer cents throughout.
 */
import { roundUpCents } from '@/lib/money';
import type { Cents } from '@/types';
import type { TipChoice } from '@/stores/cart.store';
import type { PayForwardOffer } from '@/features/payforward/types';

/**
 * The platform fee the vendor pays on a sale — shown to the vendor as informational, never charged
 * to the customer. Basis points, mirrored from the backend fee registry (marketplace = 10%).
 */
export const PLATFORM_FEE_BPS = 1000;

export interface Breakdown {
  subtotalCents: Cents;
  /**
   * PIF-4 — what the community fund would cover, as returned by the server quote. Null when the
   * business has no fund, or when this customer cannot draw on it right now.
   *
   * Deliberately NOT a line inside the totals: the fund is not a discount. The meal cost what it
   * cost, the vendor is paid in full, and somebody else paid part of it — collapsing that into
   * `discountCents` would understate the sale and misdescribe what the customer was given.
   */
  payItForward?: PayForwardOffer | null;
  discountCents: Cents;
  /** Customer-facing fee lines (R9). $0 in the pickup MVP; present so the receipt is itemized. */
  taxCents?: Cents;
  deliveryCents?: Cents;
  serviceFeeCents?: Cents;
  processingFeeCents?: Cents;
  tipCents: Cents;
  roundUpCents?: Cents;
  /** Informational: the platform fee the vendor pays on this sale (customer isn't charged it). */
  platformFeeCents: Cents;
  totalCents: Cents;
  discountPercent: number;
}

/** The server breakdown shape returned by `/orders/quote` and `/orders` (orders.service). */
export interface ServerBreakdown {
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  taxCents: number;
  deliveryCents: number;
  serviceFeeCents: number;
  processingFeeCents: number;
  tipCents: number;
  roundUpCents: number;
  totalCents: number;
  platformFeeCents: number;
}

/** Adopt the server's authoritative breakdown for display — never re-derive the total client-side. */
export function mapServerBreakdown(s: ServerBreakdown): Breakdown {
  return {
    subtotalCents: s.subtotalCents,
    discountCents: s.discountCents,
    taxCents: s.taxCents,
    deliveryCents: s.deliveryCents,
    serviceFeeCents: s.serviceFeeCents,
    processingFeeCents: s.processingFeeCents,
    tipCents: s.tipCents,
    roundUpCents: s.roundUpCents,
    platformFeeCents: s.platformFeeCents,
    totalCents: s.totalCents,
    discountPercent: s.discountPercent,
  };
}

/**
 * DEMO / offline fallback only. Mirrors the server's pickup-MVP pricing: discount off subtotal, then
 * a tip; tax/delivery/service/processing are $0 (config-driven server-side). The vendor's platform
 * fee is derived from `PLATFORM_FEE_BPS` — informational, not added to the customer's total.
 */
export function computeBreakdown(
  subtotalCents: Cents,
  discountPercent: number,
  tip: TipChoice,
  customTipCents: Cents,
): Breakdown {
  const discountCents = Math.round((subtotalCents * discountPercent) / 100);
  const discounted = subtotalCents - discountCents;
  const tipCents = tip === 'none' ? 0 : tip === 'roundup' ? roundUpCents(discounted) : Math.max(0, customTipCents);
  const platformFeeCents = Math.round((discounted * PLATFORM_FEE_BPS) / 10000);
  return {
    subtotalCents,
    discountCents,
    taxCents: 0,
    deliveryCents: 0,
    serviceFeeCents: 0,
    processingFeeCents: 0,
    tipCents,
    roundUpCents: 0,
    platformFeeCents,
    totalCents: discounted + tipCents,
    discountPercent,
  };
}
