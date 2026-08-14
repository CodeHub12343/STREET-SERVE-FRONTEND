/**
 * C-02 Welcome carousel — the entry point for new users.
 */
import type { Metadata } from 'next';
import { WelcomeCarousel } from '@/features/identity';

export const metadata: Metadata = { title: 'Welcome' };

export default function WelcomePage() {
  return <WelcomeCarousel />;
}
