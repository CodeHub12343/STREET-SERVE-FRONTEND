import type { Metadata } from 'next';
import { DiscoverInventory } from '@/features/consignment';

export const metadata: Metadata = { title: 'Discover inventory' };

export default function SellerDiscoverPage() {
  return <DiscoverInventory />;
}
