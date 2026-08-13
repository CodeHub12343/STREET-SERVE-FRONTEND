/**
 * Live map contracts (SCREEN_TO_API_MAPPING.md §2, REALTIME_ARCHITECTURE.md §5). A pin is keyed by
 * its live-session id; the socket updates position/status of existing pins, and the periodic
 * /map/nearby refetch re-baselines the set.
 */
import type { LngLat } from '@/types';
import type { PinStatus } from '@/components/map/MapPin';
import type { BusinessModule } from '@/features/business/hooks/useBusinessModules';

export interface MapPinData {
  sessionId: string;
  businessId: string;
  name: string;
  category: string;
  logoUrl?: string;
  lngLat: LngLat;
  status: PinStatus;
  etaMin?: number;
  rating?: number;
  /**
   * The business's resolved modules, served with the pin (BP-6) so a result row can say what this
   * business actually does without a per-pin request. Undefined for seller pins.
   */
  modules?: BusinessModule[];
  /** P-19 — the paid Verified Badge, served with the pin so no per-pin lookup is needed. */
  verified?: boolean;
  /**
   * 7.6 — a live business-wide flash sale, as a whole percent. 0 or absent means none.
   *
   * Served with the pin for the same reason as `modules` and `verified`: a discovery list showing
   * dozens of businesses cannot make a request per row. Item-scoped sales are excluded server-side
   * — "20% off" on a pin has to be true of the whole menu, or it misleads someone into travelling.
   */
  discountPercent?: number;
}

/**
 * A Trending result (R1b) from GET /map/trending — a live business ranked by an explainable score:
 * discount boost + live demand + recency + proximity. `factors` is the server's own reasoning, shown
 * to the customer so the ranking is never a black box.
 */
export interface TrendingItem {
  businessId: string;
  sessionId: string;
  name: string;
  logoUrl?: string | null;
  categoryId?: string | null;
  status: 'driving' | 'parked' | 'away_closed';
  discountPercent: number;
  queueCount: number;
  score: number;
  factors: string[];
  reasonSummary: string;
  location: { type: string; coordinates: LngLat };
}

// ─── Phase C map layers ─────────────────────────────────────────────────────────────────────
/**
 * C-1/C-2 — a consignment hub as it appears on the map. The inventory counts are the point: a pin
 * that only says "hub" tells a seller nothing about whether the trip is worth making.
 */
export interface HubPinData {
  hubId: string;
  businessId: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  lngLat: LngLat;
  /** Distinct products currently checkoutable here. */
  itemCount: number;
  /** Total units across those products. */
  unitCount: number;
  fromUnitValueCents: number | null;
  categories: string[];
  hasInventory: boolean;
}

/**
 * C-3 — one demand tile. Aggregate by construction: the server floors thin tiles and never returns
 * an actor id, so this says WHERE demand is and never WHO is asking.
 */
export interface DemandTile {
  tileId: string;
  lngLat: LngLat;
  /** Queue joins weigh more than waves — a join is a firmer commitment. */
  weight: number;
  waveDowns: number;
  queueJoins: number;
}

/** C-5 — one seller holding a hub's stock, with their last-known position. */
export interface InventoryHolder {
  checkoutId: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  quantity: number;
  quantitySold: number;
  outstanding: number;
  valueCents: number;
  status: string;
  expectedReturnAt: string;
  /** Null only when this seller has NEVER been live — the rows genuinely worth chasing. */
  lngLat: LngLat | null;
  /**
   * How much to trust the pin. `live` is a running session; `last_known` is where they were when
   * they last pinged. A stale fix must be dated on screen, never drawn as if it were current.
   */
  locationAge: 'live' | 'last_known' | null;
  lastSeenAt: string | null;
  liveStatus: string | null;
}

export interface HubInventoryMap {
  hubId: string;
  holders: InventoryHolder[];
  /** Anything with a pin on the map, live or stale. */
  locatedCount: number;
  /** Of those, the ones the server can vouch for right now. */
  liveCount: number;
}

/** Server → client `pin:update` payload (REALTIME_ARCHITECTURE.md §5). */
export interface PinUpdateEvent {
  sessionId: string;
  actorId: string;
  lat: number;
  lng: number;
  status: PinStatus;
  etaMin?: number;
}

export interface PinRemoveEvent {
  sessionId: string;
}
