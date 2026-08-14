import type { Metadata } from 'next';
import { NotificationsStep } from '@/features/identity';

export const metadata: Metadata = { title: 'Notifications' };

export default function OnboardingNotificationsPage() {
  return <NotificationsStep />;
}
