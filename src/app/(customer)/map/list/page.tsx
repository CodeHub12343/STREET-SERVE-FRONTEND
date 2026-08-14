import type { Metadata } from 'next';
import { NearbyList } from '@/features/livemap';

export const metadata: Metadata = { title: 'Nearby' };

export default function NearbyListPage() {
  return <NearbyList />;
}
