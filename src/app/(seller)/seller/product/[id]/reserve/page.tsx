import type { Metadata } from 'next';
import { ReserveConfirm } from '@/features/consignment';

export const metadata: Metadata = { title: 'Reserve' };

export default function ReservePage({ params }: { params: { id: string } }) {
  return <ReserveConfirm productId={params.id} />;
}
