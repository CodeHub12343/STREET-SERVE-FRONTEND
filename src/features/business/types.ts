/**
 * Business profile contracts (SCREEN_TO_API_MAPPING.md §2). Shapes track the backend responses for
 * GET /businesses/:id, /menu, /reviews, and GET /queues/:ownerId.
 */
import type { Cents } from '@/types';
import type { PinStatus } from '@/components/map/MapPin';

export interface BusinessProfile {
  id: string;
  name: string;
  category: string;
  logoUrl?: string;
  coverUrl?: string;
  /**
   * Live status when known (from the map pin / live session). The plain profile endpoint doesn't
   * carry a live status, so this can be absent — the UI must tolerate that.
   */
  status?: PinStatus;
  // Aggregates that the plain GET /businesses/:id does NOT return (they come from the reviews and
  // trust modules). Optional so the profile sheet works whether or not they're populated.
  rating?: number;
  reviewCount?: number;
  about?: string;
  hours?: string;
  /** Status-adaptive location line (docs/13 C-14). */
  locationLine?: string;
  todaysSpecial?: string;
  trustScore?: number;
  /** Whether the current user follows this business (Favorites). */
  following?: boolean;
  /** [lng, lat] — the registered service-area point; feeds the Directions action. */
  lngLat?: [number, number];
  /**
   * What this vendor charges to travel to you (spec §32.4). Must be disclosed BEFORE the customer
   * confirms a wave-down, so the Wave Confirm screen reads it from here. 0/absent = no travel fee.
   */
  travelFeeCents?: Cents;
}

export interface MenuItem {
  id: string;
  name: string;
  priceCents: Cents;
  photoUrl?: string;
  todaysSpecial?: boolean;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  body: string;
  createdAt: string;
}

/** GET /queues/:ownerId — the live queue + discount schedule (FR-3). */
export interface QueueState {
  count: number;
  cap: number;
  schedule: { position: number; percent: number }[];
}
