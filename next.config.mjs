import withSerwistInit from '@serwist/next';

/**
 * StreetServe Next.js config.
 * - `compiler.styledComponents` enables the styled-components SWC transform (SSR display
 *   names + consistent class hashing) required by the App Router registry — see
 *   NEXTJS_ARCHITECTURE.md §4.1.
 * - Serwist (the PWA service worker) is wired but gated behind `ENABLE_PWA` so Milestone 0
 *   boots/builds without SW plumbing. It is fully enabled in Milestone 9 (PWA_IMPLEMENTATION.md).
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compiler: {
    styledComponents: true,
  },
  images: {
    // Business covers/logos/menu/gallery + Mapbox assets. Remote hosts are added per env.
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'api.mapbox.com' },
    ],
  },
  // The API, Socket.IO server and BullMQ workers live on the standalone backend
  // (NEXTJS_ARCHITECTURE.md §1) — nothing about them belongs in this config.
};

// PWA is on for production builds, off in dev (fast HMR). Force-off with ENABLE_PWA=false.
const pwaDisabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_PWA === 'false';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: pwaDisabled,
  reloadOnOnline: true,
});

export default withSerwist(nextConfig);
