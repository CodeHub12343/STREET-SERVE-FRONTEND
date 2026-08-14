import type { Metadata } from 'next';
import { BookingFlow } from '@/features/scheduling';

export const metadata: Metadata = { title: 'Book' };

export default function BookPage({ params }: { params: { id: string } }) {
  return <BookingFlow businessId={params.id} />;
}
