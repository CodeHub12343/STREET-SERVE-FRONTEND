/**
 * PWA web manifest (PWA_IMPLEMENTATION.md §2). Served at /manifest.webmanifest. Dark theme by
 * default (docs/06 §2.7); icons are placeholders until the brand mark is finalized.
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
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
