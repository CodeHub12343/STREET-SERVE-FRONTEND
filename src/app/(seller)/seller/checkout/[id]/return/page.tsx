import type { Metadata } from 'next';
import { ReturnFlow } from '@/features/consignment';

export const metadata: Metadata = { title: 'Return' };

export default function ReturnPage({ params }: { params: { id: string } }) {
  return <ReturnFlow checkoutId={params.id} />;
}
