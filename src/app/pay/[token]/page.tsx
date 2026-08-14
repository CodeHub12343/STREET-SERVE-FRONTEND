import type { Metadata } from 'next';
import { PayPage } from '@/features/payments';

export const metadata: Metadata = { title: 'Pay · StreetServe' };

/**
 * PUBLIC route — deliberately outside every auth group. A street customer must be able to pay
 * without an account, an app install, or a login.
 */
export default function PublicPayPage({ params }: { params: { token: string } }) {
  return <PayPage token={params.token} />;
}
