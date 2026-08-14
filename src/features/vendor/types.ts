/**
 * Vendor operating contracts (docs/12 §4, SCREEN_TO_API_MAPPING.md §7).
 */
import type { Cents } from '@/types';
import type { MenuItem } from '@/features/business';

/** The 3-state live status (docs/13 V-02). Backend uses driving/parked/away_closed. */
export type LiveStatus = 'driving' | 'parked' | 'away_closed';

export interface LiveSession {
  id: string;
  businessId: string;
  status: LiveStatus;
  startedAt: string;
}

export interface VendorDashboard {
  businessId: string;
  /** Optional — the backend dashboard read model doesn't carry it; the home falls back to the
   * business detail name. */
  businessName?: string;
  queueCount: number;
  waveCount: number;
  orderCount: number;
  todaySalesCents: Cents;
}

export interface WaveRequest {
  id: string;
  customerName: string;
  note?: string;
  /** ISO-8601 UTC — the per-request SLA countdown (docs/13 V-03). */
  slaDeadline: string;
  distanceLabel: string;
}

export type VendorOrderStatus = 'pending' | 'preparing' | 'ready' | 'completed';

export interface VendorOrder {
  id: string;
  /**
   * Needed to open the conversation from a ticket. Optional because demo fixtures predate it and a
   * missing id must hide the control rather than send a request that cannot succeed.
   */
  customerId?: string;
  customerName: string;
  /**
   * A driver can only be asked for on a delivery. A `pickup_now` order has no destination, and the
   * server rejects the request with "This order is not a delivery" — so the control must not appear.
   */
  isDelivery?: boolean;
  items: { name: string; qty: number }[];
  totalCents: Cents;
  status: VendorOrderStatus;
  placedAt: string;
}

/** Menu item with vendor-editable availability (V-06). */
export interface VendorMenuItem extends MenuItem {
  available: boolean;
}
