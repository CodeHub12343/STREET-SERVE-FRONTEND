/**
 * `/sponsor/ice-cream-giveaway` — the Great Ice Cream Giveaway sponsor landing page.
 *
 * Public. Shares the marketing shell and the SponsorCheckout component with `/sponsor`; what
 * differs is the rate card (one-time 90-day packages instead of monthly), the comparison matrix,
 * and the public roster filter — see `IceCreamGiveawayPage` for the implementation.
 */
import type { Metadata } from 'next';
import { IceCreamGiveawayPage } from '@/features/marketing/sponsor/IceCreamGiveawayPage';

export const metadata: Metadata = {
  title: 'The Great Ice Cream Giveaway — Sponsorships',
  description:
    'Back the Great Ice Cream Giveaway: a 90-day Silicon Valley community campaign with shout-outs, promotional videos, postcards, and logo placement across every giveaway event. Silver, Gold, Platinum, and Diamond packages.',
};

export default function IceCreamGiveawaySponsorPage() {
  return <IceCreamGiveawayPage />;
}
