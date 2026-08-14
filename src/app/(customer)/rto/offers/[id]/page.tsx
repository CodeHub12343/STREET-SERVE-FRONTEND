import type { Metadata } from 'next';
import { RtoOfferDetail } from '@/features/rto';

export const metadata: Metadata = { title: 'Rent-to-own offer' };

/**
 * §44 disclosure + §47 acceptance. This is the screen the whole rent-to-own product was missing:
 * the backend could price and lock an agreement, and no customer could ever reach one.
 */
export default function RtoOfferPage({ params }: { params: { id: string } }) {
  return <RtoOfferDetail id={params.id} />;
}
