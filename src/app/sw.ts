/// <reference lib="webworker" />
// @ts-nocheck — service-worker global scope (webworker lib) intentionally differs from the app's
// DOM lib; Serwist compiles this file with its own worker context (PWA_IMPLEMENTATION.md).
import { defaultCache } from '@serwist/next/worker';
import { Serwist, NetworkFirst, CacheFirst, StaleWhileRevalidate, ExpirationPlugin } from 'serwist';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false, // apply update only on explicit user action (PWA_IMPLEMENTATION.md §7)
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API GET → NetworkFirst with a short timeout, cache fallback powers the offline shell (§3).
    {
      matcher: ({ url, request }) => request.method === 'GET' && url.pathname.includes('/api/'),
      handler: new NetworkFirst({
        cacheName: 'ss-api',
        networkTimeoutSeconds: 4,
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 })],
      }),
    },
    // Mapbox tiles → CacheFirst, capped (last-viewed area works offline).
    {
      matcher: ({ url }) => url.hostname.includes('mapbox') || url.hostname.includes('tiles'),
      handler: new CacheFirst({
        cacheName: 'ss-map-tiles',
        plugins: [new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 })],
      }),
    },
    // Business images (R2) → StaleWhileRevalidate so pins/profiles render offline.
    {
      matcher: ({ url, request }) =>
        request.destination === 'image' && (url.hostname.includes('r2') || url.hostname.includes('cloudflarestorage')),
      handler: new StaleWhileRevalidate({
        cacheName: 'ss-images',
        plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 })],
      }),
    },
    ...defaultCache,
  ],
  /**
   * Last resort for a navigation the runtime caches cannot satisfy.
   *
   * `defaultCache` handles pages with NetworkFirst, which REJECTS when the network fails and the
   * cache misses — a first visit to a route while offline, or any failed navigation. Serwist then
   * reports `no-response` and the browser shows its own error page, which §4 explicitly rules out
   * ("actions that require the network are disabled with explanation, not silent failures").
   *
   * Scoped to `document` destinations only: an image or API call that fails must keep failing so
   * the calling code sees a real error, rather than silently receiving an HTML page.
   */
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();

// ---- Web Push (PWA_IMPLEMENTATION.md §6) ----
self.addEventListener('push', (event: PushEvent) => {
  const data = (() => {
    try {
      return event.data?.json() ?? {};
    } catch {
      return { title: 'StreetServe', body: event.data?.text() ?? '' };
    }
  })();
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'StreetServe', {
      body: data.body ?? '',
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      data: { deeplink: data.deeplink ?? '/' },
      tag: data.category ?? 'streetserve',
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const deeplink = (event.notification.data && event.notification.data.deeplink) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const existing = clientsArr.find((c) => 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(deeplink);
    }),
  );
});
