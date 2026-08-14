import type { Metadata } from 'next';
import { OrderTracking } from '@/features/orders';

export const metadata: Metadata = { title: 'Order tracking' };

export default function OrderPage({ params }: { params: { id: string } }) {
  return <OrderTracking id={params.id} />;
}
