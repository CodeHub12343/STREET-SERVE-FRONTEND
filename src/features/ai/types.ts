/**
 * Phase E contracts — the Income Coach, events, and hub reallocation advice.
 */
import type { Cents } from '@/types';

/**
 * E-9. `achievable` is the field that matters most on this type: the coach is allowed to return a
 * plan that falls SHORT of the goal, and the UI must show that rather than rounding it away.
 */
export interface CoachBasketItem {
  productId: string;
  hubId: string;
  name: string;
  unitValueCents: Cents;
  suggestedQuantity: number;
  netPerUnitCents: Cents;
  /** Expected value (quantity × forecast sell-through × net), never the maximum. */
  expectedContributionCents: Cents;
  expectedSellThrough: number;
  reasonSummary: string;
}

export interface CoachPlan {
  goalCents: Cents;
  projectedCents: Cents;
  /** False when today's stock genuinely can't reach the goal. Never cosmetic. */
  achievable: boolean;
  basket: CoachBasketItem[];
  locations: Array<{ hubId: string; reasonSummary: string }>;
  summary: string;
  /** What would actually close a shortfall. Empty when the plan clears the goal. */
  advice: string[];
  /** Measured from real settled outcomes — not a claim. */
  track: { plansMeasured: number; medianActualCents: Cents | null };
}

/** E-4. `expectedAttendance` is nullable — unknown is a real state, not zero. */
export interface NearbyEvent {
  id: string;
  name: string;
  venue: string | null;
  lngLat: [number, number];
  startsAt: string;
  endsAt: string | null;
  expectedAttendance: number | null;
  category: string | null;
  distanceM: number;
  url: string | null;
}

/** E-10. */
export interface ReallocationAdvice {
  category: string;
  hereRate: number;
  bestTile: string;
  bestRate: number;
  advice: string;
}

/** E-1 dataset health — gates whether the forecaster is worth switching on. */
export interface OutcomeStats {
  totalRows: number;
  completeRows: number;
  fromRecommendations: number;
  averageSellThrough: number;
  readyForForecasting: boolean;
}
