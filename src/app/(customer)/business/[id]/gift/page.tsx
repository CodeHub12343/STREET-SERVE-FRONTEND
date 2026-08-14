import type { Metadata } from 'next';
import { GiftFlow } from '@/features/gifting';

export const metadata: Metadata = { title: 'Gift' };

export default function GiftPage({ params }: { params: { id: string } }) {
  return <GiftFlow businessId={params.id} />;
}
