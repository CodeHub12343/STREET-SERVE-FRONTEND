/**
 * `/sponsor` — the unified Sponsorships & Investors page.
 *
 * Public. It was inside the middleware's protected set, so the one page whose audience is by
 * definition not signed in redirected them to sign-in before they could read what a placement
 * costs. The payment is what's guarded now, not the reading (see SponsorCheckout).
 */
import type { Metadata } from 'next';
import { SponsorshipsInvestors } from '@/features/marketing/sponsor/SponsorshipsInvestors';

export const metadata: Metadata = {
  title: 'Sponsorships & Investors',
  description:
    'Sponsor StreetServe and get credited for every person who signs up through your link, or talk to us about investing in the live map of the mobile economy.',
};

export default function SponsorPage() {
  return <SponsorshipsInvestors />;
}
