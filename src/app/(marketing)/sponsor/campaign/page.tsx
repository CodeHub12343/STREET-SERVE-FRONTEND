/**
 * `/sponsor/campaign` — the signed-in sponsor's own campaign dashboard.
 *
 * Reads `/sponsors/me/fulfillment` and shows progress bars, the delivery log, and the next
 * report date. Authentication is enforced in the component via `useRequireAuth`; this route sits
 * under `/sponsor(.*)` which the middleware marks public, so a signed-out visitor sees the
 * component's own redirect rather than a bare 401.
 */
import type { Metadata } from 'next';
import { SponsorCampaignDashboard } from '@/features/marketing/sponsor/SponsorCampaignDashboard';

export const metadata: Metadata = {
  title: 'Your campaign — Sponsorships',
  description:
    'Track your StreetServe sponsorship: shout-outs delivered, videos published, postcards mailed, and the next report date.',
};

export default function SponsorCampaignRoute() {
  return <SponsorCampaignDashboard />;
}
