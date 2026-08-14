/**
 * Hero simulation dataset (LANDING_PAGE_HERO_SPECIFICATION.md §4) — the deterministic scene the
 * SimulationDirector plays: 7 fictional vendors (3 driving on looped street-grid routes, 3 parked,
 * 1 away), ambient customer dots, and the vignette/card schedule for one 90-second loop.
 * Coordinates approximate downtown Modesto, CA. All names are fictional and consistent with the
 * docs/design mockups. No runtime API — this module IS the seed.
 */
import type { LngLat } from '@/types';

export const LOOP_SECONDS = 90;

export type SimStatus = 'driving' | 'parked' | 'away';

export interface SimVendorDef {
  id: string;
  name: string;
  /** Stands in for the business logo until real assets exist (docs/06 §2.5). */
  emoji: string;
  category: string;
  rating: string;
  status: SimStatus;
  /** Parked/away position, or fallback when no route. */
  at: LngLat;
  /** Driving vendors: closed loop polyline they travel continuously. */
  route?: LngLat[];
  /** Metres/second along the route. */
  speed?: number;
  /** Starting offset along the route in metres (de-syncs the drivers). */
  phase?: number;
}

/** Timed marker chip shown above a vendor pin. */
export interface ChipCue {
  vendorId: string;
  from: number;
  to: number;
  text: string;
  /** Ring flash (wave accepted). */
  flash?: boolean;
}

/** Floating activity card (decorative, aria-hidden) — max 2 concurrent by schedule design. */
export interface CardCue {
  id: string;
  icon: string;
  text: string;
  from: number;
  to: number;
}

export interface EffectCue {
  kind: 'wave-arc' | 'ripple' | 'glow';
  from: number;
  to: number;
  /** wave-arc: origin point (customer). ripple/glow: center. */
  at: LngLat;
  /** wave-arc: the vendor the arc reaches for. */
  vendorId?: string;
}

export const WAVE_CUSTOMER: LngLat = [-120.9945, 37.6403];
export const BLOCK_PARTY_CENTER: LngLat = [-121.0035, 37.6448];

export const vendors: SimVendorDef[] = [
  {
    id: 'tacos-el-rey',
    name: 'Tacos El Rey',
    emoji: '🌮',
    category: 'Food truck',
    rating: '4.9 (212)',
    status: 'driving',
    at: [-120.999, 37.6415],
    speed: 9,
    phase: 0,
    route: [
      [-120.999, 37.6415],
      [-120.9952, 37.6415],
      [-120.9945, 37.6406],
      [-120.9945, 37.639],
      [-120.9968, 37.6383],
      [-120.999, 37.6383],
      [-121.0002, 37.6395],
      [-120.999, 37.6415],
    ],
  },
  {
    id: 'shine-squad',
    name: 'Shine Squad Detailing',
    emoji: '🚗',
    category: 'Mobile detailing',
    rating: '4.8 (96)',
    status: 'driving',
    at: [-120.9925, 37.6428],
    speed: 8,
    phase: 400,
    route: [
      [-120.9925, 37.6428],
      [-120.99, 37.6428],
      [-120.9892, 37.6414],
      [-120.99, 37.64],
      [-120.9925, 37.6398],
      [-120.9938, 37.6412],
      [-120.9925, 37.6428],
    ],
  },
  {
    id: 'sunrise-snacks',
    name: 'Sunrise Snacks',
    emoji: '🍧',
    category: 'Shaved ice',
    rating: '4.7 (58)',
    status: 'driving',
    at: [-121.0022, 37.6438],
    speed: 8,
    phase: 200,
    route: [
      [-121.0022, 37.6438],
      [-121.0035, 37.6448],
      [-121.005, 37.6442],
      [-121.0045, 37.6428],
      [-121.0028, 37.6422],
      [-121.0015, 37.643],
      [-121.0022, 37.6438],
    ],
  },
  {
    id: 'modesto-coffee',
    name: 'Modesto Coffee Cart',
    emoji: '☕',
    category: 'Coffee',
    rating: '4.9 (301)',
    status: 'parked',
    at: [-120.9962, 37.6398],
  },
  {
    id: 'bloom-beauty',
    name: 'Bloom Mobile Beauty',
    emoji: '💅',
    category: 'Mobile beauty',
    rating: '5.0 (44)',
    status: 'parked',
    at: [-120.9915, 37.6392],
  },
  {
    id: 'pops-kettle',
    name: "Pop's Kettle Corn",
    emoji: '🍿',
    category: 'Snacks',
    rating: '4.6 (73)',
    status: 'parked',
    at: BLOCK_PARTY_CENTER,
  },
  {
    id: 'green-thumb',
    name: 'Green Thumb Plants',
    emoji: '🪴',
    category: 'Plants & handmade',
    rating: '4.8 (39)',
    status: 'away',
    at: [-120.9982, 37.6372],
  },
];

