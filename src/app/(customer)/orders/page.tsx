import type { Metadata } from 'next';
import { OrdersHistory } from '@/features/orders';

export const metadata: Metadata = { title: 'Orders' };

export default function OrdersPage() {
  return <OrdersHistory />;
}
