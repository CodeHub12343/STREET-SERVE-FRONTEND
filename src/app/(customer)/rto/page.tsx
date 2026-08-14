import type { Metadata } from 'next';
import { RtoOffers } from '@/features/rto';

export const metadata: Metadata = { title: 'Rent to own' };

/** §42 — browse published offers. Public: deciding whether RTO suits you shouldn't need an account. */
export default function RtoOffersPage() {
  return <RtoOffers />;
}
