/**
 * `/brand/[brandId]/overview` — the franchise owner / manager overview.
 *
 * Authenticated. The server-side `/brands/:id/overview` endpoint enforces owner-or-manager
 * membership — a visitor without the right role sees a 404 (not a 403, so the brand's
 * existence isn't advertised).
 */
import type { Metadata } from 'next';
import { BrandOverview } from '@/features/brand/BrandOverview';

export const metadata: Metadata = { title: 'Brand overview' };

export default function BrandOverviewPage({ params }: { params: { brandId: string } }) {
  return <BrandOverview brandId={params.brandId} />;
}
