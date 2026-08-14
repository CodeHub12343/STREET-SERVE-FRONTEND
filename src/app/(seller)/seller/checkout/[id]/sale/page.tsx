import type { Metadata } from 'next';
import { LogSale } from '@/features/consignment';

export const metadata: Metadata = { title: 'Log a sale' };

export default function LogSalePage({ params }: { params: { id: string } }) {
  return <LogSale checkoutId={params.id} />;
}
