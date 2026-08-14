/**
 * Memoized Stripe.js loader (PAYMENTS_IMPLEMENTATION.md §1). Loaded lazily so Stripe.js is never in
 * the global bundle. Returns null when Stripe isn't configured (demo/dev) — the PaymentSheet then
 * falls back to its simulated form.
 */
import { loadStripe as stripeLoad, type Stripe } from '@stripe/stripe-js';
import { env, isStripeConfigured } from '@/lib/env';

let promise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!isStripeConfigured) return Promise.resolve(null);
  promise ??= stripeLoad(env.stripePublishableKey!);
  return promise;
}