/** Vendors kept in the T2 (lite) tier — 4 pins, still one of each status. */
export const LITE_VENDOR_IDS = ['tacos-el-rey', 'modesto-coffee', 'sunrise-snacks', 'bloom-beauty'];

/** Ambient customer dots (T1 only) — opacity pulses on a per-dot phase. */
export const customerDots: { at: LngLat; phase: number }[] = [
  { at: [-120.9948, 37.6401], phase: 0 },
  { at: [-120.9958, 37.6408], phase: 0.6 },
  { at: [-120.9971, 37.6392], phase: 1.3 },
  { at: [-120.9932, 37.6419], phase: 2.1 },
  { at: [-120.9912, 37.6403], phase: 2.9 },
  { at: [-120.9995, 37.6402], phase: 3.4 },
  { at: [-121.0028, 37.6435], phase: 4.2 },
  { at: [-121.0041, 37.6441], phase: 4.9 },
  { at: [-120.9902, 37.6421], phase: 5.5 },
  { at: [-120.9966, 37.6379], phase: 6.1 },
  { at: [-120.9986, 37.6389], phase: 0.9 },
  { at: [-120.9939, 37.6395], phase: 1.7 },
];

/**
 * The 90s vignette script (hero spec §4): wave-down ~t8, queue ~t30, ping ~t50, block party ~t70.
 * Chip windows never overlap per vendor; card windows are scheduled ≤2 concurrent.
 */
export const chipCues: ChipCue[] = [
  // Wave-down vignette — Tacos El Rey.
  { vendorId: 'tacos-el-rey', from: 8, to: 11, text: '👋 Wave received', flash: true },
  { vendorId: 'tacos-el-rey', from: 11, to: 15, text: 'ETA 4 min' },
  { vendorId: 'tacos-el-rey', from: 15, to: 19, text: 'ETA 2 min' },
  { vendorId: 'tacos-el-rey', from: 19, to: 24, text: '✓ Arrived' },
  // Queue vignette — Modesto Coffee Cart.
  { vendorId: 'modesto-coffee', from: 30, to: 34, text: 'Line forming' },
  { vendorId: 'modesto-coffee', from: 34, to: 38, text: '#1 locked · 15% off' },
  { vendorId: 'modesto-coffee', from: 38, to: 42, text: '#2 locked · 10% off' },
  { vendorId: 'modesto-coffee', from: 42, to: 46, text: '#3 locked · 5% off' },
  // Ping vignette — Bloom Mobile Beauty.
  { vendorId: 'bloom-beauty', from: 50, to: 56, text: '📣 Ping forwarded ×3' },
  { vendorId: 'bloom-beauty', from: 56, to: 62, text: '+$1 tip earned' },
  // Block party — Pop's Kettle Corn anchors the glow.
  { vendorId: 'pops-kettle', from: 70, to: 86, text: '🎉 Block Party', flash: true },
];

export const cardCues: CardCue[] = [
  { id: 'card-wave', icon: '🌮', text: 'Tacos El Rey is 4 min away', from: 10, to: 14 },
  { id: 'card-queue', icon: '💜', text: 'Maria locked 15% off — #1 in line', from: 35, to: 39 },
  { id: 'card-ping', icon: '📣', text: 'Deshawn’s ping brought 3 friends', from: 52, to: 56 },
  {
    id: 'card-party',
    icon: '🎉',
    text: 'Block Party — 3 vendors at Graceada Park',
    from: 72,
    to: 76,
  },
];

export const effectCues: EffectCue[] = [
  { kind: 'wave-arc', from: 8, to: 20, at: WAVE_CUSTOMER, vendorId: 'tacos-el-rey' },
  { kind: 'ripple', from: 50, to: 58, at: [-120.9915, 37.6392] },
  { kind: 'glow', from: 70, to: 86, at: BLOCK_PARTY_CENTER },
];
