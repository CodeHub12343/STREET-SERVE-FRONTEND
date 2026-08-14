'use client';

import { EmployerJobs } from '@/features/jobs';
import { VendorBusinessGate } from '@/features/vendor';
import { useRequireAnyRole } from '@/lib/auth/guards';

export default function VendorJobsPage() {
  // `job:post` is granted to vendor and hub alike — a hub operator hiring help shouldn't have to
  // switch modes to do it.
  useRequireAnyRole('vendor', 'hub');
  return <VendorBusinessGate>{(businessId) => <EmployerJobs businessId={businessId} />}</VendorBusinessGate>;
}
