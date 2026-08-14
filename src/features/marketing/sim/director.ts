/**
 * SimulationDirector (LANDING_PAGE_COMPONENT_SPECIFICATION.md §3) — the pure, deterministic core
 * of the hero scene. `frame(elapsedMs)` is a pure function of loop time: same input → same output,
 * and t=0 equals t=LOOP (seamless loop). No timers, no DOM, no Mapbox — the React layer owns rAF
 * and rendering, which is what makes this unit-testable and pausable for free.
 */
import type { LngLat } from '@/types';
import {
  cardCues,
  chipCues,
  customerDots,
  effectCues,
  LITE_VENDOR_IDS,
  LOOP_SECONDS,
  vendors,
  type CardCue,
  type SimStatus,
  type SimVendorDef,
} from './scene';

export interface VendorFrame {
  id: string;
  name: string;
  emoji: string;
  category: string;
  rating: string;
  status: SimStatus;
  lngLat: LngLat;
  /** Active timed chip text ('' when none) — changes a handful of times per loop. */
  chip: string;
  /** Ring flash while a flash cue is active. */
  flash: boolean;
}

export interface EffectFrame {
  /** Sampled arc customer → vendor, grows with progress. Empty when inactive. */
  waveArc: LngLat[];
  /** 0..1 expanding ripple (null when inactive). */
  ripple: { center: LngLat; progress: number } | null;
  /** 0..1 bloom for the block-party glow (null when inactive). */
  glow: { center: LngLat; progress: number } | null;
}

export interface SimFrame {
  /** Loop-local time in seconds [0, LOOP_SECONDS). */
  t: number;
  vendors: VendorFrame[];
  effects: EffectFrame;
  /** Currently visible floating cards (schedule guarantees ≤2). */
  cards: CardCue[];
  /** Ambient dots with pulsing opacity (0.15–0.5). */
  dots: { lngLat: LngLat; opacity: number }[];
}

export type SimTier = 'full' | 'lite';

const EARTH_M_PER_DEG_LAT = 111_320;

/** Equirectangular metres between two nearby points — plenty at city scale. */
function metres(a: LngLat, b: LngLat): number {
  const mLat = EARTH_M_PER_DEG_LAT;
  const mLng = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180) * EARTH_M_PER_DEG_LAT;
  const dx = (b[0] - a[0]) * mLng;
  const dy = (b[1] - a[1]) * mLat;
  return Math.hypot(dx, dy);
}

function lerp(a: LngLat, b: LngLat, f: number): LngLat {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

interface RouteWalk {
  points: LngLat[];
  /** Cumulative metres at each point; last entry = total length. */
  cum: number[];
}

function buildWalk(points: LngLat[]): RouteWalk {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push((cum[i - 1] ?? 0) + metres(points[i - 1] as LngLat, points[i] as LngLat));
  }
  return { points, cum };
}

function positionAt(walk: RouteWalk, distance: number): LngLat {
  const total = walk.cum[walk.cum.length - 1] ?? 0;
  if (total <= 0) return walk.points[0] as LngLat;
  const d = ((distance % total) + total) % total;
  for (let i = 1; i < walk.cum.length; i++) {
    const prev = walk.cum[i - 1] ?? 0;
    const next = walk.cum[i] ?? 0;
    if (d <= next) {
      const seg = next - prev;
      const f = seg > 0 ? (d - prev) / seg : 0;
      return lerp(walk.points[i - 1] as LngLat, walk.points[i] as LngLat, f);
    }
  }
  return walk.points[walk.points.length - 1] as LngLat;
}

/** Quadratic-bézier arc from→to, bowed perpendicular to the chord, drawn up to `progress` (0..1). */
function sampleArc(from: LngLat, to: LngLat, progress: number, samples = 16): LngLat[] {
  const mid: LngLat = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const ctrl: LngLat = [mid[0] - dy * 0.35, mid[1] + dx * 0.35];
  const p = Math.max(0, Math.min(1, progress));
  const n = Math.max(2, Math.round(samples * p));
  const pts: LngLat[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * p;
    const inv = 1 - t;
    pts.push([
      inv * inv * from[0] + 2 * inv * t * ctrl[0] + t * t * to[0],
      inv * inv * from[1] + 2 * inv * t * ctrl[1] + t * t * to[1],
    ]);
  }
  return pts;
}

export class SimulationDirector {
  private readonly defs: SimVendorDef[];
  private readonly walks = new Map<string, RouteWalk>();

  constructor(tier: SimTier = 'full') {
    this.defs =
      tier === 'lite' ? vendors.filter((v) => LITE_VENDOR_IDS.includes(v.id)) : vendors;
    for (const v of this.defs) {
      if (v.route && v.route.length > 1) this.walks.set(v.id, buildWalk(v.route));
    }
    this.tier = tier;
  }

  readonly tier: SimTier;

  /** The full route polylines (for the map's route-line layer). */
  routes(): { id: string; line: LngLat[] }[] {
    return this.defs
      .filter((v) => v.route)
      .map((v) => ({ id: v.id, line: v.route as LngLat[] }));
  }

  frame(elapsedMs: number): SimFrame {
    const t = (((elapsedMs / 1000) % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;

    const vendorFrames: VendorFrame[] = this.defs.map((v) => {
      const walk = this.walks.get(v.id);
      const lngLat: LngLat =
        v.status === 'driving' && walk
          ? positionAt(walk, (v.phase ?? 0) + (v.speed ?? 8) * t)
          : v.at;
      const cue = chipCues.find(
        (c) => c.vendorId === v.id && t >= c.from && t < c.to,
      );
      return {
        id: v.id,
        name: v.name,
        emoji: v.emoji,
        category: v.category,
        rating: v.rating,
        status: v.status,
        lngLat,
        chip: cue?.text ?? '',
        flash: cue?.flash ?? false,
      };
    });

    const effects: EffectFrame = { waveArc: [], ripple: null, glow: null };
    for (const cue of effectCues) {
      if (t < cue.from || t >= cue.to) continue;
      const progress = (t - cue.from) / (cue.to - cue.from);
      if (cue.kind === 'wave-arc' && cue.vendorId) {
        const target = vendorFrames.find((v) => v.id === cue.vendorId);
        if (target) {
          // The arc draws over the first quarter of its window, then holds.
          const draw = Math.min(1, progress * 4);
          effects.waveArc = sampleArc(cue.at, target.lngLat, draw);
        }
      } else if (cue.kind === 'ripple') {
        // Two expanding pulses across the window.
        effects.ripple = { center: cue.at, progress: (progress * 2) % 1 };
      } else if (cue.kind === 'glow') {
        // Ease-out bloom that holds, then fades over the last fifth.
        const bloom = Math.min(1, progress * 3);
        const fade = progress > 0.8 ? 1 - (progress - 0.8) / 0.2 : 1;
        effects.glow = { center: cue.at, progress: bloom * fade };
      }
    }

    const cards = cardCues.filter((c) => t >= c.from && t < c.to);

    const dots =
      this.tier === 'full'
        ? customerDots.map((d) => ({
            lngLat: d.at,
            opacity: 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.7 + d.phase)),
          }))
        : [];

    return { t, vendors: vendorFrames, effects, cards, dots };
  }
}
