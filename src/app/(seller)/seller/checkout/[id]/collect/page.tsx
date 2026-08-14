import type { Metadata } from 'next';
import { CollectPayment } from '@/features/payments';

export const metadata: Metadata = { title: 'Collect payment' };

export default function CollectPaymentPage({ params }: { params: { id: string } }) {
  return <CollectPayment checkoutId={params.id} />;
}
