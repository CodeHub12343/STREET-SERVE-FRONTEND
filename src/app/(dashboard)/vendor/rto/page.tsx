'use client';

import { SellerRtoListings } from '@/features/rto';
import { VendorBusinessGate } from '@/features/vendor';
import { useRequireAnyRole } from '@/lib/auth/guards';
import { env } from '@/lib/env';

/**
 * 2.7 — where a seller actually sets the terms of a rent-to-own deal. Until this existed the terms
 * came from the customer's acceptance request, which meant the seller was never asked.
 */
export default function VendorRtoPage() {
  useRequireAnyRole('vendor', 'hub');
  return (
    <VendorBusinessGate>
      {(businessId) => (
        <SellerRtoListings businessId={businessId} citySlug={env.defaultCity} />
      )}
    </VendorBusinessGate>
  );
}
