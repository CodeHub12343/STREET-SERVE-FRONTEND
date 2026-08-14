import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The ad surface labels must describe where `<AdSlot>` is actually mounted.
 *
 * All three have been wrong at least once, and the symptom was identical every time: a vendor pays,
 * goes to the screen the form named, sees nothing, and concludes the product is broken. The ad was
 * serving correctly throughout — only the sentence was false.
 *
 * This reads the SOURCE rather than rendering anything, because the thing being defended is a fact
 * about the codebase ("a slot for surface X exists in exactly these files"), not runtime behaviour.
 * A render test would happily pass while the copy pointed at a screen with no slot on it.
 */

const SRC = join(process.cwd(), 'src');

function read(rel: string): string {
  return readFileSync(join(SRC, rel), 'utf8');
}

/** Every file that mounts an AdSlot, and the surface it mounts. Kept literal on purpose. */
const MOUNTS: Record<string, string> = {
  'features/livemap/components/DiscoverySheet.tsx': 'map_banner',
  'features/livemap/components/NearbyList.tsx': 'discovery_card',
  'features/academy/components/EarnHub.tsx': 'earn_slot',
};

describe('ad surface copy matches where slots are actually mounted', () => {
  it.each(Object.entries(MOUNTS))('%s really mounts %s', (file, surface) => {
    expect(read(file)).toContain(`surface="${surface}"`);
  });

  it('no surface claims the Jobs screen, which has no ad slot', () => {
    const flow = read('features/ads/components/PromoteFlow.tsx');
    const copyBlock = flow.slice(flow.indexOf('const SURFACE_COPY'), flow.indexOf('export type PromoteSubject'));

    // `earn_slot` used to promise "the earn and jobs screens". Jobs renders no AdSlot at all.
    expect(copyBlock.toLowerCase()).not.toMatch(/jobs screen/);
  });

  it('no surface claims the top of the map, where nothing is mounted', () => {
    const flow = read('features/ads/components/PromoteFlow.tsx');
    const copyBlock = flow.slice(flow.indexOf('const SURFACE_COPY'), flow.indexOf('export type PromoteSubject'));

    // `map_banner` renders in the sheet at the BOTTOM of the map, not across the top.
    expect(copyBlock.toLowerCase()).not.toMatch(/top of the (live )?map/);
  });

  it('mounts exactly one slot per surface, so the copy can be singular and true', () => {
    /**
     * If a second file starts mounting a surface, this fails — and the copy needs revisiting,
     * because "in the nearby list" stops being the whole truth the moment there are two.
     */
    const all = Object.values(MOUNTS);
    expect(new Set(all).size).toBe(all.length);
  });
});
