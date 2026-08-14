import type { Metadata } from 'next';
import { WaveActive } from '@/features/wave';

export const metadata: Metadata = { title: 'Wave' };

export default function WaveActivePage({ params }: { params: { id: string } }) {
  return <WaveActive id={params.id} />;
}
