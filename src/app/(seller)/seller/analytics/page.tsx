'use client';

import { SellerAnalytics } from '@/features/consignment';
import { useRequireRole } from '@/lib/auth/guards';

export default function SellerAnalyticsPage() {
  useRequireRole('seller');
  return <SellerAnalytics />;
}
