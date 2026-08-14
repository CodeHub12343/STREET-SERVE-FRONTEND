/**
 * SimulationDirector unit tests (roadmap LP-2 / component spec §7): determinism, seamless loop,
 * vignette windows in order, floating-card concurrency ≤2, route containment, tier filtering.
 */
import { describe, expect, it } from 'vitest';
import { SimulationDirector } from './director';
import { cardCues, LITE_VENDOR_IDS, LOOP_SECONDS, vendors } from './scene';

describe('SimulationDirector', () => {
  it('is deterministic — same t gives an identical frame across instances', () => {
    const a = new SimulationDirector();
    const b = new SimulationDirector();
    for (const t of [0, 1234, 45_000, 89_999]) {
      expect(a.frame(t)).toEqual(b.frame(t));
    }
  });

  it('loops seamlessly — t=0 and t=LOOP produce the same frame', () => {
    const d = new SimulationDirector();
    expect(d.frame(0)).toEqual(d.frame(LOOP_SECONDS * 1000));
    expect(d.frame(12_345)).toEqual(d.frame(12_345 + LOOP_SECONDS * 1000));
  });

  it('handles negative and huge elapsed times without leaving the loop', () => {
    const d = new SimulationDirector();
    expect(d.frame(-500).t).toBeGreaterThanOrEqual(0);
    expect(d.frame(-500).t).toBeLessThan(LOOP_SECONDS);
    expect(d.frame(Number.MAX_SAFE_INTEGER % 1e9).t).toBeLessThan(LOOP_SECONDS);
  });

  it('keeps driving vendors on their routes and parked/away vendors fixed', () => {
    const d = new SimulationDirector();
    const defsById = new Map(vendors.map((v) => [v.id, v]));
    for (let t = 0; t < LOOP_SECONDS * 1000; t += 5_000) {
      for (const v of d.frame(t).vendors) {
        const def = defsById.get(v.id)!;
        if (def.status === 'driving' && def.route) {
          const lngs = def.route.map((p) => p[0]);
          const lats = def.route.map((p) => p[1]);
          expect(v.lngLat[0]).toBeGreaterThanOrEqual(Math.min(...lngs) - 1e-9);
          expect(v.lngLat[0]).toBeLessThanOrEqual(Math.max(...lngs) + 1e-9);
          expect(v.lngLat[1]).toBeGreaterThanOrEqual(Math.min(...lats) - 1e-9);
          expect(v.lngLat[1]).toBeLessThanOrEqual(Math.max(...lats) + 1e-9);
        } else {
          expect(v.lngLat).toEqual(def.at);
        }
      }
    }
  });

  it('driving vendors actually move between frames', () => {
    const d = new SimulationDirector();
    const p0 = d.frame(0).vendors.find((v) => v.id === 'tacos-el-rey')!.lngLat;
    const p1 = d.frame(5_000).vendors.find((v) => v.id === 'tacos-el-rey')!.lngLat;
    expect(p0).not.toEqual(p1);
  });

  it('fires all four vignettes, in schedule order, exactly within their windows', () => {
    const d = new SimulationDirector();
    // Wave arc at t=10 (active), gone at t=25.
    expect(d.frame(10_000).effects.waveArc.length).toBeGreaterThan(1);
    expect(d.frame(25_000).effects.waveArc).toHaveLength(0);
    // Queue chips on the coffee cart mid-window.
    expect(d.frame(35_000).vendors.find((v) => v.id === 'modesto-coffee')!.chip).toContain('15%');
    // Ping ripple active at t=52, inactive at t=65.
    expect(d.frame(52_000).effects.ripple).not.toBeNull();
    expect(d.frame(65_000).effects.ripple).toBeNull();
    // Block-party glow at t=75, cleared by loop end.
    expect(d.frame(75_000).effects.glow).not.toBeNull();
    expect(d.frame(89_000).effects.glow).toBeNull();
    // Wave chip sequence progresses.
    expect(d.frame(9_000).vendors.find((v) => v.id === 'tacos-el-rey')!.chip).toContain('Wave');
    expect(d.frame(20_000).vendors.find((v) => v.id === 'tacos-el-rey')!.chip).toContain('Arrived');
  });

  it('never shows more than 2 floating cards (checked exhaustively at 100ms resolution)', () => {
    const d = new SimulationDirector();
    for (let t = 0; t < LOOP_SECONDS * 1000; t += 100) {
      expect(d.frame(t).cards.length).toBeLessThanOrEqual(2);
    }
  });

  it('card cues all fall inside the loop and have positive duration', () => {
    for (const c of cardCues) {
      expect(c.from).toBeGreaterThanOrEqual(0);
      expect(c.to).toBeLessThanOrEqual(LOOP_SECONDS);
      expect(c.to).toBeGreaterThan(c.from);
    }
  });

  it('lite tier renders only the 4 lite vendors and no ambient dots', () => {
    const d = new SimulationDirector('lite');
    const frame = d.frame(0);
    expect(frame.vendors.map((v) => v.id).sort()).toEqual([...LITE_VENDOR_IDS].sort());
    expect(frame.dots).toHaveLength(0);
  });

  it('full tier pulses ambient dots within the designed opacity band', () => {
    const d = new SimulationDirector();
    for (const t of [0, 10_000, 44_000, 71_000]) {
      for (const dot of d.frame(t).dots) {
        expect(dot.opacity).toBeGreaterThanOrEqual(0.15);
        expect(dot.opacity).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it('exposes route polylines for the route-line layer', () => {
    const d = new SimulationDirector();
    const routes = d.routes();
    expect(routes.length).toBe(3);
    for (const r of routes) expect(r.line.length).toBeGreaterThan(2);
  });
});
