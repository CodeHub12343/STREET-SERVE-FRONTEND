import type { Metadata } from 'next';
import { SettlementView } from '@/features/consignment';

export const metadata: Metadata = { title: 'Settlement' };

export default function SettlementPage({ params }: { params: { id: string } }) {
  return <SettlementView checkoutId={params.id} />;
}
