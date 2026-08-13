/**
 * Phase C demo fixtures (gated by NEXT_PUBLIC_MAP_DEMO). Anchored on the same Modesto origin as the
 * existing live-map demo data so the layers overlay coherently rather than sitting in a different
 * city from the business pins.
 */
import type { DemandTile, HubInventoryMap, HubPinData } from './types';

const ORIGIN: [number, number] = [-120.9969, 37.6391];

/** Metres → degrees offset from the demo origin. */
function offset(dxM: number, dyM: number): [number, number] {
  const dLng = dxM / (111_320 * Math.cos((ORIGIN[1] * Math.PI) / 180));
  const dLat = dyM / 110_540;
  return [ORIGIN[0] + dLng, ORIGIN[1] + dLat];
}

const HUBS: HubPinData[] = [
  {
    hubId: 'hub_demo_gift',
    businessId: 'biz_demo_gift',
    name: 'Tenth Street Gifts',
    logoUrl: null,
    address: '1010 10th St',
    lngLat: offset(320, 180),
    itemCount: 12,
    unitCount: 84,
    fromUnitValueCents: 400,
    categories: ['shopping'],
    hasInventory: true,
  },
  {
    hubId: 'hub_demo_church',
    businessId: 'biz_demo_church',
    name: 'Grace Community Center',
    logoUrl: null,
    address: '221 Needham Ave',
    lngLat: offset(-780, 620),
    itemCount: 5,
    unitCount: 31,
    fromUnitValueCents: 250,
    categories: ['shopping', 'food'],
    hasInventory: true,
  },
  {
    hubId: 'hub_demo_market',
    businessId: 'biz_demo_market',
    name: 'Riverbank Market',
    logoUrl: null,
    address: '55 Riverbank Rd',
    lngLat: offset(1450, -540),
    itemCount: 0,
    unitCount: 0,
    fromUnitValueCents: null,
    categories: [],
    // Deliberately included: an empty hub is a real state, and the pin must read as "nothing here
    // right now" rather than being silently dropped when no filter is applied.
    hasInventory: false,
  },
];

export function demoHubPins(category?: string): HubPinData[] {
  if (!category) return HUBS;
  // Mirrors the server: with a filter active, hubs that can't satisfy it are dropped entirely.
  return HUBS.filter((h) => h.hasInventory && h.categories.includes(category));
}

export function demoDemandTiles(): DemandTile[] {
  return [
    { tileId: 'a', lngLat: offset(200, 120), weight: 14, waveDowns: 6, queueJoins: 4 },
    { tileId: 'b', lngLat: offset(-420, 380), weight: 9, waveDowns: 5, queueJoins: 2 },
    { tileId: 'c', lngLat: offset(760, -260), weight: 6, waveDowns: 4, queueJoins: 1 },
    { tileId: 'd', lngLat: offset(-980, -540), weight: 3, waveDowns: 3, queueJoins: 0 },
  ];
}

export function demoHubInventoryMap(hubId: string): HubInventoryMap {
  const holders: HubInventoryMap['holders'] = [
    {
      checkoutId: 'co_demo_1',
      sellerId: 'usr_demo_a',
      sellerName: 'Marcus T.',
      productName: 'Soy candles',
      quantity: 12,
      quantitySold: 5,
      outstanding: 7,
      valueCents: 7_000,
      status: 'active',
      expectedReturnAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      lngLat: offset(640, 410),
      locationAge: 'live',
      lastSeenAt: new Date(Date.now() - 6 * 60_000).toISOString(),
      liveStatus: 'parked',
    },
    {
      checkoutId: 'co_demo_2',
      sellerId: 'usr_demo_b',
      sellerName: 'Renee K.',
      productName: 'Beaded bracelets',
      quantity: 20,
      quantitySold: 18,
      outstanding: 2,
      valueCents: 1_600,
      status: 'active',
      expectedReturnAt: new Date(Date.now() + 86_400_000).toISOString(),
      lngLat: offset(-260, -720),
      /**
       * Off shift, but we know where they were. The demo carries this case deliberately: the stale
       * pin is a distinct visual state, and a fixture set with only live-or-nothing would leave it
       * untested by eye.
       */
      locationAge: 'last_known',
      lastSeenAt: new Date(Date.now() - 40 * 60_000).toISOString(),
      liveStatus: null,
    },
    {
      // The row that matters most: overdue AND unlocatable.
      checkoutId: 'co_demo_3',
      sellerId: 'usr_demo_c',
      sellerName: 'Dev P.',
      productName: 'Art prints',
      quantity: 8,
      quantitySold: 1,
      outstanding: 7,
      valueCents: 10_500,
      status: 'overdue',
      expectedReturnAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      lngLat: null,
      locationAge: null,
      lastSeenAt: null,
      liveStatus: null,
    },
  ];
  return {
    hubId,
    holders,
    locatedCount: holders.filter((h) => h.lngLat).length,
    liveCount: holders.filter((h) => h.locationAge === 'live').length,
  };
}
