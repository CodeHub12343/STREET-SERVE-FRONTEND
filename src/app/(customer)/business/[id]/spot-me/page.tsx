import type { Metadata } from 'next';
import { SpotMe } from '@/features/gifting';

export const metadata: Metadata = { title: 'Spot Me' };

export default function SpotMePage({ params }: { params: { id: string } }) {
  return <SpotMe businessId={params.id} />;
}
