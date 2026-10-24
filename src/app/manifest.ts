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
      /**
       * Chrome needs ≥192 and ≥512 PNG declarations in the manifest or it refuses to install the
       * PWA and the "Add to Home Screen" shortcut falls back to a generic letter + Chrome overlay
       * (which is what Android home screens were showing). The 192/512 variants are rasterised from
       * the 1024 brand mark at build-prep time; they live in /public/.
       */
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      /**
       * Maskable variant with a built-in safe zone (72% centre, dark backdrop) so Android's circle
       * crop doesn't cut off the mark. Only used by the OS launcher; `any` icons above are what the
       * browser tab and share sheet pick up.
       */
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      /** Original 1024 kept for high-DPI contexts (store listings, splash). */
      { src: '/1000020693.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
    ],
  };
}
