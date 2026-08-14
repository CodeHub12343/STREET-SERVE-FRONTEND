/**
 * Queue membership contracts (docs/13 C-20, SCREEN_TO_API_MAPPING.md §3). Position, discount, and
 * the hold timer are all server-computed and pushed over the /queue socket — the client renders
 * them, never computes them (FR-3.2).
 */
export type QueueMemberStatus = 'in_line' | 'your_turn';

export interface QueueMembership {
  ownerId: string;
  businessName: string;
  position: number;
  aheadCount: number;
  nowServing: number;
  discountPercent: number;
  cap: number;
  schedule: { position: number; percent: number }[];
  /** ISO-8601 UTC — the geofence-leave hold deadline (FR-3.4). */
  holdDeadline?: string;
  status: QueueMemberStatus;
  popup?: { message: string };
}
