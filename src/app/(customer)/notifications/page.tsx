import type { Metadata } from 'next';
import { NotificationCenter } from '@/features/notifications';

export const metadata: Metadata = { title: 'Notifications' };

export default function NotificationsPage() {
  return <NotificationCenter />;
}
