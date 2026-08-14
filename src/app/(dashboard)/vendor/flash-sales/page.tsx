'use client';

import { FlashSaleManager } from '@/features/backoffice';
import { VendorBusinessGate } from '@/features/vendor';
import { useRequireAnyRole } from '@/lib/auth/guards';

/** 7.6 / P-15 — run a short sale. Discounts never stack; the screen says so before you start one. */
export default function FlashSalesPage() {
  useRequireAnyRole('vendor', 'hub');
  return (
    <VendorBusinessGate>{(businessId) => <FlashSaleManager businessId={businessId} />}</VendorBusinessGate>
  );
}
