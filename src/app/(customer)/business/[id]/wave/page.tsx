import type { Metadata } from 'next';
import { WaveConfirm } from '@/features/wave';

export const metadata: Metadata = { title: 'Wave down' };

export default function WaveConfirmPage({ params }: { params: { id: string } }) {
  return <WaveConfirm businessId={params.id} />;
}
