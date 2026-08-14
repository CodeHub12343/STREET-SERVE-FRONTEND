/**
 * Hub (consignment supply side) contracts (docs/12 §4, SCREEN_TO_API_MAPPING.md §8).
 */
import type { Cents } from '@/types';

export interface HubProduct {
  id: string;
  name: string;
  category: string;
  quantityTotal: number;
  quantityOut: number;
  sellerSplitPercent: number;
  returnWindowDays: number;
  unitPriceCents: Cents;
  /** Public photo URLs; the first is the cover. */
  photos?: string[];
}

export interface PendingCheckout {
  id: string;
  sellerName: string;
  productName: string;
  quantity: number;
  trustScore: number;
  /** Total value the hub is releasing — the other half of the risk decision (H-03). */
  declaredValueCents?: Cents;
  requestedAt: string;
  shelterCosigned: boolean;
}

/** The hub's auto-approve rule (H-03). A null value cap means "no limit". */
export interface ApprovalPolicy {
  autoApproveMinTrust: number;
  autoApproveMaxValueCents: number | null;
}

/** A seller currently holding hub inventory (H-04 live inventory). */
export interface Holder {
  checkoutId: string;
  sellerName: string;
  productName: string;
  quantity: number;
  soldQty: number;
  returnDeadline: string;
}
