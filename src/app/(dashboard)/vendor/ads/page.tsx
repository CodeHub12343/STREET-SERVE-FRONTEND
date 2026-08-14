'use client';

import { AdsDashboard } from '@/features/ads';
import { VendorBusinessGate } from '@/features/vendor';
import { useRequireAnyRole } from '@/lib/auth/guards';

/**
 * M-11 / RV-17 — the advertising dashboard. Six working endpoints had no screen at all, so a
 * business could buy a promotion and had no way to see what it delivered.
 *
 * Hub owners reach this too: a hub buys featured placement for its products and needs the same
 * reporting, and gating it behind the vendor role would push them into a mode they don't use.
 */
export default function VendorAdsPage() {
  useRequireAnyRole('vendor', 'hub');
  return <VendorBusinessGate>{(businessId) => <AdsDashboard businessId={businessId} />}</VendorBusinessGate>;
}
