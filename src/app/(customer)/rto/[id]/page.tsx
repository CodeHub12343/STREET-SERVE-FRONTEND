import type { Metadata } from 'next';
import { RtoDashboard } from '@/features/rto';

export const metadata: Metadata = { title: 'Rent-to-Own' };

export default function RtoAgreementPage({ params }: { params: { id: string } }) {
  return <RtoDashboard id={params.id} />;
}
