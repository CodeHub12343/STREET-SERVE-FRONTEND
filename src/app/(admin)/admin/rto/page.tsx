'use client';

import { RtoAdmin } from '@/features/admin/components/RtoAdmin';
import { useRequireRole } from '@/lib/auth/guards';

/**
 * §43/§60.3 — the RTO compliance surface. Approvals, city flags and category eligibility were all
 * changeable only by direct API access before this screen existed.
 */
export default function AdminRtoPage() {
  useRequireRole('admin');
  return <RtoAdmin />;
}
