import type { Metadata } from 'next';
import { MessagesList } from '@/features/messaging';

export const metadata: Metadata = { title: 'Messages' };

export default function MessagesPage() {
  return <MessagesList />;
}
