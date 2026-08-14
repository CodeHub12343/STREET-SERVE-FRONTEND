/**
 * What a customer can actually do with a business (BP-6).
 *
 * Derived from the business's resolved modules via a PRIORITY TABLE — deliberately not a
 * per-category `if`. Adding a category must never mean editing a component: a barber leads with
 * "Book" and a locksmith with "Wave them down" because of what they *can do*, not because anyone
 * wrote `if (category === 'barber')`. A vendor who turns a module off changes their own CTA, which
 * a category switch could never express.
 *
 * Pure and exhaustively unit-testable — no React, no fetching.
 */
import type { BusinessModule } from './hooks/useBusinessModules';

export interface BusinessAction {
  /** Stable id for tests/analytics. */
  id: 'book' | 'order' | 'wave' | 'browse';
  label: string;
  /** For list rows and chips, where the full label doesn't fit. */
  short: string;
  /** Appended to /business/:id/ */
  path: string;
}

/**
 * First match wins, so order is the product decision:
 *  • booking beats everything — if you can be booked, that's the ask
 *  • ordering (with something to order) beats wave-down, so a food truck leads with "Order"
 *    while still offering "Wave them down" second
 *  • wave-down is the on-demand trade's whole loop
 *  • browse is the fallback for a catalog with no ordering
 *
 * `book` and `order` are mutually exclusive by construction — the server never enables both
 * (COMMERCE_MODULES) — so a profile can only ever lead with one of them.
 *
 * Every commerce action also requires its CONTENT module, not just the transaction one. A furniture
 * seller once showed "Book an appointment" that landed on "this business hasn't published any
 * bookable services yet"; requiring `services` here makes that CTA unrenderable rather than merely
 * unlucky.
 */
const ACTION_TABLE: (BusinessAction & { requires: BusinessModule[] })[] = [
  {
    id: 'book',
    label: 'Book an appointment',
    short: 'Book',
    path: 'book',
    requires: ['booking', 'services'],
  },
  { id: 'order', label: 'Order now', short: 'Order', path: 'order', requires: ['ordering', 'menu'] },
  { id: 'wave', label: 'Wave them down', short: 'Wave', path: 'wave', requires: ['wave_down'] },
  { id: 'browse', label: 'Browse & reserve', short: 'Browse', path: 'order', requires: ['catalog'] },
];

/** Book / Order / Browse are all "how you transact" — a profile leads with exactly one of them. */
const COMMERCE_ACTIONS = new Set<BusinessAction['id']>(['book', 'order', 'browse']);

/** Every action this business supports, most important first. */
export function resolveActions(enabled: BusinessModule[] | undefined): BusinessAction[] {
  if (!enabled) return [];
  const matched = ACTION_TABLE.filter((a) => a.requires.every((m) => enabled.includes(m)));

  // The server guarantees one commerce mode per account, but the CTA row must stay coherent even
  // if it ever sees stale or hand-edited data — two competing primary asks is the bug, not a state
  // worth rendering. Table order decides the winner.
  let commerceTaken = false;
  return matched
    .filter((a) => {
      if (!COMMERCE_ACTIONS.has(a.id)) return true;
      if (commerceTaken) return false;
      commerceTaken = true;
      return true;
    })
    .map(({ id, label, short, path }) => ({ id, label, short, path }));
}

/** Which optional profile sections this business should show — same derivation, no branching. */
export function resolveSections(enabled: BusinessModule[] | undefined) {
  const has = (m: BusinessModule) => Boolean(enabled?.includes(m));
  return {
    // A barber has no menu; rendering an empty "Menu" section is how a product feels generic.
    menu: has('menu'),
    services: has('services'),
    queue: has('queue'),
    // The community fund only appears where the business opted in — the same rule as every other
    // module. An unfunded "Pay it forward" heading on a profile that has none is noise.
    payItForward: has('pay_it_forward'),
  };
}
