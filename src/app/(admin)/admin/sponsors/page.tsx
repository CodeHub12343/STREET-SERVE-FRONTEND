import type { Metadata } from 'next';
import { SponsorManagement } from '@/features/admin';

export const metadata: Metadata = { title: 'Sponsors' };

export default function SponsorsPage() {
  return <SponsorManagement />;
}
