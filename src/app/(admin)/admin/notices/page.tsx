'use client';

import { UndeliveredNotices } from '@/features/admin/components/UndeliveredNotices';
import { useRequireAnyRole } from '@/lib/auth/guards';

/**
 * 7.1 — contractual notices that reached nobody. §38/§49/§53 are obligations; this is where an
 * undelivered one becomes visible before it becomes a dispute.
 */
export default function UndeliveredNoticesPage() {
  useRequireAnyRole('admin');
  return <UndeliveredNotices />;
}
