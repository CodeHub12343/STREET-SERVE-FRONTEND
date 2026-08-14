import type { Metadata } from 'next';
import { Help } from '@/features/settings';

export const metadata: Metadata = { title: 'Help & support' };

export default function HelpPage() {
  return <Help />;
}
