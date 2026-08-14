import type { Metadata } from 'next';
import { QueueStatus } from '@/features/queue';

export const metadata: Metadata = { title: 'Your place in line' };

export default function QueuePage({ params }: { params: { ownerId: string } }) {
  return <QueueStatus ownerId={params.ownerId} />;
}
