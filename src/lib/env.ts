/**
 * Typed, validated public environment. Only NEXT_PUBLIC_* is available in the browser;
 * secrets never appear here (AUTHENTICATION_IMPLEMENTATION.md §9). Next inlines these at
 * build time, so they must be referenced statically (not via a dynamic key).
 */
import { z } from 'zod';

const schema = z.object({
  apiUrl: z.string().url().default('http://localhost:8080/api/v1'),
  socketUrl: z.string().url().default('http://localhost:8080'),
  clerkPublishableKey: z.string().optional(),
  stripePublishableKey: z.string().optional(),
  mapboxToken: z.string().optional(),
  vapidPublicKey: z.string().optional(),
  /** Market this build serves. Scopes RTO offers, which are opened city by city (§60.3). */
  defaultCity: z.string().min(1),
});

const parsed = schema.safeParse({
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL,
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || undefined,
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || undefined,
  mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || undefined,
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
  defaultCity: process.env.NEXT_PUBLIC_DEFAULT_CITY || 'modesto-ca',
});

/**
 * Demo mode: serve local sample businesses + simulated live-pin movement so the map is fully
 * walkable without a backend or Mapbox token. Off by default; enable with NEXT_PUBLIC_MAP_DEMO=true.
 */
export const isMapDemo = process.env.NEXT_PUBLIC_MAP_DEMO === 'true';

if (!parsed.success) {
  // Surfaced at boot so misconfiguration fails fast rather than mid-request.
  throw new Error(`Invalid public environment: ${parsed.error.message}`);
}

export const env = parsed.data;

/** Auth is active only when Clerk is configured; the shell boots without it (dev). */
export const isAuthConfigured = Boolean(env.clerkPublishableKey);
export const isStripeConfigured = Boolean(env.stripePublishableKey);
export const isMapConfigured = Boolean(env.mapboxToken);
export const isPushConfigured = Boolean(env.vapidPublicKey);
