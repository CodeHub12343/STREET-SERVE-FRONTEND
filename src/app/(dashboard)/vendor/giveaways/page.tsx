'use client';

import { Giveaways } from '@/features/growth';
import { VendorBusinessGate } from '@/features/vendor';
import { useRequireRole } from '@/lib/auth/guards';

export default function GiveawaysPage() {
  useRequireRole('vendor');
  return <VendorBusinessGate module="giveaways">{() => <Giveaways />}</VendorBusinessGate>;
}
