import type { Metadata } from 'next';
import { DisputeQueue } from '@/features/admin';

export const metadata: Metadata = { title: 'Disputes' };

export default function DisputesPage() {
  return <DisputeQueue />;
}
