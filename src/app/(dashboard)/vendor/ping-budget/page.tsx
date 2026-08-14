'use client';

import { PingBudget } from '@/features/growth';
import { VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function PingBudgetPage() {
  useRequireRole('vendor');
  return <VendorBusinessGate module="ping_sharing">{() => <PingBudget />}</VendorBusinessGate>;
}
