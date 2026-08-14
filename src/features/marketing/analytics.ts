'use client';

/**
 * Marketing analytics seam (component spec §"analytics", strategy §10). Vendor-agnostic:
 * events go to `window.dataLayer` (GTM-compatible) and are mirrored to console.debug in dev.
 * Components call `track()` and never import a vendor SDK — swapping the destination is a
 * one-file change here. Canonical events: landing_view, hero_map_interact, section_view,
 * role_tab_switch, prereg_start/step/complete/share, demo_enter, faq_expand.
 */

export type MarketingEvent =
  | 'landing_view'
  | 'hero_map_interact'
  | 'section_view'
  | 'role_tab_switch'
  | 'prereg_start'
  | 'prereg_step'
  | 'prereg_complete'
  | 'prereg_duplicate'
  | 'prereg_error'
  | 'prereg_share'
  | 'demo_enter'
  | 'faq_expand'
  | 'cta_click';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function track(event: MarketingEvent, props: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  const payload = { event, ...props, ts: Date.now() };
  (window.dataLayer ??= []).push(payload);
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', payload);
  }
}

/** Fire once per browser session (e.g. landing_view, hero_map_interact). */
export function trackOncePerSession(
  event: MarketingEvent,
  props: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return;
  const key = `ss-evt-${event}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
  } catch {
    /* storage unavailable (private mode) — still fire, just not deduped */
  }
  track(event, props);
}
