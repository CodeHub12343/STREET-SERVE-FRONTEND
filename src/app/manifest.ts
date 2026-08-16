/**
 * PWA web manifest (PWA_IMPLEMENTATION.md §2). Served at /manifest.webmanifest. Dark theme by
 * default (docs/06 §2.7). Icons use the StreetServe brand mark.
 */
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StreetServe',
    short_name: 'StreetServe',
    description:
      'The real-time marketplace connecting mobile vendors, street sellers, and communities.',
    start_url: '/map?source=pwa',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0E0F12',
    theme_color: '#0E0F12',
    categories: ['shopping', 'food', 'business'],
    icons: [
      // Single scalable SVG (installable in Chromium); swap for rasterized PNGs before store listing.
      /**
       * The real brand mark, replacing the placeholder SVG. `purpose: 'any'` only — deliberately
       * NOT maskable: Android crops a maskable icon to a circle and would cut the wordmark in half.
       * A proper maskable version needs a square mark with padding, which this lockup is not.
       */
      { src: '/1000020693.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
    ],
  };
}
