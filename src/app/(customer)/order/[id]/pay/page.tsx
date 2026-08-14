import type { Metadata } from 'next';
import { PaymentPage } from '@/features/orders';

export const metadata: Metadata = { title: 'Payment' };

export default function PayPage({ params }: { params: { id: string } }) {
  return <PaymentPage id={params.id} />;
}
