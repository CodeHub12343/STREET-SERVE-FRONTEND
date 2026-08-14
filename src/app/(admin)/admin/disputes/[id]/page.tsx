import type { Metadata } from 'next';
import { DisputeCase } from '@/features/admin';

export const metadata: Metadata = { title: 'Dispute case' };

export default function DisputeCasePage({ params }: { params: { id: string } }) {
  return <DisputeCase id={params.id} />;
}
