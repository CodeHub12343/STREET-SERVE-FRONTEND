/**
 * `/sponsor/p/[slug]` — public sponsor profile.
 *
 * Lives under `/sponsor/p/` rather than `/sponsor/[slug]` so it does NOT collide with the two
 * fixed child routes (`/sponsor/campaign`, `/sponsor/ice-cream-giveaway`). Nested routing in
 * Next's App Router cannot have both a dynamic segment and a fixed sibling without the fixed one
 * winning; the `/p/` scoping is the simplest way to keep the two mental models apart.
 */
import type { Metadata } from 'next';
import { SponsorProfilePage } from '@/features/marketing/sponsor/SponsorProfilePage';

export const metadata: Metadata = {
  title: 'Sponsor — StreetServe',
};

export default function PublicSponsorProfileRoute({
  params,
}: {
  params: { slug: string };
}) {
  return <SponsorProfilePage slug={params.slug} />;
}
