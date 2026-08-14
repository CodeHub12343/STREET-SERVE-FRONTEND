import type { Metadata } from 'next';
import { BookingDetail } from '@/features/scheduling';

export const metadata: Metadata = { title: 'Booking' };

export default function BookingPage({ params }: { params: { id: string } }) {
  return <BookingDetail id={params.id} />;
}
