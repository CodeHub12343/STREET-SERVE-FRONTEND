import type { Metadata } from 'next';
import { MessageThread } from '@/features/messaging';

export const metadata: Metadata = { title: 'Message' };

export default function ThreadPage({ params }: { params: { id: string } }) {
  return <MessageThread threadId={params.id} />;
}
