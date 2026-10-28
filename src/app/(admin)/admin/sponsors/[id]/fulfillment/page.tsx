/**
 * `/admin/sponsors/[id]/fulfillment` — the admin surface for logging a sponsor's deliverables.
 *
 * Scoped per sponsor so the main sponsor roster stays clean; from the roster, each row links
 * here. Permissions enforced server-side via `admin:manage_sponsors`.
 */
import type { Metadata } from 'next';
import { SponsorFulfillmentPanel } from '@/features/admin/components/SponsorFulfillmentPanel';

export const metadata: Metadata = { title: 'Sponsor fulfillment' };

export default function AdminSponsorFulfillmentPage({ params }: { params: { id: string } }) {
  return <SponsorFulfillmentPanel sponsorId={params.id} />;
}
