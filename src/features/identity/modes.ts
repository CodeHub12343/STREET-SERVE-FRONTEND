/**
 * One account, many surfaces — the single source of mode metadata shared by the RoleSwitcher
 * (topbar) and the ModeDeck (profile hero). Adding a future mode here is the whole job: both
 * surfaces pick it up (AUTHENTICATION_IMPLEMENTATION.md §4).
 */
import { MapPin, ShoppingBag, Truck, Warehouse, Shield, Home, type LucideIcon } from 'lucide-react';
import type { AppMode, Role } from '@/types';

export interface ModeMeta {
  label: string;
  home: string;
  roles: Role[];
  icon: LucideIcon;
  /** One line of what this identity is for. */
  tagline: string;
  /** Three value-proposition bullets — the role preview sheet's body. */
  benefits: string[];
}

export const MODE_META: Record<AppMode, ModeMeta> = {
  customer: {
    label: 'Customer',
    home: '/map',
    roles: ['customer'],
    icon: MapPin,
    tagline: 'Find food & services moving near you',
    benefits: [
      'Order & wave down businesses near you',
      'Lock line-up discounts by joining early',
      'Track orders, bookings & favorites',
    ],
  },
  seller: {
    // Onboarding-first: the intro (S-01) is the seller surface's entry. It auto-forwards returning
    // sellers straight to Discover, so only the first visit sees the pitch.
    label: 'Street Seller',
    home: '/seller/start',
    roles: ['seller'],
    icon: ShoppingBag,
    tagline: 'Sell hub inventory on the street',
    benefits: [
      'Sell hub inventory with zero upfront cost',
      'Scan-to-checkout right on the street',
      'AI suggests what sells in your area',
    ],
  },
  vendor: {
    label: 'Vendor',
    home: '/vendor',
    roles: ['vendor'],
    icon: Truck,
    tagline: 'Run your mobile business live',
    benefits: [
      'Go live and be found on the map',
      'Take orders, bookings & wave-downs',
      'Grow with pings, giveaways & analytics',
    ],
  },
  hub: {
    label: 'Consignment Hub',
    home: '/hub',
    roles: ['hub'],
    icon: Warehouse,
    tagline: 'Stock sellers & settle consignment',
    benefits: [
      'Stock street sellers from your storefront',
      'Approve sellers & track every item',
      'Automated settlements & AI insights',
    ],
  },
  shelter: {
    label: 'Shelter program',
    home: '/shelter',
    roles: ['shelter_admin'],
    icon: Home,
    tagline: 'Enrol residents and hold their earnings safely',
    benefits: [
      'Enrol residents and give them a code to join',
      'Hold and hand over earnings for residents with no bank account',
      'Track training, custody and payouts in one place',
    ],
  },
  admin: {
    label: 'Admin',
    home: '/admin',
    roles: ['admin', 'ops_finance'],
    icon: Shield,
    tagline: 'Operations console',
    benefits: ['Review disputes & licences', 'Manage users & categories', 'Monitor fraud & payouts'],
  },
};

export const ALL_MODES: AppMode[] = ['customer', 'seller', 'vendor', 'hub', 'shelter', 'admin'];

/**
 * Only these can be self-granted — mirrors the backend's SELF_GRANTABLE_ROLES, which rejects
 * anything else with CANNOT_SELF_GRANT_ROLE. Admin/ops_finance are granted by ops, never by the
 * holder, so we must not advertise "Become an Admin" as an entry point that can only ever fail.
 * Privileged modes appear only once the user actually holds them.
 *
 * `shelter` is deliberately absent for the same reason: a shelter partnership is granted by an
 * admin registering the organisation, after whatever vetting that involves. Offering "Become a
 * Shelter" would advertise a door that only ever returns CANNOT_SELF_GRANT_ROLE.
 */
export const SELF_GRANTABLE_MODES: AppMode[] = ['seller', 'vendor', 'hub'];

export const holdsMode = (roles: Role[], mode: AppMode): boolean =>
  MODE_META[mode].roles.some((r) => roles.includes(r));

/**
 * Route → surface. The rendered route is the ONLY honest answer to "which mode am I in": the
 * layout, the nav and every screen come from it. The persisted `activeMode` only changes when
 * someone taps Switch, so it silently goes stale the moment a user reaches another surface any
 * other way — the seller orbit's Map item, a notification deeplink, a plain router.push — and the
 * chrome then announces a mode the user is demonstrably not in.
 *
 * Listed longest-first is unnecessary here (no prefix is a prefix of another), but matching is
 * segment-aware so a future `/vendors` route can never be mistaken for `/vendor`.
 */
const MODE_ROUTES: ReadonlyArray<readonly [string, AppMode]> = [
  ['/seller', 'seller'],
  ['/vendor', 'vendor'],
  ['/hub', 'hub'],
  ['/shelter', 'shelter'],
  ['/admin', 'admin'],
  // Customer surfaces are enumerated rather than treated as a catch-all: /sign-in, /onboarding,
  // /pay/[token] and the marketing root are not a mode, and guessing "customer" for them would
  // trade one wrong label for another.
  ['/map', 'customer'],
  ['/orders', 'customer'],
  ['/order', 'customer'],
  ['/messages', 'customer'],
  ['/notifications', 'customer'],
  ['/favorites', 'customer'],
  ['/profile', 'customer'],
  ['/settings', 'customer'],
  ['/help', 'customer'],
  ['/business', 'customer'],
  ['/booking', 'customer'],
  ['/queue', 'customer'],
  ['/wave', 'customer'],
  ['/rto', 'customer'],
  ['/gift', 'customer'],
  ['/disputes', 'customer'],
  ['/block-party', 'customer'],
];

/** The surface a path belongs to, or null when the path is not a mode surface at all. */
export function modeFromPathname(pathname: string): AppMode | null {
  for (const [prefix, mode] of MODE_ROUTES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return mode;
  }
  return null;
}
