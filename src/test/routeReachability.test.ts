import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every page must be reachable by tapping something.
 *
 * A route with no inbound link is a feature that was built, tested, and then made invisible — you
 * can only get there by typing the URL. An audit of this app found FOURTEEN, including the seller's
 * whole "Earn today" hub, the vendor's postcard ordering, and the upgrade paywall itself. None of
 * them were broken; they simply had no door.
 *
 * This walks `src/app`, derives the static routes, and fails if any is never referenced in source.
 * Dynamic routes (`[id]`) are excluded — those are reached by tapping a card, and a nav entry for
 * `/order/[id]` would be meaningless.
 *
 * When this fails you have two honest options: link the page, or delete it. Adding it to the
 * allowlist below is only correct when something OUTSIDE the app navigates there.
 */

const APP = join(process.cwd(), 'src', 'app');
const SRC = join(process.cwd(), 'src');

/**
 * Routes that are legitimately unlinked, each with the reason. Anything here is a claim that an
 * external system does the navigating — not a note to link it later.
 */
const EXTERNALLY_REACHED = new Map<string, string>([
  ['/payouts/complete', 'Stripe Connect redirects here after onboarding (CONNECT_RETURN_URL).'],
  ['/payouts/refresh', 'Stripe Connect redirects here when a link expires (CONNECT_REFRESH_URL).'],
  // `/sign-in` and `/sign-up` are catch-all routes (`[[...rest]]`), so they are already excluded
  // as dynamic and must NOT be listed here — the honesty check below would fail on them.
  ['/welcome', 'The unauthenticated landing target, reached before any in-app nav exists.'],
  ['/', 'The marketing root.'],
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry === 'page.tsx') out.push(full);
  }
  return out;
}

function toRoute(file: string): string {
  const rel = file.slice(APP.length).replace(/\\/g, '/').replace(/\/page\.tsx$/, '');
  // Route groups — `(customer)` — are organisational and never appear in a URL.
  const route = rel.replace(/\/\([^)]+\)/g, '');
  return route === '' ? '/' : route;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry) && entry !== 'page.tsx') {
      out.push(full);
    }
  }
  return out;
}

const ROUTES = walk(APP).map(toRoute).filter((r) => !r.includes('['));
const HAYSTACK = sourceFiles(SRC)
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

/**
 * A reference must end at a path boundary. Matching the bare string would let `/seller/earnings`
 * count as a link to `/seller/earn` — which is exactly how the missing Earn hub hid for so long.
 */
function isLinked(route: string): boolean {
  const boundary = new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"\`?#/])`);
  return boundary.test(HAYSTACK);
}

describe('every page is reachable from somewhere in the app', () => {
  it('found a sensible number of static routes to check', () => {
    // Guards the walker itself: a glob that silently matches nothing would make this suite vacuous.
    expect(ROUTES.length).toBeGreaterThan(50);
  });

  it.each(ROUTES.filter((r) => !EXTERNALLY_REACHED.has(r)))(
    '%s is linked from somewhere',
    (route) => {
      expect(
        isLinked(route),
        `Nothing links to ${route}. Add it to a nav or a parent screen, or delete the page. ` +
          `If something outside the app navigates there, add it to EXTERNALLY_REACHED with a reason.`,
      ).toBe(true);
    },
  );

  it('keeps the allowlist honest — every entry must still exist as a route', () => {
    // An allowlist entry for a deleted page is a stale excuse, and would hide a real orphan later
    // if the path were ever reused.
    for (const route of EXTERNALLY_REACHED.keys()) {
      expect(ROUTES, `${route} is allowlisted but is not a route any more`).toContain(route);
    }
  });
});
