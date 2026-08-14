import type { Metadata } from 'next';
import { Receipt } from '@/features/orders';

export const metadata: Metadata = { title: 'Receipt' };

export default function ReceiptPage({ params }: { params: { id: string } }) {
  return <Receipt id={params.id} />;
}
