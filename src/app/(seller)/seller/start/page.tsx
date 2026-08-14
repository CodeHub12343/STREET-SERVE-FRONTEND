import type { Metadata } from 'next';
import { SellerIntro } from '@/features/consignment';

export const metadata: Metadata = { title: 'Earn today' };

export default function SellerStartPage() {
  return <SellerIntro />;
}
