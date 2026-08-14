import type { Metadata } from 'next';
import { GiftRedemption } from '@/features/gifting';

export const metadata: Metadata = { title: 'Redeem gift' };

export default function GiftRedemptionPage({ params }: { params: { code: string } }) {
  return <GiftRedemption code={params.code} />;
}
