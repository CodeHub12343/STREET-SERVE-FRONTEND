/**
 * Seller balance contracts (Phase 3 — docs/consignment/API_CHANGES.md §4).
 */
import type { Cents } from '@/types';

export type DebtOrigin =
  | 'cash_sale'
  | 'lost_inventory'
  | 'damaged_inventory'
  | 'refund_clawback'
  | 'chargeback';

export interface SellerDebt {
  id: string;
  originType: DebtOrigin;
  originRefId: string | null;
  principalCents: Cents;
  outstandingCents: Cents;
  hubShareCents: Cents;
  platformFeeCents: Cents;
  status: 'open' | 'partially_repaid' | 'repaid' | 'written_off' | 'disputed';
  dueAt: string;
  createdAt: string;
}

export interface MyDebts {
  totalOutstandingCents: Cents;
  debts: SellerDebt[];
}

/** Trust tier as a credit rating: how much stock may be held, how much debt may be carried. */
export interface CreditStatus {
  tier: string;
  /**
   * A-3: two levers set the ceiling now. The tier (identity) gives the base, the Trust band
   * (behaviour) scales it — `maxInventoryValueCents` is the product of both, and
   * `tierMaxInventoryValueCents` is the unscaled base, so the UI can show what the band added.
   * Optional: a server that predates A-3 simply omits them.
   */
  trustScore?: number | null;
  trustBand?: string | null;
  trustBandLabel?: string | null;
  inventoryMultiplier?: number;
  tierMaxInventoryValueCents?: Cents;
  maxInventoryValueCents: Cents;
  currentInventoryValueCents: Cents;
  availableInventoryCents: Cents;
  maxCashDebtCents: Cents;
  outstandingDebtCents: Cents;
  availableDebtCents: Cents;
  overDebtLimit: boolean;
}
