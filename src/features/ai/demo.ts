/**
 * Phase E demo fixtures (gated by NEXT_PUBLIC_MAP_DEMO).
 *
 * The coach fixture deliberately returns an ACHIEVABLE plan for a modest goal and an UNACHIEVABLE
 * one above it — the shortfall path is the one most worth being able to see without a backend,
 * because it's the behaviour most likely to be "simplified away" by someone who hasn't read why
 * it exists.
 */
import type { CoachPlan, NearbyEvent, ReallocationAdvice } from './types';

export function demoCoachPlan(goalCents: number): Promise<CoachPlan> {
  if (goalCents > 100_000) {
    return Promise.reject(
      new Error('Daily goals are capped at $1,000.00 — beyond that this isn’t a realistic plan.'),
    );
  }

  const basket: CoachPlan['basket'] = [
    {
      productId: 'p_demo_1',
      hubId: 'hub_demo_gift',
      name: 'Soy candles',
      unitValueCents: 1_000,
      suggestedQuantity: 12,
      netPerUnitCents: 598,
      expectedContributionCents: 2_871,
      expectedSellThrough: 0.4,
      reasonSummary:
        'Forecast: about 40% of these sell around now. Also: good weather for selling; payday week — people are spending.',
    },
    {
      productId: 'p_demo_2',
      hubId: 'hub_demo_gift',
      name: 'Beaded bracelets',
      unitValueCents: 600,
      suggestedQuantity: 20,
      netPerUnitCents: 386,
      expectedContributionCents: 2_316,
      expectedSellThrough: 0.3,
      reasonSummary: 'Forecast: about 30% of these sell around now. Also: close to you.',
    },
  ];
  const projected = basket.reduce((n, b) => n + b.expectedContributionCents, 0);
  const achievable = projected >= goalCents;

  return Promise.resolve({
    goalCents,
    projectedCents: projected,
    achievable,
    basket,
    locations: [
      {
        hubId: 'hub_demo_gift',
        reasonSummary: 'Recommended because: busy this week (18 recent sales); close to you.',
      },
    ],
    summary: achievable
      ? `To earn $${(goalCents / 100).toFixed(2)} today: take 32 items across 2 products, and work the spots below.`
      : `Realistically you can make about $${(projected / 100).toFixed(2)} today from what's available — here's the best of it.`,
    advice: achievable
      ? []
      : [
          `Today's stock realistically supports about $${(projected / 100).toFixed(2)} — roughly $${((goalCents - projected) / 100).toFixed(2)} short of your goal.`,
          'Picking up again tomorrow, or adding a gig, is the realistic way to close it.',
        ],
    track: { plansMeasured: 6, medianActualCents: 4_150 },
  });
}

export function demoEvents(): NearbyEvent[] {
  return [
    {
      id: 'ev_demo_1',
      name: 'Graceada Summer Fair',
      venue: 'Graceada Park',
      lngLat: [-120.9989, 37.6421],
      startsAt: new Date(Date.now() + 5 * 3_600_000).toISOString(),
      endsAt: new Date(Date.now() + 13 * 3_600_000).toISOString(),
      expectedAttendance: 800,
      category: 'Fair',
      distanceM: 620,
      url: null,
    },
    {
      id: 'ev_demo_2',
      name: 'Downtown Street Market',
      venue: '10th Street',
      lngLat: [-120.9949, 37.6371],
      startsAt: new Date(Date.now() + 30 * 3_600_000).toISOString(),
      endsAt: null,
      // Unknown is a real state — the UI must not render this as "0 people".
      expectedAttendance: null,
      category: 'Market',
      distanceM: 1_450,
      url: null,
    },
  ];
}

export function demoReallocation(): ReallocationAdvice[] {
  return [
    {
      category: 'shopping',
      hereRate: 0.22,
      bestTile: '-24199:7527',
      bestRate: 0.61,
      advice:
        'shopping sells about 61% elsewhere versus 22% here. Worth sending stock to sellers working that area.',
    },
  ];
}
