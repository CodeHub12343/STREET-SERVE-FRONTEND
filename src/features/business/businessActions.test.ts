import { describe, expect, it } from 'vitest';
import { resolveActions, resolveSections } from './businessActions';
import type { BusinessModule } from './hooks/useBusinessModules';

/**
 * BP-6 exit criteria, proved on the pure resolver: a barber leads with Book, a food truck with
 * Order, a locksmith with Wave them down — with no per-category branching anywhere.
 *
 * The module sets below mirror the server's ARCHETYPE_DEFAULTS (modules.service.ts).
 */
const CORE: BusinessModule[] = [
  'live_presence',
  'profile',
  'reviews',
  'messaging',
  'payouts',
  'analytics',
];

const BARBER: BusinessModule[] = [...CORE, 'services', 'booking'];
const FOOD_TRUCK: BusinessModule[] = [...CORE, 'menu', 'ordering', 'queue', 'wave_down'];
const LOCKSMITH: BusinessModule[] = [...CORE, 'services', 'wave_down'];
const HANDMADE: BusinessModule[] = [...CORE, 'menu', 'catalog', 'ordering', 'consignment'];

describe('primary customer action', () => {
  it('a barber leads with Book', () => {
    expect(resolveActions(BARBER)[0]).toMatchObject({ id: 'book', label: 'Book an appointment' });
  });

  it('a food truck leads with Order', () => {
    expect(resolveActions(FOOD_TRUCK)[0]).toMatchObject({ id: 'order', label: 'Order now' });
  });

  it('a locksmith leads with Wave them down', () => {
    expect(resolveActions(LOCKSMITH)[0]).toMatchObject({ id: 'wave', label: 'Wave them down' });
  });

  it('every action carries a short form for list rows', () => {
    expect(resolveActions(FOOD_TRUCK).map((a) => a.short)).toEqual(['Order', 'Wave']);
  });

  it('a goods seller leads with an ordering action', () => {
    expect(resolveActions(HANDMADE)[0]?.id).toBe('order');
  });
});

describe('secondary actions', () => {
  it('a food truck still offers Wave them down, second', () => {
    const actions = resolveActions(FOOD_TRUCK);
    expect(actions.map((a) => a.id)).toEqual(['order', 'wave']);
  });

  it('a barber offers Book only — never a wave-down or an order', () => {
    expect(resolveActions(BARBER).map((a) => a.id)).toEqual(['book']);
  });

  it('a locksmith offers Wave only', () => {
    expect(resolveActions(LOCKSMITH).map((a) => a.id)).toEqual(['wave']);
  });
});

describe('capability, not category', () => {
  it('ordering without a menu is not offered — there would be nothing to order', () => {
    const brokenTruck: BusinessModule[] = [...CORE, 'ordering', 'wave_down'];
    expect(resolveActions(brokenTruck).map((a) => a.id)).toEqual(['wave']);
  });

  it('a vendor turning ordering off changes their own CTA — a category switch could not', () => {
    const truckNoOrdering: BusinessModule[] = [...CORE, 'menu', 'queue', 'wave_down'];
    expect(resolveActions(truckNoOrdering)[0]?.id).toBe('wave');
  });

  it('an on-demand business that enables booking leads with Book instead', () => {
    const mechanicTakingBookings: BusinessModule[] = [...CORE, 'services', 'wave_down', 'booking'];
    expect(resolveActions(mechanicTakingBookings)[0]?.id).toBe('book');
  });

  /**
   * The reported bug, exactly: a furniture/accessories seller's profile showed "Book an
   * appointment" beside "Order now", and the booking screen dead-ended on "this business hasn't
   * published any bookable services yet". Booking now requires something bookable behind it.
   */
  it('booking with no services is not offered — the booking screen would dead-end', () => {
    const furnitureHub: BusinessModule[] = [...CORE, 'menu', 'catalog', 'ordering', 'booking'];
    const ids = resolveActions(furnitureHub).map((a) => a.id);

    expect(ids).not.toContain('book');
    expect(ids[0]).toBe('order');
  });

  it('one account never offers both Book and Order', () => {
    // Belt and braces: the server can no longer enable both, but the CTA table must not depend
    // on that to stay coherent.
    const both: BusinessModule[] = [...CORE, 'menu', 'ordering', 'services', 'booking'];
    const ids = resolveActions(both).map((a) => a.id);

    expect(ids.filter((id) => id === 'book' || id === 'order')).toHaveLength(1);
  });

  it('a catalog with no ordering falls back to Browse', () => {
    const catalogOnly: BusinessModule[] = [...CORE, 'catalog'];
    expect(resolveActions(catalogOnly).map((a) => a.id)).toEqual(['browse']);
  });

  it('core-only resolves to no actions rather than a wrong one', () => {
    expect(resolveActions(CORE)).toEqual([]);
  });

  it('unresolved modules yield nothing (never a default guess)', () => {
    expect(resolveActions(undefined)).toEqual([]);
  });
});

describe('profile sections', () => {
  it('a barber has no menu section', () => {
    expect(resolveSections(BARBER)).toMatchObject({ menu: false, services: true, queue: false });
  });

  it('a food truck has a menu and a queue, but no services', () => {
    expect(resolveSections(FOOD_TRUCK)).toMatchObject({
      menu: true,
      services: false,
      queue: true,
    });
  });

  it('a locksmith shows services and neither menu nor queue', () => {
    expect(resolveSections(LOCKSMITH)).toMatchObject({
      menu: false,
      services: true,
      queue: false,
    });
  });
});
