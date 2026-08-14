/**
 * Root layout (RSC). Owns <html>, fonts, metadata, and mounts the single client <Providers>
 * tree (NEXTJS_ARCHITECTURE.md §2, §4). Stays a server component; the interactive app lives
 * under the route groups.
 */
import type { Metadata, Viewport } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'StreetServe',
    template: '%s · StreetServe',
  },
  description:
    'The real-time marketplace connecting mobile vendors, street sellers, and communities. See good, do good.',
  applicationName: 'StreetServe',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'StreetServe' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0E0F12' },
    { media: '(prefers-color-scheme: light)', color: '#FAFAF9' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
