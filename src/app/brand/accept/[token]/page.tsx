/**
 * `/brand/accept/[token]` — the invite accept landing page.
 *
 * Public — the middleware lets this through without auth so the preview renders for visitors
 * who don't yet have an account. The Accept action calls the authenticated backend; a
 * signed-out user clicking it is redirected to sign-in with a return path.
 */
import type { Metadata } from 'next';
import { BrandAcceptInvite } from '@/features/brand/BrandAcceptInvite';

export const metadata: Metadata = {
  title: 'Join a brand — StreetServe',
};

export default function BrandAcceptPage({ params }: { params: { token: string } }) {
  return <BrandAcceptInvite token={params.token} />;
}
