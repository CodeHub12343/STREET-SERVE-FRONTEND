'use client';

import { BackOffice } from '@/features/backoffice';
import { VendorBusinessGate } from '@/features/vendor';
import { useRequireAnyRole } from '@/lib/auth/guards';

/**
 * 7.10 — crew, expenses, and invoices. Built on ADR-002: engagements, not employment.
 */
export default function BackOfficePage() {
  useRequireAnyRole('vendor', 'hub');
  return <VendorBusinessGate>{(businessId) => <BackOffice businessId={businessId} />}</VendorBusinessGate>;
}
